function requireAdmin(req, res, next) {
  if (req.signedCookies && req.signedCookies.admin === 'true') {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

module.exports = { requireAdmin };
