const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const db = require('../config/database'); // 🔥 TAMBAHKAN INI
const { verifyToken } = require('../middlewares/auth');

const authController = {
  // =============================================
  // AUTHENTICATION
  // =============================================
  
  // POST /api/auth/register
  register: async (req, res) => {
    try {
      const { username, email, password } = req.body;

      const existingUser = await UserModel.findByUsernameOrEmail(username, email);
      if (existingUser.length > 0) {
        return res.status(400).json({ message: 'Username atau email sudah digunakan.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await UserModel.create(username, email, hashedPassword);

      res.status(201).json({ message: 'Registrasi berhasil! Silakan login.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // POST /api/auth/login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(400).json({ message: 'Email atau password salah.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Email atau password salah.' });
      }

      await UserModel.updateLastActivity(user.id);

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, level: user.level || 1 },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login berhasil!',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          reputation: user.reputation,
          level: user.level || 1,
          avatar: user.avatar || '',
          bio: user.bio || '',
          created_at: user.created_at
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // GET /api/auth/me
  getMe: async (req, res) => {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User tidak ditemukan.' });
      }
      res.json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // PUT /api/auth/update-profile
  updateProfile: async (req, res) => {
    try {
      const { username, email, bio } = req.body;
      const userId = req.user.id;

      const existingEmail = await UserModel.findByEmail(email);
      if (existingEmail && existingEmail.id !== userId) {
        return res.status(400).json({ message: 'Email sudah digunakan oleh user lain.' });
      }

      await UserModel.updateProfile(userId, username, email, bio);

      const updatedUser = await UserModel.findById(userId);
      res.json({ message: 'Profil berhasil diperbarui!', user: updatedUser });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // PUT /api/auth/change-password
  changePassword: async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user.id;

      const user = await UserModel.findByEmail(req.user.email);
      const isValid = await bcrypt.compare(oldPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ message: 'Password lama salah.' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await UserModel.updatePassword(userId, hashedPassword);

      res.json({ message: 'Password berhasil diubah!' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // POST /api/auth/upload-avatar
  uploadAvatar: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
      }

      const userId = req.user.id;
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      await UserModel.updateAvatar(userId, avatarUrl);
      const user = await UserModel.findById(userId);

      res.json({ message: 'Foto profil berhasil diupdate!', avatarUrl, user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Gagal mengunggah foto.' });
    }
  },

  // =============================================
  // LEADERBOARD & STATS
  // =============================================

  // GET /api/auth/top-hunters
  getTopHunters: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const [rows] = await db.query(`
        SELECT 
          id, username, reputation, level, avatar,
          (SELECT COUNT(*) FROM threats WHERE user_id = users.id) as total_reports
        FROM users 
        WHERE role = 'user'
        ORDER BY reputation DESC
        LIMIT ?
      `, [limit]);
      
      res.json(rows.map((user, i) => ({ rank: i + 1, ...user })));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // GET /api/auth/top-contributors
  getTopContributors: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const [rows] = await db.query(`
        SELECT 
          u.id, u.username, u.reputation, u.level, u.avatar,
          COUNT(DISTINCT t.id) as total_reports,
          COUNT(DISTINCT v.id) as total_votes
        FROM users u
        LEFT JOIN threats t ON t.user_id = u.id
        LEFT JOIN votes v ON v.threat_id = t.id
        WHERE u.role = 'user'
        GROUP BY u.id
        ORDER BY total_reports DESC, total_votes DESC
        LIMIT ?
      `, [limit]);
      
      res.json(rows.map((user, i) => ({ rank: i + 1, ...user })));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // GET /api/auth/online-users
  getOnlineUsers: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT id, username, avatar, role 
        FROM users 
        WHERE role IN ('user', 'admin')
        AND last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        ORDER BY last_activity DESC
        LIMIT 20
      `);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // POST /api/auth/update-activity
  updateActivity: async (req, res) => {
    try {
      await db.query('UPDATE users SET last_activity = NOW() WHERE id = ?', [req.user.id]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },

  // GET /api/auth/user/:id
  getUserById: async (req, res) => {
    try {
      const [rows] = await db.query(
        'SELECT id, username, avatar, level, reputation FROM users WHERE id = ?',
        [req.params.id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ message: 'User tidak ditemukan.' });
      }
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },

  // GET /api/auth/achievements
  getAchievements: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT achievement_type, achieved_at 
        FROM user_achievements 
        WHERE user_id = ?
        ORDER BY achieved_at ASC
      `, [req.user.id]);
      
      const allAchievements = [
        { type: 'first_verification', name: '🛡️ First Verifier', desc: 'Memverifikasi laporan pertama', icon: '🎯' },
        { type: 'trusted_verifier', name: '⭐ Trusted Verifier', desc: '10 laporan diverifikasi', icon: '🌟' },
        { type: 'elite_verifier', name: '🏆 Elite Verifier', desc: '50 laporan diverifikasi', icon: '👑' },
        { type: 'verification_master', name: '💎 Verification Master', desc: '100 laporan diverifikasi', icon: '🔱' }
      ];
      
      const userAchievements = rows.map(r => r.achievement_type);
      const achievements = allAchievements.map(ach => ({
        ...ach,
        achieved: userAchievements.includes(ach.type),
        achieved_at: rows.find(r => r.achievement_type === ach.type)?.achieved_at
      }));
      
      res.json(achievements);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // GET /api/auth/user-rank
  getUserRank: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT COUNT(*) + 1 AS rank
        FROM users 
        WHERE reputation > (SELECT reputation FROM users WHERE id = ?)
      `, [req.user.id]);
      
      const rank = rows[0].rank;
      const [totalUsers] = await db.query('SELECT COUNT(*) AS total FROM users WHERE role = "user"');
      
      res.json({ 
        rank: rank,
        totalUsers: totalUsers[0].total,
        percentile: Math.round((totalUsers[0].total - rank) / totalUsers[0].total * 100)
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = authController;