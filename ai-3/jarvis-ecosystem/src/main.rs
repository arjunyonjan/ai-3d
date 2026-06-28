use std::fs;
use std::io::{self, Read};
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use tiny_http::{Header, Response, Server, StatusCode};
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};

struct SseStream {
    changed: Arc<AtomicBool>,
    last_heartbeat: Instant,
}

impl Read for SseStream {
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        loop {
            if self.changed.swap(false, Ordering::SeqCst) {
                let msg = b"event: reload\ndata: {}\n\n";
                let n = msg.len().min(buf.len());
                buf[..n].copy_from_slice(&msg[..n]);
                return Ok(n);
            }
            if self.last_heartbeat.elapsed() >= Duration::from_secs(30) {
                self.last_heartbeat = Instant::now();
                let msg = b": heartbeat\n\n";
                let n = msg.len().min(buf.len());
                buf[..n].copy_from_slice(&msg[..n]);
                return Ok(n);
            }
            thread::sleep(Duration::from_millis(150));
        }
    }
}

fn mime_type(path: &str) -> &str {
    if path.ends_with(".html") { "text/html; charset=utf-8" }
    else if path.ends_with(".css") { "text/css; charset=utf-8" }
    else if path.ends_with(".js") { "application/javascript; charset=utf-8" }
    else if path.ends_with(".json") { "application/json" }
    else if path.ends_with(".png") { "image/png" }
    else if path.ends_with(".svg") { "image/svg+xml" }
    else if path.ends_with(".woff2") { "font/woff2" }
    else { "application/octet-stream" }
}

fn handle_file(server_dir: &str, req_url: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let path = req_url.trim_start_matches('/');
    let path = if path.is_empty() || path == "index.html" { "index.html" } else { path };
    let full_path = format!("{}/{}", server_dir, path);
    match fs::read(&full_path) {
        Ok(data) => {
            let ct = mime_type(path);
            Response::from_data(data)
                .with_header(Header::from_bytes("Content-Type", ct).unwrap())
        }
        Err(_) => {
            let idx = format!("{}/index.html", server_dir);
            match fs::read(&idx) {
                Ok(data) => Response::from_data(data)
                    .with_header(Header::from_bytes("Content-Type", "text/html; charset=utf-8").unwrap()),
                Err(_) => Response::from_string("404").with_status_code(404),
            }
        }
    }
}

fn main() {
    let server_dir = Path::new(env!("CARGO_MANIFEST_DIR")).to_string_lossy().to_string();
    println!("Serving: {}", server_dir);

    let port: u16 = std::env::args().nth(1).and_then(|s| s.parse().ok()).unwrap_or(8080);
    let server = Server::http(&format!("0.0.0.0:{}", port)).expect("Failed to start server");
    println!("Server at http://localhost:{}", port);

    let changed = Arc::new(AtomicBool::new(false));
    let watch_dir = server_dir.clone();

    { let c = changed.clone();
    thread::spawn(move || {
        let (tx, rx) = std::sync::mpsc::channel();
        let mut w: RecommendedWatcher = Watcher::new(tx, Config::default()).expect("watcher");
        w.watch(Path::new(&watch_dir), RecursiveMode::Recursive).expect("watch");
        for ev in rx {
            if let Ok(Event { kind: EventKind::Modify(_) | EventKind::Create(_) | EventKind::Remove(_), .. }) = ev {
                c.store(true, Ordering::SeqCst);
            }
        }
    }); }

    for req in server.incoming_requests() {
        let url = req.url().to_string();
        if url == "/events" || url == "/events/" {
            let c = changed.clone();
            thread::spawn(move || {
                let headers = vec![
                    Header::from_bytes("Content-Type", "text/event-stream").unwrap(),
                    Header::from_bytes("Cache-Control", "no-cache").unwrap(),
                    Header::from_bytes("Connection", "keep-alive").unwrap(),
                    Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap(),
                ];
                let resp = Response::new(
                    StatusCode(200),
                    headers,
                    SseStream { changed: c, last_heartbeat: Instant::now() },
                    None,
                    None,
                );
                req.respond(resp).ok();
            });
        } else {
            let _ = req.respond(handle_file(&server_dir, &url));
        }
    }
}
