const express = require('express');
const config = require('../config');
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

module.exports = router;
