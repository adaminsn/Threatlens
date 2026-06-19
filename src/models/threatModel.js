const db = require('../config/database');

const ThreatModel = {
 
  // CREATE
  create: async (userId, title, indicator, type, category, description, status, virustotalResult) => {
    const [result] = await db.query(
      'INSERT INTO threats (user_id, title, indicator, type, category, description, status, virustotal_result) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, title, indicator, type, category, description, status, JSON.stringify(virustotalResult)]
    );
    return result.insertId;
  },

 
  // READ
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

  // 🔥 Cari user by ID (untuk verifikasi)
  findUserById: async (userId) => {
    const [rows] = await db.query(
      'SELECT id, username, email, role, reputation, level, avatar, bio FROM users WHERE id = ?',
      [userId]
    );
    return rows[0];
  },

  // 🔥 Cek apakah user sudah pernah vote
  hasUserVoted: async (userId, threatId) => {
    const [rows] = await db.query(
      'SELECT * FROM votes WHERE user_id = ? AND threat_id = ?',
      [userId, threatId]
    );
    return rows.length > 0;
  },

  // 🔥 Ambil statistik vote untuk threat
  getVoteStats: async (threatId) => {
    const [votes] = await db.query(`
      SELECT 
        SUM(CASE WHEN vote = 'dangerous' THEN weight ELSE 0 END) as dangerous_score,
        SUM(CASE WHEN vote = 'safe' THEN weight ELSE 0 END) as safe_score,
        COUNT(*) as total_votes
      FROM votes 
      WHERE threat_id = ?
    `, [threatId]);
    
    const [threat] = await db.query(
      'SELECT status, vote_score, vote_count_total FROM threats WHERE id = ?',
      [threatId]
    );
    
    return {
      dangerous: votes[0].dangerous_score || 0,
      safe: votes[0].safe_score || 0,
      total: votes[0].total_votes || 0,
      status: threat[0]?.status || 'pending',
      vote_score: threat[0]?.vote_score || 0,
      vote_count_total: threat[0]?.vote_count_total || 0
    };
  },

  // 🔥 Ambil trending threats (untuk sidebar feed)
  getTrendingThreats: async (limit = 5) => {
    const [rows] = await db.query(`
      SELECT 
        id,
        title,
        indicator,
        status,
        verified,
        (SELECT COUNT(*) FROM votes WHERE threat_id = threats.id) as vote_count,
        (SELECT COUNT(*) FROM comments WHERE threat_id = threats.id) as comment_count,
        created_at
      FROM threats
      ORDER BY vote_count DESC, comment_count DESC
      LIMIT ?
    `, [limit]);
    return rows;
  },

  // 🔥 Ambil riwayat verifikasi untuk admin
  getVerificationHistory: async (limit = 50) => {
    const [rows] = await db.query(`
      SELECT 
        tv.id,
        tv.threat_id,
        t.title as threat_title,
        t.indicator as threat_indicator,
        t.verified as threat_verified,
        tv.verifier_id,
        u.username as verifier_name,
        u.level as verifier_level,
        tv.verified_at
      FROM threat_verifications tv
      LEFT JOIN threats t ON tv.threat_id = t.id
      LEFT JOIN users u ON tv.verifier_id = u.id
      ORDER BY tv.verified_at DESC
      LIMIT ?
    `, [limit]);
    return rows;
  },

 
  // UPDATE
 
  
  update: async (id, title, indicator, description) => {
    await db.query(
      'UPDATE threats SET title = ?, indicator = ?, description = ? WHERE id = ?',
      [title, indicator, description, id]
    );
  },

  updateStatus: async (id, status) => {
    await db.query('UPDATE threats SET status = ? WHERE id = ?', [status, id]);
  },

  // 🔥 Update verifikasi
  updateVerification: async (id, isVerified, verificationCount, verificationList, newStatus) => {
    await db.query(
      'UPDATE threats SET verified = ?, verification_count = ?, verification_list = ?, status = ? WHERE id = ?',
      [isVerified ? 1 : 0, verificationCount, JSON.stringify(verificationList), newStatus, id]
    );
  },

  // 🔥 Update vote score
  updateVoteScore: async (threatId, voteValue) => {
    await db.query(
      'UPDATE threats SET vote_score = vote_score + ?, vote_count_total = vote_count_total + 1 WHERE id = ?',
      [voteValue, threatId]
    );
  },

  // 🔥 Update user reputation
  updateUserReputation: async (userId, change) => {
    await db.query(
      'UPDATE users SET reputation = reputation + ?, level = FLOOR(reputation / 100) + 1 WHERE id = ?',
      [change, userId]
    );
  },

  // 🔥 Insert vote
  insertVote: async (userId, threatId, vote, weight) => {
    await db.query(
      'INSERT INTO votes (user_id, threat_id, vote, weight) VALUES (?, ?, ?, ?)',
      [userId, threatId, vote, weight]
    );
  },

  // 🔥 Insert verifikasi log
  insertVerificationLog: async (threatId, verifierId) => {
    await db.query(
      'INSERT INTO threat_verifications (threat_id, verifier_id, verified_at) VALUES (?, ?, NOW())',
      [threatId, verifierId]
    );
  },

 
  // DELETE
 
  
  deleteById: async (id) => {
    await db.query('DELETE FROM votes WHERE threat_id = ?', [id]);
    await db.query('DELETE FROM comments WHERE threat_id = ?', [id]);
    await db.query('DELETE FROM threat_verifications WHERE threat_id = ?', [id]);
    await db.query('DELETE FROM threats WHERE id = ?', [id]);
  },

 
  // STATISTICS (untuk admin dashboard)
 
  
  // 🔥 Count threats by status
  countByStatus: async () => {
    const [rows] = await db.query(`
      SELECT 
        status,
        COUNT(*) as total
      FROM threats
      GROUP BY status
    `);
    return rows;
  },

  // 🔥 Count threats by category
  countByCategory: async () => {
    const [rows] = await db.query(`
      SELECT 
        category,
        COUNT(*) as total
      FROM threats
      GROUP BY category
    `);
    return rows;
  },

  // 🔥 Get threats per day (untuk chart)
  getThreatsPerDay: async (days = 7) => {
    const [rows] = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total
      FROM threats
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [days]);
    return rows;
  }
};

module.exports = ThreatModel;