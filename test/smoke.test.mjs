/**
 * Swarm Gallery — Smoke & UI Route Tests
 * Browser-level checks via HTTP (no headless browser required)
 * Tests: page rendering, SSR content, manifest, static assets, UI routes
 */

const CLIENT = 'http://localhost:3000';
const SERVER = 'http://localhost:4000';

let passed = 0;
let failed = 0;
const errs = [];

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

async function get(url) {
  return fetch(url).catch((e) => ({ ok: false, status: 0, _err: e.message }));
}

// ── 1. All routes return 200 ──────────────────────────────────────────────────

section('Page Routes');

const routes = [
  ['/', 'Root redirect / landing'],
  ['/admin', 'Admin page'],
  ['/event/demo', 'Event gallery page (dynamic route)'],
];

for (const [path, label] of routes) {
  const res = await get(`${CLIENT}${path}`);
  ok(`${label} → 200`, res.ok, `status=${res.status}`);
}

// ── 2. HTML structure of key pages ───────────────────────────────────────────

section('HTML Content');

const adminHtml = await (await get(`${CLIENT}/admin`)).text().catch(() => '');
ok('Admin page has charset=utf-8', adminHtml.includes('charset="utf-8"') || adminHtml.includes("charset='utf-8'"));
ok('Admin page has viewport meta', adminHtml.includes('viewport'));
ok('Admin page has manifest link', adminHtml.includes('manifest.webmanifest'));
ok('Admin page has page title', adminHtml.includes('Swarm Gallery'));
ok('Admin page has PWA meta tags', adminHtml.includes('apple-mobile-web-app-capable'));
ok('Admin page references main JS chunk', adminHtml.includes('_next/static'));
// Loading state is present (client-side rendering renders it on hydration)
ok('Admin page has content', adminHtml.length > 500);

const eventHtml = await (await get(`${CLIENT}/event/demo`)).text().catch(() => '');
ok('Event page returns HTML', eventHtml.includes('<!DOCTYPE html') || eventHtml.includes('<html'));
ok('Event page has Swarm Gallery title', eventHtml.includes('Swarm Gallery'));
ok('Event page references JS bundle', eventHtml.includes('_next/static'));

// ── 3. PWA manifest ───────────────────────────────────────────────────────────

section('PWA Manifest');

const manifestRes = await get(`${CLIENT}/manifest.webmanifest`);
ok('GET /manifest.webmanifest → 200', manifestRes.ok, `status=${manifestRes.status}`);
ok('Manifest content-type is JSON', manifestRes.headers.get('content-type')?.includes('json'));
const manifest = await manifestRes.json().catch(() => null);
ok('Manifest is valid JSON', !!manifest);
ok('Manifest name = "Swarm Gallery"', manifest?.name === 'Swarm Gallery');
ok('Manifest short_name = "Swarm"', manifest?.short_name === 'Swarm');
ok('Manifest display = "standalone"', manifest?.display === 'standalone');
ok('Manifest theme_color = "#7c3aed"', manifest?.theme_color === '#7c3aed');
ok('Manifest background_color = "#0f0d1f"', manifest?.background_color === '#0f0d1f');
ok('Manifest start_url = "/"', manifest?.start_url === '/');
ok('Manifest has icons array', Array.isArray(manifest?.icons) && manifest.icons.length >= 2);
const has192 = manifest?.icons?.some((i) => i.sizes?.includes('192x192'));
const has512 = manifest?.icons?.some((i) => i.sizes?.includes('512x512'));
ok('Manifest has 192x192 icon', !!has192);
ok('Manifest has 512x512 icon', !!has512);

// ── 4. Static assets load ─────────────────────────────────────────────────────

section('Static Assets');

// Check public assets referenced in layout
const logoRes = await get(`${CLIENT}/logo-512.png`);
ok('GET /logo-512.png → 200', logoRes.ok, `status=${logoRes.status}`);
ok('Logo is PNG', logoRes.headers.get('content-type')?.includes('png'));

// Favicon
const faviconRes = await get(`${CLIENT}/favicon.ico`);
ok('GET /favicon.ico → 200', faviconRes.ok, `status=${faviconRes.status}`);

