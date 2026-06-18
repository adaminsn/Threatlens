const express = require('express');
const router = express.Router();
const db = require('../src/config/database');
const { verifyToken } = require('../src/middlewares/auth');

// GET /api/votes/:threat_id — jumlah vote + cek apakah user sudah vote
router.get('/:threat_id', verifyToken, async (req, res) => {
  try {
    const { threat_id } = req.params;

    // Hitung vote dangerous dan safe
    const [counts] = await db.query(
      `SELECT
         SUM(vote = 'dangerous') AS dangerous,
         SUM(vote = 'safe')      AS safe
       FROM votes WHERE threat_id = ?`,
      [threat_id]
    );

    // Cek apakah user ini sudah vote
    const [existing] = await db.query(
      'SELECT vote FROM votes WHERE user_id = ? AND threat_id = ?',
      [req.user.id, threat_id]
    );

    res.json({
      dangerous:  Number(counts[0].dangerous || 0),
      safe:       Number(counts[0].safe      || 0),
      user_vote:  existing.length > 0 ? existing[0].vote : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// POST /api/votes — kirim vote (cek duplikat di backend)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { threat_id, vote } = req.body;

    if (!threat_id || !vote) {
      return res.status(400).json({ message: 'Data tidak lengkap.' });
    }

    // Cek sudah vote belum
    const [existing] = await db.query(
      'SELECT * FROM votes WHERE user_id = ? AND threat_id = ?',
      [req.user.id, threat_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Kamu sudah melakukan voting.' });
    }

    await db.query(
      'INSERT INTO votes (user_id, threat_id, vote) VALUES (?, ?, ?)',
      [req.user.id, threat_id, vote]
    );

    // Update reputasi user yang submit laporan
    await db.query(
      'UPDATE users SET reputation = reputation + 1 WHERE id = (SELECT user_id FROM threats WHERE id = ?)',
      [threat_id]
    );

    res.json({ message: 'Vote berhasil!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

module.exports = router;