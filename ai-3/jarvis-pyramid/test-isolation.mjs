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

    // Full view mode — all labels visible, back button hidden
    const totalLabels = await page.$$eval('.folder-label', els => els.length);
    console.log(`Total folder labels: ${totalLabels}`);

    const backDisplay = await page.evaluate(() => document.getElementById('back-view').style.display);
    console.log(`Back button display: "${backDisplay}" (expect "none")`);
    if (backDisplay === 'none') console.log('✓ Full view mode — all projects visible');
    else throw new Error('Expected full view (back button hidden)');

    // Click a project to enter isolation
    const pos = await page.evaluate(() => {
        const labels = document.querySelectorAll('.folder-label');
        for (const el of labels) {
            if (el.textContent.includes('AI-3')) {
                const r = el.getBoundingClientRect();
                return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            }
        }
        return null;
    });

    if (pos) {
        await page.mouse.click(pos.x, pos.y);
        await page.waitForTimeout(2000);

        const backAfter = await page.evaluate(() => document.getElementById('back-view').style.display);
        console.log(`Back after click: "${backAfter}" (expect "block")`);
        if (backAfter === 'block') {
            console.log('✓ Isolation mode entered on project click');
        } else throw new Error('Expected isolation');

        // Check features expanded
        const featLabels = await page.$$('.feature-label');
        console.log(`Feature labels visible: ${featLabels.length}`);

        const hiddenCount = await page.evaluate(() => {
            let n = 0;
            document.querySelectorAll('.folder-label').forEach(l => { if (l.style.display === 'none') n++; });
            return n;
        });
        console.log(`Hidden folder labels: ${hiddenCount}/${totalLabels}`);

        if (hiddenCount === totalLabels - 1) console.log('✓ Other folders hidden');
        else throw new Error(`Expected ${totalLabels - 1} hidden, got ${hiddenCount}`);

        // Click back to restore
        await page.click('#back-view');
        await page.waitForTimeout(2000);

        const backFinal = await page.evaluate(() => document.getElementById('back-view').style.display);
        console.log(`Back after restore: "${backFinal}" (expect "none")`);
        if (backFinal === 'none') console.log('✓ View restored');
        else throw new Error('Back button did not hide');

        const featAfter = await page.$$('.feature-label');
        if (featAfter.length === 0) console.log('✓ All feature labels hidden after back');
        else throw new Error(`Expected 0 feature labels, got ${featAfter.length}`);
    } else {
        throw new Error('AI-3 label not found');
    }

    console.log('\n✓ All isolation tests passed');
    await browser.close();
})();
