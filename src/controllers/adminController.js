const db = require('../config/database');
const UserModel = require('../models/userModel');
const ThreatModel = require('../models/threatModel');

const adminController = {
  // =============================================
  // DASHBOARD STATISTICS
  // =============================================
  
  getStats: async (req, res) => {
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
      console.error('Error in admin stats:', err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // =============================================
  // USER MANAGEMENT
  // =============================================
  
  getAllUsers: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT 
          id, username, email, role, reputation, level, avatar, bio, created_at, last_activity,
          (SELECT COUNT(*) FROM threats WHERE user_id = users.id) as total_reports,
          (SELECT COUNT(*) FROM votes WHERE user_id = users.id) as total_votes
        FROM users
        ORDER BY created_at DESC
      `);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  updateUser: async (req, res) => {
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
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const userId = req.params.id;
      
      const [user] = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
      if (user.length === 0) {
        return res.status(404).json({ message: 'User tidak ditemukan.' });
      }
      
      if (user[0].role === 'admin') {
        return res.status(403).json({ message: 'Tidak bisa menghapus user admin.' });
      }
      
      await db.query('DELETE FROM votes WHERE user_id = ?', [userId]);
      await db.query('DELETE FROM comments WHERE user_id = ?', [userId]);
      await db.query('DELETE FROM threat_verifications WHERE verifier_id = ?', [userId]);
      await db.query('DELETE FROM threats WHERE user_id = ?', [userId]);
      await db.query('DELETE FROM users WHERE id = ?', [userId]);
      
      res.json({ message: 'User berhasil dihapus.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // =============================================
  // REPORT MANAGEMENT
  // =============================================
  
  getAllReports: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT 
          t.id, t.title, t.indicator, t.type, t.category, t.status,
          t.verified, t.verification_count, t.created_at,
          u.id as user_id, u.username,
          (SELECT COUNT(*) FROM votes WHERE threat_id = t.id) as vote_count,
          (SELECT COUNT(*) FROM comments WHERE threat_id = t.id) as comment_count
        FROM threats t
        LEFT JOIN users u ON t.user_id = u.id
        ORDER BY t.created_at DESC
      `);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  deleteReport: async (req, res) => {
    try {
      const reportId = req.params.id;
      
      await db.query('DELETE FROM votes WHERE threat_id = ?', [reportId]);
      await db.query('DELETE FROM comments WHERE threat_id = ?', [reportId]);
      await db.query('DELETE FROM threat_verifications WHERE threat_id = ?', [reportId]);
      
      const [result] = await db.query('DELETE FROM threats WHERE id = ?', [reportId]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
      }
      
      res.json({ message: 'Laporan berhasil dihapus.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // =============================================
  // ADMIN VERIFICATION (LANGSUNG HIGH RISK)
  // =============================================
  
  verifyReport: async (req, res) => {
    try {
      const reportId = req.params.id;
      const adminId = req.user.id;
      
      const [threat] = await db.query('SELECT verified, status FROM threats WHERE id = ?', [reportId]);
      if (threat.length === 0) {
        return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
      }
      
      const newVerified = threat[0].verified ? 0 : 1;
      
      if (newVerified === 1) {
        // Admin verifikasi langsung jadi HIGH RISK
        await db.query(
          'UPDATE threats SET verified = 1, status = "dangerous", verification_count = 1, verification_list = ? WHERE id = ?',
          [JSON.stringify([adminId]), reportId]
        );
        
        await db.query(
          'INSERT INTO threat_verifications (threat_id, verifier_id, verified_at) VALUES (?, ?, NOW())',
          [reportId, adminId]
        );
        
        const [threatData] = await db.query('SELECT user_id FROM threats WHERE id = ?', [reportId]);
        await db.query('UPDATE users SET reputation = reputation + 50, level = FLOOR(reputation / 100) + 1 WHERE id = ?', 
          [threatData[0].user_id]);
        
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
        res.json({ 
          message: 'Verifikasi laporan dibatalkan.',
          verified: false,
          status: 'pending'
        });
      }
    } catch (err) {
      console.error('Error in admin verify:', err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // =============================================
  // VERIFICATION HISTORY
  // =============================================
  
  getVerificationHistory: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT 
          tv.id, tv.threat_id, t.title as report_title, t.indicator as report_indicator,
          t.verified as report_verified, tv.verifier_id, u.username as verifier_name,
          u.level as verifier_level, tv.verified_at
        FROM threat_verifications tv
        LEFT JOIN threats t ON tv.threat_id = t.id
        LEFT JOIN users u ON tv.verifier_id = u.id
        ORDER BY tv.verified_at DESC
      `);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  }
};

module.exports = adminController;