const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middlewares/auth');

// Semua route admin harus login dan role admin
router.use(verifyToken, isAdmin);

// Dashboard
router.get('/stats', adminController.getStats);

// User management
router.get('/users', adminController.getAllUsers);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Report management
router.get('/reports', adminController.getAllReports);
router.delete('/reports/:id', adminController.deleteReport);
router.put('/reports/:id/verify', adminController.verifyReport);

// Verification history
router.get('/verifications', adminController.getVerificationHistory);

module.exports = router;