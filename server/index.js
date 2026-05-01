const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { nanoid } = require('nanoid');
const config = require('./config');
const db = require('./db');
const adminRouter = require('./routes/admin');
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

// Prepared statements
const insertPhoto = db.prepare(`
  INSERT INTO photos (id, event_id, filename, original_name, mimetype, size_bytes, uploaded_at, uploader_ip, uploader_name, user_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const getPhotos = db.prepare(`SELECT * FROM photos WHERE event_id = ? ORDER BY uploaded_at DESC`);
const getPhoto  = db.prepare(`SELECT * FROM photos WHERE id = ?`);
const getUserById   = db.prepare(`SELECT * FROM users WHERE id = ?`);
const getUserByName = db.prepare(`SELECT id FROM users WHERE event_id = ? AND username = ?`);

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PATCH, OPTIONS');
  if (_req.method === 'OPTIONS') return res.status(204).end();
  next();
});
app.use(express.json());
app.use(cookieParser(config.COOKIE_SECRET));

app.use('/admin', adminRouter);
app.use('/users', usersRouter);
app.use('/avatars', express.static(config.STORAGE.AVATARS));

// Serve uploaded media (photos + videos) with range support for video streaming
app.use('/photos', express.static(config.STORAGE.EVENTS, { acceptRanges: true }));

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

function toPhotoObj(r, eventId) {
  return {
    id: r.id,
    filename: r.filename,
    url: `/photos/${eventId}/${r.filename}`,
    uploadedAt: r.uploaded_at,
    uploader: r.uploader_name,
    mimetype: r.mimetype,
  };
}

function handleUpload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No valid file' });

  const eventId = req.params.eventId || config.DEMO_EVENT_ID;
  const id = nanoid();
  const uploaderName = req.body.username || 'Guest';
  const userRow = getUserByName.get(eventId, uploaderName);

  insertPhoto.run(
    id, eventId, req.file.filename, req.file.originalname,
    req.file.mimetype, req.file.size, Date.now(), req.ip,
    uploaderName, userRow ? userRow.id : null
  );

  const photo = toPhotoObj(
    { id, filename: req.file.filename, uploaded_at: Date.now(), uploader_name: uploaderName, mimetype: req.file.mimetype },
    eventId
  );

  io.emit('new-photo', photo);
  res.status(201).json(photo);
}

app.post('/upload',         upload.single('photo'), handleUpload);
app.post('/upload/:eventId', upload.single('photo'), handleUpload);

function listPhotos(req, res) {
  const eventId = req.params.eventId || config.DEMO_EVENT_ID;
  res.json(getPhotos.all(eventId).map((r) => toPhotoObj(r, eventId)));
}

app.get('/photos-list',          listPhotos);
app.get('/photos-list/:eventId', listPhotos);

// Delete photo (owner only)
app.delete('/photos/:id', (req, res) => {
  const row = getPhoto.get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.uploader_name !== req.query.username) {
    return res.status(403).json({ error: 'Not your photo' });
  }

  fs.rm(path.join(config.STORAGE.EVENTS, row.event_id, row.filename), { force: true }, () => {});
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
  socket.emit('photo-history', getPhotos.all(eventId).map((r) => toPhotoObj(r, eventId)));
  io.emit('user-count', { count: io.engine.clientsCount });

  socket.on('ping', () => socket.emit('pong'));
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    io.emit('user-count', { count: io.engine.clientsCount });
  });
});

server.listen(config.PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${config.PORT}`);
});
