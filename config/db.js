const mysql = require('mysql2/promise');
require('dotenv').config();

// Menggunakan environment variable Railway (MYSQLHOST, dll) jika tersedia,
// jika tidak, fallback ke environment variable lokal (DB_HOST, dll)
const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD !== undefined 
    ? process.env.MYSQLPASSWORD 
    : (process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : ''),
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'mandasari_db',
  port: process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
