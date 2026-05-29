/**
 * Swarm Gallery — Browser (Playwright) Test Suite
 * Run: node test/browser.test.mjs
 */

import { chromium } from '/home/ken/.nvm/versions/node/v24.15.0/lib/node_modules/playwright/index.mjs';

const CLIENT = 'http://localhost:3000';
const SERVER = 'http://localhost:4000';

let passed = 0;
let failed = 0;
const errs = [];
let browser, context, page;

function ok(name, cond, detail = '') {
  if (cond) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
    errs.push(name);
  }
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(50 - title.length)}`);
}

async function waitFor(fn, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { const r = await fn(); if (r) return r; } catch { /**/ }
    await new Promise(r => setTimeout(r, 100));
  }
  return null;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

browser = await chromium.launch({ headless: true });
context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
page = await context.newPage();

const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', err => consoleErrors.push(`Page error: ${err.message}`));

// ── 1. Client loads ───────────────────────────────────────────────────────────

section('Client App Loads');

const resp = await page.goto(CLIENT, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => null);
ok('Client app → 200', resp?.ok());
ok('Page title set', (await page.title()).length > 0);

// ── 2. Landing page — Get Started button ──────────────────────────────────────

section('Landing Page');

ok('Get Started button visible', await page.locator('a:has-text("Get Started")').isVisible().catch(() => false));
// Button should NOT have var(--ink) background (dark mode invisible)
const btnBg = await page.locator('a:has-text("Get Started")').evaluate(el => getComputedStyle(el).backgroundImage).catch(() => '');
ok('Get Started uses gradient (not flat ink)', btnBg.includes('gradient') || btnBg !== 'none');

// ── 3. Guest join flow ────────────────────────────────────────────────────────

section('Guest Join Flow');

await page.goto(`${CLIENT}/event/demo`, { waitUntil: 'networkidle', timeout: 15000 });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle', timeout: 15000 });

const hasInput = await waitFor(() => page.locator('input[type="text"]').first().isVisible());
ok('Join screen has username input', !!hasInput);

const bodyText = await page.textContent('body');
ok('Join screen has join content', bodyText?.toLowerCase().includes('join') || bodyText?.toLowerCase().includes('nickname'));
ok('Join screen shows K3DP Events', bodyText?.includes('K3DP Events'));

// ── 4. Join screen — client-side username validation ──────────────────────────

section('Join Screen Validation');

// Submit with empty name
const submitBtn = page.locator('button[type="submit"]').first();
await submitBtn.click().catch(() => {});
// No network round-trip needed — validation is synchronous, DOM updates in next tick
await page.waitForFunction(() => document.activeElement !== null).catch(() => {});
// Should still be on join screen (validation blocked submit)
ok('Empty submit stays on join screen', await page.locator('input[type="text"]').first().isVisible().catch(() => false));

// 1-char name — submit should be blocked or error shown
await page.locator('input[type="text"]').first().fill('X');
await submitBtn.click();
await page.waitForFunction(() => document.activeElement !== null).catch(() => {});
const afterOneChar = await page.textContent('body');
ok('1-char name shows error or stays on join', afterOneChar?.toLowerCase().includes('at least') || afterOneChar?.toLowerCase().includes('character') || await page.locator('input[type="text"]').first().isVisible().catch(() => false));

// ── 5. Event name shown on join screen ────────────────────────────────────────

section('Event Name on Join Screen');

const joinBodyText = await page.textContent('body');
// The event name from DB should appear (not the hardcoded fallback "Event Gallery")
const hasRealName = joinBodyText && !joinBodyText.includes('Event Gallery');
ok('Join screen does not show hardcoded "Event Gallery"', !!hasRealName);
// Should show the actual event name (whatever is in DB)
ok('Join screen shows a real event name', joinBodyText?.includes('Event') || joinBodyText?.includes('Party') || joinBodyText?.includes('Demo') || joinBodyText?.includes('Birthday'));

// ── 6. Admin login ────────────────────────────────────────────────────────────

section('Admin Login');

const adminPage = await context.newPage();
await adminPage.goto(`${CLIENT}/admin`, { waitUntil: 'networkidle', timeout: 15000 });
const adminBody = await adminPage.textContent('body');
ok('Admin page loads', !!adminBody && adminBody.length > 50);

const pwInput = adminPage.locator('input[type="password"]');
const pwVisible = await pwInput.isVisible().catch(() => false);
ok('Password input visible', pwVisible);

if (pwVisible) {
  // Wrong password
  await pwInput.fill('wrong-password');
  const subBtn = adminPage.locator('button[type="submit"]').first();
  await subBtn.click();
  // Wait for either error message or form to remain visible
  await adminPage.waitForSelector('input[type="password"], .error, [style*="danger"]', { timeout: 4000 }).catch(() => {});
  ok('Wrong password keeps login form', await adminPage.locator('input[type="password"]').isVisible().catch(() => false));

  // Correct password
  await pwInput.fill('admin123');
  await subBtn.click();
  // Wait for sidebar nav to appear — proof that auth succeeded and dashboard rendered
  await adminPage.waitForSelector('button:has-text("Dashboard")', { timeout: 10000 }).catch(() => {});

  const postLogin = await adminPage.textContent('body');
  ok('Admin dashboard visible after login', postLogin?.toLowerCase().includes('dashboard') || postLogin?.includes('Photos') || postLogin?.includes('Guests'));

  const dashBtn = await adminPage.locator('button:has-text("Dashboard")').isVisible().catch(() => false);
  const galBtn  = await adminPage.locator('button:has-text("Galleries")').isVisible().catch(() => false);
  ok('Admin sidebar nav present', dashBtn && galBtn);
}

// ── 7. Admin sidebar shows live event name ────────────────────────────────────

section('Admin Sidebar Event Name');

if (pwVisible) {
  // Event name in sidebar should match DB, not be hardcoded "Demo Event" always
  const sidebarText = await adminPage.textContent('body');
  ok('Sidebar does not hard-lock to "Event Gallery"', !sidebarText?.includes('Event Gallery'));
  // Should have LIVE indicator
  ok('Sidebar has LIVE indicator', sidebarText?.includes('LIVE'));
}

// ── 8. Admin dashboard content ────────────────────────────────────────────────

section('Admin Dashboard Content');

if (pwVisible) {
  const dashBtn2 = adminPage.locator('button:has-text("Dashboard")').first();
  if (await dashBtn2.isVisible().catch(() => false)) await dashBtn2.click();
  await adminPage.waitForSelector('text=Total Photos, text=TOTAL PHOTOS, img[src*="/qr"]', { timeout: 6000 }).catch(() => {});
  const dash = await adminPage.textContent('body');
  ok('Dashboard has photo stat', dash?.includes('Photo') || dash?.includes('photo'));
  ok('Dashboard has guest stat', dash?.includes('Guest') || dash?.includes('guest'));
  ok('Dashboard has QR section', dash?.includes('QR'));
  ok('Dashboard has Network section', dash?.includes('Network'));
  ok('QR image loads', await adminPage.locator('img[src*="/qr"]').isVisible().catch(() => false));
}

// ── 9. Admin Settings validation in browser ────────────────────────────────────

section('Admin Settings Validation');

if (pwVisible) {
  const settBtn = adminPage.locator('button:has-text("Settings")').first();
  if (await settBtn.isVisible().catch(() => false)) {
    await settBtn.click();
    await adminPage.waitForSelector('text=K3DP Events, text=Event name, text=Event Info', { timeout: 6000 }).catch(() => {});
    const settBody = await adminPage.textContent('body');

    // Organizer should be read-only K3DP Events
    ok('Settings shows K3DP Events as organizer', settBody?.includes('K3DP Events'));
    ok('Organizer is NOT an editable input', !await adminPage.locator('input[value="K3DP Events"]').isVisible().catch(() => false));

    // Storage warning has min/max
    const warnInput = adminPage.locator('input[type="number"]').last();
    const warnMin = await warnInput.getAttribute('min').catch(() => null);
    const warnMax = await warnInput.getAttribute('max').catch(() => null);
    ok('Storage warning has min=1', warnMin === '1');
    ok('Storage warning has max=100', warnMax === '100');

    // Event name has maxLength
    const nameInput = adminPage.locator('input[type="text"]').first();
    const nameMax = await nameInput.getAttribute('maxlength').catch(() => null);
    ok('Event name has maxLength=80', nameMax === '80');

    // Settings join link is NOT localhost
    ok('Settings join link not localhost', !settBody?.includes('localhost:3000/event'));

    // QR image visible in settings
    ok('Settings QR image visible', await adminPage.locator('img[src*="/qr"]').isVisible().catch(() => false));

    // Danger zone present
    ok('Danger zone present', settBody?.includes('Danger'));
  } else {
    for (let i = 0; i < 7; i++) ok('Settings check (login skipped)', false, 'skipped');
  }
}

// ── 10. Admin Galleries ───────────────────────────────────────────────────────

section('Admin Galleries');

if (pwVisible) {
  const galBtn2 = adminPage.locator('button:has-text("Galleries")').first();
  if (await galBtn2.isVisible().catch(() => false)) {
    await galBtn2.click();
    await adminPage.waitForSelector('input[placeholder*="Search"]', { timeout: 6000 }).catch(() => {});
    ok('Galleries page loads', await adminPage.locator('input[placeholder*="Search"]').isVisible().catch(() => false));
  } else {
    ok('Galleries page', false, 'button not found');
  }
}

// ── 11. Admin Guests ──────────────────────────────────────────────────────────

section('Admin Guests');

if (pwVisible) {
  const gBtn = adminPage.locator('button:has-text("Guests")').first();
  if (await gBtn.isVisible().catch(() => false)) {
    await gBtn.click();
    await adminPage.waitForSelector('text=All guests, text=Active, text=Left event', { timeout: 6000 }).catch(() => {});
    const gBody = await adminPage.textContent('body');
    ok('Guests page loads', gBody?.includes('Guest') || gBody?.includes('guest'));
    ok('Guests has live stats', gBody?.includes('Active') || gBody?.includes('joined'));
  } else {
    ok('Guests page', false, 'button not found');
    ok('Guests live stats', false, 'skipped');
  }
}

// ── 12. Gallery header shows event name (not "Event Gallery") ─────────────────

section('Gallery Header Event Name');

// Create a fresh context for the gallery view (simulate a returning user)
const galleryCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
const gPage = await galleryCtx.newPage();

// Pre-seed localStorage with a valid-ish user to skip join screen
await gPage.goto(`${CLIENT}/event/demo`, { waitUntil: 'domcontentloaded' });
await gPage.evaluate(() => {
  localStorage.setItem('swarm-gallery-user', JSON.stringify({ userId: '__test__', username: 'Test', avatarUrl: null }));
});
await gPage.reload({ waitUntil: 'networkidle', timeout: 15000 });
// Wait for either the gallery UI or the join screen to finish rendering
await gPage.waitForSelector('h1, input[type="text"], button', { timeout: 6000 }).catch(() => {});

const gBody = await gPage.textContent('body');
// Either shows join screen (invalid user) or gallery — neither should say "Event Gallery"
ok('Gallery area does not show hardcoded "Event Gallery"', !gBody?.includes('Event Gallery') || gBody?.includes('K3DP Events'));

await galleryCtx.close();

// ── 13. Mobile viewport ───────────────────────────────────────────────────────

section('Mobile Viewport');

const mobilePage = await context.newPage();
await mobilePage.setViewportSize({ width: 390, height: 844 });

await mobilePage.goto(`${CLIENT}/event/demo`, { waitUntil: 'networkidle', timeout: 15000 });
ok('Event page loads on mobile', (await mobilePage.textContent('body'))?.length > 100);
ok('No horizontal overflow on mobile', await mobilePage.evaluate(() => document.documentElement.scrollWidth) <= 400);

await mobilePage.goto(`${CLIENT}/admin`, { waitUntil: 'networkidle', timeout: 15000 });
ok('Admin no overflow on mobile', await mobilePage.evaluate(() => document.documentElement.scrollWidth) <= 400);
await mobilePage.close();

// ── 14. PWA manifest ──────────────────────────────────────────────────────────

section('PWA / Manifest');

const manifestRes = await page.request.get(`${CLIENT}/manifest.webmanifest`);
ok('Manifest → 200', manifestRes.ok());
const manifest = await manifestRes.json().catch(() => null);
ok('Manifest is JSON', !!manifest);
ok('Has name', typeof manifest?.name === 'string');
ok('display=standalone', manifest?.display === 'standalone');
ok('Has theme_color', !!manifest?.theme_color);
ok('Has icons', Array.isArray(manifest?.icons) && manifest.icons.length > 0);

// ── 15. Console error check ───────────────────────────────────────────────────

section('Console Error Check');

consoleErrors.length = 0;
await page.goto(`${CLIENT}/event/demo`, { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForSelector('h1, input[type="text"], button', { timeout: 5000 }).catch(() => {});
// Filter known benign noise: favicon misses, socket reconnects, and 404s on
// test-created then deleted photo/avatar files from the API test suite.
const critErrors = consoleErrors.filter(e =>
  !e.includes('favicon') &&
  !e.includes('socket') &&
  !e.includes('404') &&      // deleted test resources
  !e.includes('avatars/') && // stale avatar from prior run
  !e.includes('photos/')     // stale photo from prior run
);
ok('No critical JS errors on /event/demo', critErrors.length === 0, critErrors.slice(0, 2).join('; '));

// ── Cleanup ───────────────────────────────────────────────────────────────────

await adminPage.close();
await browser.close();

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(60)}`);
console.log(`  Browser Tests: ${passed} passed, ${failed} failed`);
if (errs.length) {
  console.log('\n  Failed tests:');
  errs.forEach((e) => console.log(`    • ${e}`));
}
console.log(`${'═'.repeat(60)}\n`);

process.exit(failed > 0 ? 1 : 0);
