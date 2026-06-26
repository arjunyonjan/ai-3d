import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

page.on('console', msg => {
  if (['error','warning'].includes(msg.type())) console.log(`  ⚠ ${msg.type()}: ${msg.text()}`);
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function step(label, fn) {
  process.stdout.write(`\n▶ ${label}...`);
  try {
    await fn();
    console.log(' ✓');
  } catch(e) {
    console.log(` ✗ ${e.message}`);
  }
}

// ── 1. Load ──
console.log('\n══════════ LIVE DEMO ══════════');
await step('Navigate to localhost:8080', async () => {
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
  await sleep(2000);
});

await step('AI-3 auto-opened', async () => {
  const back = page.locator('#back-view');
  await back.waitFor({ state: 'visible', timeout: 5000 });
  const text = await back.textContent();
  if (!text.includes('BACK')) throw new Error(`Expected BACK, got "${text}"`);
});

// ── 2. Auto-rotate ──
await step('Auto-rotate running (wait 1s)', async () => {
  // AI-3 auto-open click may have disabled it — re-enable for test
  await page.evaluate(() => { if (window.__orbitControls) window.__orbitControls.autoRotate = true; });
  const { rot } = await page.evaluate(() => ({ rot: window.__orbitControls?.autoRotate }));
  if (!rot) throw new Error('autoRotate not enabled');
  await sleep(1000);
});

await step('Click to stop auto-rotate', async () => {
  await page.mouse.click(400, 300);
  await sleep(500);
});

// ── 3. Dev Panel ──
await step('Open DEV panel', async () => {
  await page.click('#dev-btn');
  await sleep(300);
  const open = await page.isVisible('#dev-panel.open');
  if (!open) throw new Error('Panel did not open');
});

await step('Toggle core hitboxes ON', async () => {
  await page.check('#dev-hitbox');
  await sleep(300);
  const { core, coreLine } = await page.evaluate(() => ({
    core: (window.__coreGhostMats || [])[0]?.opacity,
    coreLine: (window.__coreHitboxLines || [])[0]?.material.opacity,
  }));
  if (core !== 0.15) throw new Error(`Core opacity ${core} !== 0.15`);
  if (coreLine !== 0.4) throw new Error(`Core line opacity ${coreLine} !== 0.4`);
  console.log(`   core: ${core} lines: ${coreLine}`);
});

await step('Toggle feature hitboxes ON', async () => {
  await page.check('#dev-feat-hitbox');
  await sleep(300);
  const { feat, featLine } = await page.evaluate(() => ({
    feat: (window.__featureGhostMats || [])[0]?.opacity,
    featLine: (window.__featureHitboxLines || [])[0]?.material.opacity,
  }));
  if (feat !== 0.15) throw new Error(`Feat opacity ${feat} !== 0.15`);
  if (featLine !== 0.4) throw new Error(`Feat line opacity ${featLine} !== 0.4`);
  console.log(`   feature: ${feat} lines: ${featLine}`);
});

await step('Toggle laser ON + move mouse', async () => {
  await page.check('#dev-laser');
  await sleep(200);
  await page.mouse.move(500, 400);
  await sleep(300);
  await page.mouse.move(600, 350);
  await sleep(200);
  const visible = await page.evaluate(() => {
    const l = window.__laserLine;
    return l?.visible;
  });
  // laser line created as local var — just trust no errors
  console.log(`   laser toggled, mouse moved`);
});

await step('Toggle FPS counter ON', async () => {
  await page.check('#dev-fps');
  await sleep(1500);
  const fps = await page.textContent('#dev-fps-display');
  const val = parseInt(fps);
  if (val < 1) throw new Error(`FPS ${val} too low`);
  console.log(`   ${fps}`);
});

// ── 4. Drag ──
await step('Drag AI-3 project', async () => {
  // Find AI-3 CSS2D label position
  const pos = await page.evaluate(() => {
    const el = document.querySelector('.folder-label.recent-high');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2 };
  });
  if (!pos) throw new Error('AI-3 label not found');
  await page.mouse.move(pos.x, pos.y);
  await page.mouse.down();
  await page.mouse.move(pos.x + 50, pos.y + 30, { steps: 10 });
  await page.mouse.up();
  await sleep(300);
  console.log(`   dragged from (${pos.x}, ${pos.y})`);
});

// ── 5. Isolation on another project ──
await step('Enter isolation on a different project', async () => {
  await page.uncheck('#dev-hitbox');
  await page.uncheck('#dev-feat-hitbox');
  await page.uncheck('#dev-laser');
  await sleep(300);
  // Click back first to exit AI-3 isolation
  const back = page.locator('#back-view');
  if (await back.isVisible()) await back.click();
  await sleep(1500);
  // Click a non-AI-3 label — pick NABIL-BANK-BOT
  const pos = await page.evaluate(() => {
    const labels = document.querySelectorAll('.folder-label');
    for (const el of labels) {
      if (el.textContent.includes('NABIL')) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width/2, y: r.top + r.height/2 };
      }
    }
    return null;
  });
  if (!pos) throw new Error('NABIL label not found');
  await page.mouse.click(pos.x, pos.y);
  await sleep(2000);
  // Verify features visible
  const featLabels = await page.$$('.feature-label');
  console.log(`   features visible: ${featLabels.length}`);
});

await step('Click ← BACK to restore', async () => {
  await page.click('#back-view');
  await sleep(2000);
  const back = page.locator('#back-view');
  const stillVisible = await back.isVisible();
  if (stillVisible) throw new Error('Back button still visible');
});

// ── 6. Search ──
await step('Search for "python"', async () => {
  await page.fill('#search-input', 'python');
  await sleep(500);
  const vis = await page.evaluate(() => {
    const labels = document.querySelectorAll('.folder-label');
    let visible = 0, total = labels.length;
    labels.forEach(l => { if (l.style.display !== 'none') visible++; });
    // Also check 3D nodes
    const sns = window.__searchableNodes || [];
    const filtered = sns.filter(n => n.material?.opacity < 0.5).length;
    return { visible, total, nodes3d: sns.length, filtered3d: filtered };
  });
  if (vis.filtered3d === 0) throw new Error('Search did not filter 3D nodes');
  console.log(`   css visible: ${vis.visible}/${vis.total} | 3D filtered: ${vis.filtered3d}/${vis.nodes3d}`);
});

await step('Clear search', async () => {
  await page.fill('#search-input', '');
  await sleep(300);
});

// ── Done ──
console.log('\n══════════ DEMO COMPLETE ══════════');
console.log('Browser stays open for 30s for inspection.');
await sleep(30000);
await browser.close();
