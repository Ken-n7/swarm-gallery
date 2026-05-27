const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');
const config = require('../config');
const db = require('../db');

const router = express.Router();

const avatarStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const eventId = req.body.eventId || config.DEMO_EVENT_ID;
    const dir = path.join(config.STORAGE.AVATARS, eventId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${nanoid()}${ext}`);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, config.ALLOWED_MIME_TYPES.includes(file.mimetype));
  },
});

const getUserById       = db.prepare(`SELECT * FROM users WHERE id = ?`);
const getUserByDevice   = db.prepare(`SELECT * FROM users WHERE device_id = ? AND event_id = ?`);
const getUserByUsername = db.prepare(`SELECT id FROM users WHERE event_id = ? AND username = ?`);
const updateLastSeen    = db.prepare(`UPDATE users SET last_seen = ? WHERE id = ?`);
const attachDevice      = db.prepare(`UPDATE users SET device_id = ?, last_seen = ? WHERE id = ?`);

const insertUser = db.prepare(`
  INSERT INTO users (id, event_id, username, device_id, avatar_filename, joined_at, last_seen)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

function userResponse(user, eventId) {
  return {
    userId: user.id,
    username: user.username,
    avatarUrl: user.avatar_filename
      ? `/avatars/${eventId}/${user.avatar_filename}`
      : null,
  };
}

// GET /users/device?deviceId=X&eventId=Y — check if device is already registered
router.get('/device', (req, res) => {
  const { deviceId, eventId = config.DEMO_EVENT_ID } = req.query;
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

  const user = getUserByDevice.get(deviceId, eventId);
  if (!user) return res.status(404).json({ error: 'Not found' });

  updateLastSeen.run(Date.now(), user.id);
  res.json(userResponse(user, eventId));
});

// POST /users/join — register or rejoin
router.post('/join', uploadAvatar.single('avatar'), (req, res) => {
  const { userId, deviceId, username, eventId = config.DEMO_EVENT_ID } = req.body;

  if (!username?.trim()) {
    return res.status(400).json({ error: 'Username required' });
  }

  // 1. Device rejoin — device is the ground truth
  if (deviceId) {
    const byDevice = getUserByDevice.get(deviceId, eventId);
    if (byDevice) {
      updateLastSeen.run(Date.now(), byDevice.id);
      return res.json(userResponse(byDevice, eventId));
    }
  }

  // 2. UserId rejoin — fallback for devices that joined before device_id existed
  if (userId) {
    const byId = getUserById.get(userId);
    if (byId) {
      if (deviceId && !byId.device_id) {
        attachDevice.run(deviceId, Date.now(), byId.id);
      } else {
        updateLastSeen.run(Date.now(), byId.id);
      }
      return res.json(userResponse(byId, eventId));
    }
  }

  // 3. New user — enforce unique nickname
  const trimmed = username.trim();
  const taken = getUserByUsername.get(eventId, trimmed);
  if (taken) {
    return res.status(409).json({ error: 'That nickname is already taken' });
  }

  const id = nanoid();
  const avatarFilename = req.file ? req.file.filename : null;
  insertUser.run(id, eventId, trimmed, deviceId || null, avatarFilename, Date.now(), Date.now());

  res.status(201).json({
    userId: id,
    username: trimmed,
    avatarUrl: avatarFilename ? `/avatars/${eventId}/${avatarFilename}` : null,
  });
});

// PATCH /users/:id/avatar — replace profile photo
router.patch('/:id/avatar', uploadAvatar.single('avatar'), (req, res) => {
  const user = getUserById.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!req.file)  return res.status(400).json({ error: 'No file provided' });

  const eventId = user.event_id;

  // Delete old avatar file (non-blocking)
  if (user.avatar_filename) {
    const oldPath = path.join(config.STORAGE.AVATARS, eventId, user.avatar_filename);
    fs.rm(oldPath, { force: true }, () => {});
  }

  db.prepare('UPDATE users SET avatar_filename = ? WHERE id = ?').run(req.file.filename, user.id);
  res.json(userResponse({ ...user, avatar_filename: req.file.filename }, eventId));
});

// PATCH /users/:id/username — change nickname
router.patch('/:id/username', (req, res) => {
  const { username, eventId = config.DEMO_EVENT_ID } = req.body;
  if (!username?.trim()) return res.status(400).json({ error: 'Username required' });

  const user = getUserById.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const trimmed = username.trim();
  if (trimmed === user.username) return res.json({ username: trimmed });

  const taken = getUserByUsername.get(eventId, trimmed);
  if (taken) return res.status(409).json({ error: 'That nickname is already taken' });

  db.prepare(`UPDATE users SET username = ? WHERE id = ?`).run(trimmed, user.id);
  // Update uploader_name on all their photos (safe: uniqueness is now enforced)
  db.prepare(`UPDATE photos SET uploader_name = ? WHERE uploader_name = ? AND event_id = ?`)
    .run(trimmed, user.username, eventId);

  res.json({ username: trimmed });
});

module.exports = router;
