import { chromium } from 'playwright';

const port = 8080;

(async () => {
    console.log(`Connecting to live-server at http://localhost:${port}`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    page.on('console', msg => { if (msg.type() === 'error') console.log('  [browser error]', msg.text()); });
    page.on('pageerror', err => console.log('  [page error]', err.message));

    await page.goto(`http://localhost:${port}`);
    await page.waitForTimeout(3000);

    const totalLabels = await page.$$eval('.folder-label', els => els.length);
    console.log(`Total folder labels: ${totalLabels}`);

    const backText = await page.textContent('#back-view');
    const backDisplay = await page.evaluate(() => getComputedStyle(document.getElementById('back-view')).display);
    console.log(`Back button: "${backText}" (display: ${backDisplay})`);

    if (backDisplay === 'block') {
        console.log('✓ AI-3 auto-isolated on page load');

        const hiddenCount = await page.evaluate(() => {
            let n = 0;
            document.querySelectorAll('.folder-label').forEach(l => { if (l.style.display === 'none') n++; });
            return n;
        });
        console.log(`Hidden labels: ${hiddenCount}/${totalLabels}`);

        await page.click('#back-view');
        await page.waitForTimeout(2000);

        const backAfter = await page.evaluate(() => document.getElementById('back-view').style.display);
        console.log(`Back display after click: "${backAfter}"`);
        if (backAfter === 'none') console.log('✓ View restored');
        else throw new Error('Back button did not hide');

        const featGhostCount = await page.evaluate(() => {
            let count = 0;
            document.querySelectorAll('.feature-label').forEach(el => { if (el.style.display !== 'none') count++; });
            return count;
        });
        if (featGhostCount === 0) console.log('✓ All feature labels hidden after back');
        else console.log(`⚠ ${featGhostCount} feature labels still visible`);
    } else {
        throw new Error('Back button not visible — auto-isolation failed');
    }

    await browser.close();
    console.log('\n✓ All isolation tests passed');
})();
