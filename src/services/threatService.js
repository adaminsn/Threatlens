const ThreatModel       = require('../models/threatModel');
const UserModel         = require('../models/userModel');
const VerificationModel = require('../models/verificationModel');
const { checkWithVirusTotal } = require('./virusTotalService');
const { formatThreat }  = require('../utils/helpers');

// =====================================================
// THREAT SERVICE
// Semua business logic untuk manajemen laporan ancaman.
// =====================================================

const ThreatService = {

  /**
   * Ambil semua laporan (public feed) + format untuk frontend.
   */
  getAllThreats: async () => {
    const threats = await ThreatModel.findAll();
    return threats.map(t => {
      if (t.virustotal_result) {
        try { t.virustotal_result = JSON.parse(t.virustotal_result); }
        catch (e) { t.virustotal_result = null; }
      }
      return formatThreat(t);
    });
  },

  /**
   * Ambil laporan milik user yang sedang login.
   */
  getMyThreats: async (userId) => {
    const threats = await ThreatModel.findByUserId(userId);
    return threats.map(t => {
      if (t.virustotal_result) {
        try { t.virustotal_result = JSON.parse(t.virustotal_result); }
        catch (e) { t.virustotal_result = null; }
      }
      return formatThreat(t);
    });
  },

  /**
   * Ambil detail satu laporan.
   */
  getThreatById: async (id) => {
    const threat = await ThreatModel.findById(id);
    if (!threat) throw { status: 404, message: 'Laporan tidak ditemukan.' };

    if (threat.virustotal_result) {
      try { threat.virustotal_result = JSON.parse(threat.virustotal_result); }
      catch (e) { threat.virustotal_result = null; }
    }

    return formatThreat(threat);
  },

  /**
   * Submit laporan baru:
   * - Validasi field wajib
   * - Cek dengan VirusTotal API
   * - Simpan ke DB
   * - Tambah reputasi submitter +10
   */
  createThreat: async (userId, { title, indicator, type, category, description }) => {
    if (!title || !indicator || !type || !category) {
      throw { status: 400, message: 'Semua field wajib diisi.' };
    }

    let threatStatus    = 'pending';
    let virusTotalResult = null;

    console.log(`🔍 Checking ${type}: ${indicator} with VirusTotal...`);
    const vtResult = await checkWithVirusTotal(indicator, type);

    if (vtResult.scanned && !vtResult.error) {
      virusTotalResult = {
        scanned:           true,
        malicious_count:   vtResult.malicious_count,
        suspicious_count:  vtResult.suspicious_count,
        total_engines:     vtResult.total_engines,
        risk_score:        vtResult.risk_score,
        recommended_level: vtResult.recommended_level,
        checked_at:        new Date().toISOString()
      };

      if (vtResult.recommended_level) {
        threatStatus = vtResult.recommended_level;
        console.log(`📊 VirusTotal: ${vtResult.recommended_level} (${vtResult.malicious_count}/${vtResult.total_engines})`);
      }
    } else if (vtResult.error) {
      virusTotalResult = { scanned: false, error: vtResult.error };
    } else {
      virusTotalResult = { scanned: false, message: 'Tidak ditemukan di database VirusTotal' };
    }

    const threatId = await ThreatModel.create(
      userId, title, indicator, type, category, description, threatStatus, virusTotalResult
    );

    // Tambah reputasi submitter +10
    await UserModel.updateReputation(userId, 10);

    return { id: threatId, status: threatStatus, virusTotal: virusTotalResult };
  },

  /**
   * Verifikasi laporan oleh user (sistem 5 verifikator):
   * - Cek level user (minimal 50 atau admin)
   * - Cek sudah pernah verify atau tidak
   * - Cek tidak memverifikasi laporan sendiri
   * - Jika sudah 5 verifikasi → laporan terverifikasi resmi
   * - Tambah reputasi verifier +5, reporter +50 jika resmi terverifikasi
   */
  verifyThreat: async (threatId, userId, userRole) => {
    const user = await UserModel.findById(userId);
    if (!user) throw { status: 404, message: 'User tidak ditemukan.' };

    const userLevel = user.level || 1;
    const canVerify = (userRole === 'admin') || (userLevel >= 50);

    if (!canVerify) {
      throw {
        status:        403,
        message:       `⚠️ Level ${userLevel} belum cukup untuk memverifikasi. Minimal Level 50.`,
        requiredLevel: 50,
        currentLevel:  userLevel
      };
    }

    const threat = await ThreatModel.findById(threatId);
    if (!threat) throw { status: 404, message: 'Laporan tidak ditemukan.' };

    // Parse verification list
    let verificationList = [];
    if (threat.verification_list && threat.verification_list !== 'null') {
      try { verificationList = JSON.parse(threat.verification_list); }
      catch (e) { verificationList = []; }
    }

    if (verificationList.includes(userId)) {
      throw { status: 400, message: 'Anda sudah pernah memverifikasi laporan ini.' };
    }
    if (threat.user_id === userId && userRole !== 'admin') {
      throw { status: 403, message: 'Tidak bisa memverifikasi laporan sendiri.' };
    }

    verificationList.push(userId);
    const newCount  = verificationList.length;
    let isVerified  = false;
    let newStatus   = threat.status;
    let message     = '';

    if (newCount >= 5) {
      isVerified = true;

      // Tentukan status berdasarkan vote_score, default dangerous
      newStatus = 'dangerous';
      if (threat.vote_score) {
        const totalVotes = threat.vote_count_total || 0;
        const maxScore   = totalVotes * 3;
        const percentage = totalVotes > 0 ? (threat.vote_score / maxScore) * 100 : 0;

        if (percentage >= 70)      newStatus = 'dangerous';
        else if (percentage >= 30) newStatus = 'suspicious';
        else                       newStatus = 'safe';
      }

      message = `🎉 Laporan telah mencapai 5 verifikasi dan resmi TERVERIFIKASI! Status diubah menjadi ${newStatus.toUpperCase()}. +5 reputasi untuk Anda, +50 untuk pembuat laporan.`;
    } else {
      message = `✅ Verifikasi berhasil! (${newCount}/5 verifikasi) +5 reputasi.`;
    }

    // Eksekusi semua operasi DB dalam satu transaction (ada di VerificationModel)
    await VerificationModel.performVerification({
      threatId,
      userId,
      isVerified,
      verificationCount: newCount,
      verificationList,
      newStatus,
      reporterId: threat.user_id
    });

    return {
      message,
      verified:            isVerified,
      verificationCount:   newCount,
      neededVerifications: 5 - newCount,
      newStatus
    };
  },

  /**
   * Edit laporan (hanya owner atau admin).
   */
  updateThreat: async (threatId, userId, userRole, { title, target, indicator, description }) => {
    const threat = await ThreatModel.findById(threatId);
    if (!threat) throw { status: 404, message: 'Laporan tidak ditemukan.' };

    if (threat.user_id !== userId && userRole !== 'admin') {
      throw { status: 403, message: 'Tidak ada izin untuk mengedit laporan ini.' };
    }

    await ThreatModel.update(
      threatId,
      title       || threat.title,
      indicator   || target || threat.indicator,
      description || threat.description
    );

    return { message: 'Laporan berhasil diperbarui.' };
  },

  /**
   * Hapus laporan (hanya owner atau admin).
   */
  deleteThreat: async (threatId, userId, userRole) => {
    const threat = await ThreatModel.findById(threatId);
    if (!threat) throw { status: 404, message: 'Laporan tidak ditemukan.' };

    if (threat.user_id !== userId && userRole !== 'admin') {
      throw { status: 403, message: 'Tidak ada izin untuk menghapus laporan ini.' };
    }

    await ThreatModel.deleteById(threatId);
    return { message: 'Laporan berhasil dihapus.' };
  }
};

module.exports = ThreatService;
