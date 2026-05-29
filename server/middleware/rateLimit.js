// Simple in-memory rate limiter — no Redis needed for local-network use.
// Tracks attempts per IP. Resets window after WINDOW_MS.

const store = new Map(); // ip → { count, resetAt }

const WINDOW_MS  = 15 * 60 * 1000; // 15 min
const MAX_HITS   = 10;              // attempts before lockout

function loginRateLimit(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();

  let entry = store.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(ip, entry);
  }

  entry.count++;

  if (entry.count > MAX_HITS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      error: 'Too many login attempts. Try again later.',
      retryAfter,
    });
  }

  // On success the route will call clearLoginAttempts(ip)
  req._rateLimitIp = ip;
  next();
}

function clearLoginAttempts(ip) {
  store.delete(ip);
}

module.exports = { loginRateLimit, clearLoginAttempts };