// Main CSS/JS chunks referenced in admin page HTML
const chunkMatches = adminHtml.match(/\/_next\/static\/chunks\/[^"'\s]+\.css/g);
ok('Admin page references CSS chunk', chunkMatches && chunkMatches.length > 0);
if (chunkMatches) {
  const cssRes = await get(`${CLIENT}${chunkMatches[0]}`);
  ok('Main CSS chunk loads → 200', cssRes.ok, `status=${cssRes.status}`);
  ok('CSS chunk has Tailwind/CSS content', (await cssRes.text().catch(() => '')).length > 1000);
}

// ── 5. Not found returns proper 404 ──────────────────────────────────────────

section('404 Handling');

const miss1 = await get(`${CLIENT}/this-page-does-not-exist`);
ok('Unknown client route → non-500', miss1.status !== 500, `got ${miss1.status}`);

const miss2 = await get(`${SERVER}/this-endpoint-does-not-exist`);
ok('Unknown server route → 404 or not-found', miss2.status === 404 || miss2.status === 400);

// ── 6. Client ↔ Server connectivity (simulated browser fetch) ────────────────

section('Client ↔ Server Connectivity');

// Simulate what the client JS does: fetch photos-list from server
const photosRes = await get(`${SERVER}/photos-list/demo`);
ok('Client can reach photo list API', photosRes.ok, `status=${photosRes.status}`);
ok('Photo list returns array', Array.isArray(await photosRes.json().catch(() => null)));

// Server health from client's perspective
const healthRes = await get(`${SERVER}/health`);
ok('Client can reach server health endpoint', healthRes.ok);

// QR code image available
const qrRes = await get(`${SERVER}/events/demo/qr`);
ok('QR code endpoint returns image', qrRes.ok && qrRes.headers.get('content-type')?.includes('image/png'));

// ── 7. Admin page JS chunks all load ─────────────────────────────────────────

section('Admin Page JS Chunks');

// Extract all script src references from admin HTML
const scriptSrcs = [...adminHtml.matchAll(/src="(\/_next\/static\/chunks\/[^"]+)"/g)].map(m => m[1]);
ok('Admin page has script chunks', scriptSrcs.length > 0, `found ${scriptSrcs.length}`);

let chunksFailed = 0;
for (const src of scriptSrcs) {
  const r = await get(`${CLIENT}${src}`);
  if (!r.ok) {
    console.error(`    ✗ chunk 500: ${src}`);
    chunksFailed++;
  }
}
ok(`All ${scriptSrcs.length} JS chunks load (no 500s)`, chunksFailed === 0, `${chunksFailed} failed`);

// ── 8. Event page JS chunks all load ─────────────────────────────────────────

section('Event Page JS Chunks');

const eventScripts = [...eventHtml.matchAll(/src="(\/_next\/static\/chunks\/[^"]+)"/g)].map(m => m[1]);
ok('Event page has script chunks', eventScripts.length > 0, `found ${eventScripts.length}`);

let eventChunksFailed = 0;
for (const src of eventScripts) {
  const r = await get(`${CLIENT}${src}`);
  if (!r.ok) {
    console.error(`    ✗ chunk 500: ${src}`);
    eventChunksFailed++;
  }
}
ok(`All ${eventScripts.length} event page JS chunks load`, eventChunksFailed === 0, `${eventChunksFailed} failed`);

// ── 9. Admin routes require auth (simulated browser behavior) ─────────────────

section('Admin Auth Gates (simulated browser)');

// These API calls are made by the admin dashboard — no cookie = 401
const protectedApis = [
  `${SERVER}/admin/stats?eventId=demo`,
  `${SERVER}/admin/photos?eventId=demo`,
  `${SERVER}/admin/guests?eventId=demo`,
  `${SERVER}/admin/network`,
];
for (const url of protectedApis) {
  const r = await get(url);
  ok(`Unauth API call to ${url.replace(SERVER, '')} → 401`, r.status === 401);
}

// ── 10. Settings page join URL fix ────────────────────────────────────────────

section('Settings Join URL Fix Verification');

// Login as admin and check the event-settings response
const loginRes = await fetch(`${SERVER}/admin/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'admin123' }),
});
const setCookie = loginRes.headers.get('set-cookie');
const adminCookie = setCookie ? setCookie.split(';')[0] : '';

const netRes = await fetch(`${SERVER}/admin/network`, { headers: { Cookie: adminCookie } });
const netData = await netRes.json();
ok('Network endpoint returns liveIp', typeof netData.liveIp === 'string' || netData.liveIp === null);
ok('Network endpoint port is numeric', Number.isInteger(Number(netData.port)));

// The admin page HTML should NOT hard-code localhost in any join link (SSR check)
// (The component is client-rendered, but we verify the SSR response doesn't contain a wrong URL)
ok('Admin HTML does not hard-code localhost join link in SSR',
   !adminHtml.includes('localhost:3000/event/'));

// ── 11. CORS header check ─────────────────────────────────────────────────────

section('CORS Headers');

const corsRes = await fetch(`${SERVER}/health`, {
  headers: { 'Origin': 'http://192.168.137.1:3000' },
});
ok('Server CORS header present', !!corsRes.headers.get('access-control-allow-origin'));
ok('Server allows credentials origin', corsRes.headers.get('access-control-allow-credentials') === 'true');

// Preflights
const preflightRes = await fetch(`${SERVER}/users/join`, {
  method: 'OPTIONS',
  headers: { 'Origin': 'http://192.168.1.1:3000', 'Access-Control-Request-Method': 'POST' },
});
ok('OPTIONS preflight returns 204', preflightRes.status === 204);

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(60)}`);
console.log(`  Smoke Tests: ${passed} passed, ${failed} failed`);
if (errs.length) {
  console.log('\n  Failed tests:');
  errs.forEach((e) => console.log(`    • ${e}`));
}
console.log(`${'═'.repeat(60)}\n`);

process.exit(failed > 0 ? 1 : 0);
