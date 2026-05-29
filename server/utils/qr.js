const QRCode = require('qrcode');
const os = require('os');
const config = require('../config');

/**
 * Returns the best available hotspot IP at call-time.
 * Checks Windows (192.168.137.x) and Mac (192.168.2.x) hotspot ranges first,
 * then falls back to the first non-internal IPv4.
 */
const SKIP_NAMES = /virtual|vbox|vmware|hyper.v|vethernet|docker|loopback|tunnel|teredo|isatap/i;
const SKIP_MACS  = /^(00:50:56|00:0c:29|08:00:27|0a:00:27|00:15:5d)/i;
const APIPA      = /^169\.254\./;
const WIFI_NAMES = /wi.?fi|wlan|wireless/i;
const ETH_NAMES  = /ethernet|eth\b|lan\b/i;

function getReachableIps() {
  const candidates = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (SKIP_NAMES.test(name)) continue;
    for (const a of addrs) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (APIPA.test(a.address)) continue;
      if (SKIP_MACS.test(a.mac || '')) continue;
      candidates.push({ name, address: a.address });
    }
  }
  return candidates;
}

function getLiveIp() {
  const candidates = getReachableIps();
  const pick = (fn) => candidates.find(fn)?.address;
  return (
    pick((c) => c.address.startsWith('192.168.137.') || c.address.startsWith('192.168.2.')) ||
    pick((c) => WIFI_NAMES.test(c.name)) ||
    pick((c) => ETH_NAMES.test(c.name)) ||
    candidates[0]?.address ||
    null
  );
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
  getReachableIps,
  getLiveIp,
  getEventJoinUrl,
  generateEventQr,
};
