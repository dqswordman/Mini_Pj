const oracledb = require('oracledb');
require('dotenv').config();

async function testTrigger() {
  let connection;
  try {
    oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient' });
    
    connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECTSTRING
    });

    // 先尝试删除已存在的触发器
    try {
      await connection.execute(
        `DROP TRIGGER trg_system_logs_bi`
      );
      console.log('Old trigger dropped successfully');
    } catch (err) {
      console.log('No existing trigger to drop');
    }

    // 创建新触发器
    const triggerSQL = `
    CREATE OR REPLACE TRIGGER trg_system_logs_bi 
    BEFORE INSERT ON SystemLogs 
    FOR EACH ROW
    BEGIN
      SELECT seq_system_logs.NEXTVAL 
      INTO :new.log_id 
      FROM DUAL;
    END`;

    await connection.execute(triggerSQL);
    console.log('Trigger created successfully');

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

testTrigger();