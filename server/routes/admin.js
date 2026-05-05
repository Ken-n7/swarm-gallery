const express = require('express');
const config = require('../config');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  signed: true,
  sameSite: 'lax',
  maxAge: 8 * 60 * 60 * 1000, // 8 hours
};

router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== config.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  res.cookie('admin', 'true', COOKIE_OPTS);
  res.json({ ok: true });
});

router.get('/logout', (_req, res) => {
  res.clearCookie('admin');
  res.json({ ok: true });
});

router.get('/me', requireAdmin, (_req, res) => {
  res.json({ admin: true });
});

// Admin stats
router.get('/stats', requireAdmin, (req, res) => {
  const eventId = req.query.eventId || config.DEMO_EVENT_ID;

  const photoCount = db.prepare('SELECT COUNT(*) as count FROM photos WHERE event_id = ?').get(eventId).count;
  const guestCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE event_id = ?').get(eventId).count;
  const activeGuests = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE event_id = ? AND last_seen > ?').get(eventId, Date.now() - 5 * 60 * 1000).count; // Active in last 5 min

  // Calculate storage used
  const fs = require('fs');
  const path = require('path');
  let storageUsed = 0;
  try {
    const eventDir = path.join(config.STORAGE.EVENTS, eventId);
    if (fs.existsSync(eventDir)) {
      const files = fs.readdirSync(eventDir);
      storageUsed = files.reduce((total, file) => {
        const filePath = path.join(eventDir, file);
        return total + (fs.statSync(filePath).size || 0);
      }, 0);
    }
  } catch (err) {
    console.error('Error calculating storage:', err);
  }

  res.json({
    photoCount,
    guestCount,
    activeGuests,
    storageUsed: Math.round(storageUsed / (1024 * 1024)), // MB
  });
});

// Recent photos for dashboard
router.get('/recent-photos', requireAdmin, (req, res) => {
  const eventId = req.query.eventId || config.DEMO_EVENT_ID;
  const limit = parseInt(req.query.limit) || 10;

  const photos = db.prepare(`
    SELECT p.*, u.username
    FROM photos p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.event_id = ?
    ORDER BY p.uploaded_at DESC
    LIMIT ?
  `).all(eventId, limit);

  res.json(photos.map(p => ({
    id: p.id,
    filename: p.filename,
    url: `/photos/${eventId}/${p.filename}`,
    thumbUrl: p.thumb_filename ? `/photos/${eventId}/${p.thumb_filename}` : null,
    uploadedAt: p.uploaded_at,
    uploader: p.uploader_name || p.username,
    mimetype: p.mimetype,
  })));
});

// Recent guests for dashboard
router.get('/recent-guests', requireAdmin, (req, res) => {
  const eventId = req.query.eventId || config.DEMO_EVENT_ID;
  const limit = parseInt(req.query.limit) || 10;

  const guests = db.prepare(`
    SELECT u.*, COUNT(p.id) as photo_count
    FROM users u
    LEFT JOIN photos p ON u.id = p.user_id AND p.event_id = u.event_id
    WHERE u.event_id = ?
    GROUP BY u.id
    ORDER BY u.joined_at DESC
    LIMIT ?
  `).all(eventId, limit);

  res.json(guests.map(g => ({
    id: g.id,
    username: g.username,
    avatarUrl: g.avatar_filename ? `/avatars/${eventId}/${g.avatar_filename}` : null,
    joinedAt: g.joined_at,
    lastSeen: g.last_seen,
    photoCount: g.photo_count,
  })));
});

// All photos for galleries page
router.get('/photos', requireAdmin, (req, res) => {
  const eventId = req.query.eventId || config.DEMO_EVENT_ID;

  const photos = db.prepare(`
    SELECT p.*, u.username
    FROM photos p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.event_id = ?
    ORDER BY p.uploaded_at DESC
  `).all(eventId);

  res.json(photos.map(p => ({
    id: p.id,
    filename: p.filename,
    url: `/photos/${eventId}/${p.filename}`,
    thumbUrl: p.thumb_filename ? `/photos/${eventId}/${p.thumb_filename}` : null,
    uploadedAt: p.uploaded_at,
    uploader: p.uploader_name || p.username,
    mimetype: p.mimetype,
    sizeBytes: p.size_bytes,
    flagged: p.flagged,
  })));
});

// All guests for guests page
router.get('/guests', requireAdmin, (req, res) => {
  const eventId = req.query.eventId || config.DEMO_EVENT_ID;

  const guests = db.prepare(`
    SELECT u.*, COUNT(p.id) as photo_count
    FROM users u
    LEFT JOIN photos p ON u.id = p.user_id AND p.event_id = u.event_id
    WHERE u.event_id = ?
    GROUP BY u.id
    ORDER BY u.joined_at DESC
  `).all(eventId);

  res.json(guests.map(g => ({
    id: g.id,
    username: g.username,
    avatarUrl: g.avatar_filename ? `/avatars/${eventId}/${g.avatar_filename}` : null,
    joinedAt: g.joined_at,
    lastSeen: g.last_seen,
    photoCount: g.photo_count,
  })));
});

module.exports = router;
