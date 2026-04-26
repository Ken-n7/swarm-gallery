require('dotenv').config();
const path = require('path');

const ROOT = path.join(__dirname);

module.exports = {
  PORT: process.env.PORT || 4000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',

  DB_PATH: path.join(ROOT, 'data', 'gallery.db'),

  STORAGE: {
    EVENTS: path.join(ROOT, 'storage', 'events'),
    AVATARS: path.join(ROOT, 'storage', 'avatars'),
  },

  DEMO_EVENT_ID: 'demo',

  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'dev-secret',

  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
};
