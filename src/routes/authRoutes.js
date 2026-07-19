const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/auth');

// =====================================================
// KONFIGURASI UPLOAD AVATAR
// =====================================================
const uploadDir = './uploads/avatars';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `user-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  file.mimetype.startsWith('image/')
    ? cb(null, true)
    : cb(new Error('Hanya file gambar yang diperbolehkan!'), false);
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter
});

// =====================================================
// ROUTES
// =====================================================

// ── Public ──────────────────────────────────────────
router.post('/register',     authController.register);
router.post('/login',        authController.login);

// ── Email Verification ──────────────────────────────
router.get('/verify-email',         authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

// ── Password Reset ──────────────────────────────────
router.post('/forgot-password',     authController.forgotPassword);
router.post('/reset-password',      authController.resetPassword);
router.get('/validate-reset-token', authController.validateResetToken);

// ── Public Community ────────────────────────────────
router.get('/top-hunters',      authController.getTopHunters);
router.get('/top-contributors', authController.getTopContributors);
router.get('/online-users',     authController.getOnlineUsers);
router.get('/user/:id',         authController.getUserById);

// ── Protected ───────────────────────────────────────
router.get('/me',               verifyToken, authController.getMe);
router.put('/update-profile',   verifyToken, authController.updateProfile);
router.put('/change-password',  verifyToken, authController.changePassword);
router.post('/upload-avatar',   verifyToken, upload.single('avatar'), authController.uploadAvatar);
router.post('/update-activity', verifyToken, authController.updateActivity);
router.get('/achievements',     verifyToken, authController.getAchievements);
router.get('/user-rank',        verifyToken, authController.getUserRank);

module.exports = router;