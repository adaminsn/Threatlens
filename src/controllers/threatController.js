const ThreatModel = require('../models/threatModel');
const { checkWithVirusTotal } = require('../services/virusTotalService');
const { formatThreat } = require('../utils/helpers');
const db = require('../config/database');

const threatController = {
  // GET /api/threats
  getAllThreats: async (req, res) => {
    try {
      const threats = await ThreatModel.findAll();
      const formatted = threats.map(t => {
        if (t.virustotal_result) {
          try {
            t.virustotal_result = JSON.parse(t.virustotal_result);
          } catch(e) { t.virustotal_result = null; }
        }
        return formatThreat(t);
      });
      res.json(formatted);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // GET /api/threats/my
  getMyThreats: async (req, res) => {
    try {
      const threats = await ThreatModel.findByUserId(req.user.id);
      const formatted = threats.map(t => {
        if (t.virustotal_result) {
          try {
            t.virustotal_result = JSON.parse(t.virustotal_result);
          } catch(e) { t.virustotal_result = null; }
        }
        return formatThreat(t);
      });
      res.json(formatted);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // GET /api/threats/:id
  getThreatById: async (req, res) => {
    try {
      const threat = await ThreatModel.findById(req.params.id);
      if (!threat) {
        return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
      }
      
      if (threat.virustotal_result) {
        try {
          threat.virustotal_result = JSON.parse(threat.virustotal_result);
        } catch(e) { threat.virustotal_result = null; }
      }
      
      res.json(formatThreat(threat));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // POST /api/threats
  createThreat: async (req, res) => {
    try {
      const { title, indicator, type, category, description } = req.body;

      if (!title || !indicator || !type || !category) {
        return res.status(400).json({ message: 'Semua field wajib diisi.' });
      }

      let threatStatus = 'pending';
      let virusTotalResult = null;
      
      console.log(`🔍 Checking ${type}: ${indicator} with VirusTotal...`);
      const vtResult = await checkWithVirusTotal(indicator, type);
      
      if (vtResult.scanned && !vtResult.error) {
        virusTotalResult = {
          scanned: true,
          malicious_count: vtResult.malicious_count,
          suspicious_count: vtResult.suspicious_count,
          total_engines: vtResult.total_engines,
          risk_score: vtResult.risk_score,
          recommended_level: vtResult.recommended_level,
          checked_at: new Date().toISOString()
        };
        
        if (vtResult.recommended_level) {
          threatStatus = vtResult.recommended_level;
          console.log(`📊 VirusTotal: ${vtResult.recommended_level} (${vtResult.malicious_count}/${vtResult.total_engines})`);
        }
      }

      const threatId = await ThreatModel.create(
        req.user.id, title, indicator, type, category, description, threatStatus, virusTotalResult
      );

      await ThreatModel.updateUserReputation(req.user.id, 10);

      res.status(201).json({ 
        message: 'Laporan berhasil disubmit!', 
        id: threatId,
        status: threatStatus,
        virusTotal: virusTotalResult
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // PUT /api/threats/:id/verify
  verifyThreat: async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      
      const user = await ThreatModel.findUserById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User tidak ditemukan.' });
      }
      
      const userLevel = user.level || 1;
      const canVerify = (userRole === 'admin') || (userLevel >= 50);
      
      if (!canVerify) {
        return res.status(403).json({ 
          message: `⚠️ Level ${userLevel} belum cukup. Minimal Level 50.`,
          requiredLevel: 50,
          currentLevel: userLevel
        });
      }

      const threat = await ThreatModel.findById(req.params.id);
      if (!threat) {
        return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
      }

      let verificationList = [];
      if (threat.verification_list && threat.verification_list !== 'null') {
        try {
          verificationList = JSON.parse(threat.verification_list);
        } catch(e) { verificationList = []; }
      }

      if (verificationList.includes(userId)) {
        return res.status(400).json({ message: 'Anda sudah pernah memverifikasi laporan ini.' });
      }

      if (threat.user_id === userId && userRole !== 'admin') {
        return res.status(403).json({ message: 'Tidak bisa memverifikasi laporan sendiri.' });
      }

      verificationList.push(userId);
      const newCount = verificationList.length;
      let isVerified = false;
      let newStatus = threat.status;
      let message = '';

      if (newCount >= 5) {
        isVerified = true;
        newStatus = 'dangerous';
        message = `🎉 Laporan telah mencapai 5 verifikasi! Status: ${newStatus.toUpperCase()}`;
      } else {
        message = `✅ Verifikasi berhasil! (${newCount}/5 verifikasi) +5 reputasi.`;
      }

      await ThreatModel.updateVerification(req.params.id, isVerified, newCount, verificationList, newStatus);
      await ThreatModel.insertVerificationLog(req.params.id, userId);
      await ThreatModel.updateUserReputation(userId, 5);

      if (isVerified) {
        await ThreatModel.updateUserReputation(threat.user_id, 50);
      }

      res.json({ message, verified: isVerified, verificationCount: newCount, newStatus });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // PATCH /api/threats/:id
  updateThreat: async (req, res) => {
    try {
      const threat = await ThreatModel.findById(req.params.id);
      if (!threat) {
        return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
      }

      if (threat.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Tidak ada izin untuk mengedit.' });
      }

      const { title, target, indicator, description } = req.body;
      await ThreatModel.update(
        req.params.id,
        title || threat.title,
        indicator || target || threat.indicator,
        description || threat.description
      );

      res.json({ message: 'Laporan berhasil diperbarui.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // DELETE /api/threats/:id
  deleteThreat: async (req, res) => {
    try {
      const threat = await ThreatModel.findById(req.params.id);
      if (!threat) {
        return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
      }

      if (threat.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Tidak ada izin untuk menghapus.' });
      }

      await ThreatModel.deleteById(req.params.id);
      res.json({ message: 'Laporan berhasil dihapus.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  }
};

module.exports = threatController;