const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Extract token dari header Authorization
 * @param {Object} req - Express request object
 * @returns {string|null} Token atau null jika tidak ada
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  
  // Format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1];
};

/**
 * Verify JWT token (middleware)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware
 */
const verifyToken = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // Log untuk debugging (tidak dikirim ke client)
    console.error('[Auth Error]', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token sudah kadaluarsa. Silakan login ulang.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token tidak valid.' });
    }
    
    return res.status(401).json({ message: 'Token tidak valid.' });
  }
};

/**
 * Verify token dan cek role admin (satu fungsi untuk kedua keperluan)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware
 */
const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Akses ditolak. Hanya untuk admin.' });
    }
    next();
  });
};

/**
 * Alias dari verifyAdmin (untuk konsistensi)
 * Sama seperti verifyAdmin, hanya nama berbeda
 */
const isAdmin = verifyAdmin;

/**
 * Verify token OPTIONAL (tidak wajib ada token)
 * Untuk endpoint yang bisa diakses public tapi tetap bisa dapat data user jika ada token
 */
const verifyOptional = (req, res, next) => {
  const token = extractToken(req);
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Token tidak valid, abaikan saja (tidak throw error)
      console.error('[Auth Optional] Invalid token:', err.message);
    }
  }
  
  next();
};

module.exports = { 
  verifyToken, 
  verifyAdmin, 
  isAdmin,
  verifyOptional,
  extractToken  // diekspor untuk keperluan testing
};