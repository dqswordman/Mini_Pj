const oracledb = require('oracledb');
require('dotenv').config();
const path = require('path');

(async () => {
  try {
    console.log('Initializing Oracle Client...');
    oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient' });

    console.log('Connecting to database...');
    const connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECTSTRING,
    });

    console.log('Connected to database successfully!');

    // 测试简单查询
    const result = await connection.execute('SELECT 1 FROM DUAL');
    console.log('Test query result:', result);

    await connection.close();
    console.log('Database connection closed successfully.');
  } catch (err) {
    console.error('Error connecting to database:', err);
  }
})();
