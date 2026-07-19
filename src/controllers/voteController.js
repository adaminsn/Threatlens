const VoteService = require('../services/voteService');

// =====================================================
// VOTE CONTROLLER
// Hanya berisi: validasi input, pemanggilan VoteService,
// pengiriman response JSON.
// =====================================================

// Helper untuk kirim error response
const handleError = (res, err) => {
  console.error('❌ VoteController Error:', err.message || err);
  res.status(err.status || 500).json({ message: err.message || 'Terjadi kesalahan server.' });
};

const voteController = {

  /**
   * POST /api/votes — submit vote (memerlukan auth)
   */
  castVote: async (req, res) => {
    try {
      const { threat_id, vote } = req.body;

      if (!threat_id || !vote) {
        return res.status(400).json({ message: 'threat_id dan vote wajib diisi.' });
      }
      if (!['dangerous', 'safe'].includes(vote)) {
        return res.status(400).json({ message: 'Vote harus "dangerous" atau "safe".' });
      }

      const userId    = req.user.id;
      const userLevel = req.user.level || 1;

      const result = await VoteService.castVote(userId, threat_id, vote, userLevel);
      res.json({ message: 'Vote berhasil!', ...result });
    } catch (err) { handleError(res, err); }
  },

  /**
   * GET /api/votes/:threat_id — statistik vote publik (tanpa auth)
   */
  getVoteStats: async (req, res) => {
    try {
      const stats = await VoteService.getVoteStats(req.params.threat_id);
      res.json(stats);
    } catch (err) { handleError(res, err); }
  },

  /**
   * GET /api/votes/:threat_id/my — vote user yang sedang login (memerlukan auth)
   */
  getUserVote: async (req, res) => {
    try {
      const result = await VoteService.getUserVote(req.user.id, req.params.threat_id);
      res.json(result);
    } catch (err) { handleError(res, err); }
  }
};

module.exports = voteController;