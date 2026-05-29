const QRCode = require('qrcode');
const os = require('os');
const config = require('../config');

/**
 * Returns the best available hotspot IP at call-time.
 * Checks Windows (192.168.137.x) and Mac (192.168.2.x) hotspot ranges first,
 * then falls back to the first non-internal IPv4.
 */
function getLiveIp() {
  const nets = Object.values(os.networkInterfaces()).flat();
  const ipv4 = nets.filter((a) => a.family === 'IPv4' && !a.internal);

  const hotspot = ipv4.find(
    (a) => a.address.startsWith('192.168.137.') || a.address.startsWith('192.168.2.')
  );
  return (hotspot || ipv4[0])?.address || null;
}

function getEventJoinUrl(eventId) {
  const clientPort = config.CLIENT_PORT || 3000;
  const liveIp = getLiveIp();
  const host = liveIp || 'localhost';
  return `http://${host}:${clientPort}/event/${encodeURIComponent(eventId)}`;
}

async function generateEventQr(eventId) {
  const url = getEventJoinUrl(eventId);
  return QRCode.toBuffer(url, { type: 'png', width: 360, margin: 2 });
}

module.exports = {
  getLiveIp,
  getEventJoinUrl,
  generateEventQr,
};
