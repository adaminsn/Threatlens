const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (public dan uploads)
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// =====================================================
// ROUTES
// =====================================================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/threats', require('./routes/threatRoutes'));
app.use('/api/votes', require('./routes/voteRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// =====================================================
// ERROR HANDLER
// =====================================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ message: 'Terjadi kesalahan server!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint tidak ditemukan.' });
});

module.exports = app;