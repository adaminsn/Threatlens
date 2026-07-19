const db = require('../config/database');

const UserModel = {
 
  // CREATE
 
  
  create: async (username, email, hashedPassword) => {
    const [result] = await db.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );
    return result.insertId;
  },

 
  // READ
 
  
  findByEmail: async (email) => {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  },

  findById: async (id) => {
    const [rows] = await db.query(
      'SELECT id, username, email, role, reputation, level, avatar, bio, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  },

  findByUsername: async (username) => {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  },

  findByUsernameOrEmail: async (username, email) => {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    return rows;
  },

  findAll: async () => {
    const [rows] = await db.query(`
      SELECT 
        id, username, email, role, reputation, level, avatar, bio, created_at,
        (SELECT COUNT(*) FROM threats WHERE user_id = users.id) as total_reports,
        (SELECT COUNT(*) FROM votes WHERE user_id = users.id) as total_votes
      FROM users
      ORDER BY reputation DESC
    `);
    return rows;
  },

 
  // UPDATE
 
  
  updateProfile: async (userId, username, email, bio) => {
    await db.query(
      'UPDATE users SET username = ?, email = ?, bio = ? WHERE id = ?',
      [username, email, bio, userId]
    );
  },

  updatePassword: async (userId, hashedPassword) => {
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
  },

  updateAvatar: async (userId, avatarUrl) => {
    await db.query('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, userId]);
  },

  updateReputation: async (userId, change) => {
    // Update reputasi dan level secara otomatis
    await db.query(
      'UPDATE users SET reputation = reputation + ? WHERE id = ?',
      [change, userId]
    );
    // Update level berdasarkan reputasi terbaru
    await db.query(
      'UPDATE users SET level = FLOOR(reputation / 100) + 1 WHERE id = ?',
      [userId]
    );
  },

  // 🔥 BARU: Update level saja (tanpa mengubah reputasi)
  updateLevel: async (userId) => {
    await db.query(
      'UPDATE users SET level = FLOOR(reputation / 100) + 1 WHERE id = ?',
      [userId]
    );
  },

  updateRole: async (userId, role) => {
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
  },

  updateLastActivity: async (userId) => {
    await db.query('UPDATE users SET last_activity = NOW() WHERE id = ?', [userId]);
  },

 
  // DELETE
 
  
  deleteById: async (userId) => {
    await db.query('DELETE FROM votes WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM comments WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM threat_verifications WHERE verifier_id = ?', [userId]);
    await db.query('DELETE FROM threats WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
  },

 
  // STATISTICS
 
  
  getTotalCount: async () => {
    const [rows] = await db.query("SELECT COUNT(*) as total FROM users WHERE role = 'user'");
    return rows[0].total;
  },

  getOnlineUsers: async () => {
    const [rows] = await db.query(
      "SELECT COUNT(*) as total FROM users WHERE last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE)"
    );
    return rows[0].total;
  },

  getNewUsersToday: async () => {
    const [rows] = await db.query(
      "SELECT COUNT(*) as total FROM users WHERE DATE(created_at) = CURDATE()"
    );
    return rows[0].total;
  },

 
  // 🔥 BARU: UTILITY
 
  
  // Cek apakah email sudah digunakan (untuk validasi)
  isEmailExists: async (email, excludeUserId = null) => {
    let query = 'SELECT id FROM users WHERE email = ?';
    const params = [email];
    
    if (excludeUserId) {
      query += ' AND id != ?';
      params.push(excludeUserId);
    }
    
    const [rows] = await db.query(query, params);
    return rows.length > 0;
  },

  // Cek apakah username sudah digunakan
  isUsernameExists: async (username, excludeUserId = null) => {
    let query = 'SELECT id FROM users WHERE username = ?';
    const params = [username];
    
    if (excludeUserId) {
      query += ' AND id != ?';
      params.push(excludeUserId);
    }
    
    const [rows] = await db.query(query, params);
    return rows.length > 0;
  },

  // Update email saja
  updateEmail: async (userId, email) => {
    await db.query('UPDATE users SET email = ? WHERE id = ?', [email, userId]);
  },

  // Update username saja
  updateUsername: async (userId, username) => {
    await db.query('UPDATE users SET username = ? WHERE id = ?', [username, userId]);
  },

  // Update bio saja
  updateBio: async (userId, bio) => {
    await db.query('UPDATE users SET bio = ? WHERE id = ?', [bio, userId]);
  },

  // ──────────────────────────────────────────────────
  // 🔥 METHODS BARU UNTUK AUTH SERVICE
  // ──────────────────────────────────────────────────

  /**
   * Cari user untuk proses login (termasuk email_verified dan device tracking).
   */
  findForLogin: async (email) => {
    const [rows] = await db.query(
      `SELECT id, username, email, password, role, reputation, level, avatar, bio,
              email_verified, created_at, last_activity, last_activity_device
       FROM users WHERE email = ?`,
      [email]
    );
    return rows[0];
  },

  /**
   * Update last_activity dan device saat login.
   */
  updateLoginActivity: async (userId, userAgent) => {
    await db.query(
      'UPDATE users SET last_activity = NOW(), last_activity_device = ? WHERE id = ?',
      [userAgent, userId]
    );
  },

  /**
   * Verifikasi email user (set email_verified = 1).
   * @returns {number} affectedRows — 0 jika sudah terverifikasi sebelumnya
   */
  verifyEmail: async (email) => {
    const [result] = await db.query(
      'UPDATE users SET email_verified = 1 WHERE email = ? AND email_verified = 0',
      [email]
    );
    return result.affectedRows;
  },

  /**
   * Cari user untuk keperluan verifikasi email (hanya username & status verified).
   */
  findByEmailForVerification: async (email) => {
    const [rows] = await db.query(
      'SELECT username, email_verified FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  },

  /**
   * Ambil data publik user by ID (untuk endpoint GET /user/:id).
   */
  findPublicById: async (id) => {
    const [rows] = await db.query(
      'SELECT id, username, avatar, level, reputation FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  },

  /**
   * Update password berdasarkan email (untuk reset password flow).
   */
  updatePasswordByEmail: async (email, hashedPassword) => {
    await db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
  },

  // ──────────────────────────────────────────────────
  // 🔥 LEADERBOARD QUERIES
  // ──────────────────────────────────────────────────

  /**
   * Ambil top hunters berdasarkan reputasi.
   */
  findTopHunters: async (limit) => {
    const [rows] = await db.query(`
      SELECT
        id,
        username,
        COALESCE(reputation, 0) as reputation,
        COALESCE(level, 1)      as level,
        COALESCE(avatar, '')    as avatar,
        (SELECT COUNT(*) FROM threats WHERE user_id = users.id) AS total_reports
      FROM users
      WHERE role = 'user'
      ORDER BY reputation DESC
      LIMIT ?
    `, [limit]);
    return rows;
  },

  /**
   * Ambil top contributors berdasarkan jumlah laporan dan vote.
   */
  findTopContributors: async (limit) => {
    const [rows] = await db.query(`
      SELECT
        u.id,
        u.username,
        COALESCE(u.reputation, 0) as reputation,
        COALESCE(u.level, 1)      as level,
        COALESCE(u.avatar, '')    as avatar,
        COUNT(DISTINCT t.id) AS total_reports,
        COUNT(DISTINCT v.id) AS total_votes
      FROM users u
      LEFT JOIN threats t ON t.user_id = u.id
      LEFT JOIN votes   v ON v.threat_id = t.id
      WHERE u.role = 'user'
      GROUP BY u.id
      ORDER BY total_reports DESC, total_votes DESC
      LIMIT ?
    `, [limit]);
    return rows;
  },

  /**
   * Ambil daftar user yang sedang online (aktif dalam 5 menit terakhir).
   */
  findOnlineUsers: async () => {
    const [rows] = await db.query(`
      SELECT id, username, avatar, role
      FROM users
      WHERE role IN ('user', 'admin')
        AND last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
      ORDER BY last_activity DESC
      LIMIT 20
    `);
    return rows;
  },

  /**
   * Ambil daftar achievement yang sudah diraih user.
   */
  findAchievements: async (userId) => {
    const [rows] = await db.query(`
      SELECT achievement_type, achieved_at
      FROM user_achievements
      WHERE user_id = ?
      ORDER BY achieved_at ASC
    `, [userId]);
    return rows;
  },

  /**
   * Hitung rank dan total user untuk menentukan posisi user.
   * @returns {{ rank: number, totalUsers: number }}
   */
  findRank: async (userId) => {
    const [rankRows] = await db.query(`
      SELECT COUNT(*) + 1 AS rank
      FROM users
      WHERE reputation > (SELECT reputation FROM users WHERE id = ?)
    `, [userId]);
    const [totalRows] = await db.query(
      'SELECT COUNT(*) AS total FROM users WHERE role = "user"'
    );
    return { rank: rankRows[0].rank, totalUsers: totalRows[0].total };
  }
};

module.exports = UserModel;