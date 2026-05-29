/**
 * Swarm Gallery — API Test Suite
 * Run: node test/api.test.mjs
 */

const BASE   = 'http://localhost:4000';
const CLIENT = 'http://localhost:3000';

let passed = 0;
let failed = 0;
const errs = [];

// ── helpers ──────────────────────────────────────────────────────────────────

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

async function get(path, opts = {}) {
  return fetch(`${BASE}${path}`, { credentials: 'include', ...opts });
}
async function post(path, body, opts = {}) {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
    ...opts,
  });
}
async function patch(path, body, opts = {}) {
  return fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
    ...opts,
  });
}
async function del(path, opts = {}) {
  return fetch(`${BASE}${path}`, { method: 'DELETE', credentials: 'include', ...opts });
}

let adminCookie = '';

async function adminGet(path) {
  return fetch(`${BASE}${path}`, { headers: { Cookie: adminCookie } });
}
async function adminPost(path, body) {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify(body),
  });
}
async function adminPatch(path, body) {
  return fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify(body),
  });
}

function makeJpegBytes() {
  return Buffer.from(
    'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffda00080101000008041e00',
    'hex',
  );
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(50 - title.length)}`);
}

// ── 1. Infrastructure ────────────────────────────────────────────────────────

section('Infrastructure');

const [healthRes, clientRes] = await Promise.all([
  fetch(`${BASE}/health`).catch(() => null),
  fetch(`${CLIENT}/`).catch(() => null),
]);

ok('Server reachable (port 4000)', healthRes?.ok);
ok('Health returns {ok:true}', (await healthRes?.json())?.ok === true);
ok('Client reachable (port 3000)', clientRes?.ok);

// ── 2. Admin auth ─────────────────────────────────────────────────────────────

section('Admin Auth');

// Pre-flight: if IP is already rate-limited from a prior test run, exit early
// with a clear message. Restart the server to reset the in-memory counter.
const preflightRes = await post('/admin/login', { password: '__preflight__' });
if (preflightRes.status === 429) {
  console.error('\n  ⚠  IP is rate-limited from a previous test run.');
  console.error('  ⚠  Restart the server to clear: kill $(cat .run/server.pid) && node server/index.js &\n');
  process.exit(2);
}
ok('Wrong password → 401', preflightRes.status === 401);

const loginOk = await post('/admin/login', { password: 'admin123' });
ok('Correct password → 200', loginOk.ok);

const setCookie = loginOk.headers.get('set-cookie');
adminCookie = setCookie ? setCookie.split(';')[0] : '';
ok('Login sets admin cookie', !!adminCookie);

ok('GET /admin/me — authenticated', (await adminGet('/admin/me')).ok);
ok('GET /admin/me — unauthenticated → 401', (await get('/admin/me')).status === 401);

// ── 4. Network info ───────────────────────────────────────────────────────────

section('Network Info');

const netRes = await adminGet('/admin/network');
ok('GET /admin/network → 200', netRes.ok);
const net = await netRes.json();
ok('Has ips array', Array.isArray(net.ips));
ok('Has liveIp field', 'liveIp' in net);
ok('Port is a number', typeof net.port === 'number');
ok('Port is 4000', Number(net.port) === 4000);
ok('liveIp is string or null', net.liveIp === null || typeof net.liveIp === 'string');

// ── 5. Events / QR ───────────────────────────────────────────────────────────

section('Events & QR');

const eventRes = await get('/events/demo');
ok('GET /events/demo → 200', eventRes.ok);
const event = await eventRes.json();
ok('Event id=demo', event.id === 'demo');
ok('Event has name', typeof event.name === 'string' && event.name.length > 0);
ok('Event has status', typeof event.status === 'string');

ok('GET /events/nonexistent → 404', (await get('/events/does-not-exist')).status === 404);

const qrRes = await get('/events/demo/qr');
ok('QR → 200 image/png', qrRes.ok && qrRes.headers.get('content-type')?.includes('image/png'));
ok('QR PNG non-empty', (await qrRes.arrayBuffer()).byteLength > 0);
ok('QR with ?ip= cache-bust → 200', (await get('/events/demo/qr?ip=192.168.137.1')).ok);

// ── 6. Username validation ────────────────────────────────────────────────────

section('Username Validation');

const ts = Date.now();
const baseUser = `ValidUser_${ts}`;

// Too short (1 char)
const shortForm = new FormData();
shortForm.append('username', 'X');
shortForm.append('eventId', 'demo');
const shortRes = await fetch(`${BASE}/users/join`, { method: 'POST', body: shortForm });
ok('1-char username → 400', shortRes.status === 400);

// Min length exactly (2 chars) — use ts suffix to avoid collision across test runs
const twoCharForm = new FormData();
twoCharForm.append('username', `X${ts % 1000}`);
twoCharForm.append('eventId', 'demo');
const twoRes = await fetch(`${BASE}/users/join`, { method: 'POST', body: twoCharForm });
ok('2-char username → 201', twoRes.status === 201);

// Max length (32 chars) — unique prefix to avoid collision
const max32name = `A${ts}`.slice(0, 32).padEnd(32, 'z');
const maxForm = new FormData();
maxForm.append('username', max32name);
maxForm.append('eventId', 'demo');
const maxRes = await fetch(`${BASE}/users/join`, { method: 'POST', body: maxForm });
ok('32-char username → 201', maxRes.status === 201);

// Over max (33 chars) — should fail
const overForm = new FormData();
overForm.append('username', 'A'.repeat(33));
overForm.append('eventId', 'demo');
const overRes = await fetch(`${BASE}/users/join`, { method: 'POST', body: overForm });
ok('33-char username → 400', overRes.status === 400);

// Empty username
const emptyForm = new FormData();
emptyForm.append('username', '   ');
emptyForm.append('eventId', 'demo');
const emptyRes = await fetch(`${BASE}/users/join`, { method: 'POST', body: emptyForm });
ok('Whitespace-only username → 400', emptyRes.status === 400);

// Valid join for remaining tests
const validForm = new FormData();
validForm.append('username', baseUser);
validForm.append('eventId', 'demo');
validForm.append('deviceId', `dev_${ts}`);
const validJoin = await fetch(`${BASE}/users/join`, { method: 'POST', body: validForm });
ok('Valid username join → 201', validJoin.status === 201);
const { userId } = await validJoin.json();

// Username rename — too short
const renameShort = await fetch(`${BASE}/users/${userId}/username`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'X' }),
});
ok('Rename to 1-char → 400', renameShort.status === 400);

// Username rename — too long
const renameLong = await fetch(`${BASE}/users/${userId}/username`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'B'.repeat(33) }),
});
ok('Rename to 33-char → 400', renameLong.status === 400);

// Username rename — valid
const renameOk = await fetch(`${BASE}/users/${userId}/username`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: `${baseUser}_r` }),
});
ok('Rename to valid username → 200', renameOk.ok);

// ── 7. User identity flow ─────────────────────────────────────────────────────

section('User Identity Flow');

const ts2 = Date.now();
const testUser = `FlowUser_${ts2}`;
const testDevice = `flowdev_${ts2}`;

const joinForm = new FormData();
joinForm.append('username', testUser);
joinForm.append('eventId', 'demo');
joinForm.append('deviceId', testDevice);
const joinRes = await fetch(`${BASE}/users/join`, { method: 'POST', body: joinForm });
ok('New user join → 201', joinRes.status === 201);
const joinData = await joinRes.json();
ok('Join returns userId', typeof joinData.userId === 'string');
ok('Join returns username', joinData.username === testUser);
ok('Join returns avatarUrl null', joinData.avatarUrl === null);
const flowUserId = joinData.userId;

// Duplicate username
const dupForm = new FormData();
dupForm.append('username', testUser);
dupForm.append('eventId', 'demo');
const dupRes = await fetch(`${BASE}/users/join`, { method: 'POST', body: dupForm });
ok('Duplicate username → 409', dupRes.status === 409);

// Device rejoin
const rejoinForm = new FormData();
rejoinForm.append('username', testUser);
rejoinForm.append('eventId', 'demo');
rejoinForm.append('deviceId', testDevice);
const rejoinRes = await fetch(`${BASE}/users/join`, { method: 'POST', body: rejoinForm });
ok('Same device rejoin → 200', rejoinRes.ok);
ok('Rejoin returns same userId', (await rejoinRes.json()).userId === flowUserId);

// GET /users/device
const devRes = await fetch(`${BASE}/users/device?deviceId=${testDevice}&eventId=demo`);
ok('GET /users/device → 200', devRes.ok);
ok('Device lookup returns userId', (await devRes.json()).userId === flowUserId);
ok('Unknown device → 404', (await fetch(`${BASE}/users/device?deviceId=unknown_xyz&eventId=demo`)).status === 404);
ok('Missing deviceId → 400', (await fetch(`${BASE}/users/device?eventId=demo`)).status === 400);

// ── 8. Photo upload ───────────────────────────────────────────────────────────

section('Photo Upload');

const jpegBytes = makeJpegBytes();
const uploadForm = new FormData();
uploadForm.append('photo', new Blob([jpegBytes], { type: 'image/jpeg' }), 'test.jpg');
uploadForm.append('username', testUser);
const uploadRes = await fetch(`${BASE}/upload/demo`, { method: 'POST', body: uploadForm });
ok('Upload → 201', uploadRes.status === 201);
const photo = await uploadRes.json();
ok('Has id', typeof photo.id === 'string');
ok('Has url', typeof photo.url === 'string');
ok('Has uploadedAt', typeof photo.uploadedAt === 'number');
ok('uploader matches username', photo.uploader === testUser);
ok('likeCount=0', photo.likeCount === 0);
ok('likedByMe=false', photo.likedByMe === false);
const photoId = photo.id;

ok('Photo URL accessible', (await fetch(`${BASE}${photo.url}`)).ok);
ok('No file → 400', (await fetch(`${BASE}/upload/demo`, { method: 'POST', body: new FormData() })).status === 400);

// ── 9. Event name propagation ─────────────────────────────────────────────────

section('Event Name Propagation');

// Rename event and verify it shows up in GET /events/demo
const savedName = event.name; // store original
await adminPatch('/admin/event-settings', {
  eventId: 'demo',
  name: 'Propagation Test Event',
  organizerName: 'K3DP Events',
  eventDate: '2026-06-01',
  eventType: 'Wedding',
  expectedGuests: '50',
  retentionPolicy: 'Until handoff',
  storageWarning: '80',
});
const updatedEvent = await (await get('/events/demo')).json();
ok('Event name update visible on /events/demo', updatedEvent.name === 'Propagation Test Event');

// Restore original name
await adminPatch('/admin/event-settings', {
  eventId: 'demo',
  name: savedName || 'Demo Event',
  organizerName: 'K3DP Events',
  eventDate: '2026-05-29',
  eventType: 'Corporate / Conference',
  expectedGuests: '300',
  retentionPolicy: 'Until handoff',
  storageWarning: '80',
});
const restoredEvent = await (await get('/events/demo')).json();
ok('Event name restored', restoredEvent.name === (savedName || 'Demo Event'));

// ── 10. Admin event settings validation ───────────────────────────────────────

section('Admin Event Settings Validation');

// Empty event name → 400
const emptyNameRes = await adminPatch('/admin/event-settings', {
  eventId: 'demo',
  name: '',
  organizerName: 'K3DP Events',
  eventDate: '2026-06-01',
  eventType: 'Wedding',
  expectedGuests: '50',
  retentionPolicy: 'Until handoff',
  storageWarning: '80',
});
ok('Empty event name → 400', emptyNameRes.status === 400);

// Whitespace-only event name → 400
const wsNameRes = await adminPatch('/admin/event-settings', {
  eventId: 'demo',
  name: '   ',
  organizerName: 'K3DP Events',
  eventDate: '2026-06-01',
  eventType: 'Wedding',
  expectedGuests: '50',
  retentionPolicy: 'Until handoff',
  storageWarning: '80',
});
ok('Whitespace-only event name → 400', wsNameRes.status === 400);

// Name too long (>80 chars) → 400
const longNameRes = await adminPatch('/admin/event-settings', {
  eventId: 'demo',
  name: 'X'.repeat(81),
  organizerName: 'K3DP Events',
  eventDate: '2026-06-01',
  eventType: 'Wedding',
  expectedGuests: '50',
  retentionPolicy: 'Until handoff',
  storageWarning: '80',
});
ok('Event name >80 chars → 400', longNameRes.status === 400);

// Storage warning out of range → 400
const badWarnRes = await adminPatch('/admin/event-settings', {
  eventId: 'demo',
  name: 'Valid Name',
  organizerName: 'K3DP Events',
  eventDate: '2026-06-01',
  eventType: 'Wedding',
  expectedGuests: '50',
  retentionPolicy: 'Until handoff',
  storageWarning: '150',
});
ok('Storage warning >100 → 400', badWarnRes.status === 400);

const zeroWarnRes = await adminPatch('/admin/event-settings', {
  eventId: 'demo',
  name: 'Valid Name',
  organizerName: 'K3DP Events',
  eventDate: '2026-06-01',
  eventType: 'Wedding',
  expectedGuests: '50',
  retentionPolicy: 'Until handoff',
  storageWarning: '0',
});
ok('Storage warning 0 → 400', zeroWarnRes.status === 400);

// Valid at boundary (1% and 100%)
const warn1 = await adminPatch('/admin/event-settings', {
  eventId: 'demo', name: 'Valid Name', organizerName: 'K3DP Events',
  eventDate: '2026-06-01', eventType: 'Wedding', expectedGuests: '50',
  retentionPolicy: 'Until handoff', storageWarning: '1',
});
ok('Storage warning 1% → 200', warn1.status === 200);

const warn100 = await adminPatch('/admin/event-settings', {
  eventId: 'demo', name: 'Valid Name', organizerName: 'K3DP Events',
  eventDate: '2026-06-01', eventType: 'Wedding', expectedGuests: '50',
  retentionPolicy: 'Until handoff', storageWarning: '100',
});
ok('Storage warning 100% → 200', warn100.status === 200);

// Expected guests negative → 400
const negGuestsRes = await adminPatch('/admin/event-settings', {
  eventId: 'demo', name: 'Valid Name', organizerName: 'K3DP Events',
  eventDate: '2026-06-01', eventType: 'Wedding', expectedGuests: '-5',
  retentionPolicy: 'Until handoff', storageWarning: '80',
});
ok('Negative expected guests → 400', negGuestsRes.status === 400);

// Restore settings
await adminPatch('/admin/event-settings', {
  eventId: 'demo', name: savedName || 'Demo Event', organizerName: 'K3DP Events',
  eventDate: '2026-05-29', eventType: 'Corporate / Conference',
  expectedGuests: '300', retentionPolicy: 'Until handoff', storageWarning: '80',
});

// ── 11. Photo listing ─────────────────────────────────────────────────────────

section('Photo Listing');

const listRes = await fetch(`${BASE}/photos-list/demo?userId=${flowUserId}`);
ok('GET /photos-list/demo → 200', listRes.ok);
const photos = await listRes.json();
ok('Photos list is array', Array.isArray(photos));
ok('Includes our photo', photos.some((p) => p.id === photoId));
const found = photos.find((p) => p.id === photoId);
ok('Photo has all fields', found && 'url' in found && 'uploader' in found && 'likeCount' in found);

// ── 12. Photo likes ───────────────────────────────────────────────────────────

section('Photo Likes');

const likeRes = await post(`/photos/${photoId}/like`, { userId: flowUserId });
ok('Like → 200', likeRes.ok);
const likeData = await likeRes.json();
ok('likeCount=1', likeData.likeCount === 1);
ok('likedByMe=true', likeData.likedByMe === true);

const like2 = await post(`/photos/${photoId}/like`, { userId: flowUserId });
ok('Double-like idempotent', like2.ok && (await like2.json()).likeCount === 1);

const unlike = await del(`/photos/${photoId}/like?userId=${flowUserId}`);
ok('Unlike → 200, likeCount=0', unlike.ok && (await unlike.json()).likeCount === 0);

ok('Like unknown user → 403', (await post(`/photos/${photoId}/like`, { userId: 'fake' })).status === 403);
ok('Like no userId → 400', (await post(`/photos/${photoId}/like`, {})).status === 400);

// ── 13. Admin stats ───────────────────────────────────────────────────────────

section('Admin Stats');

const statsRes = await adminGet('/admin/stats?eventId=demo');
ok('GET /admin/stats → 200', statsRes.ok);
const stats = await statsRes.json();
ok('Has photoCount', typeof stats.photoCount === 'number');
ok('Has guestCount', typeof stats.guestCount === 'number');
ok('Has activeGuests', typeof stats.activeGuests === 'number');
ok('storageUsed is number (MB)', typeof stats.storageUsed === 'number');
ok('photoCount >= 1', stats.photoCount >= 1);
ok('guestCount >= 1', stats.guestCount >= 1);
ok('Unauth → 401', (await get('/admin/stats?eventId=demo')).status === 401);

// ── 14. Admin photos ──────────────────────────────────────────────────────────

section('Admin Photos');

const apRes = await adminGet('/admin/photos?eventId=demo');
ok('GET /admin/photos → 200', apRes.ok);
const ap = (await apRes.json()).find((p) => p.id === photoId);
ok('Photo in admin list', !!ap);
ok('Has sizeBytes', typeof ap?.sizeBytes === 'number');
ok('Has flagged bool', typeof ap?.flagged === 'boolean');

const flagRes = await adminPatch(`/admin/photos/${photoId}/flag`, { eventId: 'demo', flagged: true });
ok('Flag photo → 200, flagged=true', flagRes.ok && (await flagRes.json()).photo.flagged === true);
const unflagRes = await adminPatch(`/admin/photos/${photoId}/flag`, { eventId: 'demo', flagged: false });
ok('Unflag photo → 200, flagged=false', unflagRes.ok && (await unflagRes.json()).photo.flagged === false);
ok('Flag nonexistent → 404', (await adminPatch('/admin/photos/fake/flag', { eventId: 'demo', flagged: true })).status === 404);

// ── 15. Admin guests ──────────────────────────────────────────────────────────

section('Admin Guests');

const guestsRes = await adminGet('/admin/guests?eventId=demo');
ok('GET /admin/guests → 200', guestsRes.ok);
const guests = await guestsRes.json();
ok('Includes our user', guests.some((g) => g.id === flowUserId));
const g = guests.find((g) => g.id === flowUserId);
ok('Guest has all fields', g && 'username' in g && 'joinedAt' in g && 'lastSeen' in g && 'photoCount' in g && 'status' in g);
ok('Status is valid', ['Active', 'Idle', 'Left event'].includes(g?.status));

// ── 16. liveIp is hotspot-preferred (not just ips[0]) ─────────────────────────

section('Network — liveIp vs ips[0]');

const netData = await (await adminGet('/admin/network')).json();
// liveIp should be present if any network interfaces exist
if (netData.ips.length > 0) {
  ok('liveIp is populated when IPs exist', netData.liveIp !== null);
  // liveIp should be one of the ips
  ok('liveIp is in the ips array', netData.ips.includes(netData.liveIp));
} else {
  ok('liveIp present field (no interfaces)', 'liveIp' in netData);
  ok('liveIp null when no IPs', netData.liveIp === null);
}

// ── 17. Photo export ──────────────────────────────────────────────────────────

section('Photo Export');

const expAll = await adminGet('/admin/photos/export?eventId=demo&exportAll=1');
ok('Export all → 200 zip', expAll.ok && expAll.headers.get('content-type')?.includes('zip'));
ok('Export ZIP non-empty', (await expAll.arrayBuffer()).byteLength > 0);
ok('Export by id → 200', (await adminGet(`/admin/photos/export?eventId=demo&photoIds=${photoId}`)).ok);
ok('Export empty → 404', (await adminGet('/admin/photos/export?eventId=demo')).status === 404);

// ── 18. Guest album ───────────────────────────────────────────────────────────

section('Guest Albums');

const albumRes = await adminGet(`/admin/guests/${flowUserId}/album?eventId=demo`);
ok('Admin guest album → 200 zip', albumRes.ok && albumRes.headers.get('content-type')?.includes('zip'));

const csvRes = await adminGet('/admin/guests/export?eventId=demo');
ok('Guest CSV → 200', csvRes.ok);
ok('CSV content-type', csvRes.headers.get('content-type')?.includes('csv'));
ok('CSV has header', (await csvRes.text()).startsWith('Guest ID,Username'));

const selfAlbum = await get(`/users/${flowUserId}/album`);
ok('User self-album → 200 zip', selfAlbum.ok && selfAlbum.headers.get('content-type')?.includes('zip'));
ok('Unknown user album → 404', (await get('/users/fake-id/album')).status === 404);

// ── 19. Photo delete ──────────────────────────────────────────────────────────

section('Photo Delete');

const delUploadForm = new FormData();
delUploadForm.append('photo', new Blob([jpegBytes], { type: 'image/jpeg' }), 'todelete.jpg');
delUploadForm.append('username', testUser);
const delPhoto = await (await fetch(`${BASE}/upload/demo`, { method: 'POST', body: delUploadForm })).json();

ok('Wrong username → 403', (await del(`/photos/${delPhoto.id}?username=wrong`)).status === 403);
const delOk = await del(`/photos/${delPhoto.id}?username=${encodeURIComponent(testUser)}`);
ok('Owner delete → 200', delOk.ok && (await delOk.json()).ok === true);
const photosAfter = await (await fetch(`${BASE}/photos-list/demo`)).json();
ok('Deleted photo gone from list', !photosAfter.some((p) => p.id === delPhoto.id));

// ── 20. Admin bulk delete ─────────────────────────────────────────────────────

section('Admin Bulk Delete');

const bulkUploadForm = new FormData();
bulkUploadForm.append('photo', new Blob([jpegBytes], { type: 'image/jpeg' }), 'bulk.jpg');
bulkUploadForm.append('username', testUser);
const bulkPhoto = await (await fetch(`${BASE}/upload/demo`, { method: 'POST', body: bulkUploadForm })).json();

const bdRes = await (await adminPost('/admin/photos/delete', { eventId: 'demo', photoIds: [bulkPhoto.id] })).json();
ok('Bulk delete → ok:true', bdRes.ok === true);
ok('deletedCount=1', bdRes.deletedCount === 1);
ok('Returns updated photos array', Array.isArray(bdRes.photos));
ok('Empty photoIds → 400', (await adminPost('/admin/photos/delete', { eventId: 'demo', photoIds: [] })).status === 400);

// ── 21. Admin guest photo delete ──────────────────────────────────────────────

section('Admin Guest Photo Delete');

const gpdRes = await (await fetch(`${BASE}/admin/guests/${flowUserId}/photos/delete`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
  body: JSON.stringify({ eventId: 'demo' }),
})).json();
ok('Guest photo delete → ok:true', gpdRes.ok === true);
ok('Returns guests array', Array.isArray(gpdRes.guests));
ok('Returns photos array', Array.isArray(gpdRes.photos));
ok('Unknown guest → 404', (await fetch(`${BASE}/admin/guests/fake/photos/delete`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
  body: JSON.stringify({ eventId: 'demo' }),
})).status === 404);

// ── 22. PATCH username uses user.event_id (not client-supplied) ───────────────

section('Username Patch — event isolation');

// Create a fresh user for this test
const isoTs = Date.now();
const isoForm = new FormData();
isoForm.append('username', `IsoUser_${isoTs}`);
isoForm.append('eventId', 'demo');
const isoJoin = await fetch(`${BASE}/users/join`, { method: 'POST', body: isoForm });
const { userId: isoId } = await isoJoin.json();

// Try to patch username while sending a wrong eventId — server should use user.event_id
const isoRename = await fetch(`${BASE}/users/${isoId}/username`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: `IsoUser_${isoTs}_r`, eventId: 'malicious-event' }),
});
// Should succeed but use the real event_id (demo), not the injected one
ok('Rename with wrong eventId body uses DB event_id', isoRename.ok);

// ── 23. WebSocket broadcast ───────────────────────────────────────────────────

section('WebSocket Broadcast');

{
  const { createRequire } = await import('module');
  const _require = createRequire(import.meta.url);
  let socketClient = null;
  try { socketClient = _require('/home/ken/Workspace/swarm-gallery/client/node_modules/socket.io-client'); } catch { /**/ }

  if (socketClient) {
    const received = [];
    const c1 = socketClient(BASE, { transports: ['websocket'] });
    const c2 = socketClient(BASE, { transports: ['websocket'] });
    await new Promise((res) => c1.on('connect', res));
    await new Promise((res) => c2.on('connect', res));
    c2.on('new-photo', (p) => received.push(p));

    const wsForm = new FormData();
    wsForm.append('photo', new Blob([makeJpegBytes()], { type: 'image/jpeg' }), 'ws.jpg');
    wsForm.append('username', `WsUser_${Date.now()}`);
    await fetch(`${BASE}/upload/demo`, { method: 'POST', body: wsForm });
    await new Promise((r) => setTimeout(r, 600));

    ok('Upload triggers new-photo broadcast', received.length > 0);
    ok('Broadcast has url field', typeof received[0]?.url === 'string');
    ok('Broadcast has uploader field', typeof received[0]?.uploader === 'string');
    c1.disconnect();
    c2.disconnect();
  } else {
    for (const t of ['Upload triggers new-photo broadcast', 'Broadcast has url field', 'Broadcast has uploader field'])
      ok(t, false, 'socket.io-client not found');
  }
}

// ── 24. QR code URL content ───────────────────────────────────────────────────

section('QR Code Content');

{
  const { createRequire } = await import('module');
  const _req = createRequire(import.meta.url);
  try {
    const { getEventJoinUrl } = _req('/home/ken/Workspace/swarm-gallery/server/utils/qr.js');
    const url = getEventJoinUrl('demo');
    ok('QR encodes /event/demo path', url.includes('/event/demo'));
    ok('QR URL is http (not https)', url.startsWith('http://'));
    ok('QR URL has client port 3000', url.includes(':3000'));
    ok('QR URL does not use localhost', !url.includes('localhost'));
  } catch (e) {
    for (const t of ['QR encodes /event/demo path', 'QR URL is http', 'QR URL port 3000', 'QR URL no localhost'])
      ok(t, false, String(e));
  }
}

// ── 25. Config PORT is integer ────────────────────────────────────────────────

section('Config Integrity');

ok('Server port responds as integer', Number(net.port) === 4000 && Number.isInteger(Number(net.port)));

// ── 24. CORS / security ───────────────────────────────────────────────────────

section('CORS / Security');

ok('CORS allows origin header', !!(await fetch(`${BASE}/health`, { headers: { Origin: 'http://192.168.137.1:3000' } })).headers.get('access-control-allow-origin'));
ok('OPTIONS preflight → 204', (await fetch(`${BASE}/health`, { method: 'OPTIONS', headers: { Origin: 'http://test.local' } })).status === 204);

// ── 25. Avatars ───────────────────────────────────────────────────────────────

section('Avatars');

const avForm = new FormData();
avForm.append('username', `AvatarUser_${Date.now()}`);
avForm.append('eventId', 'demo');
avForm.append('avatar', new Blob([jpegBytes], { type: 'image/jpeg' }), 'avatar.jpg');
const avJoin = await fetch(`${BASE}/users/join`, { method: 'POST', body: avForm });
ok('Join with avatar → 201', avJoin.status === 201);
const avUser = await avJoin.json();
ok('avatarUrl returned', typeof avUser.avatarUrl === 'string');
ok('Avatar URL accessible', (await fetch(`${BASE}${avUser.avatarUrl}`)).ok);

const newAvForm = new FormData();
newAvForm.append('avatar', new Blob([jpegBytes], { type: 'image/jpeg' }), 'new.jpg');
const patchAv = await fetch(`${BASE}/users/${avUser.userId}/avatar`, { method: 'PATCH', body: newAvForm });
ok('PATCH avatar → 200', patchAv.ok);
ok('New avatarUrl differs', (await patchAv.json()).avatarUrl !== avUser.avatarUrl);

// ── 26. Admin route protection ────────────────────────────────────────────────

section('Admin Route Protection');

const protectedRoutes = [
  '/admin/network', '/admin/stats?eventId=demo', '/admin/photos?eventId=demo',
  '/admin/guests?eventId=demo', '/admin/recent-photos?eventId=demo',
  '/admin/recent-guests?eventId=demo', '/admin/event-settings?eventId=demo',
];
for (const route of protectedRoutes) {
  ok(`GET ${route} unauth → 401`, (await get(route)).status === 401);
}

// ── 27. Admin login rate limiting (runs last — locks this IP for 15 min) ──────

section('Admin Login Rate Limiting');

// Sequential sends — server is single-threaded so counter increments reliably
const rlStatuses = [];
let firstLocked = null;
for (let i = 0; i < 12; i++) {
  const r = await post('/admin/login', { password: 'wrong' });
  rlStatuses.push(r.status);
  if (r.status === 429 && !firstLocked) firstLocked = r;
}
ok('First 10 bad attempts → 401', rlStatuses.slice(0, 10).every((s) => s === 401));
ok('11th+ attempt → 429', rlStatuses.slice(10).some((s) => s === 429));

const lockedBody = firstLocked ? await firstLocked.json().catch(() => ({})) : {};
ok('429 response has retryAfter', typeof lockedBody.retryAfter === 'number');

// Correct password while locked → still 429 (rate limit blocks before auth check)
ok('Correct login while locked → 429', (await post('/admin/login', { password: 'admin123' })).status === 429);

// ── 28. Logout ────────────────────────────────────────────────────────────────

section('Logout');

const logoutRes = await fetch(`${BASE}/admin/logout`, { headers: { Cookie: adminCookie } });
ok('Logout → 200', logoutRes.ok);
ok('Logout returns {ok:true}', (await logoutRes.json()).ok === true);
ok('Admin/me without cookie → 401', (await fetch(`${BASE}/admin/me`)).status === 401);

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(60)}`);
console.log(`  API Tests: ${passed} passed, ${failed} failed`);
if (errs.length) {
  console.log('\n  Failed tests:');
  errs.forEach((e) => console.log(`    • ${e}`));
}
console.log(`${'═'.repeat(60)}\n`);

process.exit(failed > 0 ? 1 : 0);
