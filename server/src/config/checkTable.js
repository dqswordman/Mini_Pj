const oracledb = require('oracledb');
require('dotenv').config();

async function checkTable() {
  let connection;
  try {
    oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient' });
    
    connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECTSTRING
    });

    // Check SystemLogs table structure
    const tableResult = await connection.execute(`
      SELECT column_name, data_type, data_length
      FROM USER_TAB_COLUMNS
      WHERE table_name = 'SYSTEMLOGS'
      ORDER BY column_id`
    );

    console.log('SystemLogs table structure:');
    console.log(tableResult.rows);

    // Check SEQ_SYSTEM_LOGS sequence
    const seqResult = await connection.execute(`
      SELECT sequence_name, last_number, increment_by
      FROM USER_SEQUENCES
      WHERE sequence_name = 'SEQ_SYSTEM_LOGS'`
    );

    if (seqResult.rows.length > 0) {
      console.log('\nSequence information:');
      console.log(seqResult.rows);
    } else {
      console.log('\nSequence not found');
    }

    // Insert test data
    const insertResult = await connection.execute(`
      INSERT INTO SystemLogs (log_id, action, user_id, details) 
      VALUES (SEQ_SYSTEM_LOGS.NEXTVAL, 'TEST', 1, 'Test log entry')`
    );
    console.log('Test insert successful');

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

checkTable();