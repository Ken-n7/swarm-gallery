const express = require('express');
const db = require('../db');
const { generateEventQr } = require('../utils/qr');

const router = express.Router();
const getEvent = db.prepare('SELECT id, name, status, created_at FROM events WHERE id = ?');

router.get('/:id', (req, res) => {
  const event = getEvent.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json({
    id: event.id,
    name: event.name,
    status: event.status,
    createdAt: event.created_at,
  });
});

router.get('/:id/qr', async (req, res) => {
  const event = getEvent.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  try {
    const buffer = await generateEventQr(event.id);
    res.type('png').send(buffer);
  } catch (error) {
    console.error('QR generation failed:', error);
    res.status(500).json({ error: 'Unable to generate QR code' });
  }
});

module.exports = router;
