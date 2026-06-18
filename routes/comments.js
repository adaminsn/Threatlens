const express = require('express');
const router = express.Router();
const db = require('../src/config/database');
const { verifyToken } = require('../src/middlewares/auth');

// GET komentar by threat_id
router.get('/:threat_id', async (req, res) => {
  try {
    const [comments] = await db.query(
      `SELECT c.*, u.username 
       FROM comments c 
       LEFT JOIN users u ON c.user_id = u.id 
       WHERE c.threat_id = ? 
       ORDER BY c.created_at ASC`,
      [req.params.threat_id]
    );
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// POST komentar baru
router.post('/', verifyToken, async (req, res) => {
  try {
    const { threat_id, content } = req.body;

    if (!threat_id || !content) {
      return res.status(400).json({ message: 'Data tidak lengkap.' });
    }

    await db.query(
      'INSERT INTO comments (user_id, threat_id, content) VALUES (?, ?, ?)',
      [req.user.id, threat_id, content]
    );

    res.status(201).json({ message: 'Komentar berhasil ditambahkan!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

module.exports = router;