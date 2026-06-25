import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname, join, resolve } from 'path';

const root = resolve(import.meta.dirname || '.');
const port = 8001;

const MIME = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm',
};

const server = createServer((req, res) => {
    const filePath = join(root, req.url === '/' ? 'index.html' : req.url);
    const ext = extname(filePath);
    try {
        const content = readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(content);
    } catch {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(port, async () => {
    console.log(`Server at http://localhost:${port}`);
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}`);
    await page.pause();
});
