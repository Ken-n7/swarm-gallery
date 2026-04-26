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
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB for avatars
  fileFilter: (_req, file, cb) => {
    cb(null, config.ALLOWED_MIME_TYPES.includes(file.mimetype));
  },
});

const insertUser = db.prepare(`
  INSERT INTO users (id, event_id, username, avatar_filename, joined_at, last_seen)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const getUserById = db.prepare(`SELECT * FROM users WHERE id = ?`);

const updateLastSeen = db.prepare(`
  UPDATE users SET last_seen = ? WHERE id = ?
`);

// POST /users/join — register or rejoin
router.post('/join', uploadAvatar.single('avatar'), (req, res) => {
  const { userId, username, eventId = config.DEMO_EVENT_ID } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username required' });
  }

  // Rejoin: existing user
  if (userId) {
    const existing = getUserById.get(userId);
    if (existing) {
      updateLastSeen.run(Date.now(), userId);
      return res.json({
        userId: existing.id,
        username: existing.username,
        avatarUrl: existing.avatar_filename
          ? `/avatars/${eventId}/${existing.avatar_filename}`
          : null,
      });
    }
  }

  // New user
  const id = nanoid();
  const avatarFilename = req.file ? req.file.filename : null;

  insertUser.run(id, eventId, username.trim(), avatarFilename, Date.now(), Date.now());

  res.status(201).json({
    userId: id,
    username: username.trim(),
    avatarUrl: avatarFilename ? `/avatars/${eventId}/${avatarFilename}` : null,
  });
});

module.exports = router;
