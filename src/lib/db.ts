import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'countryside-db-nelchrimson-6a2f.c.aivencloud.com',
  user:     process.env.DB_USER || 'avnadmin',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'defaultdb',
  port:     parseInt(process.env.DB_PORT || '16619'),
  connectTimeout: 30000,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

export default pool;
