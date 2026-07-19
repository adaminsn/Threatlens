const db = require('../config/database');

// =====================================================
// VOTE MODEL
// Bertanggung jawab HANYA untuk operasi tabel votes
// dan update kolom vote-terkait di tabel threats.
//
// Business logic (calculateWeight, getVoteValue,
// determineNewStatus) ada di VoteService.
// =====================================================

const VoteModel = {

  // ──────────────────────────────────────────────────
  // READ
  // ──────────────────────────────────────────────────

  /**
   * Cek apakah user sudah pernah vote untuk laporan ini.
   */
  hasUserVoted: async (userId, threatId) => {
    const [rows] = await db.query(
      'SELECT id FROM votes WHERE user_id = ? AND threat_id = ?',
      [userId, threatId]
    );
    return rows.length > 0;
  },

  /**
   * Ambil statistik vote + data vote user tertentu.
   * Digunakan untuk endpoint GET /votes/:threat_id dengan auth.
   */
  getUserVote: async (userId, threatId) => {
    const [voteRows] = await db.query(
      'SELECT vote FROM votes WHERE user_id = ? AND threat_id = ?',
      [userId, threatId]
    );
    const [counts] = await db.query(
      `SELECT
         SUM(vote = 'dangerous') AS dangerous,
         SUM(vote = 'safe')      AS safe
       FROM votes WHERE threat_id = ?`,
      [threatId]
    );
    return {
      dangerous: Number(counts[0].dangerous || 0),
      safe:      Number(counts[0].safe      || 0),
      user_vote: voteRows.length > 0 ? voteRows[0].vote : null
    };
  },

  /**
   * Ambil statistik vote berbobot untuk threat (dangerous_score, safe_score, total).
   * Juga mengambil vote_score dan status dari tabel threats.
   */
  getStats: async (threatId) => {
    const [votes] = await db.query(`
      SELECT 
        SUM(CASE WHEN vote = 'dangerous' THEN weight ELSE 0 END) as dangerous_score,
        SUM(CASE WHEN vote = 'safe'      THEN weight ELSE 0 END) as safe_score,
        COUNT(*) as total_votes
      FROM votes 
      WHERE threat_id = ?
    `, [threatId]);

    const [threat] = await db.query(
      'SELECT status, vote_score, vote_count_total FROM threats WHERE id = ?',
      [threatId]
    );

    return {
      dangerous:       votes[0].dangerous_score || 0,
      safe:            votes[0].safe_score      || 0,
      total:           votes[0].total_votes     || 0,
      status:          threat[0]?.status         || 'pending',
      vote_score:      threat[0]?.vote_score     || 0,
      vote_count_total: threat[0]?.vote_count_total || 0
    };
  },

  // ──────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────

  /**
   * Insert vote baru.
   */
  create: async (userId, threatId, vote, weight) => {
    await db.query(
      'INSERT INTO votes (user_id, threat_id, vote, weight) VALUES (?, ?, ?, ?)',
      [userId, threatId, vote, weight]
    );
  },

  // ──────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────

  /**
   * Tambah vote_score dan vote_count_total di tabel threats.
   */
  updateThreatScore: async (threatId, voteValue) => {
    await db.query(
      'UPDATE threats SET vote_score = vote_score + ?, vote_count_total = vote_count_total + 1 WHERE id = ?',
      [voteValue, threatId]
    );
  },

  /**
   * Update status laporan berdasarkan hasil kalkulasi (kalkulasi ada di VoteService).
   */
  updateThreatStatus: async (threatId, status) => {
    await db.query('UPDATE threats SET status = ? WHERE id = ?', [status, threatId]);
  }
};

module.exports = VoteModel;