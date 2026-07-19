const VoteModel   = require('../models/voteModel');
const ThreatModel = require('../models/threatModel');

// =====================================================
// VOTE SERVICE
// Business logic untuk sistem voting laporan ancaman.
// =====================================================

const VoteService = {

  /**
   * Hitung bobot vote berdasarkan level user.
   * Level >= 50 mendapat bobot 3x, level biasa 1x.
   */
  calculateWeight: (userLevel) => userLevel >= 50 ? 3 : 1,

  /**
   * Hitung nilai numerik vote:
   * 'dangerous' = +weight, 'safe' = -weight.
   */
  getVoteValue: (vote, weight) => {
    if (vote === 'dangerous') return  weight;
    if (vote === 'safe')      return -weight;
    return 0;
  },

  /**
   * Tentukan status laporan baru berdasarkan vote score.
   * Baru dihitung jika total vote >= 10.
   */
  determineNewStatus: (voteScore, totalVotes, currentStatus) => {
    if (totalVotes < 10) return currentStatus;

    const maxPossibleScore = totalVotes * 3;
    const percentage       = (voteScore / maxPossibleScore) * 100;

    if (percentage >= 70)      return 'dangerous';
    if (percentage >= 30)      return 'suspicious';
    return 'safe';
  },

  /**
   * Proses vote baru:
   * - Cek duplikat vote
   * - Cek laporan ada
   * - Hitung bobot & nilai vote
   * - Simpan vote + update score
   * - Update status laporan jika sudah >= 10 vote
   */
  castVote: async (userId, threatId, vote, userLevel) => {
    const hasVoted = await VoteModel.hasUserVoted(userId, threatId);
    if (hasVoted) {
      throw { status: 400, message: 'Anda sudah memberikan vote untuk laporan ini.' };
    }

    const threat = await ThreatModel.findById(threatId);
    if (!threat) {
      throw { status: 404, message: 'Laporan tidak ditemukan.' };
    }

    const weight    = VoteService.calculateWeight(userLevel);
    const voteValue = VoteService.getVoteValue(vote, weight);

    await VoteModel.create(userId, threatId, vote, weight);
    await VoteModel.updateThreatScore(threatId, voteValue);

    // Ambil statistik terbaru setelah insert + update score
    const stats     = await VoteModel.getStats(threatId);
    const newStatus = VoteService.determineNewStatus(
      stats.vote_score,
      stats.total,
      threat.status
    );

    // Update status jika berubah dan sudah cukup vote
    if (newStatus !== threat.status && stats.total >= 10) {
      await VoteModel.updateThreatStatus(threatId, newStatus);
    }

    return {
      vote_score:    stats.vote_score,
      vote_count:    stats.total,
      status:        newStatus,
      needsMoreVotes: stats.total < 10
    };
  },

  /**
   * Ambil statistik vote berbobot untuk sebuah laporan.
   */
  getVoteStats: async (threatId) => {
    return await VoteModel.getStats(threatId);
  },

  /**
   * Ambil data vote milik user tertentu untuk sebuah laporan.
   */
  getUserVote: async (userId, threatId) => {
    return await VoteModel.getUserVote(userId, threatId);
  }
};

module.exports = VoteService;
