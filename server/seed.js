#!/usr/bin/env node
/**
 * seed.js — populate the demo event with fake guests + photos for dev/testing
 *
 * Usage:
 *   node seed.js           — seed (skips if already seeded)
 *   node seed.js --reset   — clear seed data then re-seed
 *   node seed.js --clear   — clear seed data only
 */

'use strict';

const { execSync }  = require('child_process');
const fs            = require('fs');
const path          = require('path');
const { randomUUID } = require('crypto');

const db          = require('./db');
const config      = require('./config');
const ffmpegPath  = require('ffmpeg-static');

const RESET = process.argv.includes('--reset');
const CLEAR = process.argv.includes('--clear');
const EVENT_ID = config.DEMO_EVENT_ID;

// ── Helpers ────────────────────────────────────────────────────────────────

function uid() {
  return randomUUID().replace(/-/g, '').slice(0, 21);
}

/** Generate a solid-color JPEG using ffmpeg (no extra npm packages needed). */
function generateJpeg(outputPath, hexColor, width = 800, height = 600) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  execSync(
    `"${ffmpegPath}" -y -f lavfi \
      -i "color=c=${hexColor}:size=${width}x${height}:rate=1" \
      -frames:v 1 -q:v 4 "${outputPath}"`,
    { stdio: 'pipe' },
  );
}

// ── Seed data ──────────────────────────────────────────────────────────────

const USERS = [
  { name: 'Alice Kim',     avatarColor: '#7c3aed', deviceId: `seed-device-alice-${EVENT_ID}` },
  { name: 'Bob Nguyen',    avatarColor: '#ec4899', deviceId: `seed-device-bob-${EVENT_ID}` },
  { name: 'Carlos Ruiz',   avatarColor: '#0ea5e9', deviceId: `seed-device-carlos-${EVENT_ID}` },
  { name: 'Diana Patel',   avatarColor: '#22c55e', deviceId: `seed-device-diana-${EVENT_ID}` },
  { name: 'Eve Johansson', avatarColor: '#f59e0b', deviceId: `seed-device-eve-${EVENT_ID}` },
];

// Each entry: [uploaderIndex, color, width, height, secondsAgo]
const PHOTO_SPECS = [
  [0, '#7c3aed', 1080, 720,  7200],
  [1, '#ec4899', 800,  600,  6800],
  [2, '#0ea5e9', 1200, 800,  6200],
  [0, '#9333ea', 900,  600,  5900],
  [3, '#22c55e', 1080, 720,  5400],
  [1, '#db2777', 750,  500,  5100],
  [4, '#f59e0b', 1000, 667,  4800],
  [2, '#0284c7', 800,  800,  4300],
  [0, '#6d28d9', 1200, 675,  3900],
  [3, '#16a34a', 900,  600,  3400],
  [4, '#d97706', 1080, 720,  3000],
  [1, '#be185d', 800,  533,  2600],
  [2, '#0369a1', 1000, 750,  2100],
  [0, '#5b21b6', 900,  600,  1800],
  [3, '#15803d', 1080, 720,  1200],
  [4, '#b45309', 800,  600,   600],
];

// ── Clear ──────────────────────────────────────────────────────────────────

