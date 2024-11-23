const oracledb = require('oracledb');
require('dotenv').config();

async function testSingleSQL() {
  let connection;
  try {
    oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient' });
    
    connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECTSTRING
    });

    // 注意：移除SQL语句末尾的分号
    const sql = 'CREATE SEQUENCE seq_departments START WITH 1 INCREMENT BY 1';
    
    try {
      await connection.execute(sql);
      console.log('Successfully created sequence');
    } catch (err) {
      if (err.errorNum === 955) {
        console.log('Sequence already exists');
      } else {
        throw err;
      }
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('Connection closed');
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

testSingleSQL();