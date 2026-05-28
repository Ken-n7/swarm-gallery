#!/usr/bin/env node
/**
 * seed.js — populate the demo event with fake guests + photos for dev/testing
 *
 * Usage:
 *   node seed.js           — seed (skips if already seeded)
 *   node seed.js --reset   — clear seed data then re-seed
 *   node seed.js --clear   — clear seed data only
 *   node seed.js --offline — skip downloads, use generated color images
 */

'use strict';

const https          = require('https');
const http           = require('http');
const { execSync }   = require('child_process');
const fs             = require('fs');
const path           = require('path');
const { randomUUID } = require('crypto');

const db         = require('./db');
const config     = require('./config');
const ffmpegPath = require('ffmpeg-static');

const RESET   = process.argv.includes('--reset');
const CLEAR   = process.argv.includes('--clear');
const OFFLINE = process.argv.includes('--offline');
const EVENT_ID = config.DEMO_EVENT_ID;

// ── Helpers ────────────────────────────────────────────────────────────────

function uid() {
  return randomUUID().replace(/-/g, '').slice(0, 21);
}

/**
 * Download a URL to a file.
 * Follows up to 5 redirects. Rejects on non-2xx or timeout.
 */
function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(download(res.headers.location, dest, redirects + 1));
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on('finish', resolve);
      out.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

/** Fallback: solid-color JPEG via ffmpeg (no internet needed). */
function generateJpeg(dest, hexColor, width = 800, height = 600) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  execSync(
    `"${ffmpegPath}" -y -f lavfi \
      -i "color=c=${hexColor}:size=${width}x${height}:rate=1" \
      -frames:v 1 -q:v 4 "${dest}"`,
    { stdio: 'pipe' },
  );
}

/**
 * Try downloading `url` to `dest`.
 * If offline mode or download fails, fall back to a solid-color JPEG.
 */
async function fetchImage(url, dest, fallbackColor, fallbackW = 800, fallbackH = 600) {
  if (!OFFLINE) {
    try {
      await download(url, dest);
      return true; // downloaded
    } catch (e) {
      process.stdout.write(` (download failed: ${e.message}, using fallback)`);
    }
  }
  generateJpeg(dest, fallbackColor, fallbackW, fallbackH);
  return false; // generated
}

// ── Seed data ──────────────────────────────────────────────────────────────

const USERS = [
  { name: 'Alice Kim',     fallbackColor: '#7c3aed', pravatar: 1  },
  { name: 'Bob Nguyen',    fallbackColor: '#ec4899', pravatar: 3  },
  { name: 'Carlos Ruiz',   fallbackColor: '#0ea5e9', pravatar: 12 },
  { name: 'Diana Patel',   fallbackColor: '#22c55e', pravatar: 25 },
  { name: 'Eve Johansson', fallbackColor: '#f59e0b', pravatar: 47 },
];

// [uploaderIndex, picsumSeed, fallbackColor, width, height, secondsAgo]
const PHOTO_SPECS = [
  [0, 'swarm-1',  '#7c3aed', 1080, 720,  7200],
  [1, 'swarm-2',  '#ec4899',  800, 600,  6800],
  [2, 'swarm-3',  '#0ea5e9', 1200, 800,  6200],
  [0, 'swarm-4',  '#9333ea',  900, 600,  5900],
  [3, 'swarm-5',  '#22c55e', 1080, 720,  5400],
  [1, 'swarm-6',  '#db2777',  750, 500,  5100],
  [4, 'swarm-7',  '#f59e0b', 1000, 667,  4800],
  [2, 'swarm-8',  '#0284c7',  800, 800,  4300],
  [0, 'swarm-9',  '#6d28d9', 1200, 675,  3900],
  [3, 'swarm-10', '#16a34a',  900, 600,  3400],
  [4, 'swarm-11', '#d97706', 1080, 720,  3000],
  [1, 'swarm-12', '#be185d',  800, 533,  2600],
  [2, 'swarm-13', '#0369a1', 1000, 750,  2100],
  [0, 'swarm-14', '#5b21b6',  900, 600,  1800],
  [3, 'swarm-15', '#15803d', 1080, 720,  1200],
  [4, 'swarm-16', '#b45309',  800, 600,   600],
];

// ── Clear ──────────────────────────────────────────────────────────────────

