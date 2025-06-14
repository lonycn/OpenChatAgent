const mysql = require('mysql2/promise');
require('dotenv').config({ path: './chat-admin/.env' });

async function testMysql() {
  try {
    console.log('Testing mysql2 directly...');
    
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'chat_admin',
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
    
    console.log('DB Config:', dbConfig);
    
    const pool = mysql.createPool(dbConfig);
    
    // 测试1: 简单查询
    console.log('\nTest 1: Simple query without parameters');
    const [rows1] = await pool.execute('SELECT COUNT(*) as count FROM users');
    console.log('Result 1:', rows1);
    
    // 测试2: 带参数的查询
    console.log('\nTest 2: Query with parameters');
    const [rows2] = await pool.execute('SELECT id, email FROM users LIMIT ? OFFSET ?', [5, 0]);
    console.log('Result 2:', rows2.length, 'rows');
    
    await pool.end();
    
  } catch (error) {
    console.error('MySQL test error:', error);
  }
}

testMysql();