function clearSeedData() {
  // Find seeded users (device_id starts with 'seed-device-')
  const seededUsers = db.prepare(
    `SELECT id, avatar_filename FROM users WHERE device_id LIKE 'seed-device-%' AND event_id = ?`
  ).all(EVENT_ID);

  if (!seededUsers.length) {
    console.log('No seed data found.');
    return;
  }

  const userIds = seededUsers.map((u) => u.id);
  const placeholders = userIds.map(() => '?').join(',');

  // Delete likes on seeded photos
  const seededPhotos = db.prepare(
    `SELECT id, filename, thumb_filename FROM photos WHERE user_id IN (${placeholders})`
  ).all(...userIds);

  const photoIds = seededPhotos.map((p) => p.id);
  if (photoIds.length) {
    const pp = photoIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM photo_likes WHERE photo_id IN (${pp})`).run(...photoIds);
    db.prepare(`DELETE FROM photos WHERE id IN (${pp})`).run(...photoIds);

    // Remove image files
    for (const p of seededPhotos) {
      const dir = path.join(config.STORAGE.EVENTS, EVENT_ID);
      [p.filename, p.thumb_filename].filter(Boolean).forEach((f) => {
        try { fs.rmSync(path.join(dir, f)); } catch { /* already gone */ }
      });
    }
  }

  // Delete users + avatars
  for (const u of seededUsers) {
    if (u.avatar_filename) {
      try {
        fs.rmSync(path.join(config.STORAGE.AVATARS, EVENT_ID, u.avatar_filename));
      } catch { /* already gone */ }
    }
  }
  db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).run(...userIds);

  console.log(`Cleared ${seededUsers.length} users and ${seededPhotos.length} photos.`);
}

// ── Seed ───────────────────────────────────────────────────────────────────

function seed() {
  // Check if already seeded
  const existing = db.prepare(
    `SELECT COUNT(*) as n FROM users WHERE device_id LIKE 'seed-device-%' AND event_id = ?`
  ).get(EVENT_ID).n;

  if (existing > 0) {
    console.log(`Already seeded (${existing} seed users found). Use --reset to re-seed.`);
    return;
  }

  console.log('Seeding demo event…');

  // Ensure avatar dir exists
  const avatarDir = path.join(config.STORAGE.AVATARS, EVENT_ID);
  const photoDir  = path.join(config.STORAGE.EVENTS,  EVENT_ID);
  fs.mkdirSync(avatarDir, { recursive: true });
  fs.mkdirSync(photoDir,  { recursive: true });

  // ── Insert users ─────────────────────────────────────────────────────────
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, event_id, username, device_id, avatar_filename, joined_at, last_seen)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const userRows = USERS.map((u, i) => {
    const userId   = uid();
    const filename = `seed-avatar-${userId}.jpg`;
    const joinedAt = now - (8000 - i * 400) * 1000; // spread joins over ~2 hrs

    console.log(`  Generating avatar for ${u.name}…`);
    generateJpeg(path.join(avatarDir, filename), u.avatarColor, 400, 400);

    insertUser.run(userId, EVENT_ID, u.name, u.deviceId, filename, joinedAt, joinedAt);
    return { ...u, userId, joinedAt };
  });

  console.log(`  Created ${userRows.length} users.`);

  // ── Insert photos ─────────────────────────────────────────────────────────
  const insertPhoto = db.prepare(`
    INSERT INTO photos
      (id, event_id, filename, original_name, mimetype, size_bytes, uploaded_at, uploader_ip, uploader_name, user_id, thumb_filename)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const photoRows = [];
  for (const [uploaderIdx, color, w, h, secsAgo] of PHOTO_SPECS) {
    const uploader   = userRows[uploaderIdx];
    const photoId    = uid();
    const filename   = `seed-photo-${photoId}.jpg`;
    const uploadedAt = now - secsAgo * 1000;

    process.stdout.write(`  Generating photo ${photoRows.length + 1}/${PHOTO_SPECS.length}…\r`);
    generateJpeg(path.join(photoDir, filename), color, w, h);

    const stat = fs.statSync(path.join(photoDir, filename));
    insertPhoto.run(
      photoId, EVENT_ID, filename, `seed-photo-${photoRows.length + 1}.jpg`,
      'image/jpeg', stat.size,
      uploadedAt, '127.0.0.1',
      uploader.name, uploader.userId, null,
    );
    photoRows.push({ photoId, uploadedAt, uploaderUserId: uploader.userId });
  }

  console.log(`\n  Created ${photoRows.length} photos.`);

  // ── Add some likes ────────────────────────────────────────────────────────
  const insertLike = db.prepare(`
    INSERT OR IGNORE INTO photo_likes (photo_id, user_id, liked_at) VALUES (?, ?, ?)
  `);

  // Every user likes a random subset of photos from OTHER uploaders
  let likeCount = 0;
  for (const user of userRows) {
    const eligible = photoRows.filter((p) => p.uploaderUserId !== user.userId);
    // Like roughly half
    for (const photo of eligible) {
      if (Math.random() < 0.45) {
        insertLike.run(photo.photoId, user.userId, photo.uploadedAt + Math.floor(Math.random() * 600_000));
        likeCount++;
      }
    }
  }

  console.log(`  Added ${likeCount} likes.`);
  console.log('Done. Restart the server to see seeded data in the gallery.');
}

// ── Main ───────────────────────────────────────────────────────────────────

if (RESET || CLEAR) clearSeedData();
if (!CLEAR)         seed();
