const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { nanoid } = require('nanoid');

ffmpeg.setFfmpegPath(ffmpegPath);
const config = require('./config');
const db = require('./db');
const { connectedSockets, connectedUserIds, liveGuestCount } = require('./liveCount');
const adminRouter = require('./routes/admin');
const eventsRouter = require('./routes/events');
const usersRouter = require('./routes/users');

// Ensure storage dirs exist
fs.mkdirSync(config.STORAGE.EVENTS, { recursive: true });
fs.mkdirSync(config.STORAGE.AVATARS, { recursive: true });

// Ensure demo event exists
const ensureDemo = db.prepare(`
  INSERT OR IGNORE INTO events (id, name, created_at, status)
  VALUES (?, 'Demo Event', ?, 'active')
`);
ensureDemo.run(config.DEMO_EVENT_ID, Date.now());

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Multer — per-event folder
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const eventId = req.params.eventId || config.DEMO_EVENT_ID;
    const dir = path.join(config.STORAGE.EVENTS, eventId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${nanoid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    cb(null, config.ALLOWED_MIME_TYPES.includes(file.mimetype));
  },
});

function extractThumb(videoPath, thumbPath) {
  return new Promise((resolve) => {
    ffmpeg(videoPath)
      .screenshots({ timestamps: ['00:00:01'], filename: path.basename(thumbPath), folder: path.dirname(thumbPath), size: '480x?' })
      .on('end', resolve)
      .on('error', resolve); // don't fail upload if thumb fails
  });
}

