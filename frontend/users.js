const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - list colleagues for the recipient dropdown (excludes the caller)
router.get('/', requireAuth, (req, res) => {
  const users = db
    .prepare('SELECT id, name, email FROM users WHERE is_active = 1 AND id != ? ORDER BY name ASC')
    .all(req.user.id);

  res.json({ users });
});

module.exports = router;
