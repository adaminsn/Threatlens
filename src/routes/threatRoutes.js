const express = require('express');
const router = express.Router();
const threatController = require('../controllers/threatController');
const { verifyToken } = require('../middlewares/auth');

 
// ROUTES
// Public routes (bisa diakses tanpa login)
router.get('/', threatController.getAllThreats);
router.get('/:id', threatController.getThreatById);

// Protected routes (perlu login)
router.get('/my', verifyToken, threatController.getMyThreats);
router.post('/', verifyToken, threatController.createThreat);
router.patch('/:id', verifyToken, threatController.updateThreat);
router.delete('/:id', verifyToken, threatController.deleteThreat);
router.put('/:id/verify', verifyToken, threatController.verifyThreat);

module.exports = router;