require('dotenv').config();
const path = require('path');

const ROOT = path.join(__dirname);

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 4000,
  CLIENT_PORT: parseInt(process.env.CLIENT_PORT, 10) || 3000,

  DB_PATH: path.join(ROOT, 'data', 'gallery.db'),

  STORAGE: {
    EVENTS: path.join(ROOT, 'storage', 'events'),
    AVATARS: path.join(ROOT, 'storage', 'avatars'),
  },

  DEMO_EVENT_ID: 'demo',

  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'dev-secret',

  MAX_FILE_SIZE: 200 * 1024 * 1024, // 200 MB — covers phone videos
  ALLOWED_MIME_TYPES: [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  ],
};
