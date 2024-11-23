const oracledb = require('oracledb');
require('dotenv').config();

async function testConnection() {
  try {
    // 使用新的路径
    oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient' });
    
    oracledb.thin = false;

    const connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECTSTRING
    });
    
    console.log('Successfully connected to Oracle Database');
    
    // 测试查询
    const result = await connection.execute('SELECT 1 FROM DUAL');
    console.log('Test query successful:', result);
    
    await connection.close();
    console.log('Connection closed successfully');
    
  } catch (err) {
    console.error('Error connecting to the database:', err);
  }
}

testConnection();