const express = require('express');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const config = require('../config');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { loginRateLimit, clearLoginAttempts } = require('../middleware/rateLimit');
const { validateEventName, validateStorageWarning, validateExpectedGuests } = require('../middleware/validate');
const { liveGuestCount, connectedUserIds } = require('../liveCount');

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  signed: true,
  sameSite: 'lax',
  maxAge: 8 * 60 * 60 * 1000,
};

const getEvent = db.prepare(`
  SELECT e.*, s.organizer_name, s.event_date, s.event_type, s.expected_guests, s.retention_policy, s.storage_warning_pct
  FROM events e
  LEFT JOIN event_settings s ON s.event_id = e.id
  WHERE e.id = ?
`);

const upsertEventSettings = db.prepare(`
  INSERT INTO event_settings (
    event_id, organizer_name, event_date, event_type, expected_guests, retention_policy, storage_warning_pct
  ) VALUES (
    @event_id, @organizer_name, @event_date, @event_type, @expected_guests, @retention_policy, @storage_warning_pct
  )
  ON CONFLICT(event_id) DO UPDATE SET
    organizer_name = excluded.organizer_name,
    event_date = excluded.event_date,
    event_type = excluded.event_type,
    expected_guests = excluded.expected_guests,
    retention_policy = excluded.retention_policy,
    storage_warning_pct = excluded.storage_warning_pct
`);
const getPhotoById = db.prepare(`SELECT * FROM photos WHERE id = ?`);
const getPhotoRowsForEvent = db.prepare(`
  SELECT p.*, u.username
  FROM photos p
  LEFT JOIN users u ON p.user_id = u.id
  WHERE p.event_id = ?
  ORDER BY p.uploaded_at DESC
`);
const getGuestRowsForEvent = db.prepare(`
  SELECT u.*, COUNT(p.id) as photo_count
  FROM users u
  LEFT JOIN photos p ON u.id = p.user_id AND p.event_id = u.event_id
  WHERE u.event_id = ?
  GROUP BY u.id
  ORDER BY u.joined_at DESC
`);
const getGuestById = db.prepare(`
  SELECT u.*, COUNT(p.id) as photo_count
  FROM users u
  LEFT JOIN photos p ON u.id = p.user_id AND p.event_id = u.event_id
  WHERE u.event_id = ? AND u.id = ?
  GROUP BY u.id
`);

function calculateStorageUsed(eventId) {
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
  return storageUsed;
}

function eventStateResponse(eventId) {
  const event = getEvent.get(eventId);
  if (!event) return null;

  const photoCount = db.prepare('SELECT COUNT(*) as count FROM photos WHERE event_id = ?').get(eventId).count;
  const guestCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE event_id = ?').get(eventId).count;
  const storageUsedBytes = calculateStorageUsed(eventId);

  return {
    id: event.id,
    name: event.name,
    organizerName: event.organizer_name || 'K3DP Events',
    eventDate: event.event_date || new Date().toISOString().slice(0, 10),
    eventType: event.event_type || 'Corporate / Conference',
    expectedGuests: event.expected_guests || 300,
    retentionPolicy: event.retention_policy || 'Until handoff',
    storageWarning: event.storage_warning_pct || 80,
    status: event.status,
    createdAt: event.created_at,
    handoffPreparedAt: event.handoff_prepared_at,
    handoffCompletedAt: event.handoff_completed_at,
    mediaDeletedAt: event.media_deleted_at,
    closedAt: event.closed_at,
    photoCount,
    guestCount,
    activeGuests: liveGuestCount(),
    storageUsed: Number((storageUsedBytes / 1024 / 1024 / 1024).toFixed(1)),
    storageTotal: 50,
  };
}

function mapPhotoRow(row, eventId) {
  return {
    id: row.id,
    filename: row.filename,
    url: `/photos/${eventId}/${row.filename}`,
    thumbUrl: row.thumb_filename ? `/photos/${eventId}/${row.thumb_filename}` : null,
    uploadedAt: row.uploaded_at,
    uploader: row.uploader_name || row.username,
    mimetype: row.mimetype,
    sizeBytes: row.size_bytes,
    flagged: !!row.flagged,
  };
}

