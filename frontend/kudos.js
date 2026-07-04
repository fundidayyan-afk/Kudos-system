const express = require('express');
const { randomUUID } = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { shouldFlag } = require('../utils/contentFilter');

const router = express.Router();

const MAX_MESSAGE_LENGTH = 500;
const DUPLICATE_WINDOW_SECONDS = 60;

// Rate limit kudos creation per user (spam edge case)
const createKudosLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: { code: 'RATE_LIMITED', message: 'You have reached the hourly limit for sending kudos.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// POST /api/kudos - create a new kudos
router.post('/', requireAuth, createKudosLimiter, (req, res) => {
  const { recipient_id, message } = req.body || {};

  if (!recipient_id || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'recipient_id and a non-empty message are required.' } });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` } });
  }

  if (recipient_id === req.user.id) {
    return res.status(400).json({ error: { code: 'SELF_KUDOS', message: 'You cannot send a kudos to yourself.' } });
  }

  const recipient = db.prepare('SELECT id FROM users WHERE id = ? AND is_active = 1').get(recipient_id);
  if (!recipient) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recipient not found.' } });
  }

  // Duplicate-submission check: same sender/recipient/message within window
  const duplicate = db
    .prepare(
      `SELECT id FROM kudos
       WHERE sender_id = ? AND recipient_id = ? AND message = ?
       AND created_at >= datetime('now', ?)`
    )
    .get(req.user.id, recipient_id, message.trim(), `-${DUPLICATE_WINDOW_SECONDS} seconds`);

  if (duplicate) {
    return res.status(409).json({ error: { code: 'DUPLICATE_SUBMISSION', message: 'This kudos looks like a duplicate of one you just sent.' } });
  }

  const cleanMessage = escapeHtml(message.trim());
  const flagged = shouldFlag(cleanMessage) ? 1 : 0;
  const id = randomUUID();

  db.prepare(
    `INSERT INTO kudos (id, sender_id, recipient_id, message, is_visible, is_flagged)
     VALUES (?, ?, ?, ?, 1, ?)`
  ).run(id, req.user.id, recipient_id, cleanMessage, flagged);

  const created = db
    .prepare(
      `SELECT kudos.*, s.name as sender_name, r.name as recipient_name
       FROM kudos
       JOIN users s ON s.id = kudos.sender_id
       JOIN users r ON r.id = kudos.recipient_id
       WHERE kudos.id = ?`
    )
    .get(id);

  res.status(201).json({ kudos: created });
});

// GET /api/kudos?page=&limit= - public feed (visible only)
router.get('/', requireAuth, (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const offset = (page - 1) * limit;

  const rows = db
    .prepare(
      `SELECT kudos.id, kudos.message, kudos.created_at,
              s.id as sender_id, s.name as sender_name, s.is_active as sender_active,
              r.id as recipient_id, r.name as recipient_name, r.is_active as recipient_active
       FROM kudos
       JOIN users s ON s.id = kudos.sender_id
       JOIN users r ON r.id = kudos.recipient_id
       WHERE kudos.is_visible = 1
       ORDER BY kudos.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM kudos WHERE is_visible = 1').get().count;

  res.json({
    kudos: rows,
    pagination: { page, limit, total, hasMore: offset + rows.length < total },
  });
});

// POST /api/kudos/:id/report - user reports a kudos as inappropriate
router.post('/:id/report', requireAuth, (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};

  const kudos = db.prepare('SELECT id FROM kudos WHERE id = ?').get(id);
  if (!kudos) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kudos not found.' } });
  }

  db.prepare(
    `INSERT INTO reports (id, kudos_id, reported_by, reason) VALUES (?, ?, ?, ?)`
  ).run(randomUUID(), id, req.user.id, reason ? String(reason).slice(0, 500) : null);

  res.status(201).json({ message: 'Report submitted. Thank you — an administrator will review it.' });
});

module.exports = router;
