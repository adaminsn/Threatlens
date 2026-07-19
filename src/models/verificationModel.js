const db = require('../config/database');

// =====================================================
// VERIFICATION MODEL
// Bertanggung jawab untuk operasi tabel threat_verifications.
// =====================================================

const VerificationModel = {

  /**
   * Insert log verifikasi (oleh user biasa maupun admin).
   */
  insertLog: async (threatId, verifierId) => {
    await db.query(
      'INSERT INTO threat_verifications (threat_id, verifier_id, verified_at) VALUES (?, ?, NOW())',
      [threatId, verifierId]
    );
  },

  /**
   * Ambil riwayat semua verifikasi beserta info laporan dan verifikator.
   */
  findHistory: async () => {
    const [rows] = await db.query(`
      SELECT
        tv.id, tv.threat_id,
        t.title    AS report_title,
        t.indicator AS report_indicator,
        t.verified  AS report_verified,
        t.status,
        tv.verifier_id,
        u.username  AS verifier_name,
        u.level     AS verifier_level,
        tv.verified_at
      FROM threat_verifications tv
      LEFT JOIN threats t ON tv.threat_id  = t.id
      LEFT JOIN users   u ON tv.verifier_id = u.id
      ORDER BY tv.verified_at DESC
    `);
    return rows;
  },

  /**
   * Toggle verifikasi laporan oleh admin (verified ↔ unverified) dalam satu transaction.
   * Jika diverifikasi: update threats + insert log + tambah reputasi reporter.
   * Jika dibatalkan: reset verified dan status laporan ke pending.
   *
   * @param {number} reportId - ID laporan
   * @param {number} adminId  - ID admin yang melakukan verifikasi
   * @param {0|1}   newVerified - nilai verified baru (1 = verify, 0 = unverify)
   */
  adminVerifyToggle: async (reportId, adminId, newVerified) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      if (newVerified === 1) {
        // Ambil reporter sebelum update
        const [[threat]] = await connection.query(
          'SELECT user_id FROM threats WHERE id = ?',
          [reportId]
        );

        await connection.query(
          'UPDATE threats SET verified = 1, status = "dangerous", verification_count = 1, verification_list = ? WHERE id = ?',
          [JSON.stringify([adminId]), reportId]
        );
        await connection.query(
          'INSERT INTO threat_verifications (threat_id, verifier_id, verified_at) VALUES (?, ?, NOW())',
          [reportId, adminId]
        );
        // Tambah reputasi reporter +50
        await connection.query(
          'UPDATE users SET reputation = reputation + 50, level = FLOOR(reputation / 100) + 1 WHERE id = ?',
          [threat.user_id]
        );
      } else {
        await connection.query(
          'UPDATE threats SET verified = 0, status = "pending", verification_count = 0, verification_list = NULL WHERE id = ?',
          [reportId]
        );
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  /**
   * Eksekusi proses verifikasi oleh user (multi-verifier) dalam satu transaction.
   * Melibatkan: update threats, insert log, tambah reputasi verifier (+5),
   * dan jika isVerified=true, tambah reputasi reporter (+50).
   */
  performVerification: async ({ threatId, userId, isVerified, verificationCount, verificationList, newStatus, reporterId }) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      await connection.query(
        'UPDATE threats SET verified = ?, verification_count = ?, verification_list = ?, status = ? WHERE id = ?',
        [isVerified ? 1 : 0, verificationCount, JSON.stringify(verificationList), newStatus, threatId]
      );
      await connection.query(
        'INSERT INTO threat_verifications (threat_id, verifier_id, verified_at) VALUES (?, ?, NOW())',
        [threatId, userId]
      );
      // Tambah reputasi verifier +5
      await connection.query(
        'UPDATE users SET reputation = reputation + 5, level = FLOOR(reputation / 100) + 1 WHERE id = ?',
        [userId]
      );
      // Jika laporan resmi terverifikasi, tambah reputasi reporter +50
      if (isVerified) {
        await connection.query(
          'UPDATE users SET reputation = reputation + 50, level = FLOOR(reputation / 100) + 1 WHERE id = ?',
          [reporterId]
        );
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
};

module.exports = VerificationModel;