// Prepared statements
const insertPhoto = db.prepare(`
  INSERT INTO photos (id, event_id, filename, original_name, mimetype, size_bytes, uploaded_at, uploader_ip, uploader_name, user_id, thumb_filename)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const getPhotos = db.prepare(`
  SELECT p.*, u.avatar_filename AS uploader_avatar_filename
  FROM photos p
  LEFT JOIN users u ON p.user_id = u.id
  WHERE p.event_id = ? ORDER BY p.uploaded_at DESC
`);
const getPhoto  = db.prepare(`SELECT * FROM photos WHERE id = ?`);
const getUserById   = db.prepare(`SELECT * FROM users WHERE id = ?`);
const getUserByName = db.prepare(`SELECT * FROM users WHERE event_id = ? AND username = ?`);
const getLikeCount = db.prepare(`SELECT COUNT(*) AS count FROM photo_likes WHERE photo_id = ?`);
const hasUserLikedPhoto = db.prepare(`SELECT 1 FROM photo_likes WHERE photo_id = ? AND user_id = ?`);
const insertPhotoLike = db.prepare(`INSERT OR IGNORE INTO photo_likes (photo_id, user_id, liked_at) VALUES (?, ?, ?)`);
const deletePhotoLike = db.prepare(`DELETE FROM photo_likes WHERE photo_id = ? AND user_id = ?`);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});
app.use(express.json());
app.use(cookieParser(config.COOKIE_SECRET));

app.use('/admin', adminRouter);
app.use('/events', eventsRouter);
app.use('/users', usersRouter);
app.use('/avatars', express.static(config.STORAGE.AVATARS));

// Serve uploaded media (photos + videos) with range support for video streaming
app.use('/photos', express.static(config.STORAGE.EVENTS, { acceptRanges: true }));

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

function toPhotoObj(r, eventId, userId = null) {
  return {
    id: r.id,
    filename: r.filename,
    url: `/photos/${eventId}/${r.filename}`,
    thumbUrl: r.thumb_filename ? `/photos/${eventId}/${r.thumb_filename}` : null,
    uploadedAt: r.uploaded_at,
    uploader: r.uploader_name,
    uploaderAvatarUrl: r.uploader_avatar_filename
      ? `/avatars/${eventId}/${r.uploader_avatar_filename}`
      : null,
    mimetype: r.mimetype,
    likeCount: getLikeCount.get(r.id).count,
    likedByMe: userId ? !!hasUserLikedPhoto.get(r.id, userId) : false,
  };
}

function emitPhotoLikeUpdate(photoId, userId, liked) {
  const row = getPhoto.get(photoId);
  if (!row) return;
  io.emit('photo-liked', {
    photoId,
    likeCount: getLikeCount.get(photoId).count,
    userId,
    liked,
    eventId: row.event_id,
  });
}

async function handleUpload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No valid file' });

  const eventId = req.params.eventId || config.DEMO_EVENT_ID;
  const id = nanoid();
  const uploaderName = req.body.username || 'Guest';
  const userRow = getUserByName.get(eventId, uploaderName);

  let thumbFilename = null;
  if (req.file.mimetype.startsWith('video/')) {
    thumbFilename = `thumb-${id}.jpg`;
    const thumbPath = path.join(config.STORAGE.EVENTS, eventId, thumbFilename);
    await extractThumb(req.file.path, thumbPath);
    if (!fs.existsSync(thumbPath)) thumbFilename = null;
  }

  insertPhoto.run(
    id, eventId, req.file.filename, req.file.originalname,
    req.file.mimetype, req.file.size, Date.now(), req.ip,
    uploaderName, userRow ? userRow.id : null, thumbFilename
  );

  const photo = toPhotoObj(
    {
      id,
      filename: req.file.filename,
      thumb_filename: thumbFilename,
      uploaded_at: Date.now(),
      uploader_name: uploaderName,
      uploader_avatar_filename: userRow?.avatar_filename ?? null,
      mimetype: req.file.mimetype,
    },
    eventId,
    userRow ? userRow.id : null
  );

  io.emit('new-photo', photo);
  res.status(201).json(photo);
}

app.post('/upload',         upload.single('photo'), handleUpload);
app.post('/upload/:eventId', upload.single('photo'), handleUpload);

function listPhotos(req, res) {
  const eventId = req.params.eventId || config.DEMO_EVENT_ID;
  const userId = typeof req.query.userId === 'string' ? req.query.userId : null;
  res.json(getPhotos.all(eventId).map((r) => toPhotoObj(r, eventId, userId)));
}

app.get('/photos-list',          listPhotos);
app.get('/photos-list/:eventId', listPhotos);

app.post('/photos/:id/like', (req, res) => {
  const photo = getPhoto.get(req.params.id);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  const userId = req.body.userId;
  if (!userId) return res.status(400).json({ error: 'User is required' });

  const user = getUserById.get(userId);
  if (!user || user.event_id !== photo.event_id) {
    return res.status(403).json({ error: 'User cannot like this photo' });
  }

  insertPhotoLike.run(photo.id, user.id, Date.now());
  emitPhotoLikeUpdate(photo.id, user.id, true);

  res.json({
    ok: true,
    likeCount: getLikeCount.get(photo.id).count,
    likedByMe: true,
  });
});

app.delete('/photos/:id/like', (req, res) => {
  const photo = getPhoto.get(req.params.id);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'User is required' });

  const user = getUserById.get(userId);
  if (!user || user.event_id !== photo.event_id) {
    return res.status(403).json({ error: 'User cannot unlike this photo' });
  }

  deletePhotoLike.run(photo.id, user.id);
  emitPhotoLikeUpdate(photo.id, user.id, false);

  res.json({
    ok: true,
    likeCount: getLikeCount.get(photo.id).count,
    likedByMe: false,
  });
});

// Delete photo (owner only)
app.delete('/photos/:id', (req, res) => {
  const row = getPhoto.get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.uploader_name !== req.query.username) {
    return res.status(403).json({ error: 'Not your photo' });
  }

  fs.rm(path.join(config.STORAGE.EVENTS, row.event_id, row.filename), { force: true }, () => {});
  if (row.thumb_filename) {
    fs.rm(path.join(config.STORAGE.EVENTS, row.event_id, row.thumb_filename), { force: true }, () => {});
  }
  db.prepare('DELETE FROM photos WHERE id = ?').run(row.id);
  io.emit('photo-deleted', { photoId: row.id });
  res.json({ ok: true });
});

// Download user's own media as ZIP
app.get('/users/:id/album', (req, res) => {
  const user = getUserById.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const eventId = req.query.eventId || config.DEMO_EVENT_ID;
  const rows = db.prepare(`
    SELECT * FROM photos WHERE event_id = ? AND (user_id = ? OR uploader_name = ?)
  `).all(eventId, user.id, user.username);

  if (!rows.length) return res.status(404).json({ error: 'No media found' });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="my-album.zip"`);

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.on('error', (err) => { console.error('ZIP error:', err); res.end(); });
  archive.pipe(res);

  for (const row of rows) {
    const filePath = path.join(config.STORAGE.EVENTS, eventId, row.filename);
    if (fs.existsSync(filePath)) archive.file(filePath, { name: row.filename });
  }

  archive.finalize();
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  const eventId = config.DEMO_EVENT_ID;
  const userId = typeof socket.handshake.auth?.userId === 'string' ? socket.handshake.auth.userId : null;

  connectedSockets.set(socket.id, userId);
  if (userId) {
    connectedUserIds.add(userId);
    // Keep last_seen fresh so DB queries also stay accurate
    db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(Date.now(), userId);
  }

  socket.emit('photo-history', getPhotos.all(eventId).map((r) => toPhotoObj(r, eventId, userId)));
  io.emit('user-count', { count: liveGuestCount() });

  socket.on('ping', () => {
    if (userId) db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(Date.now(), userId);
    socket.emit('pong');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    connectedSockets.delete(socket.id);
    // Only remove from the Set if no other socket from this user remains
    if (userId && ![...connectedSockets.values()].includes(userId)) {
      connectedUserIds.delete(userId);
    }
    io.emit('user-count', { count: liveGuestCount() });
  });
});

server.listen(config.PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${config.PORT}`);
});
