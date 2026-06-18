const db = require('../config/database');

const VoteModel = {
  // Cek apakah user sudah vote
  hasUserVoted: async (userId, threatId) => {
    const [rows] = await db.query(
      'SELECT * FROM votes WHERE user_id = ? AND threat_id = ?',
      [userId, threatId]
    );
    return rows.length > 0;
  },

  // Insert vote baru
  create: async (userId, threatId, vote, weight) => {
    await db.query(
      'INSERT INTO votes (user_id, threat_id, vote, weight) VALUES (?, ?, ?, ?)',
      [userId, threatId, vote, weight]
    );
  },

  // Hitung bobot vote (level 50+ = 3, lainnya = 1)
  calculateWeight: (userLevel) => {
    return userLevel >= 50 ? 3 : 1;
  },

  // Hitung nilai vote (dangerous = +weight, safe = -weight)
  getVoteValue: (vote, weight) => {
    if (vote === 'dangerous') return weight;
    if (vote === 'safe') return -weight;
    return 0;
  },

  // Ambil statistik vote untuk threat
  getStats: async (threatId) => {
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

  // Update vote score di tabel threats
  updateThreatScore: async (threatId, voteValue) => {
    await db.query(
      'UPDATE threats SET vote_score = vote_score + ?, vote_count_total = vote_count_total + 1 WHERE id = ?',
      [voteValue, threatId]
    );
  },

  // Update status threat berdasarkan vote (jika sudah 10 vote)
  updateThreatStatusByVote: async (threatId, currentStatus, voteScore, totalVotes) => {
    if (totalVotes >= 10) {
      const maxPossibleScore = totalVotes * 3;
      const percentage = (voteScore / maxPossibleScore) * 100;
      
      let newStatus = currentStatus;
      if (percentage >= 70) {
        newStatus = 'dangerous';
      } else if (percentage >= 30) {
        newStatus = 'suspicious';
      } else {
        newStatus = 'safe';
      }
      
      if (newStatus !== currentStatus) {
        await db.query('UPDATE threats SET status = ? WHERE id = ?', [newStatus, threatId]);
        return newStatus;
      }
    }
    return currentStatus;
  }
};

module.exports = VoteModel;