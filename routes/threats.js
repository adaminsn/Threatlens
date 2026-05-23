const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// ── Helper: mapping status DB → level feed ──────────────────────────────
function statusToLevel(status) {
  switch (status) {
    case 'dangerous':  return 'high';
    case 'suspicious': return 'med';
    case 'safe':       return 'low';
    default:           return 'low';
  }
}

// ── Format satu baris threat agar cocok dengan feed.html ────────────────
function formatThreat(t) {
  return {
    id:          t.id,
    user_id:     t.user_id,
    title:       t.title,
    target:      t.indicator,
    indicator:   t.indicator,
    type:        t.type,
    category:    t.category,
    description: t.description,
    status:      t.status,
    level:       statusToLevel(t.status),
    verified:    !!t.verified,
    verification_count: t.verification_count || 0,
    verification_list: t.verification_list || '[]',
    user:        t.username || 'Unknown',
    username:    t.username || 'Unknown',
    votes:       Number(t.vote_count    || 0),
    comments:    Number(t.comment_count || 0),
    createdAt:   t.created_at ? new Date(t.created_at).toLocaleDateString('id-ID', {
                   day: 'numeric', month: 'long', year: 'numeric',
                   hour: '2-digit', minute: '2-digit'
                 }) : '',
    created_at:  t.created_at,
  };
}

// ── GET /api/threats — semua laporan ────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        t.*,
        u.username,
        COUNT(DISTINCT v.id) AS vote_count,
        COUNT(DISTINCT c.id) AS comment_count
      FROM threats t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN votes v ON t.id = v.threat_id
      LEFT JOIN comments c ON t.id = c.threat_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    res.json(rows.map(formatThreat));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// ── GET /api/threats/my — laporan milik user yang login ─────────────────
