const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Missing or invalid Authorization header.' } });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email, role, name }
    next();
  } catch (err) {
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid or expired token.' } });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Administrator role required.' } });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, JWT_SECRET };
