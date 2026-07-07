const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const config = {
  host: 'hayabusa.proxy.rlwy.net',
  port: 59402,
  user: 'root',
  password: 'mdNdlKxtrvvLkHYwehqEQPhxOlBPtVPa',
  database: 'railway',
  multipleStatements: true // Mengizinkan eksekusi multiple statements
};

async function migrate() {
  console.log('Menghubungkan ke Railway MySQL...');
  const connection = await mysql.createConnection(config);
  
  try {
    const sqlFilePath = path.join(__dirname, '../database_railway.sql');
    console.log('Membaca file SQL dari:', sqlFilePath);
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('Memulai migrasi skema tabel & seed data...');
    // Eksekusi seluruh skrip SQL
    await connection.query(sql);
    
    console.log('Migrasi selesai dengan SUKSES! 🎉');
  } catch (error) {
    console.error('Migrasi GAGAL:', error);
  } finally {
    await connection.end();
  }
}

migrate();
