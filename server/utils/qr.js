const QRCode = require('qrcode');
const config = require('../config');

function getEventJoinUrl(eventId) {
  const base = (config.CLIENT_URL || '').replace(/\/$/, '') || 'http://localhost:3000';
  return `${base}/event/${encodeURIComponent(eventId)}`;
}

async function generateEventQr(eventId) {
  const url = getEventJoinUrl(eventId);
  return QRCode.toBuffer(url, { type: 'png', width: 360, margin: 2 });
}

module.exports = {
  getEventJoinUrl,
  generateEventQr,
};
