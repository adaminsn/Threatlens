const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const AuthModel = require('../models/authModel');
const {
  sendVerificationEmail,
  sendLoginNotificationEmail,
  sendResetPasswordEmail
} = require('./emailService');

// =====================================================
// AUTH SERVICE
// Semua business logic terkait autentikasi dan profil user.
// =====================================================

const ACHIEVEMENTS_LIST = [
  { type: 'first_verification',  name: '🛡️ First Verifier',       desc: 'Memverifikasi laporan pertama', icon: '🎯' },
  { type: 'trusted_verifier',    name: '⭐ Trusted Verifier',      desc: '10 laporan diverifikasi',       icon: '🌟' },
  { type: 'elite_verifier',      name: '🏆 Elite Verifier',        desc: '50 laporan diverifikasi',       icon: '👑' },
  { type: 'verification_master', name: '💎 Verification Master',   desc: '100 laporan diverifikasi',      icon: '🔱' }
];

const AuthService = {

  /**
   * Registrasi user baru: validasi, hash password, kirim email verifikasi.
   */
  register: async (username, email, password) => {
    if (!username || !email || !password) {
      throw { status: 400, message: 'Semua field harus diisi.' };
    }
    if (username.length < 3) {
      throw { status: 400, message: 'Username minimal 3 karakter.' };
    }
    if (password.length < 6) {
      throw { status: 400, message: 'Password minimal 6 karakter.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw { status: 400, message: 'Format email tidak valid.' };
    }

    const existing = await UserModel.findByUsernameOrEmail(username, email);
    if (existing.length > 0) {
      throw { status: 400, message: 'Username atau email sudah digunakan.' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await UserModel.create(username, email, hashedPassword);

    await sendVerificationEmail(email, username);

    return { userId };
  },

  /**
   * Login user: validasi kredensial, cek verifikasi email,
   * kirim notifikasi perangkat baru, generate JWT.
   */
  login: async (email, password, userAgent, ip) => {
    if (!email || !password) {
      throw { status: 400, message: 'Email dan password wajib diisi.' };
    }

    const user = await UserModel.findForLogin(email);
    if (!user) {
      throw { status: 401, message: 'Email atau password salah.' };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw { status: 401, message: 'Email atau password salah.' };
    }

    if (user.email_verified === 0) {
      throw {
        status: 403,
        message: 'Email belum diverifikasi. Silakan cek inbox Anda untuk link verifikasi.',
        needVerification: true,
        email: user.email
      };
    }

    // Kirim notifikasi jika login dari perangkat baru
    const isNewDevice = user.last_activity_device !== userAgent;
    await UserModel.updateLoginActivity(user.id, userAgent);

    if (isNewDevice) {
      sendLoginNotificationEmail(user.email, user.username, ip, userAgent, 'Unknown')
        .catch(err => console.error('Failed to send login notification:', err));
    }

    const token = jwt.sign(
      {
        id:       user.id,
        username: user.username,
        role:     user.role,
        level:    user.level || 1,
        email:    user.email
      },
      process.env.JWT_SECRET || 'threatlens_secret_key',
      { expiresIn: '24h' }
    );

    console.log('✅ User login:', { id: user.id, username: user.username, role: user.role, isNewDevice });

    return {
      token,
      user: {
        id:             user.id,
        username:       user.username,
        email:          user.email,
        role:           user.role,
        reputation:     user.reputation || 0,
        level:          user.level      || 1,
        avatar:         user.avatar     || '',
        bio:            user.bio        || '',
        created_at:     user.created_at,
        email_verified: user.email_verified
      }
    };
  },

  /**
   * Verifikasi email via JWT token dari link email.
   * @returns {string} email yang terverifikasi (untuk redirect)
   */
  verifyEmail: async (token) => {
    if (!token) {
      throw { status: 400, message: 'Token verifikasi tidak ditemukan.' };
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'threatlens_secret_key');
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw { status: 400, message: 'Token sudah kadaluarsa. Silakan minta token baru.' };
      }
      throw { status: 400, message: 'Token verifikasi tidak valid.' };
    }

    if (decoded.type !== 'email_verification') {
      throw { status: 400, message: 'Token tidak valid.' };
    }

    const affected = await UserModel.verifyEmail(decoded.email);
    if (affected === 0) {
      throw { status: 400, message: 'Email sudah terverifikasi atau token tidak valid.' };
    }

    return decoded.email;
  },

  /**
   * Kirim ulang email verifikasi.
   */
  resendVerification: async (email) => {
    if (!email) {
      throw { status: 400, message: 'Email wajib diisi.' };
    }
    const user = await UserModel.findByEmailForVerification(email);
    if (!user || user.email_verified === 1) return; // Diam, jangan expose data
    await sendVerificationEmail(email, user.username);
  },

  /**
   * Kirim link reset password ke email.
   */
  forgotPassword: async (email) => {
    if (!email) {
      throw { status: 400, message: 'Email wajib diisi.' };
    }

    const user = await UserModel.findByEmail(email);
    if (!user) return; // Diam, jangan expose bahwa email tidak terdaftar

    if (user.email_verified === 0) {
      throw { status: 400, message: 'Email belum diverifikasi. Silakan verifikasi email terlebih dahulu.' };
    }

    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt  = new Date(Date.now() + 3600000); // 1 jam

    await AuthModel.createPasswordReset(email, resetToken, expiresAt);
    await sendResetPasswordEmail(email, user.username, resetToken);
  },

  /**
   * Proses reset password menggunakan token dari email.
   */
  resetPassword: async (token, newPassword) => {
    if (!token || !newPassword) {
      throw { status: 400, message: 'Token dan password baru wajib diisi.' };
    }
    if (newPassword.length < 6) {
      throw { status: 400, message: 'Password minimal 6 karakter.' };
    }

    const reset = await AuthModel.findPasswordReset(token);
    if (!reset) {
      throw { status: 400, message: 'Token tidak valid atau sudah kadaluarsa. Silakan minta ulang.' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.updatePasswordByEmail(reset.email, hashedPassword);
    await AuthModel.deletePasswordReset(token);

    console.log(`✅ Password reset successful for: ${reset.email}`);
  },

  /**
   * Validasi apakah token reset password masih valid.
   */
  validateResetToken: async (token) => {
    if (!token) {
      throw { status: 400, message: 'Token tidak ditemukan.' };
    }
    const reset = await AuthModel.findPasswordReset(token);
    if (!reset) {
      return { valid: false, message: 'Token tidak valid atau sudah kadaluarsa.' };
    }
    return { valid: true, email: reset.email };
  },

  /**
   * Ambil top hunters berdasarkan reputasi (dengan rank).
   */
  getTopHunters: async (limit) => {
    const rows = await UserModel.findTopHunters(limit);
    return rows.map((user, i) => ({
      rank:          i + 1,
      id:            user.id,
      username:      user.username || 'Anonymous',
      reputation:    user.reputation || 0,
      level:         user.level      || 1,
      avatar:        user.avatar     || '',
      total_reports: user.total_reports || 0
    }));
  },

  /**
   * Ambil top contributors berdasarkan jumlah laporan (dengan rank).
   */
  getTopContributors: async (limit) => {
    const rows = await UserModel.findTopContributors(limit);
    return rows.map((user, i) => ({
      rank:          i + 1,
      id:            user.id,
      username:      user.username || 'Anonymous',
      reputation:    user.reputation || 0,
      level:         user.level      || 1,
      avatar:        user.avatar     || '',
      total_reports: user.total_reports || 0,
      total_votes:   user.total_votes   || 0
    }));
  },

  /**
   * Ambil daftar user yang sedang online.
   */
  getOnlineUsers: async () => {
    return await UserModel.findOnlineUsers();
  },

  /**
   * Ambil daftar achievement user (achieved + belum achieved).
   */
  getAchievements: async (userId) => {
    const rows = await UserModel.findAchievements(userId);
    const userAchievements = rows.map(r => r.achievement_type);
    return ACHIEVEMENTS_LIST.map(ach => ({
      ...ach,
      achieved:    userAchievements.includes(ach.type),
      achieved_at: rows.find(r => r.achievement_type === ach.type)?.achieved_at
    }));
  },

  /**
   * Hitung posisi rank user di antara semua user berdasarkan reputasi.
   */
  getUserRank: async (userId) => {
    const { rank, totalUsers } = await UserModel.findRank(userId);
    return {
      rank,
      totalUsers,
      percentile: Math.round((totalUsers - rank) / totalUsers * 100)
    };
  }
};

module.exports = AuthService;
