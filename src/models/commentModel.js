const db = require('../config/database');

const CommentModel = {
  // Create
  create: async (userId, threatId, content) => {
    const [result] = await db.query(
      'INSERT INTO comments (user_id, threat_id, content) VALUES (?, ?, ?)',
      [userId, threatId, content]
    );
    return result.insertId;
  },

  // Read
  findByThreatId: async (threatId) => {
    const [rows] = await db.query(`
      SELECT 
        c.*,
        u.username
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.threat_id = ?
      ORDER BY c.created_at ASC
    `, [threatId]);
    return rows;
  },

  findById: async (id) => {
    const [rows] = await db.query(
      'SELECT * FROM comments WHERE id = ?',
      [id]
    );
    return rows[0];
  },

  // Update
  update: async (id, content, userId, isAdmin) => {
    let query = 'UPDATE comments SET content = ? WHERE id = ?';
    const params = [content, id];
    
    if (!isAdmin) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    const [result] = await db.query(query, params);
    return result.affectedRows > 0;
  },

  // Delete
  delete: async (id, userId, isAdmin) => {
    let query = 'DELETE FROM comments WHERE id = ?';
    const params = [id];
    
    if (!isAdmin) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    const [result] = await db.query(query, params);
    return result.affectedRows > 0;
  },

  // Count comments per threat
  countByThreatId: async (threatId) => {
    const [rows] = await db.query(
      'SELECT COUNT(*) as total FROM comments WHERE threat_id = ?',
      [threatId]
    );
    return rows[0].total;
  }
};

module.exports = CommentModel;