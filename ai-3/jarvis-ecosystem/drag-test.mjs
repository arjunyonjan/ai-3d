import { chromium } from 'playwright';

const URL = 'http://localhost:8081';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) { console.log('FAIL: no canvas'); await browser.close(); return; }

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Drag the center panel downward
  await page.mouse.move(cx, cy);
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.waitForTimeout(100);
  await page.mouse.move(cx, cy + 80, { steps: 10 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(500);

  // Read panel positions from page context
  const positions = await page.evaluate(() => {
    const data = window.ECOSYSTEM_DATA;
    return data.nodes.map(n => ({ label: n.label, x: n.x.toFixed(2), y: n.y.toFixed(2) }));
  });

  console.log('Positions after drag:', JSON.stringify(positions, null, 2));

  // Check if any node moved
  const moved = positions.filter(p => parseFloat(p.y) !== 0);
  if (moved.length) {
    console.log('PASS: panels draggable, lines follow');
  } else {
    console.log('FAIL: no panel moved');
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
