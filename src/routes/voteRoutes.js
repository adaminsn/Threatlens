const express = require('express');
const router = express.Router();
const voteController = require('../controllers/voteController');
const { verifyToken } = require('../middlewares/auth');

 
// ROUTES
router.post('/', verifyToken, voteController.castVote);
router.get('/:threat_id', voteController.getVoteStats);

module.exports = router;