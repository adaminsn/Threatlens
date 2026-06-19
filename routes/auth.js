const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../src/config/database');
const { verifyToken } = require('../src/middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import email service
const { sendVerificationEmail } = require('../src/services/emailService');

// KONFIGURASI MULTER (Upload Foto Profil)
const uploadDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `user-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diperbolehkan!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: fileFilter
});

// REGISTER - Dengan Verifikasi Email
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Semua field harus diisi.' });
    }

    if (username.length < 3) {
      return res.status(400).json({ message: 'Username minimal 3 karakter.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password minimal 6 karakter.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Format email tidak valid.' });
    }

    const [existingUser] = await db.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Username atau email sudah digunakan.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (username, email, password, email_verified, created_at, reputation, level) VALUES (?, ?, ?, 0, NOW(), 0, 1)',
      [username, email, hashedPassword]
    );

    await sendVerificationEmail(email, username);

    res.status(201).json({ 
      message: 'Registrasi berhasil! Silakan cek email Anda untuk verifikasi.',
      userId: result.insertId
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// LOGIN - Dengan Pengecekan Verifikasi Email + Login Notification
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan password wajib diisi.' });
    }

    const [users] = await db.query(
      'SELECT id, username, email, password, role, reputation, level, avatar, bio, email_verified, created_at, last_activity, last_activity_device FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Email atau password salah.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Email atau password salah.' });
    }

    if (user.email_verified === 0) {
      return res.status(403).json({ 
        message: 'Email belum diverifikasi. Silakan cek inbox Anda untuk link verifikasi.',
        needVerification: true,
        email: user.email
      });
    }

    // CEK PERANGKAT - Apakah login dari perangkat baru?
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown IP';
    const lastDevice = user.last_activity_device || null;
    const isNewDevice = lastDevice !== userAgent;

    // Update last_activity dan device
    await db.query(
      'UPDATE users SET last_activity = NOW(), last_activity_device = ? WHERE id = ?',
      [userAgent, user.id]
    );

    // KIRIM NOTIFIKASI jika login dari perangkat baru
    if (isNewDevice) {
      const { sendLoginNotificationEmail } = require('../src/services/emailService');
      sendLoginNotificationEmail(
        user.email, 
        user.username, 
        ipAddress, 
        userAgent,
        'Unknown'
      ).catch(err => console.error('Failed to send login notification:', err));
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        level: user.level || 1,
        email: user.email
      },
      process.env.JWT_SECRET || 'threatlens_secret_key',
      { expiresIn: '24h' }
    );

    console.log('✅ User login:', { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      level: user.level,
      isNewDevice: isNewDevice
    });

    res.json({
      success: true,
      message: 'Login berhasil!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        reputation: user.reputation || 0,
        level: user.level || 1,
        avatar: user.avatar || '',
        bio: user.bio || '',
        created_at: user.created_at,
        email_verified: user.email_verified
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// VERIFIKASI EMAIL
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Token verifikasi tidak ditemukan.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'threatlens_secret_key');
    
    if (decoded.type !== 'email_verification') {
      return res.status(400).json({ message: 'Token tidak valid.' });
    }

    const email = decoded.email;
    const [result] = await db.query(
      'UPDATE users SET email_verified = 1 WHERE email = ? AND email_verified = 0',
      [email]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'Email sudah terverifikasi atau token tidak valid.' });
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    res.redirect(`${baseUrl}/pages/login.html?verified=true`);
    
  } catch (error) {
    console.error('Verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ 
        message: 'Token sudah kadaluarsa. Silakan minta token baru.' 
      });
    }
    
    res.status(400).json({ message: 'Token verifikasi tidak valid.' });
  }
});

// RESEND VERIFICATION EMAIL
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email wajib diisi.' });
    }

    const [users] = await db.query(
      'SELECT username, email_verified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.json({ message: 'Jika email terdaftar, link verifikasi akan dikirim.' });
    }

    if (users[0].email_verified === 1) {
      return res.json({ message: 'Email sudah terverifikasi.' });
    }

    await sendVerificationEmail(email, users[0].username);
    res.json({ message: 'Link verifikasi telah dikirim ulang ke email Anda.' });
    
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// GET /api/auth/me — data profil user yang login
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, email, reputation, role, avatar, bio, level, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error in /me:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// PUT /api/auth/update-profile — update username, email, bio
router.put('/update-profile', verifyToken, async (req, res) => {
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

    const [existingEmail] = await db.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );
    if (existingEmail.length > 0) {
      return res.status(400).json({ message: 'Email sudah digunakan oleh user lain.' });
    }

    const [existingUsername] = await db.query(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username, userId]
    );
    if (existingUsername.length > 0) {
      return res.status(400).json({ message: 'Username sudah digunakan oleh user lain.' });
    }

    await db.query(
      'UPDATE users SET username = ?, email = ?, bio = ? WHERE id = ?',
      [username, email, bio || null, userId]
    );

    const [rows] = await db.query(
      'SELECT id, username, email, role, bio, avatar, reputation, level, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      message: 'Profil berhasil diperbarui!',
      user: rows[0]
    });
  } catch (err) {
    console.error('Error in update-profile:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server: ' + err.message });
  }
});

// PUT /api/auth/change-password — ganti password
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Password lama dan baru wajib diisi.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password baru minimal 6 karakter.' });
    }

    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    const isValid = await bcrypt.compare(oldPassword, rows[0].password);
    if (!isValid) {
      return res.status(400).json({ message: 'Password lama salah.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    res.json({ message: 'Password berhasil diubah!' });
  } catch (err) {
    console.error('Error in change-password:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server: ' + err.message });
  }
});

// POST /api/auth/upload-avatar — upload foto profil
router.post('/upload-avatar', verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    const userId = req.user.id;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const [oldUser] = await db.query('SELECT avatar FROM users WHERE id = ?', [userId]);
    if (oldUser[0]?.avatar && oldUser[0].avatar !== avatarUrl) {
      const oldPath = path.join(__dirname, '..', oldUser[0].avatar);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await db.query('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, userId]);

    const [rows] = await db.query(
      'SELECT id, username, email, role, bio, avatar, reputation, level, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({ 
      message: 'Foto profil berhasil diupdate!', 
      avatarUrl: avatarUrl,
      user: rows[0]
    });
  } catch (err) {
    console.error('Upload avatar error:', err);
    res.status(500).json({ message: 'Gagal mengunggah foto: ' + err.message });
  }
});

// GET /api/auth/top-hunters — Top berdasarkan reputasi
router.get('/top-hunters', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const [rows] = await db.query(`
      SELECT 
        id, 
        username, 
        COALESCE(reputation, 0) as reputation,
        COALESCE(level, 1) as level,
        COALESCE(avatar, '') as avatar,
        (SELECT COUNT(*) FROM threats WHERE user_id = users.id) AS total_reports
      FROM users 
      WHERE role = 'user'
      ORDER BY reputation DESC
      LIMIT ?
    `, [limit]);
    
    const hunters = rows.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      username: user.username || 'Anonymous',
      reputation: user.reputation || 0,
      level: user.level || 1,
      avatar: user.avatar || '',
      total_reports: user.total_reports || 0
    }));
    
    res.json(hunters);
  } catch (err) {
    console.error('Error in top-hunters:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/top-contributors — Top berdasarkan laporan
router.get('/top-contributors', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const [rows] = await db.query(`
      SELECT 
        u.id,
        u.username,
        COALESCE(u.reputation, 0) as reputation,
        COALESCE(u.level, 1) as level,
        COALESCE(u.avatar, '') as avatar,
        COUNT(DISTINCT t.id) AS total_reports,
        COUNT(DISTINCT v.id) AS total_votes
      FROM users u
      LEFT JOIN threats t ON t.user_id = u.id
      LEFT JOIN votes v ON v.threat_id = t.id
      WHERE u.role = 'user'
      GROUP BY u.id
      ORDER BY total_reports DESC, total_votes DESC
      LIMIT ?
    `, [limit]);
    
    const contributors = rows.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      username: user.username || 'Anonymous',
      reputation: user.reputation || 0,
      level: user.level || 1,
      avatar: user.avatar || '',
      total_reports: user.total_reports || 0,
      total_votes: user.total_votes || 0
    }));
    
    res.json(contributors);
  } catch (err) {
    console.error('Error in top-contributors:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/online-users — User sedang online
router.get('/online-users', async (req, res) => {
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
    console.error('Error in online-users:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/update-activity — Update last_activity
router.post('/update-activity', verifyToken, async (req, res) => {
  try {
    await db.query('UPDATE users SET last_activity = NOW() WHERE id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error update activity:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/achievements — Achievement user
router.get('/achievements', verifyToken, async (req, res) => {
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
});

// GET /api/auth/user/:id — Data user by ID (PUBLIC)
router.get('/user/:id', async (req, res) => {
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
    console.error('Error in /user/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// FORGOT PASSWORD - Kirim link reset ke email
router.post('/forgot_password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email wajib diisi.' });
        }

        const [users] = await db.query(
            'SELECT id, username, email_verified FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(200).json({ 
                message: 'Jika email terdaftar, link reset password akan dikirim.' 
            });
        }

        const user = users[0];

        if (user.email_verified === 0) {
            return res.status(400).json({ 
                message: 'Email belum diverifikasi. Silakan verifikasi email terlebih dahulu.' 
            });
        }

        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000);

        await db.query(
            `INSERT INTO password_resets (email, token, expires_at) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
             token = VALUES(token), 
             expires_at = VALUES(expires_at)`,
            [email, resetToken, expiresAt]
        );

        const { sendResetPasswordEmail } = require('../src/services/emailService');
        await sendResetPasswordEmail(email, user.username, resetToken);

        res.status(200).json({ 
            message: 'Jika email terdaftar, link reset password akan dikirim.' 
        });

    } catch (err) {
        console.error('❌ Forgot password error:', err);
        res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
});

// RESET PASSWORD - Proses reset password
router.post('/reset_password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token dan password baru wajib diisi.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password minimal 6 karakter.' });
        }

        const [rows] = await db.query(
            'SELECT email FROM password_resets WHERE token = ? AND expires_at > NOW()',
            [token]
        );

        if (rows.length === 0) {
            return res.status(400).json({ 
                message: 'Token tidak valid atau sudah kadaluarsa. Silakan minta ulang.' 
            });
        }

        const email = rows[0].email;
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.query(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, email]
        );

        await db.query('DELETE FROM password_resets WHERE token = ?', [token]);

        console.log(`✅ Password reset successful for: ${email}`);

        res.json({ 
            success: true,
            message: 'Password berhasil direset! Silakan login dengan password baru.' 
        });

    } catch (err) {
        console.error('❌ Reset password error:', err);
        res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
});

// VALIDATE RESET TOKEN - Cek apakah token valid
router.get('/validate-reset-token', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ valid: false, message: 'Token tidak ditemukan.' });
        }

        const [rows] = await db.query(
            'SELECT email FROM password_resets WHERE token = ? AND expires_at > NOW()',
            [token]
        );

        if (rows.length === 0) {
            return res.json({ valid: false, message: 'Token tidak valid atau sudah kadaluarsa.' });
        }

        res.json({ valid: true, email: rows[0].email });
    } catch (err) {
        console.error('❌ Validate token error:', err);
        res.status(500).json({ valid: false, message: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;