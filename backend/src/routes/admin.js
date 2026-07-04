const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireAdmin);

// GET /api/admin/kudos?page=&limit= - all kudos including hidden, for moderation
router.get('/kudos', (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const offset = (page - 1) * limit;

  const rows = db
    .prepare(
      `SELECT kudos.*, s.name as sender_name, r.name as recipient_name, m.name as moderated_by_name
       FROM kudos
       JOIN users s ON s.id = kudos.sender_id
       JOIN users r ON r.id = kudos.recipient_id
       LEFT JOIN users m ON m.id = kudos.moderated_by
       ORDER BY kudos.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM kudos').get().count;

  res.json({ kudos: rows, pagination: { page, limit, total, hasMore: offset + rows.length < total } });
});

// PATCH /api/admin/kudos/:id/hide - soft-hide a kudos
router.patch('/kudos/:id/hide', (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};

  const kudos = db.prepare('SELECT id FROM kudos WHERE id = ?').get(id);
  if (!kudos) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kudos not found.' } });
  }

  db.prepare(
    `UPDATE kudos
     SET is_visible = 0, moderated_by = ?, moderated_at = datetime('now'),
         reason_for_moderation = ?, moderation_action = 'hidden'
     WHERE id = ?`
  ).run(req.user.id, reason ? String(reason).slice(0, 500) : null, id);

  res.json({ message: 'Kudos hidden.' });
});

// PATCH /api/admin/kudos/:id/restore - un-hide a kudos
router.patch('/kudos/:id/restore', (req, res) => {
  const { id } = req.params;

  const kudos = db.prepare('SELECT id FROM kudos WHERE id = ?').get(id);
  if (!kudos) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kudos not found.' } });
  }

  db.prepare(
    `UPDATE kudos
     SET is_visible = 1, moderated_by = ?, moderated_at = datetime('now'),
         reason_for_moderation = NULL, moderation_action = 'restored'
     WHERE id = ?`
  ).run(req.user.id, id);

  res.json({ message: 'Kudos restored.' });
});

// DELETE /api/admin/kudos/:id - hard delete
router.delete('/kudos/:id', (req, res) => {
  const { id } = req.params;

  const kudos = db.prepare('SELECT id FROM kudos WHERE id = ?').get(id);
  if (!kudos) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kudos not found.' } });
  }

  db.prepare('DELETE FROM reports WHERE kudos_id = ?').run(id);
  db.prepare('DELETE FROM kudos WHERE id = ?').run(id);

  res.json({ message: 'Kudos permanently deleted.' });
});

// GET /api/admin/reports - list open user reports
router.get('/reports', (req, res) => {
  const rows = db
    .prepare(
      `SELECT reports.*, u.name as reported_by_name,
              kudos.message as kudos_message, kudos.is_visible as kudos_is_visible
       FROM reports
       JOIN users u ON u.id = reports.reported_by
       JOIN kudos ON kudos.id = reports.kudos_id
       ORDER BY reports.created_at DESC`
    )
    .all();

  res.json({ reports: rows });
});

module.exports = router;
