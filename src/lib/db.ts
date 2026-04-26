import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'resto_pos',
  port:     parseInt(process.env.DB_PORT || '3306'),
  connectTimeout: 30000,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

export default pool;
