import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { extname, resolve } from 'path';

const root = resolve(import.meta.dirname || '.');
const port = 8002;
const MIME = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
};

const server = createServer((req, res) => {
    const filePath = root + (req.url === '/' ? '/index.html' : req.url);
    const ext = extname(filePath);
    try {
        const content = readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(content);
    } catch { res.writeHead(404); res.end(); }
});

server.listen(port, async () => {
    console.log(`Test server at http://localhost:${port}`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`http://localhost:${port}`);

    // 1. Wait for Three.js to render + auto-open delay (500ms) + camera animation (~1s)
    await page.waitForTimeout(3000);

    // 2. Check auto-open triggered isolation — back button should be visible
    const totalLabels = await page.$$eval('.folder-label', els => els.length);
    console.log(`Total folder labels: ${totalLabels}`);

    const backText = await page.textContent('#back-view');
    const backDisplay = await page.evaluate(() => getComputedStyle(document.getElementById('back-view')).display);
    console.log(`Back button: "${backText}" (display: ${backDisplay})`);

    if (backDisplay === 'block') {
        console.log('✓ AI-3 auto-isolated on page load');

        // 3. Check some labels are hidden
        const hiddenCount = await page.evaluate(() => {
            let n = 0;
            document.querySelectorAll('.folder-label').forEach(l => { if (l.style.display === 'none') n++; });
            return n;
        });
        console.log(`Hidden labels: ${hiddenCount}/${totalLabels}`);

        // 4. Click BACK
        await page.click('#back-view');
        await page.waitForTimeout(2000);

        const backAfter = await page.evaluate(() => document.getElementById('back-view').style.display);
        console.log(`Back display after click: "${backAfter}"`);
        if (backAfter === 'none') console.log('✓ View restored');
        else throw new Error('Back button did not hide');
    } else {
        throw new Error('Back button not visible — auto-isolation failed');
    }

    await browser.close();
    server.close();
    console.log('\n✓ All isolation tests passed');
});
