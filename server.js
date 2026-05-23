const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/threats', require('./routes/threats'));
app.use('/api/votes', require('./routes/votes'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/admin', require('./routes/admin')); // 🔥 Route admin

// Socket.io
io.on('connection', (socket) => {
  console.log('User terhubung:', socket.id);
  socket.on('disconnect', () => {
    console.log('User terputus:', socket.id);
  });
});

// Jalankan server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`ThreatLens berjalan di http://localhost:${PORT}`);
});