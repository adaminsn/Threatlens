const express = require('express');
const router  = express.Router();
const voteController = require('../controllers/voteController');
const { verifyToken } = require('../middlewares/auth');

// =====================================================
// ROUTES
// =====================================================

// POST / — submit vote (memerlukan auth)
router.post('/', verifyToken, voteController.castVote);

// GET /:threat_id — statistik vote publik (tanpa auth)
router.get('/:threat_id', voteController.getVoteStats);

// GET /:threat_id/my — cek vote user yang login (memerlukan auth)
router.get('/:threat_id/my', verifyToken, voteController.getUserVote);

module.exports = router;