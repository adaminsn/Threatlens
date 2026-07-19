const CommentModel = require('../models/commentModel');

// =====================================================
// COMMENT SERVICE
// Business logic untuk manajemen komentar.
// =====================================================

const CommentService = {

  /**
   * Ambil semua komentar untuk laporan tertentu.
   */
  getComments: async (threatId) => {
    return await CommentModel.findByThreatId(threatId);
  },

  /**
   * Kirim komentar baru:
   * - Validasi konten tidak kosong
   * - Simpan ke DB
   * - Return komentar yang baru dibuat (dengan info user)
   */
  createComment: async (userId, threatId, content) => {
    if (!content || content.trim() === '') {
      throw { status: 400, message: 'Komentar tidak boleh kosong.' };
    }
    if (!threatId) {
      throw { status: 400, message: 'ID laporan wajib diisi.' };
    }

    const commentId  = await CommentModel.create(userId, threatId, content.trim());
    const newComment = await CommentModel.findById(commentId);
    return newComment;
  },

  /**
   * Edit komentar (hanya owner atau admin).
   */
  updateComment: async (commentId, content, userId, isAdmin) => {
    if (!content || content.trim() === '') {
      throw { status: 400, message: 'Konten komentar tidak boleh kosong.' };
    }

    const updated = await CommentModel.update(commentId, content.trim(), userId, isAdmin);
    if (!updated) {
      throw { status: 404, message: 'Komentar tidak ditemukan atau Anda tidak memiliki izin.' };
    }

    return { message: 'Komentar berhasil diperbarui!' };
  },

  /**
   * Hapus komentar (hanya owner atau admin).
   */
  deleteComment: async (commentId, userId, isAdmin) => {
    const deleted = await CommentModel.delete(commentId, userId, isAdmin);
    if (!deleted) {
      throw { status: 404, message: 'Komentar tidak ditemukan atau Anda tidak memiliki izin.' };
    }

    return { message: 'Komentar berhasil dihapus!' };
  }
};

module.exports = CommentService;
