const ThreatService = require('../services/threatService');

// =====================================================
// THREAT CONTROLLER
// Hanya berisi: validasi input, pemanggilan ThreatService,
// pengiriman response JSON.
// =====================================================

// Helper untuk kirim error response
const handleError = (res, err) => {
  console.error('❌ ThreatController Error:', err.message || err);
  const body = { message: err.message || 'Terjadi kesalahan server.' };
  if (err.requiredLevel) {
    body.requiredLevel = err.requiredLevel;
    body.currentLevel  = err.currentLevel;
  }
  res.status(err.status || 500).json(body);
};

const threatController = {

  getAllThreats: async (req, res) => {
    try {
      const threats = await ThreatService.getAllThreats();
      res.json(threats);
    } catch (err) { handleError(res, err); }
  },

  getMyThreats: async (req, res) => {
    try {
      const threats = await ThreatService.getMyThreats(req.user.id);
      res.json(threats);
    } catch (err) { handleError(res, err); }
  },

  getThreatById: async (req, res) => {
    try {
      const threat = await ThreatService.getThreatById(req.params.id);
      res.json(threat);
    } catch (err) { handleError(res, err); }
  },

  createThreat: async (req, res) => {
    try {
      const { title, indicator, type, category, description } = req.body;
      const result = await ThreatService.createThreat(
        req.user.id,
        { title, indicator, type, category, description }
      );
      res.status(201).json({ message: 'Laporan berhasil disubmit!', ...result });
    } catch (err) { handleError(res, err); }
  },

  verifyThreat: async (req, res) => {
    try {
      const result = await ThreatService.verifyThreat(
        req.params.id,
        req.user.id,
        req.user.role
      );
      res.json(result);
    } catch (err) { handleError(res, err); }
  },

  updateThreat: async (req, res) => {
    try {
      const { title, target, indicator, description } = req.body;
      const result = await ThreatService.updateThreat(
        req.params.id,
        req.user.id,
        req.user.role,
        { title, target, indicator, description }
      );
      res.json(result);
    } catch (err) { handleError(res, err); }
  },

  deleteThreat: async (req, res) => {
    try {
      const result = await ThreatService.deleteThreat(
        req.params.id,
        req.user.id,
        req.user.role
      );
      res.json(result);
    } catch (err) { handleError(res, err); }
  }
};

module.exports = threatController;