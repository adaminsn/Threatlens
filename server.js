const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// =====================================================
// STATIC FILES
// =====================================================
app.use(express.static('public'));
app.use(express.static('pages'));

// 🔥 INI YANG PENTING - buat akses file uploads
app.use('/uploads', express.static('uploads'));

// =====================================================
// API ROUTES
// =====================================================
app.use('/api/admin', require('./routes/admin'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/threats', require('./routes/threats'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/votes', require('./routes/votes'));

// =====================================================
// DEFAULT ROUTE
// =====================================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

// =====================================================
// 404 HANDLER
// =====================================================
app.use('/api', (req, res) => {
  res.status(404).json({ message: "Endpoint tidak ditemukan." });
});

app.use((req, res) => {
  res.status(404).send('<h1>404 - Halaman Tidak Ditemukan</h1>');
});

// =====================================================
// ERROR HANDLER
// =====================================================
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ message: 'Terjadi kesalahan server.' });
});

// =====================================================
// START SERVER
// =====================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔐 Login: http://localhost:${PORT}/index.html`);
});