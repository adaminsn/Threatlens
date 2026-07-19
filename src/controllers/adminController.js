const AdminService = require('../services/adminService');

// =====================================================
// ADMIN CONTROLLER
// Hanya berisi: validasi input, pemanggilan AdminService,
// pengiriman response JSON.
// =====================================================

// Helper untuk kirim error response
const handleError = (res, err) => {
  console.error('❌ AdminController Error:', err.message || err);
  res.status(err.status || 500).json({ message: err.message || 'Terjadi kesalahan server.' });
};

const adminController = {

  // ──────────────────────────────────────────────────
  // DASHBOARD
  // ──────────────────────────────────────────────────

  getStats: async (req, res) => {
    try {
      const stats = await AdminService.getDashboardStats();
      res.json(stats);
    } catch (err) { handleError(res, err); }
  },

  // ──────────────────────────────────────────────────
  // USER MANAGEMENT
  // ──────────────────────────────────────────────────

  getAllUsers: async (req, res) => {
    try {
      const users = await AdminService.getAllUsers();
      res.json(users);
    } catch (err) { handleError(res, err); }
  },

  updateUser: async (req, res) => {
    try {
      const { username, email, role, reputation } = req.body;
      const result = await AdminService.updateUser(req.params.id, { username, email, role, reputation });
      res.json(result);
    } catch (err) { handleError(res, err); }
  },

  deleteUser: async (req, res) => {
    try {
      const result = await AdminService.deleteUser(req.params.id);
      res.json(result);
    } catch (err) { handleError(res, err); }
  },

  // ──────────────────────────────────────────────────
  // REPORT MANAGEMENT
  // ──────────────────────────────────────────────────

  getAllReports: async (req, res) => {
    try {
      const reports = await AdminService.getAllReports();
      res.json(reports);
    } catch (err) { handleError(res, err); }
  },

  updateReportStatus: async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: 'Status wajib diisi.' });
      const result = await AdminService.updateReportStatus(req.params.id, status);
      res.json(result);
    } catch (err) { handleError(res, err); }
  },

  deleteReport: async (req, res) => {
    try {
      const result = await AdminService.deleteReport(req.params.id);
      res.json(result);
    } catch (err) { handleError(res, err); }
  },

  verifyReport: async (req, res) => {
    try {
      const result = await AdminService.verifyReport(req.params.id, req.user.id);
      res.json(result);
    } catch (err) { handleError(res, err); }
  },

  // ──────────────────────────────────────────────────
  // VERIFICATION HISTORY
  // ──────────────────────────────────────────────────

  getVerificationHistory: async (req, res) => {
    try {
      const history = await AdminService.getVerificationHistory();
      res.json(history);
    } catch (err) { handleError(res, err); }
  },

  // ──────────────────────────────────────────────────
  // SETTINGS
  // ──────────────────────────────────────────────────

  getSettings: async (req, res) => {
    try {
      const settings = await AdminService.getSettings();
      res.json(settings);
    } catch (err) { handleError(res, err); }
  },

  updateSettings: async (req, res) => {
    try {
      const { site_name, maintenance_mode, report_cooldown } = req.body;
      const result = await AdminService.updateSettings({ site_name, maintenance_mode, report_cooldown });
      res.json(result);
    } catch (err) { handleError(res, err); }
  }
};

module.exports = adminController;