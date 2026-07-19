const db = require('../config/database');

// =====================================================
// AUTH MODEL
// Bertanggung jawab untuk operasi tabel password_resets
// =====================================================

const AuthModel = {
  /**
   * Simpan atau update token reset password untuk email tertentu.
   */
  createPasswordReset: async (email, token, expiresAt) => {
    await db.query(
      `INSERT INTO password_resets (email, token, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)`,
      [email, token, expiresAt]
    );
  },

  /**
   * Cari reset token yang masih valid (belum kadaluarsa).
   * @returns {Object|undefined} row dengan field `email`, atau undefined jika tidak ada
   */
  findPasswordReset: async (token) => {
    const [rows] = await db.query(
      'SELECT email FROM password_resets WHERE token = ? AND expires_at > NOW()',
      [token]
    );
    return rows[0];
  },

  /**
   * Hapus token reset password setelah berhasil digunakan.
   */
  deletePasswordReset: async (token) => {
    await db.query('DELETE FROM password_resets WHERE token = ?', [token]);
  }
};

module.exports = AuthModel;
