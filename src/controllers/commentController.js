const CommentModel = require('../models/commentModel');

const commentController = {
  // GET /api/comments/:threat_id
  getComments: async (req, res) => {
    try {
      const comments = await CommentModel.findByThreatId(req.params.threat_id);
      res.json(comments);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // POST /api/comments
  createComment: async (req, res) => {
    try {
      const { threat_id, content } = req.body;
      
      if (!content || content.trim() === '') {
        return res.status(400).json({ message: 'Komentar tidak boleh kosong.' });
      }

      const commentId = await CommentModel.create(req.user.id, threat_id, content);
      const newComment = await CommentModel.findById(commentId);
      
      res.status(201).json({ 
        message: 'Komentar berhasil dikirim!',
        comment: newComment
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // PUT /api/comments/:id
  updateComment: async (req, res) => {
    try {
      const { content } = req.body;
      const isAdmin = req.user.role === 'admin';
      
      const updated = await CommentModel.update(req.params.id, content, req.user.id, isAdmin);
      
      if (!updated) {
        return res.status(404).json({ message: 'Komentar tidak ditemukan atau Anda tidak memiliki izin.' });
      }
      
      res.json({ message: 'Komentar berhasil diperbarui!' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  },

  // DELETE /api/comments/:id
  deleteComment: async (req, res) => {
    try {
      const isAdmin = req.user.role === 'admin';
      const deleted = await CommentModel.delete(req.params.id, req.user.id, isAdmin);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Komentar tidak ditemukan atau Anda tidak memiliki izin.' });
      }
      
      res.json({ message: 'Komentar berhasil dihapus!' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  }
};

module.exports = commentController;