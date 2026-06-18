const VoteModel = require('../models/voteModel');
const ThreatModel = require('../models/threatModel');

const voteController = {
  // POST /api/votes
  castVote: async (req, res) => {
    try {
      const { threat_id, vote } = req.body;
      const userId = req.user.id;
      const userLevel = req.user.level || 1;

      const hasVoted = await VoteModel.hasUserVoted(userId, threat_id);
      if (hasVoted) {
        return res.status(400).json({ message: 'Anda sudah memberikan vote untuk laporan ini.' });
      }

      const threat = await ThreatModel.findById(threat_id);
      if (!threat) {
        return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
      }

      const weight = VoteModel.calculateWeight(userLevel);
      const voteValue = VoteModel.getVoteValue(vote, weight);

      await VoteModel.create(userId, threat_id, vote, weight);
      await VoteModel.updateThreatScore(threat_id, voteValue);

      const stats = await VoteModel.getStats(threat_id);
      const newStatus = await VoteModel.updateThreatStatusByVote(
        threat_id, threat.status, stats.vote_score, stats.total
      );

      res.json({ 
        message: 'Vote berhasil!',
        vote_score: stats.vote_score,
        vote_count: stats.total,
        status: newStatus,
        needsMoreVotes: stats.total < 10
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // GET /api/votes/:threat_id
  getVoteStats: async (req, res) => {
    try {
      const stats = await VoteModel.getStats(req.params.threat_id);
      res.json(stats);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  }
};

module.exports = voteController;