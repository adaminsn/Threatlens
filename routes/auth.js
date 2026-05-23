const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// =====================================================
// KONFIGURASI MULTER (Upload Foto Profil)
// =====================================================

// Tentukan folder penyimpanan
const uploadDir = './uploads/avatars';
// Buat folder jika belum ada
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Format nama: userId-timestamp.ext (contoh: 3-1712345678901.jpg)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `user-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

// Filter tipe file (hanya gambar)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diperbolehkan!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Maks 2MB
  fileFilter: fileFilter
});

// =====================================================
// REGISTER
// =====================================================
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const [existingUser] = await db.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Username atau email sudah digunakan.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    res.status(201).json({ message: 'Registrasi berhasil! Silakan login.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// =====================================================
// LOGIN
// =====================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await db.query(
      'SELECT id, username, email, password, role, reputation, level, avatar, bio, created_at FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Email atau password salah.' });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email atau password salah.' });
    }

    // UPDATE last_activity saat login
    await db.query('UPDATE users SET last_activity = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, level: user.level || 1 },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('User login:', { 
      id: user.id, 
      username: user.username, 
      level: user.level
    });

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
});

// =====================================================
// GET /api/auth/me — data profil user yang login
// =====================================================
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, email, reputation, role, avatar, bio, level, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }
    console.log('📌 /me response:', rows[0]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error in /me:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// =====================================================
// PUT /api/auth/update-profile — update username, email, bio
// =====================================================
router.put('/update-profile', verifyToken, async (req, res) => {
  try {
    const { username, email, bio } = req.body;
    const userId = req.user.id;

    // Validasi input
    if (!username || !email) {
      return res.status(400).json({ message: 'Username dan email wajib diisi.' });
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Format email tidak valid.' });
    }

    // Cek apakah email sudah digunakan oleh user lain
    const [existingEmail] = await db.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );
    if (existingEmail.length > 0) {
      return res.status(400).json({ message: 'Email sudah digunakan oleh user lain.' });
    }

    // Cek apakah username sudah digunakan oleh user lain
    const [existingUsername] = await db.query(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username, userId]
    );
    if (existingUsername.length > 0) {
      return res.status(400).json({ message: 'Username sudah digunakan oleh user lain.' });
    }

    // Update profil user
    await db.query(
      'UPDATE users SET username = ?, email = ?, bio = ? WHERE id = ?',
      [username, email, bio || null, userId]
    );

    // Ambil data user terbaru
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

// =====================================================
// PUT /api/auth/change-password — ganti password
// =====================================================
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validasi input
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Password lama dan baru wajib diisi.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password baru minimal 6 karakter.' });
    }

    // Ambil password lama dari database
    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    // Verifikasi password lama
    const isValid = await bcrypt.compare(oldPassword, rows[0].password);
    if (!isValid) {
      return res.status(400).json({ message: 'Password lama salah.' });
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.query('UPDATE users SET password = ? WHERE id = ?', [
      hashedPassword,
      userId,
    ]);

    res.json({ message: 'Password berhasil diubah!' });
  } catch (err) {
    console.error('Error in change-password:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server: ' + err.message });
  }
});

// =====================================================
// POST /api/auth/upload-avatar — upload foto profil
// =====================================================
router.post('/upload-avatar', verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    const userId = req.user.id;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Hapus foto lama jika ada
    const [oldUser] = await db.query('SELECT avatar FROM users WHERE id = ?', [userId]);
    if (oldUser[0]?.avatar && oldUser[0].avatar !== avatarUrl) {
      const oldPath = path.join(__dirname, '..', oldUser[0].avatar);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Update database dengan avatar baru
    await db.query('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, userId]);

    // Ambil data user terbaru
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

// =====================================================
// GET /api/auth/top-hunters — Top 10/100 berdasarkan reputasi (PUBLIC)
// =====================================================
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

// =====================================================
// GET /api/auth/top-contributors — Top contributor berdasarkan laporan terbanyak (PUBLIC)
// =====================================================
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

// =====================================================
// GET /api/auth/online-users — Mendapatkan user yang sedang online
// =====================================================
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

// =====================================================
// POST /api/auth/update-activity — Update last_activity user
// =====================================================
router.post('/update-activity', verifyToken, async (req, res) => {
  try {
    await db.query(
      'UPDATE users SET last_activity = NOW() WHERE id = ?',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error update activity:', err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// PUT /api/threats/:id/verify — Multi-verifikasi (butuh 5 verifikator)
// =====================================================
router.put('/:id/verify', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Ambil data user
    const [userRows] = await db.query('SELECT level, reputation, username FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }
    
    const user = userRows[0];
    const userLevel = user.level || 1;
    
    // Cek apakah user bisa verifikasi (level minimal 50 ATAU admin)
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

    // Tentukan aksi (verify atau unverify)
    let isVerified = threat.verified;
    let newVerificationCount = currentVerificationCount;
    let newVerificationList = [...currentVerificationList];
    let action = 'verify';

    // Jika laporan sudah verified, cek apakah user mau unverify (hanya admin)
    if (isVerified && userRole === 'admin') {
      // Admin bisa unverify langsung
      isVerified = false;
      newVerificationCount = 0;
      newVerificationList = [];
      action = 'unverify';
    } else if (!isVerified) {
      // Tambah verifikasi baru
      newVerificationList.push(userId);
      newVerificationCount = currentVerificationCount + 1;
      
      // Cek apakah sudah mencapai 5 verifikasi
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

      // Update reputasi dan cek achievement
      if (action === 'added_verification') {
        // Verifikator +5 reputasi
        await connection.query('UPDATE users SET reputation = reputation + 5 WHERE id = ?', [userId]);
        await connection.query('UPDATE users SET level = FLOOR(reputation / 100) + 1 WHERE id = ?', [userId]);
        
      } else if (action === 'fully_verified') {
        // Laporan terverifikasi penuh - kasih bonus ke pembuat laporan
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
        message = '🎉 Laporan telah mencapai 5 verifikasi dan resmi TERVERIFIKASI! Semua pihak mendapat bonus reputasi!';
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
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
});

// GET /api/auth/achievements — Mendapatkan achievement user
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

// GET /api/auth/user/:id — Mendapatkan data user by ID (PUBLIC)
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

module.exports = router;