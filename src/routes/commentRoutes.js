const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { verifyToken } = require('../middlewares/auth');

// =====================================================
// ROUTES
// =====================================================

router.get('/:threat_id', commentController.getComments);
router.post('/', verifyToken, commentController.createComment);
router.put('/:id', verifyToken, commentController.updateComment);
router.delete('/:id', verifyToken, commentController.deleteComment);

module.exports = router;