function mapGuestRow(row, eventId) {
  const IDLE_MS = 15 * 60 * 1000;
  const now = Date.now();
  let status;
  if (connectedUserIds.has(row.id)) status = 'Active';
  else if (now - row.last_seen < IDLE_MS) status = 'Idle';
  else status = 'Left event';

  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatar_filename ? `/avatars/${eventId}/${row.avatar_filename}` : null,
    joinedAt: row.joined_at,
    lastSeen: row.last_seen,
    photoCount: row.photo_count,
    status,
  };
}

router.post('/login', loginRateLimit, (req, res) => {
  const { password } = req.body;
  if (!password || password !== config.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  // Clear the attempt counter on success so a legitimate user isn't locked out
  clearLoginAttempts(req._rateLimitIp);
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

router.get('/network', requireAdmin, (_req, res) => {
  const { getLiveIp } = require('../utils/qr');
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const ips = [];
  for (const iface of Object.values(nets)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
    }
  }
  res.json({ ips, liveIp: getLiveIp() || ips[0] || null, port: config.PORT });
});

router.get('/stats', requireAdmin, (req, res) => {
  const eventId = req.query.eventId || config.DEMO_EVENT_ID;
  const photoCount = db.prepare('SELECT COUNT(*) as count FROM photos WHERE event_id = ?').get(eventId).count;
  const guestCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE event_id = ?').get(eventId).count;
  const storageUsed = calculateStorageUsed(eventId);

  res.json({
    photoCount,
    guestCount,
    activeGuests: liveGuestCount(),
    storageUsed: Math.round(storageUsed / (1024 * 1024)),
  });
});

router.get('/recent-photos', requireAdmin, (req, res) => {
  const eventId = req.query.eventId || config.DEMO_EVENT_ID;
  const limit = parseInt(req.query.limit, 10) || 10;

  const photos = db.prepare(`
    SELECT p.*, u.username
    FROM photos p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.event_id = ?
    ORDER BY p.uploaded_at DESC
    LIMIT ?
  `).all(eventId, limit);

  res.json(photos.map((p) => ({
    id: p.id,
    filename: p.filename,
    url: `/photos/${eventId}/${p.filename}`,
    thumbUrl: p.thumb_filename ? `/photos/${eventId}/${p.thumb_filename}` : null,
    uploadedAt: p.uploaded_at,
    uploader: p.uploader_name || p.username,
    mimetype: p.mimetype,
  })));
});

router.get('/recent-guests', requireAdmin, (req, res) => {
  const eventId = req.query.eventId || config.DEMO_EVENT_ID;
  const limit = parseInt(req.query.limit, 10) || 10;
  const IDLE_MS = 15 * 60 * 1000; // 15 minutes without a socket = Idle

  const guests = db.prepare(`
    SELECT u.*, COUNT(p.id) as photo_count
    FROM users u
    LEFT JOIN photos p ON u.id = p.user_id AND p.event_id = u.event_id
    WHERE u.event_id = ?
    GROUP BY u.id
    ORDER BY u.joined_at DESC
    LIMIT ?
  `).all(eventId, limit);

  const now = Date.now();

  res.json(guests.map((g) => {
    let status;
    if (connectedUserIds.has(g.id)) {
      status = 'Active';
    } else if (now - g.last_seen < IDLE_MS) {
      status = 'Idle';
    } else {
      status = 'Left event';
    }

    return {
      id: g.id,
      username: g.username,
      avatarUrl: g.avatar_filename ? `/avatars/${eventId}/${g.avatar_filename}` : null,
      joinedAt: g.joined_at,
      lastSeen: g.last_seen,
      photoCount: g.photo_count,
      status,
    };
  }));
});

router.get('/photos', requireAdmin, (req, res) => {
  const eventId = req.query.eventId || config.DEMO_EVENT_ID;

  const photos = db.prepare(`
    SELECT p.*, u.username
    FROM photos p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.event_id = ?
    ORDER BY p.uploaded_at DESC
  `).all(eventId);

  res.json(photos.map((p) => mapPhotoRow(p, eventId)));
});

router.get('/photos/export', requireAdmin, (req, res) => {
  const eventId = req.query.eventId || config.DEMO_EVENT_ID;
  const exportAll = req.query.exportAll === '1';
  const photoIds = typeof req.query.photoIds === 'string' && req.query.photoIds.length
    ? req.query.photoIds.split(',').filter(Boolean)
    : [];

  const rows = exportAll
    ? db.prepare(`
        SELECT p.*, u.username
        FROM photos p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.event_id = ?
        ORDER BY p.uploaded_at DESC
      `).all(eventId)
    : photoIds.length
      ? db.prepare(`
          SELECT p.*, u.username
          FROM photos p
          LEFT JOIN users u ON p.user_id = u.id
          WHERE p.event_id = ? AND p.id IN (${photoIds.map(() => '?').join(',')})
          ORDER BY p.uploaded_at DESC
        `).all(eventId, ...photoIds)
      : [];

  if (!rows.length) return res.status(404).json({ error: 'No photos selected for export' });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${eventId}-${exportAll ? 'gallery' : 'selection'}.zip"`);

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.on('error', (err) => {
    console.error('Gallery export ZIP error:', err);
    if (!res.headersSent) res.status(500).end();
    else res.end();
  });
  archive.pipe(res);

  for (const row of rows) {
    const filePath = path.join(config.STORAGE.EVENTS, eventId, row.filename);
    if (fs.existsSync(filePath)) archive.file(filePath, { name: row.filename });
  }

  archive.append(JSON.stringify({
    exportedAt: Date.now(),
    eventId,
    photoCount: rows.length,
    exportAll,
    media: rows.map((row) => ({
      id: row.id,
      filename: row.filename,
      originalName: row.original_name,
      uploadedAt: row.uploaded_at,
      uploader: row.uploader_name || row.username,
      mimetype: row.mimetype,
      sizeBytes: row.size_bytes,
      flagged: !!row.flagged,
    })),
  }, null, 2), { name: 'manifest.json' });

  archive.finalize();
});

router.post('/photos/delete', requireAdmin, (req, res) => {
  const eventId = req.body.eventId || config.DEMO_EVENT_ID;
  const photoIds = Array.isArray(req.body.photoIds) ? req.body.photoIds : [];

  if (!photoIds.length) return res.status(400).json({ error: 'photoIds required' });

  const rows = db.prepare(`
    SELECT * FROM photos
    WHERE event_id = ? AND id IN (${photoIds.map(() => '?').join(',')})
  `).all(eventId, ...photoIds);

  for (const row of rows) {
    const filePath = path.join(config.STORAGE.EVENTS, eventId, row.filename);
    if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
    if (row.thumb_filename) {
      const thumbPath = path.join(config.STORAGE.EVENTS, eventId, row.thumb_filename);
      if (fs.existsSync(thumbPath)) fs.rmSync(thumbPath, { force: true });
    }
  }

  db.prepare(`DELETE FROM photos WHERE event_id = ? AND id IN (${photoIds.map(() => '?').join(',')})`).run(eventId, ...photoIds);

  const photos = getPhotoRowsForEvent.all(eventId);

  res.json({
    ok: true,
    deletedCount: rows.length,
    photos: photos.map((p) => mapPhotoRow(p, eventId)),
  });
});

router.patch('/photos/:id/flag', requireAdmin, (req, res) => {
  const eventId = req.body.eventId || req.query.eventId || config.DEMO_EVENT_ID;
  const photo = getPhotoById.get(req.params.id);
  if (!photo || photo.event_id !== eventId) return res.status(404).json({ error: 'Photo not found' });

  const nextFlagged = typeof req.body.flagged === 'boolean' ? req.body.flagged : !photo.flagged;
  db.prepare('UPDATE photos SET flagged = ? WHERE id = ?').run(nextFlagged ? 1 : 0, req.params.id);

  res.json({
    ok: true,
    photo: {
      id: photo.id,
      flagged: nextFlagged,
    },
  });
});

router.get('/guests', requireAdmin, (req, res) => {
  const eventId = req.query.eventId || config.DEMO_EVENT_ID;
  const guests = getGuestRowsForEvent.all(eventId);
  res.json(guests.map((g) => mapGuestRow(g, eventId)));
});

router.get('/guests/export', requireAdmin, (req, res) => {
  const eventId = req.query.eventId || config.DEMO_EVENT_ID;
  const guestIds = typeof req.query.guestIds === 'string' && req.query.guestIds.length
    ? req.query.guestIds.split(',').filter(Boolean)
    : [];

  const rows = guestIds.length
    ? db.prepare(`
        SELECT u.*, COUNT(p.id) as photo_count
        FROM users u
        LEFT JOIN photos p ON u.id = p.user_id AND p.event_id = u.event_id
        WHERE u.event_id = ? AND u.id IN (${guestIds.map(() => '?').join(',')})
        GROUP BY u.id
        ORDER BY u.joined_at DESC
      `).all(eventId, ...guestIds)
    : getGuestRowsForEvent.all(eventId);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${eventId}-guests.csv"`);

  const header = ['Guest ID', 'Username', 'Joined At', 'Last Seen', 'Photo Count'];
  const lines = rows.map((row) => (
    [
      row.id,
      `"${String(row.username).replace(/"/g, '""')}"`,
      new Date(row.joined_at).toISOString(),
      new Date(row.last_seen).toISOString(),
      row.photo_count,
    ].join(',')
  ));

  res.send([header.join(','), ...lines].join('\n'));
});

router.get('/guests/:id/album', requireAdmin, (req, res) => {
  const eventId = req.query.eventId || config.DEMO_EVENT_ID;
  const guest = getGuestById.get(eventId, req.params.id);
  if (!guest) return res.status(404).json({ error: 'Guest not found' });

  const rows = db.prepare(`
    SELECT p.*, u.username
    FROM photos p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.event_id = ? AND p.user_id = ?
    ORDER BY p.uploaded_at DESC
  `).all(eventId, guest.id);

  if (!rows.length) return res.status(404).json({ error: 'No photos found for this guest' });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${eventId}-${guest.username}-album.zip"`);

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.on('error', (err) => {
    console.error('Guest album ZIP error:', err);
    if (!res.headersSent) res.status(500).end();
    else res.end();
  });
  archive.pipe(res);

  for (const row of rows) {
    const filePath = path.join(config.STORAGE.EVENTS, eventId, row.filename);
    if (fs.existsSync(filePath)) archive.file(filePath, { name: row.filename });
  }

  archive.append(JSON.stringify({
    exportedAt: Date.now(),
    eventId,
    guest: {
      id: guest.id,
      username: guest.username,
    },
    photoCount: rows.length,
  }, null, 2), { name: 'manifest.json' });

  archive.finalize();
});

router.post('/guests/:id/photos/delete', requireAdmin, (req, res) => {
  const eventId = req.body.eventId || config.DEMO_EVENT_ID;
  const guest = getGuestById.get(eventId, req.params.id);
  if (!guest) return res.status(404).json({ error: 'Guest not found' });

  const rows = db.prepare(`
    SELECT * FROM photos
    WHERE event_id = ? AND user_id = ?
  `).all(eventId, guest.id);

  for (const row of rows) {
    const filePath = path.join(config.STORAGE.EVENTS, eventId, row.filename);
    if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
    if (row.thumb_filename) {
      const thumbPath = path.join(config.STORAGE.EVENTS, eventId, row.thumb_filename);
      if (fs.existsSync(thumbPath)) fs.rmSync(thumbPath, { force: true });
    }
  }

  db.prepare('DELETE FROM photos WHERE event_id = ? AND user_id = ?').run(eventId, guest.id);

  const guests = getGuestRowsForEvent.all(eventId);
  const photos = getPhotoRowsForEvent.all(eventId);

  res.json({
    ok: true,
    deletedCount: rows.length,
    guests: guests.map((row) => mapGuestRow(row, eventId)),
    photos: photos.map((row) => mapPhotoRow(row, eventId)),
  });
});

router.get('/event-settings', requireAdmin, (req, res) => {
  const eventId = req.query.eventId || config.DEMO_EVENT_ID;
  const state = eventStateResponse(eventId);
  if (!state) return res.status(404).json({ error: 'Event not found' });
  res.json(state);
});

router.patch('/event-settings', requireAdmin, (req, res) => {
  const eventId = req.body.eventId || config.DEMO_EVENT_ID;
  const event = getEvent.get(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const {
    name,
    organizerName,
    eventDate,
    eventType,
    expectedGuests,
    retentionPolicy,
    storageWarning,
  } = req.body;

  const nameErr     = validateEventName(name);
  const warningErr  = validateStorageWarning(storageWarning);
  const guestsErr   = validateExpectedGuests(expectedGuests);
  const firstErr    = nameErr || warningErr || guestsErr;
  if (firstErr) return res.status(400).json({ error: firstErr });

  db.prepare('UPDATE events SET name = ? WHERE id = ?').run(name?.trim() || event.name, eventId);
  upsertEventSettings.run({
    event_id: eventId,
    organizer_name: organizerName || null,
    event_date: eventDate || null,
    event_type: eventType || null,
    expected_guests: expectedGuests ? Number(expectedGuests) : null,
    retention_policy: retentionPolicy || null,
    storage_warning_pct: storageWarning ? Number(storageWarning) : null,
  });

  res.json(eventStateResponse(eventId));
});

router.post('/export-package', requireAdmin, (req, res) => {
  const eventId = req.body.eventId || config.DEMO_EVENT_ID;
  const event = getEvent.get(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const preparedAt = Date.now();
  db.prepare('UPDATE events SET handoff_prepared_at = ?, status = ? WHERE id = ?')
    .run(preparedAt, 'handoff_prepared', eventId);

  res.json({
    ok: true,
    preparedAt,
    downloadUrl: `/admin/export-package/download?eventId=${encodeURIComponent(eventId)}`,
    event: eventStateResponse(eventId),
  });
});

router.get('/export-package/download', requireAdmin, (req, res) => {
  const eventId = req.query.eventId || config.DEMO_EVENT_ID;
  const event = getEvent.get(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const rows = db.prepare(`
    SELECT p.*, u.username
    FROM photos p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.event_id = ?
    ORDER BY p.uploaded_at DESC
  `).all(eventId);
  const state = eventStateResponse(eventId);
  const eventDir = path.join(config.STORAGE.EVENTS, eventId);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${eventId}-handoff.zip"`);

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.on('error', (err) => {
    console.error('Export ZIP error:', err);
    if (!res.headersSent) res.status(500).end();
    else res.end();
  });
  archive.pipe(res);

  archive.append(JSON.stringify({
    exportedAt: Date.now(),
    event: state,
    media: rows.map((row) => ({
      id: row.id,
      filename: row.filename,
      originalName: row.original_name,
      uploadedAt: row.uploaded_at,
      uploader: row.uploader_name || row.username,
      mimetype: row.mimetype,
      sizeBytes: row.size_bytes,
      flagged: !!row.flagged,
    })),
  }, null, 2), { name: 'manifest.json' });

  if (fs.existsSync(eventDir)) {
    archive.directory(eventDir, 'media');
  }

  archive.finalize();
});

router.post('/handoff-complete', requireAdmin, (req, res) => {
  const eventId = req.body.eventId || config.DEMO_EVENT_ID;
  const event = getEvent.get(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (!event.handoff_prepared_at) return res.status(409).json({ error: 'Prepare export package first' });

  db.prepare('UPDATE events SET handoff_completed_at = ?, status = ? WHERE id = ?')
    .run(Date.now(), 'handoff_completed', eventId);

  res.json({ ok: true, event: eventStateResponse(eventId) });
});

router.post('/delete-media', requireAdmin, (req, res) => {
  const eventId = req.body.eventId || config.DEMO_EVENT_ID;
  const event = getEvent.get(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (!event.handoff_completed_at) return res.status(409).json({ error: 'Complete handoff first' });

  const eventDir = path.join(config.STORAGE.EVENTS, eventId);
  if (fs.existsSync(eventDir)) {
    fs.rmSync(eventDir, { recursive: true, force: true });
    fs.mkdirSync(eventDir, { recursive: true });
  }
  db.prepare('DELETE FROM photos WHERE event_id = ?').run(eventId);
  db.prepare('UPDATE events SET media_deleted_at = ?, status = ? WHERE id = ?')
    .run(Date.now(), 'media_deleted', eventId);

  res.json({ ok: true, event: eventStateResponse(eventId) });
});

router.post('/delete-event', requireAdmin, (req, res) => {
  const eventId = req.body.eventId || config.DEMO_EVENT_ID;
  const event = getEvent.get(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (!event.media_deleted_at) return res.status(409).json({ error: 'Delete event media first' });

  const avatarDir = path.join(config.STORAGE.AVATARS, eventId);
  if (fs.existsSync(avatarDir)) {
    fs.rmSync(avatarDir, { recursive: true, force: true });
  }
  db.prepare('DELETE FROM users WHERE event_id = ?').run(eventId);
  db.prepare('UPDATE events SET closed_at = ?, status = ? WHERE id = ?')
    .run(Date.now(), 'closed', eventId);

  res.json({ ok: true, event: eventStateResponse(eventId) });
});

module.exports = router;
