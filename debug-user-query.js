const Database = require('./chat-admin/config/database');

async function debugUserQuery() {
  try {
    console.log('Testing basic query with parameters...');
    
    // 测试最基本的带参数查询
    const query = 'SELECT id, email, full_name FROM users LIMIT ? OFFSET ?';
    const params = [5, 0];
    
    console.log('Query:', query);
    console.log('Params:', params);
    console.log('Param types:', params.map(p => typeof p));
    
    const result = await Database.query(query, params);
    console.log('Result:', result);
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    process.exit(0);
  }
}

debugUserQuery();