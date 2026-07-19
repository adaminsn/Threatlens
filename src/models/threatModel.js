const db = require('../config/database');

// =====================================================
// THREAT MODEL
// Bertanggung jawab HANYA untuk operasi tabel threats
// dan tabel terkait (join) dalam domain threat.
// =====================================================

const ThreatModel = {
 
  // ──────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────
  create: async (userId, title, indicator, type, category, description, status, virustotalResult) => {
    const [result] = await db.query(
      'INSERT INTO threats (user_id, title, indicator, type, category, description, status, virustotal_result) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, title, indicator, type, category, description, status, JSON.stringify(virustotalResult)]
    );
    return result.insertId;
  },

 
  // ──────────────────────────────────────────────────
  // READ
  // ──────────────────────────────────────────────────
  findAll: async () => {
    const [rows] = await db.query(`
      SELECT 
        t.*,
        u.username,
        COUNT(DISTINCT v.id) AS vote_count,
        COUNT(DISTINCT c.id) AS comment_count
      FROM threats t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN votes v ON t.id = v.threat_id
      LEFT JOIN comments c ON t.id = c.threat_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    return rows;
  },

  findById: async (id) => {
    const [rows] = await db.query(`
      SELECT 
        t.*,
        u.username,
        t.verification_count,
        t.verification_list,
        COUNT(DISTINCT v.id) AS vote_count,
        COUNT(DISTINCT c.id) AS comment_count
      FROM threats t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN votes v ON t.id = v.threat_id
      LEFT JOIN comments c ON t.id = c.threat_id
      WHERE t.id = ?
      GROUP BY t.id
    `, [id]);
    return rows[0];
  },

  findByUserId: async (userId) => {
    const [rows] = await db.query(`
      SELECT 
        t.*,
        u.username,
        COUNT(DISTINCT v.id) AS vote_count,
        COUNT(DISTINCT c.id) AS comment_count
      FROM threats t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN votes v ON t.id = v.threat_id
      LEFT JOIN comments c ON t.id = c.threat_id
      WHERE t.user_id = ?
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `, [userId]);
    return rows;
  },

  // Ambil trending threats (untuk sidebar feed)
  getTrendingThreats: async (limit = 5) => {
    const [rows] = await db.query(`
      SELECT 
        id, title, indicator, status, verified,
        (SELECT COUNT(*) FROM votes    WHERE threat_id = threats.id) as vote_count,
        (SELECT COUNT(*) FROM comments WHERE threat_id = threats.id) as comment_count,
        created_at
      FROM threats
      ORDER BY vote_count DESC, comment_count DESC
      LIMIT ?
    `, [limit]);
    return rows;
  },

 
  // ──────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────
  update: async (id, title, indicator, description) => {
    await db.query(
      'UPDATE threats SET title = ?, indicator = ?, description = ? WHERE id = ?',
      [title, indicator, description, id]
    );
  },

  updateStatus: async (id, status) => {
    await db.query('UPDATE threats SET status = ? WHERE id = ?', [status, id]);
  },

  // Update data verifikasi (verified, count, list, status)
  updateVerification: async (id, isVerified, verificationCount, verificationList, newStatus) => {
    await db.query(
      'UPDATE threats SET verified = ?, verification_count = ?, verification_list = ?, status = ? WHERE id = ?',
      [isVerified ? 1 : 0, verificationCount, JSON.stringify(verificationList), newStatus, id]
    );
  },

 
  // ──────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────
  deleteById: async (id) => {
    await db.query('DELETE FROM votes               WHERE threat_id = ?', [id]);
    await db.query('DELETE FROM comments            WHERE threat_id = ?', [id]);
    await db.query('DELETE FROM threat_verifications WHERE threat_id = ?', [id]);
    await db.query('DELETE FROM threats             WHERE id         = ?', [id]);
  },

 
  // ──────────────────────────────────────────────────
  // STATISTICS
  // ──────────────────────────────────────────────────

  // Jumlah laporan per status
  countByStatus: async () => {
    const [rows] = await db.query(`
      SELECT status, COUNT(*) as total
      FROM threats
      GROUP BY status
    `);
    return rows;
  },

  // Jumlah laporan per kategori
  countByCategory: async () => {
    const [rows] = await db.query(`
      SELECT category, COUNT(*) as total
      FROM threats
      GROUP BY category
    `);
    return rows;
  },

  // Laporan per hari (untuk chart)
  getThreatsPerDay: async (days = 7) => {
    const [rows] = await db.query(`
      SELECT DATE(created_at) as date, COUNT(*) as total
      FROM threats
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [days]);
    return rows;
  }
};

module.exports = ThreatModel;