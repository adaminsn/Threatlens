const db = require('../config/database');

const UserModel = {
  // =============================================
  // CREATE
  // =============================================
  
  create: async (username, email, hashedPassword) => {
    const [result] = await db.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );
    return result.insertId;
  },

  // =============================================
  // READ
  // =============================================
  
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

  // =============================================
  // UPDATE
  // =============================================
  
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

  // =============================================
  // DELETE
  // =============================================
  
  deleteById: async (userId) => {
    await db.query('DELETE FROM votes WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM comments WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM threat_verifications WHERE verifier_id = ?', [userId]);
    await db.query('DELETE FROM threats WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
  },

  // =============================================
  // STATISTICS
  // =============================================
  
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

  // =============================================
  // 🔥 BARU: UTILITY
  // =============================================
  
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
  }
};

module.exports = UserModel;