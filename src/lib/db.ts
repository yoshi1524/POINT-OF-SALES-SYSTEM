import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'defaultdb',
  port:     parseInt(process.env.DB_PORT || '16619'),
  connectTimeout: 30000,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  ssl: process.env.DB_HOST && process.env.DB_HOST !== '127.0.0.1' && process.env.DB_HOST !== 'localhost' ? {
    ca: fs.readFileSync(path.join(process.cwd(), 'ca.pem')),
    rejectUnauthorized: true,
  } : undefined
});

export default pool;