// HARUS di atas /:id agar tidak tertangkap sebagai id
router.get('/my', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        t.*,
        u.username,
        COUNT(DISTINCT v.id) AS vote_count,
        COUNT(DISTINCT c.id) AS comment_count
      FROM threats t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN votes v ON t.id = v.threat_id
      LEFT JOIN comments c ON t.id = c.threat_id
      WHERE t.user_id = ?
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `, [req.user.id]);

    res.json(rows.map(formatThreat));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// GET /api/threats/:id — detail satu laporan
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        t.*,
        u.username,
        t.verification_count,
        t.verification_list,
        COUNT(DISTINCT v.id) AS vote_count,
        COUNT(DISTINCT c.id) AS comment_count
      FROM threats t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN votes v ON t.id = v.threat_id
      LEFT JOIN comments c ON t.id = c.threat_id
      WHERE t.id = ?
      GROUP BY t.id
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
    }

    res.json(formatThreat(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// POST /api/votes — vote untuk threat (dengan sistem skoring)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { threat_id, vote } = req.body;
    const userId = req.user.id;
    const userLevel = req.user.level || 1;

    // Cek apakah sudah pernah vote
    const [existing] = await db.query(
      'SELECT * FROM votes WHERE user_id = ? AND threat_id = ?',
      [userId, threat_id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Anda sudah memberikan vote untuk laporan ini.' });
    }

    // Hitung bobot vote (level 50+ = 3 poin, lainnya = 1 poin)
    let weight = 1;
    if (userLevel >= 50) weight = 3;

    // Vote value: dangerous = +1, safe = -1
    let voteValue = 0;
    if (vote === 'dangerous') voteValue = weight;
    else if (vote === 'safe') voteValue = -weight;

    // Simpan vote
    await db.query(
      'INSERT INTO votes (user_id, threat_id, vote, weight) VALUES (?, ?, ?, ?)',
      [userId, threat_id, vote, weight]
    );

    // Update threat vote score
    await db.query(
      'UPDATE threats SET vote_score = vote_score + ?, vote_count_total = vote_count_total + 1 WHERE id = ?',
      [voteValue, threat_id]
    );

    // Ambil data terbaru
    const [threat] = await db.query(
      'SELECT vote_score, vote_count_total, status FROM threats WHERE id = ?',
      [threat_id]
    );

    // Hitung persentase dan update status jika sudah 10 vote
    const totalVotes = threat[0].vote_count_total;
    const score = threat[0].vote_score;
    
    let newStatus = threat[0].status;
    
    if (totalVotes >= 10) {
      // Hitung persentase setuju (max score = totalVotes * 3)
      const maxPossibleScore = totalVotes * 3;
      const percentage = (score / maxPossibleScore) * 100;
      
      if (percentage >= 70) {
        newStatus = 'dangerous';  // HIGH RISK
      } else if (percentage >= 30) {
        newStatus = 'suspicious'; // MEDIUM RISK
      } else {
        newStatus = 'safe';       // LOW RISK
      }
      
      await db.query('UPDATE threats SET status = ? WHERE id = ?', [newStatus, threat_id]);
    }

    res.json({ 
      message: 'Vote berhasil!',
      vote_score: score,
      vote_count: totalVotes,
      status: newStatus,
      needsMoreVotes: totalVotes < 10
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// GET /api/votes/:threat_id — ambil data vote untuk threat
router.get('/:threat_id', async (req, res) => {
  try {
    const threatId = req.params.threat_id;
    
    // Hitung vote
    const [votes] = await db.query(`
      SELECT 
        SUM(CASE WHEN vote = 'dangerous' THEN weight ELSE 0 END) as dangerous_score,
        SUM(CASE WHEN vote = 'safe' THEN weight ELSE 0 END) as safe_score,
        COUNT(*) as total_votes
      FROM votes 
      WHERE threat_id = ?
    `, [threatId]);
    
    // Ambil status threat
    const [threat] = await db.query('SELECT status, vote_score, vote_count_total FROM threats WHERE id = ?', [threatId]);
    
    res.json({
      dangerous: votes[0].dangerous_score || 0,
      safe: votes[0].safe_score || 0,
      total: votes[0].total_votes || 0,
      status: threat[0]?.status || 'pending',
      vote_score: threat[0]?.vote_score || 0,
      vote_count_total: threat[0]?.vote_count_total || 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// POST /api/threats — submit laporan baru
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, indicator, type, category, description, status } = req.body;
    //                                                   ↑ TAMBAHKAN status

    if (!title || !indicator || !type || !category) {
      return res.status(400).json({ message: 'Semua field wajib diisi.' });
    }

    // Gunakan status yang dikirim, atau default 'pending' jika tidak ada
    const threatStatus = status || 'pending';

    const [result] = await db.query(
      'INSERT INTO threats (user_id, title, indicator, type, category, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, indicator, type, category, description, threatStatus]
    );

    // Update reputasi user +10
    await db.query('UPDATE users SET reputation = reputation + 10 WHERE id = ?', [req.user.id]);
    await db.query('UPDATE users SET level = FLOOR(reputation / 100) + 1 WHERE id = ?', [req.user.id]);

    res.status(201).json({ message: 'Laporan berhasil disubmit!', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// ── PATCH /api/threats/:id — edit laporan (owner / admin) ───────────────
router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM threats WHERE id = ?', [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
    }

    const threat = rows[0];

    if (threat.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Tidak ada izin untuk mengedit laporan ini.' });
    }

    const { title, target, indicator, description } = req.body;

    const newIndicator   = indicator || target || threat.indicator;
    const newTitle       = title       || threat.title;
    const newDescription = description || threat.description;

    await db.query(
      'UPDATE threats SET title = ?, indicator = ?, description = ?, updated_at = NOW() WHERE id = ?',
      [newTitle, newIndicator, newDescription, req.params.id]
    );

    res.json({ message: 'Laporan berhasil diperbarui.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// ── DELETE /api/threats/:id — hapus laporan (owner / admin) ─────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM threats WHERE id = ?', [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
    }

    const threat = rows[0];

    if (threat.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Tidak ada izin untuk menghapus laporan ini.' });
    }

    await db.query('DELETE FROM votes    WHERE threat_id = ?', [req.params.id]);
    await db.query('DELETE FROM comments WHERE threat_id = ?', [req.params.id]);
    await db.query('DELETE FROM threats  WHERE id = ?',        [req.params.id]);

    res.json({ message: 'Laporan berhasil dihapus.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// =====================================================
// PUT /api/threats/:id/verify — Multi-verifikasi (butuh 5 verifikator)
// =====================================================
router.put('/:id/verify', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Ambil data user untuk cek level
    const [userRows] = await db.query('SELECT level, reputation, username FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }
    
    const user = userRows[0];
    const userLevel = user.level || 1;
    
    // 🔥 Cek apakah user bisa verifikasi (level minimal 50 ATAU admin)
    const canVerify = (userRole === 'admin') || (userLevel >= 50);
    
    if (!canVerify) {
      return res.status(403).json({ 
        message: `⚠️ Level ${userLevel} belum cukup untuk memverifikasi. Minimal Level 50.`,
        requiredLevel: 50,
        currentLevel: userLevel
      });
    }

    // Cek apakah laporan ada
    const [threatRows] = await db.query('SELECT * FROM threats WHERE id = ?', [req.params.id]);
    if (threatRows.length === 0) {
      return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
    }

    const threat = threatRows[0];
    const currentVerificationCount = threat.verification_count || 0;
    const currentVerificationList = threat.verification_list ? JSON.parse(threat.verification_list) : [];

    // Cek apakah user sudah pernah verifikasi laporan ini
    if (currentVerificationList.includes(userId)) {
      return res.status(400).json({ message: 'Anda sudah pernah memverifikasi laporan ini.' });
    }

    // Cek apakah user sendiri yang membuat laporan
    if (threat.user_id === userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Tidak bisa memverifikasi laporan sendiri.' });
    }

    // Tentukan aksi
    let isVerified = threat.verified;
    let newVerificationCount = currentVerificationCount;
    let newVerificationList = [...currentVerificationList];
    let action = 'verify';

    // Jika laporan sudah verified dan admin, bisa unverify
    if (isVerified && userRole === 'admin') {
      isVerified = false;
      newVerificationCount = 0;
      newVerificationList = [];
      action = 'unverify';
    } else if (!isVerified) {
      newVerificationList.push(userId);
      newVerificationCount = currentVerificationCount + 1;
      
      if (newVerificationCount >= 5) {
        isVerified = true;
        action = 'fully_verified';
      } else {
        action = 'added_verification';
      }
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Update threat
      await connection.query(
        'UPDATE threats SET verified = ?, verification_count = ?, verification_list = ? WHERE id = ?',
        [isVerified ? 1 : 0, newVerificationCount, JSON.stringify(newVerificationList), req.params.id]
      );

      // Catat log verifikasi
      if (action !== 'unverify') {
        await connection.query(
          'INSERT INTO threat_verifications (threat_id, verifier_id) VALUES (?, ?)',
          [req.params.id, userId]
        );
      }

      // Update reputasi
      if (action === 'added_verification') {
        await connection.query('UPDATE users SET reputation = reputation + 5 WHERE id = ?', [userId]);
        await connection.query('UPDATE users SET level = FLOOR(reputation / 100) + 1 WHERE id = ?', [userId]);
      } else if (action === 'fully_verified') {
        // Bonus untuk pembuat laporan
        await connection.query('UPDATE users SET reputation = reputation + 50 WHERE id = ?', [threat.user_id]);
        await connection.query('UPDATE users SET level = FLOOR(reputation / 100) + 1 WHERE id = ?', [threat.user_id]);
        
        // Bonus untuk semua verifikator
        for (const verifierId of newVerificationList) {
          await connection.query('UPDATE users SET reputation = reputation + 10 WHERE id = ?', [verifierId]);
          await connection.query('UPDATE users SET level = FLOOR(reputation / 100) + 1 WHERE id = ?', [verifierId]);
        }
      }

      await connection.commit();

      let message = '';
      if (action === 'fully_verified') {
        message = '🎉 Laporan telah mencapai 5 verifikasi dan resmi TERVERIFIKASI!';
      } else if (action === 'added_verification') {
        message = `✅ Verifikasi ditambahkan! (${newVerificationCount}/5 verifikasi) +5 reputasi.`;
      } else if (action === 'unverify') {
        message = 'Verifikasi laporan dibatalkan oleh admin.';
      }

      res.json({ 
        message: message,
        verified: isVerified,
        verificationCount: newVerificationCount,
        neededVerifications: 5 - newVerificationCount,
        action: action
      });
      
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Error in verify:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server: ' + err.message });
  }
});

module.exports = router;