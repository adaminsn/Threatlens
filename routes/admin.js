const express = require('express');
const router = express.Router();
const db = require('../src/config/database');
const { verifyToken } = require('../src/middlewares/auth');

// Middleware untuk cek admin
async function isAdmin(req, res, next) {
  try {
    const [rows] = await db.query('SELECT role FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0 || rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'Akses ditolak. Hanya untuk admin.' });
    }
    next();
  } catch (err) {
    console.error('Error in isAdmin middleware:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
}

// =====================================================
// GET /api/admin/stats — Statistik dashboard
// =====================================================
router.get('/stats', verifyToken, isAdmin, async (req, res) => {
  try {
    const [totalUsers] = await db.query("SELECT COUNT(*) as total FROM users WHERE role = 'user'");
    const [totalReports] = await db.query('SELECT COUNT(*) as total FROM threats');
    const [verifiedReports] = await db.query('SELECT COUNT(*) as total FROM threats WHERE verified = 1');
    const [totalVotes] = await db.query('SELECT COUNT(*) as total FROM votes');
    const [totalComments] = await db.query('SELECT COUNT(*) as total FROM comments');
    const [onlineUsers] = await db.query(
      "SELECT COUNT(*) as total FROM users WHERE last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE)"
    );
    const [newUsersToday] = await db.query(
      "SELECT COUNT(*) as total FROM users WHERE DATE(created_at) = CURDATE()"
    );
    const [newReportsToday] = await db.query(
      "SELECT COUNT(*) as total FROM threats WHERE DATE(created_at) = CURDATE()"
    );
    
    res.json({
      total_users: totalUsers[0].total,
      total_reports: totalReports[0].total,
      verified_reports: verifiedReports[0].total,
      total_votes: totalVotes[0].total,
      total_comments: totalComments[0].total,
      online_users: onlineUsers[0].total,
      new_users_today: newUsersToday[0].total,
      new_reports_today: newReportsToday[0].total
    });
  } catch (err) {
    console.error('Error in /admin/stats:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// =====================================================
// GET /api/admin/reports — Semua laporan
// =====================================================
router.get('/reports', verifyToken, isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        t.id,
        t.title,
        t.indicator,
        t.type,
        t.category,
        t.status,
        t.verified,
        t.verification_count,
        t.verification_list,
        t.created_at,
        u.id as user_id,
        u.username,
        (SELECT COUNT(*) FROM votes WHERE threat_id = t.id) as vote_count,
        (SELECT COUNT(*) FROM comments WHERE threat_id = t.id) as comment_count
      FROM threats t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `);
    
    res.json(rows);
  } catch (err) {
    console.error('Error in /admin/reports:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// =====================================================
// PUT /api/admin/reports/:id/status — Update status report
// =====================================================
router.put('/reports/:id/status', verifyToken, isAdmin, async (req, res) => {
  try {
    const reportId = req.params.id;
    const { status } = req.body;
    
    const allowedStatus = ['pending', 'investigating', 'dangerous', 'resolved', 'false_report'];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: 'Status tidak valid.' });
    }
    
    const [threat] = await db.query('SELECT * FROM threats WHERE id = ?', [reportId]);
    if (threat.length === 0) {
      return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
    }
    
    await db.query('UPDATE threats SET status = ? WHERE id = ?', [status, reportId]);
    
    res.json({ 
      message: `Status laporan diubah menjadi ${status}.`,
      status: status
    });
  } catch (err) {
    console.error('Error updating report status:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// =====================================================
// DELETE /api/admin/reports/:id — Hapus laporan
// =====================================================
router.delete('/reports/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const reportId = req.params.id;
    
    // Mulai transaction
    await db.query('START TRANSACTION');
    
    await db.query('DELETE FROM votes WHERE threat_id = ?', [reportId]);
    await db.query('DELETE FROM comments WHERE threat_id = ?', [reportId]);
    await db.query('DELETE FROM threat_verifications WHERE threat_id = ?', [reportId]);
    
    const [result] = await db.query('DELETE FROM threats WHERE id = ?', [reportId]);
    
    if (result.affectedRows === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
    }
    
    await db.query('COMMIT');
    res.json({ message: 'Laporan berhasil dihapus.' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error deleting report:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// =====================================================
// PUT /api/admin/reports/:id/verify — Verifikasi laporan oleh admin
// =====================================================
router.put('/reports/:id/verify', verifyToken, isAdmin, async (req, res) => {
  try {
    const reportId = req.params.id;
    const adminId = req.user.id;
    
    const [threat] = await db.query('SELECT * FROM threats WHERE id = ?', [reportId]);
    if (threat.length === 0) {
      return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
    }
    
    const newVerified = threat[0].verified ? 0 : 1;
    
    await db.query('START TRANSACTION');
    
    if (newVerified === 1) {
      await db.query(
        'UPDATE threats SET verified = 1, status = "dangerous", verification_count = 1, verification_list = ? WHERE id = ?',
        [JSON.stringify([adminId]), reportId]
      );
      
      await db.query(
        'INSERT INTO threat_verifications (threat_id, verifier_id, verified_at) VALUES (?, ?, NOW())',
        [reportId, adminId]
      );
      
      const [threatData] = await db.query('SELECT user_id FROM threats WHERE id = ?', [reportId]);
      await db.query('UPDATE users SET reputation = reputation + 50, level = FLOOR(reputation / 100) + 1 WHERE id = ?', [threatData[0].user_id]);
      
      await db.query('COMMIT');
      
      res.json({ 
        message: '✅ Laporan diverifikasi oleh ADMIN dan menjadi HIGH RISK!',
        verified: true,
        status: 'dangerous'
      });
    } else {
      await db.query(
        'UPDATE threats SET verified = 0, status = "pending", verification_count = 0, verification_list = NULL WHERE id = ?',
        [reportId]
      );
      
      await db.query('COMMIT');
      
      res.json({ 
        message: 'Verifikasi laporan dibatalkan.',
        verified: false,
        status: 'pending'
      });
    }
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error in admin verify:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// =====================================================
// GET /api/admin/verifications — Riwayat verifikasi
// =====================================================
router.get('/verifications', verifyToken, isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        tv.id,
        tv.threat_id,
        t.title as report_title,
        t.indicator as report_indicator,
        t.verified as report_verified,
        t.status,
        tv.verifier_id,
        u.username as verifier_name,
        u.level as verifier_level,
        tv.verified_at
      FROM threat_verifications tv
      LEFT JOIN threats t ON tv.threat_id = t.id
      LEFT JOIN users u ON tv.verifier_id = u.id
      ORDER BY tv.verified_at DESC
    `);
    
    res.json(rows);
  } catch (err) {
    console.error('Error in /admin/verifications:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// =====================================================
// GET /api/admin/users — Semua user
// =====================================================
router.get('/users', verifyToken, isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id,
        username,
        email,
        role,
        reputation,
        level,
        avatar,
        bio,
        created_at,
        last_activity,
        (SELECT COUNT(*) FROM threats WHERE user_id = users.id) as total_reports,
        (SELECT COUNT(*) FROM votes WHERE user_id = users.id) as total_votes
      FROM users
      ORDER BY created_at DESC
    `);
    
    res.json(rows);
  } catch (err) {
    console.error('Error in /admin/users:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// =====================================================
// PUT /api/admin/users/:id — Edit user
// =====================================================
router.put('/users/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, email, role, reputation } = req.body;
    
    const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }
    
    await db.query(
      'UPDATE users SET username = ?, email = ?, role = ?, reputation = ?, level = FLOOR(? / 100) + 1 WHERE id = ?',
      [username, email, role, reputation, reputation, userId]
    );
    
    res.json({ message: 'User berhasil diupdate.' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// =====================================================
// DELETE /api/admin/users/:id — Hapus user
// =====================================================
router.delete('/users/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    const [user] = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (user.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }
    
    if (user[0].role === 'admin') {
      return res.status(403).json({ message: 'Tidak bisa menghapus user admin.' });
    }
    
    await db.query('START TRANSACTION');
    
    await db.query('DELETE FROM votes WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM comments WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM threat_verifications WHERE verifier_id = ?', [userId]);
    await db.query('DELETE FROM threats WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    
    await db.query('COMMIT');
    
    res.json({ message: 'User berhasil dihapus.' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// =====================================================
// GET /api/admin/settings — Ambil pengaturan aplikasi
// =====================================================
router.get('/settings', verifyToken, isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM settings WHERE id = 1');
    
    if (rows.length === 0) {
      // Return default settings jika belum ada
      return res.json({
        site_name: 'ThreatLens',
        maintenance_mode: 0,
        report_cooldown: 60
      });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error getting settings:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// =====================================================
// PUT /api/admin/settings — Update pengaturan aplikasi
// =====================================================
router.put('/settings', verifyToken, isAdmin, async (req, res) => {
  try {
    const { site_name, maintenance_mode, report_cooldown } = req.body;
    
    // Validasi input
    const cooldown = parseInt(report_cooldown);
    if (isNaN(cooldown) || cooldown < 0 || cooldown > 3600) {
      return res.status(400).json({ message: 'Cooldown harus antara 0-3600 detik.' });
    }
    
    const maintenance = maintenance_mode === 1 || maintenance_mode === true ? 1 : 0;
    const siteName = site_name ? site_name.trim() : 'ThreatLens';
    
    // Cek apakah settings sudah ada
    const [existing] = await db.query('SELECT id FROM settings WHERE id = 1');
    
    if (existing.length === 0) {
      await db.query(
        'INSERT INTO settings (id, site_name, maintenance_mode, report_cooldown) VALUES (1, ?, ?, ?)',
        [siteName, maintenance, cooldown]
      );
    } else {
      await db.query(
        'UPDATE settings SET site_name = ?, maintenance_mode = ?, report_cooldown = ? WHERE id = 1',
        [siteName, maintenance, cooldown]
      );
    }
    
    res.json({ 
      message: 'Pengaturan berhasil disimpan.',
      settings: { site_name: siteName, maintenance_mode: maintenance, report_cooldown: cooldown }
    });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

module.exports = router;