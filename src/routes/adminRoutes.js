const express = require('express');
const router  = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middlewares/auth');

// Semua route admin wajib login dan role admin
router.use(verifyToken, isAdmin);

// ── Dashboard ────────────────────────────────────────
router.get('/stats', adminController.getStats);

// ── User Management ──────────────────────────────────
router.get('/users',     adminController.getAllUsers);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// ── Report Management ────────────────────────────────
router.get('/reports',              adminController.getAllReports);
router.delete('/reports/:id',       adminController.deleteReport);
router.put('/reports/:id/verify',   adminController.verifyReport);
router.put('/reports/:id/status',   adminController.updateReportStatus);   // ← ditambahkan

// ── Verification History ─────────────────────────────
router.get('/verifications', adminController.getVerificationHistory);

// ── Settings ─────────────────────────────────────────
router.get('/settings', adminController.getSettings);    // ← ditambahkan
router.put('/settings', adminController.updateSettings); // ← ditambahkan

module.exports = router;