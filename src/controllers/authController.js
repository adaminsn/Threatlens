const path       = require('path');
const fs         = require('fs');
const AuthService = require('../services/authService');
const UserModel   = require('../models/userModel');

// =====================================================
// AUTH CONTROLLER
// Hanya berisi: validasi input, pemanggilan AuthService/UserModel,
// pengiriman response JSON.
// =====================================================

// Helper untuk kirim error response
const handleError = (res, err) => {
  console.error('❌ AuthController Error:', err.message || err);
  const body = { message: err.message || 'Terjadi kesalahan server.' };
  if (err.needVerification) { body.needVerification = true; body.email = err.email; }
  res.status(err.status || 500).json(body);
};

const authController = {

  // ──────────────────────────────────────────────────
  // REGISTER & LOGIN
  // ──────────────────────────────────────────────────

  register: async (req, res) => {
    try {
      const { username, email, password } = req.body;
      const result = await AuthService.register(username, email, password);
      res.status(201).json({
        message: 'Registrasi berhasil! Silakan cek email Anda untuk verifikasi.',
        ...result
      });
    } catch (err) { handleError(res, err); }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const userAgent = req.headers['user-agent']       || 'Unknown Device';
      const ip        = req.ip || req.connection?.remoteAddress || 'Unknown IP';

      const result = await AuthService.login(email, password, userAgent, ip);
      res.json({ success: true, message: 'Login berhasil!', ...result });
    } catch (err) { handleError(res, err); }
  },

  // ──────────────────────────────────────────────────
  // EMAIL VERIFICATION
  // ──────────────────────────────────────────────────

  verifyEmail: async (req, res) => {
    try {
      const { token } = req.query;
      await AuthService.verifyEmail(token);
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      res.redirect(`${baseUrl}/pages/login.html?verified=true`);
    } catch (err) { handleError(res, err); }
  },

  resendVerification: async (req, res) => {
    try {
      const { email } = req.body;
      await AuthService.resendVerification(email);
      res.json({ message: 'Jika email terdaftar dan belum diverifikasi, link verifikasi akan dikirim.' });
    } catch (err) { handleError(res, err); }
  },

  // ──────────────────────────────────────────────────
  // PASSWORD RESET
  // ──────────────────────────────────────────────────

  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      await AuthService.forgotPassword(email);
      res.json({ message: 'Jika email terdaftar, link reset password akan dikirim.' });
    } catch (err) { handleError(res, err); }
  },

  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      await AuthService.resetPassword(token, newPassword);
      res.json({ success: true, message: 'Password berhasil direset! Silakan login dengan password baru.' });
    } catch (err) { handleError(res, err); }
  },

  validateResetToken: async (req, res) => {
    try {
      const { token } = req.query;
      const result = await AuthService.validateResetToken(token);
      res.json(result);
    } catch (err) { handleError(res, err); }
  },

  // ──────────────────────────────────────────────────
  // PROFILE (Protected)
  // ──────────────────────────────────────────────────

  getMe: async (req, res) => {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User tidak ditemukan.' });
      res.json(user);
    } catch (err) { handleError(res, err); }
  },

  updateProfile: async (req, res) => {
    try {
      const { username, email, bio } = req.body;
      const userId = req.user.id;

      if (!username || !email) {
        return res.status(400).json({ message: 'Username dan email wajib diisi.' });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Format email tidak valid.' });
      }

      const emailTaken    = await UserModel.isEmailExists(email, userId);
      if (emailTaken) return res.status(400).json({ message: 'Email sudah digunakan oleh user lain.' });

      const usernameTaken = await UserModel.isUsernameExists(username, userId);
      if (usernameTaken) return res.status(400).json({ message: 'Username sudah digunakan oleh user lain.' });

      await UserModel.updateProfile(userId, username, email, bio || null);
      const updatedUser = await UserModel.findById(userId);
      res.json({ message: 'Profil berhasil diperbarui!', user: updatedUser });
    } catch (err) { handleError(res, err); }
  },

  changePassword: async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Password lama dan baru wajib diisi.' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password baru minimal 6 karakter.' });
      }

      // Ambil password hash dari DB melalui UserModel
      const user = await UserModel.findByEmail(req.user.email);
      if (!user) return res.status(404).json({ message: 'User tidak ditemukan.' });

      const bcrypt  = require('bcryptjs');
      const isValid = await bcrypt.compare(oldPassword, user.password);
      if (!isValid) return res.status(400).json({ message: 'Password lama salah.' });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await UserModel.updatePassword(userId, hashedPassword);
      res.json({ message: 'Password berhasil diubah!' });
    } catch (err) { handleError(res, err); }
  },

  uploadAvatar: async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });

      const userId    = req.user.id;
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      // Hapus avatar lama jika ada
      const oldUser = await UserModel.findById(userId);
      if (oldUser?.avatar && oldUser.avatar !== avatarUrl) {
        const oldPath = path.join(__dirname, '../../', oldUser.avatar);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) { /* abaikan jika file tidak bisa dihapus */ }
        }
      }

      await UserModel.updateAvatar(userId, avatarUrl);
      const user = await UserModel.findById(userId);
      res.json({ message: 'Foto profil berhasil diupdate!', avatarUrl, user });
    } catch (err) { handleError(res, err); }
  },

  // ──────────────────────────────────────────────────
  // LEADERBOARD & COMMUNITY (Public)
  // ──────────────────────────────────────────────────

  getTopHunters: async (req, res) => {
    try {
      const limit   = parseInt(req.query.limit) || 10;
      const hunters = await AuthService.getTopHunters(limit);
      res.json(hunters);
    } catch (err) { handleError(res, err); }
  },

  getTopContributors: async (req, res) => {
    try {
      const limit        = parseInt(req.query.limit) || 10;
      const contributors = await AuthService.getTopContributors(limit);
      res.json(contributors);
    } catch (err) { handleError(res, err); }
  },

  getOnlineUsers: async (req, res) => {
    try {
      const users = await AuthService.getOnlineUsers();
      res.json(users);
    } catch (err) { handleError(res, err); }
  },

  updateActivity: async (req, res) => {
    try {
      await UserModel.updateLastActivity(req.user.id);
      res.json({ success: true });
    } catch (err) { handleError(res, err); }
  },

  getUserById: async (req, res) => {
    try {
      const user = await UserModel.findPublicById(req.params.id);
      if (!user) return res.status(404).json({ message: 'User tidak ditemukan.' });
      res.json(user);
    } catch (err) { handleError(res, err); }
  },

  // ──────────────────────────────────────────────────
  // ACHIEVEMENTS & RANK (Protected)
  // ──────────────────────────────────────────────────

  getAchievements: async (req, res) => {
    try {
      const achievements = await AuthService.getAchievements(req.user.id);
      res.json(achievements);
    } catch (err) { handleError(res, err); }
  },

  getUserRank: async (req, res) => {
    try {
      const result = await AuthService.getUserRank(req.user.id);
      res.json(result);
    } catch (err) { handleError(res, err); }
  }
};

module.exports = authController;