const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');
const config = require('./config');
const db = require('./db');

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
  INSERT INTO photos (id, event_id, filename, original_name, mimetype, size_bytes, uploaded_at, uploader_ip, uploader_name)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const getPhotos = db.prepare(`
  SELECT * FROM photos WHERE event_id = ? ORDER BY uploaded_at DESC
`);
const getPhoto = db.prepare(`SELECT * FROM photos WHERE id = ?`);

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.use(express.json());

// Serve uploaded photos
app.use('/photos', express.static(config.STORAGE.EVENTS));

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

function handleUpload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No valid photo' });

  const eventId = req.params.eventId || config.DEMO_EVENT_ID;
  const id = nanoid();

  insertPhoto.run(
    id,
    eventId,
    req.file.filename,
    req.file.originalname,
    req.file.mimetype,
    req.file.size,
    Date.now(),
    req.ip,
    req.body.username || 'Guest'
  );

  const photo = {
    id,
    filename: req.file.filename,
    url: `/photos/${eventId}/${req.file.filename}`,
    uploadedAt: Date.now(),
    uploader: req.body.username || 'Guest',
  };

  io.emit('new-photo', photo);
  res.status(201).json(photo);
}

// Upload routes (Express 5 dropped optional params)
app.post('/upload', upload.single('photo'), handleUpload);
app.post('/upload/:eventId', upload.single('photo'), handleUpload);

function listPhotos(req, res) {
  const eventId = req.params.eventId || config.DEMO_EVENT_ID;
  const rows = getPhotos.all(eventId);
  res.json(rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    url: `/photos/${eventId}/${r.filename}`,
    uploadedAt: r.uploaded_at,
    uploader: r.uploader_name,
  })));
}

// List photos routes
app.get('/photos-list', listPhotos);
app.get('/photos-list/:eventId', listPhotos);

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  const eventId = config.DEMO_EVENT_ID;
  const rows = getPhotos.all(eventId);
  socket.emit('photo-history', rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    url: `/photos/${eventId}/${r.filename}`,
    uploadedAt: r.uploaded_at,
    uploader: r.uploader_name,
  })));

  socket.on('ping', () => socket.emit('pong'));
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

server.listen(config.PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${config.PORT}`);
});
