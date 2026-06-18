const mysql = require('mysql2');
require('dotenv').config();

// Buat connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'threatlens',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

// Promise wrapper
const promisePool = pool.promise();

// Test koneksi (opsional, untuk debug)
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Please check your .env configuration');
    process.exit(1);
  }
};

// Jalankan test koneksi (panggil di app.js atau server.js)
// testConnection();

module.exports = promisePool;