const DashboardModel  = require('../models/dashboardModel');
const VerificationModel = require('../models/verificationModel');

// =====================================================
// ADMIN SERVICE
// Semua business logic untuk fitur-fitur admin panel.
// =====================================================

const ALLOWED_REPORT_STATUSES = ['pending', 'investigating', 'dangerous', 'resolved', 'false_report'];

const AdminService = {

  /**
   * Ambil semua statistik untuk dashboard admin.
   */
  getDashboardStats: async () => {
    return await DashboardModel.getStats();
  },

  // ──────────────────────────────────────────────────
  // USER MANAGEMENT
  // ──────────────────────────────────────────────────

  /**
   * Ambil semua user beserta statistik.
   */
  getAllUsers: async () => {
    return await DashboardModel.getAllUsers();
  },

  /**
   * Update data user (validasi keberadaan user terlebih dahulu).
   */
  updateUser: async (userId, { username, email, role, reputation }) => {
    const user = await DashboardModel.findUserById(userId);
    if (!user) throw { status: 404, message: 'User tidak ditemukan.' };

    await DashboardModel.updateUser(userId, { username, email, role, reputation });
    return { message: 'User berhasil diupdate.' };
  },

  /**
   * Hapus user (tidak boleh hapus admin).
   */
  deleteUser: async (userId) => {
    const user = await DashboardModel.findUserById(userId);
    if (!user) throw { status: 404, message: 'User tidak ditemukan.' };
    if (user.role === 'admin') throw { status: 403, message: 'Tidak bisa menghapus user admin.' };

    await DashboardModel.deleteUserCascade(userId);
    return { message: 'User berhasil dihapus.' };
  },

  // ──────────────────────────────────────────────────
  // REPORT MANAGEMENT
  // ──────────────────────────────────────────────────

  /**
   * Ambil semua laporan beserta info user dan statistik.
   */
  getAllReports: async () => {
    return await DashboardModel.getAllReports();
  },

  /**
   * Update status laporan (validasi status yang diizinkan).
   */
  updateReportStatus: async (reportId, status) => {
    if (!ALLOWED_REPORT_STATUSES.includes(status)) {
      throw { status: 400, message: 'Status tidak valid.' };
    }

    const report = await DashboardModel.findReportById(reportId);
    if (!report) throw { status: 404, message: 'Laporan tidak ditemukan.' };

    await DashboardModel.updateReportStatus(reportId, status);
    return { message: `Status laporan diubah menjadi ${status}.`, status };
  },

  /**
   * Hapus laporan beserta semua data terkait.
   */
  deleteReport: async (reportId) => {
    const deleted = await DashboardModel.deleteReportCascade(reportId);
    if (!deleted) throw { status: 404, message: 'Laporan tidak ditemukan.' };
    return { message: 'Laporan berhasil dihapus.' };
  },

  /**
   * Toggle verifikasi laporan oleh admin (verify ↔ unverify).
   * Jika diverifikasi: status → dangerous, reputasi reporter +50.
   * Jika dibatalkan: status → pending, verified → false.
   */
  verifyReport: async (reportId, adminId) => {
    const report = await DashboardModel.findReportById(reportId);
    if (!report) throw { status: 404, message: 'Laporan tidak ditemukan.' };

    const newVerified = report.verified ? 0 : 1;
    await VerificationModel.adminVerifyToggle(reportId, adminId, newVerified);

    if (newVerified === 1) {
      return {
        message:  '✅ Laporan diverifikasi oleh ADMIN dan menjadi HIGH RISK!',
        verified: true,
        status:   'dangerous'
      };
    } else {
      return {
        message:  'Verifikasi laporan dibatalkan.',
        verified: false,
        status:   'pending'
      };
    }
  },

  /**
   * Ambil riwayat semua verifikasi.
   */
  getVerificationHistory: async () => {
    return await VerificationModel.findHistory();
  },

  // ──────────────────────────────────────────────────
  // SETTINGS
  // ──────────────────────────────────────────────────

  /**
   * Ambil pengaturan aplikasi (return default jika belum ada).
   */
  getSettings: async () => {
    const settings = await DashboardModel.getSettings();
    return settings || { site_name: 'ThreatLens', maintenance_mode: 0, report_cooldown: 60 };
  },

  /**
   * Simpan pengaturan aplikasi (validasi nilai cooldown).
   */
  updateSettings: async ({ site_name, maintenance_mode, report_cooldown }) => {
    const cooldown = parseInt(report_cooldown);
    if (isNaN(cooldown) || cooldown < 0 || cooldown > 3600) {
      throw { status: 400, message: 'Cooldown harus antara 0-3600 detik.' };
    }

    const maintenance = (maintenance_mode === 1 || maintenance_mode === true) ? 1 : 0;
    const siteName    = site_name ? site_name.trim() : 'ThreatLens';

    await DashboardModel.upsertSettings({
      site_name:        siteName,
      maintenance_mode: maintenance,
      report_cooldown:  cooldown
    });

    return {
      message:  'Pengaturan berhasil disimpan.',
      settings: { site_name: siteName, maintenance_mode: maintenance, report_cooldown: cooldown }
    };
  }
};

module.exports = AdminService;
