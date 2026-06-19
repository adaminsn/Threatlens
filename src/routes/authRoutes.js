const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

 
// KONFIGURASI UPLOAD AVATAR
 
const uploadDir = './uploads/avatars';
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

 
// ROUTES
 
// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes (perlu token)
router.get('/me', verifyToken, authController.getMe);
router.put('/update-profile', verifyToken, authController.updateProfile);
router.put('/change-password', verifyToken, authController.changePassword);
router.post('/upload-avatar', verifyToken, upload.single('avatar'), authController.uploadAvatar);

// Public but with optional auth (bisa diakses tanpa token)
router.get('/top-hunters', authController.getTopHunters);
router.get('/top-contributors', authController.getTopContributors);
router.get('/online-users', authController.getOnlineUsers);
router.post('/update-activity', verifyToken, authController.updateActivity);
router.get('/user/:id', authController.getUserById);
router.get('/achievements', verifyToken, authController.getAchievements);
router.get('/user-rank', verifyToken, authController.getUserRank);

module.exports = router;