function clearSeedData() {
  const seededUsers = db.prepare(
    `SELECT id, avatar_filename FROM users WHERE device_id LIKE 'seed-device-%' AND event_id = ?`
  ).all(EVENT_ID);

  if (!seededUsers.length) {
    console.log('No seed data found.');
    return;
  }

  const userIds = seededUsers.map((u) => u.id);
  const ph = userIds.map(() => '?').join(',');

  const seededPhotos = db.prepare(
    `SELECT id, filename, thumb_filename FROM photos WHERE user_id IN (${ph})`
  ).all(...userIds);

  const photoIds = seededPhotos.map((p) => p.id);
  if (photoIds.length) {
    const pp = photoIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM photo_likes WHERE photo_id IN (${pp})`).run(...photoIds);
    db.prepare(`DELETE FROM photos WHERE id IN (${pp})`).run(...photoIds);
    const photoDir = path.join(config.STORAGE.EVENTS, EVENT_ID);
    for (const p of seededPhotos) {
      [p.filename, p.thumb_filename].filter(Boolean).forEach((f) => {
        try { fs.rmSync(path.join(photoDir, f)); } catch { /* gone */ }
      });
    }
  }

  const avatarDir = path.join(config.STORAGE.AVATARS, EVENT_ID);
  for (const u of seededUsers) {
    if (u.avatar_filename) {
      try { fs.rmSync(path.join(avatarDir, u.avatar_filename)); } catch { /* gone */ }
    }
  }
  db.prepare(`DELETE FROM users WHERE id IN (${ph})`).run(...userIds);

  console.log(`Cleared ${seededUsers.length} users and ${seededPhotos.length} photos.`);
}

// ── Seed ───────────────────────────────────────────────────────────────────

async function seed() {
  const existing = db.prepare(
    `SELECT COUNT(*) as n FROM users WHERE device_id LIKE 'seed-device-%' AND event_id = ?`
  ).get(EVENT_ID).n;

  if (existing > 0) {
    console.log(`Already seeded (${existing} seed users found). Use --reset to re-seed.`);
    return;
  }

  const mode = OFFLINE ? 'offline (color fills)' : 'online (picsum.photos + pravatar.cc)';
  console.log(`Seeding demo event — ${mode}…`);

  const avatarDir = path.join(config.STORAGE.AVATARS, EVENT_ID);
  const photoDir  = path.join(config.STORAGE.EVENTS,  EVENT_ID);
  fs.mkdirSync(avatarDir, { recursive: true });
  fs.mkdirSync(photoDir,  { recursive: true });

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, event_id, username, device_id, avatar_filename, joined_at, last_seen)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();

  // ── Users + avatars ───────────────────────────────────────────────────────
  const userRows = [];
  for (let i = 0; i < USERS.length; i++) {
    const u        = USERS[i];
    const userId   = uid();
    const filename = `seed-avatar-${userId}.jpg`;
    const dest     = path.join(avatarDir, filename);
    const joinedAt = now - (8000 - i * 400) * 1000;
    const deviceId = `seed-device-${u.name.toLowerCase().replace(/\s+/g, '-')}-${EVENT_ID}`;

    process.stdout.write(`  Avatar ${i + 1}/${USERS.length}: ${u.name}… `);
    // pravatar.cc serves real face photos — great for avatar placeholders
    await fetchImage(
      `https://i.pravatar.cc/400?img=${u.pravatar}`,
      dest,
      u.fallbackColor, 400, 400,
    );
    console.log('✓');

    insertUser.run(userId, EVENT_ID, u.name, deviceId, filename, joinedAt, joinedAt);
    userRows.push({ ...u, userId, joinedAt });
  }

  console.log(`  Created ${userRows.length} users.`);

  // ── Photos ────────────────────────────────────────────────────────────────
  const insertPhoto = db.prepare(`
    INSERT INTO photos
      (id, event_id, filename, original_name, mimetype, size_bytes, uploaded_at,
       uploader_ip, uploader_name, user_id, thumb_filename)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const photoRows = [];
  for (let i = 0; i < PHOTO_SPECS.length; i++) {
    const [uploaderIdx, picsumSeed, fallbackColor, w, h, secsAgo] = PHOTO_SPECS[i];
    const uploader   = userRows[uploaderIdx];
    const photoId    = uid();
    const filename   = `seed-photo-${photoId}.jpg`;
    const dest       = path.join(photoDir, filename);
    const uploadedAt = now - secsAgo * 1000;

    process.stdout.write(`  Photo ${i + 1}/${PHOTO_SPECS.length}: ${uploader.name}… `);
    // picsum.photos/seed/{seed}/{w}/{h} returns a consistent real photo each run
    await fetchImage(
      `https://picsum.photos/seed/${picsumSeed}/${w}/${h}`,
      dest,
      fallbackColor, w, h,
    );
    console.log('✓');

    const stat = fs.statSync(dest);
    insertPhoto.run(
      photoId, EVENT_ID, filename, `seed-photo-${i + 1}.jpg`,
      'image/jpeg', stat.size,
      uploadedAt, '127.0.0.1',
      uploader.name, uploader.userId, null,
    );
    photoRows.push({ photoId, uploadedAt, uploaderUserId: uploader.userId });
  }

  console.log(`  Created ${photoRows.length} photos.`);

  // ── Likes ─────────────────────────────────────────────────────────────────
  const insertLike = db.prepare(
    `INSERT OR IGNORE INTO photo_likes (photo_id, user_id, liked_at) VALUES (?, ?, ?)`
  );

  let likeCount = 0;
  for (const user of userRows) {
    const eligible = photoRows.filter((p) => p.uploaderUserId !== user.userId);
    for (const photo of eligible) {
      if (Math.random() < 0.45) {
        insertLike.run(
          photo.photoId, user.userId,
          photo.uploadedAt + Math.floor(Math.random() * 600_000),
        );
        likeCount++;
      }
    }
  }

  console.log(`  Added ${likeCount} likes.`);
  console.log('\nDone ✓  Refresh the app to see seeded data.');
}

// ── Main ───────────────────────────────────────────────────────────────────

(async () => {
  if (RESET || CLEAR) clearSeedData();
  if (!CLEAR) await seed();
})().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
