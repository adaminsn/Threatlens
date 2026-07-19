const db = require('../config/database');

// =====================================================
// DASHBOARD MODEL
// Bertanggung jawab untuk semua query admin dashboard:
// statistik, manajemen user, manajemen laporan, settings.
// =====================================================

const DashboardModel = {

  // ──────────────────────────────────────────────────
  // STATISTICS
  // ──────────────────────────────────────────────────

  /**
   * Ambil semua angka statistik untuk dashboard admin.
   * @returns {Object} berisi total_users, total_reports, dst.
   */
  getStats: async () => {
    const [[totalUsers]]      = await db.query("SELECT COUNT(*) as total FROM users WHERE role = 'user'");
    const [[totalReports]]    = await db.query('SELECT COUNT(*) as total FROM threats');
    const [[verifiedReports]] = await db.query('SELECT COUNT(*) as total FROM threats WHERE verified = 1');
    const [[totalVotes]]      = await db.query('SELECT COUNT(*) as total FROM votes');
    const [[totalComments]]   = await db.query('SELECT COUNT(*) as total FROM comments');
    const [[onlineUsers]]     = await db.query(
      "SELECT COUNT(*) as total FROM users WHERE last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE)"
    );
    const [[newUsersToday]]   = await db.query(
      "SELECT COUNT(*) as total FROM users WHERE DATE(created_at) = CURDATE()"
    );
    const [[newReportsToday]] = await db.query(
      "SELECT COUNT(*) as total FROM threats WHERE DATE(created_at) = CURDATE()"
    );

    return {
      total_users:      totalUsers.total,
      total_reports:    totalReports.total,
      verified_reports: verifiedReports.total,
      total_votes:      totalVotes.total,
      total_comments:   totalComments.total,
      online_users:     onlineUsers.total,
      new_users_today:  newUsersToday.total,
      new_reports_today: newReportsToday.total
    };
  },

  // ──────────────────────────────────────────────────
  // USER MANAGEMENT
  // ──────────────────────────────────────────────────

  /**
   * Ambil semua user beserta total laporan dan vote mereka.
   */
  getAllUsers: async () => {
    const [rows] = await db.query(`
      SELECT
        id, username, email, role, reputation, level, avatar, bio,
        created_at, last_activity,
        (SELECT COUNT(*) FROM threats WHERE user_id = users.id) as total_reports,
        (SELECT COUNT(*) FROM votes   WHERE user_id = users.id) as total_votes
      FROM users
      ORDER BY created_at DESC
    `);
    return rows;
  },

  /**
   * Cari user by ID (hanya field id dan role).
   */
  findUserById: async (userId) => {
    const [rows] = await db.query('SELECT id, role FROM users WHERE id = ?', [userId]);
    return rows[0];
  },

  /**
   * Update data user (username, email, role, reputation, level) oleh admin.
   */
  updateUser: async (userId, { username, email, role, reputation }) => {
    await db.query(
      'UPDATE users SET username = ?, email = ?, role = ?, reputation = ?, level = FLOOR(? / 100) + 1 WHERE id = ?',
      [username, email, role, reputation, reputation, userId]
    );
  },

  /**
   * Hapus user beserta semua data terkait dalam satu transaction.
   */
  deleteUserCascade: async (userId) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      await connection.query('DELETE FROM votes              WHERE user_id    = ?', [userId]);
      await connection.query('DELETE FROM comments           WHERE user_id    = ?', [userId]);
      await connection.query('DELETE FROM threat_verifications WHERE verifier_id = ?', [userId]);
      await connection.query('DELETE FROM threats            WHERE user_id    = ?', [userId]);
      await connection.query('DELETE FROM users              WHERE id         = ?', [userId]);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  // ──────────────────────────────────────────────────
  // REPORT MANAGEMENT
  // ──────────────────────────────────────────────────

  /**
   * Ambil semua laporan beserta info user, vote, comment.
   */
  getAllReports: async () => {
    const [rows] = await db.query(`
      SELECT
        t.id, t.title, t.indicator, t.type, t.category, t.status,
        t.verified, t.verification_count, t.verification_list, t.created_at,
        u.id as user_id, u.username,
        (SELECT COUNT(*) FROM votes    WHERE threat_id = t.id) as vote_count,
        (SELECT COUNT(*) FROM comments WHERE threat_id = t.id) as comment_count
      FROM threats t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `);
    return rows;
  },

  /**
   * Cari satu laporan by ID.
   */
  findReportById: async (reportId) => {
    const [rows] = await db.query('SELECT * FROM threats WHERE id = ?', [reportId]);
    return rows[0];
  },

  /**
   * Update status laporan.
   */
  updateReportStatus: async (reportId, status) => {
    await db.query('UPDATE threats SET status = ? WHERE id = ?', [status, reportId]);
  },

  /**
   * Hapus laporan beserta semua data terkait dalam satu transaction.
   * @returns {boolean} true jika berhasil, false jika laporan tidak ditemukan
   */
  deleteReportCascade: async (reportId) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      await connection.query('DELETE FROM votes               WHERE threat_id = ?', [reportId]);
      await connection.query('DELETE FROM comments            WHERE threat_id = ?', [reportId]);
      await connection.query('DELETE FROM threat_verifications WHERE threat_id = ?', [reportId]);
      const [result] = await connection.query('DELETE FROM threats WHERE id = ?', [reportId]);

      if (result.affectedRows === 0) {
        await connection.rollback();
        return false;
      }

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  // ──────────────────────────────────────────────────
  // SETTINGS
  // ──────────────────────────────────────────────────

  /**
   * Ambil pengaturan aplikasi.
   * @returns {Object|null}
   */
  getSettings: async () => {
    const [rows] = await db.query('SELECT * FROM settings WHERE id = 1');
    return rows[0] || null;
  },

  /**
   * Simpan atau update pengaturan aplikasi.
   */
  upsertSettings: async ({ site_name, maintenance_mode, report_cooldown }) => {
    const [existing] = await db.query('SELECT id FROM settings WHERE id = 1');
    if (existing.length === 0) {
      await db.query(
        'INSERT INTO settings (id, site_name, maintenance_mode, report_cooldown) VALUES (1, ?, ?, ?)',
        [site_name, maintenance_mode, report_cooldown]
      );
    } else {
      await db.query(
        'UPDATE settings SET site_name = ?, maintenance_mode = ?, report_cooldown = ? WHERE id = 1',
        [site_name, maintenance_mode, report_cooldown]
      );
    }
  }
};

module.exports = DashboardModel;
