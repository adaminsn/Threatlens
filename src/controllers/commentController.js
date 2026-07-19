const CommentService = require('../services/commentService');

// =====================================================
// COMMENT CONTROLLER
// Hanya berisi: validasi input, pemanggilan CommentService,
// pengiriman response JSON.
// =====================================================

// Helper untuk kirim error response
const handleError = (res, err) => {
  console.error('❌ CommentController Error:', err.message || err);
  res.status(err.status || 500).json({ message: err.message || 'Terjadi kesalahan server.' });
};

const commentController = {

  /**
   * GET /api/comments/:threat_id — ambil semua komentar (publik)
   */
  getComments: async (req, res) => {
    try {
      const comments = await CommentService.getComments(req.params.threat_id);
      res.json(comments);
    } catch (err) { handleError(res, err); }
  },

  /**
   * POST /api/comments — kirim komentar baru (memerlukan auth)
   */
  createComment: async (req, res) => {
    try {
      const { threat_id, content } = req.body;

      if (!threat_id || !content) {
        return res.status(400).json({ message: 'threat_id dan content wajib diisi.' });
      }

      const newComment = await CommentService.createComment(req.user.id, threat_id, content);
      res.status(201).json({ message: 'Komentar berhasil dikirim!', comment: newComment });
    } catch (err) { handleError(res, err); }
  },

  /**
   * PUT /api/comments/:id — edit komentar (hanya owner atau admin)
   */
  updateComment: async (req, res) => {
    try {
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ message: 'Content wajib diisi.' });
      }

      const isAdmin = req.user.role === 'admin';
      const result  = await CommentService.updateComment(
        req.params.id,
        content,
        req.user.id,
        isAdmin
      );
      res.json(result);
    } catch (err) { handleError(res, err); }
  },

  /**
   * DELETE /api/comments/:id — hapus komentar (hanya owner atau admin)
   */
  deleteComment: async (req, res) => {
    try {
      const isAdmin = req.user.role === 'admin';
      const result  = await CommentService.deleteComment(
        req.params.id,
        req.user.id,
        isAdmin
      );
      res.json(result);
    } catch (err) { handleError(res, err); }
  }
};

module.exports = commentController;