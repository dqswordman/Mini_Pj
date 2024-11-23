const oracledb = require('oracledb');
const { initialize } = require('./database');

async function testTables() {
  let connection;
  try {
    // 初始化数据库
    await initialize();
    
    connection = await oracledb.getConnection();
    
    // 测试查询每个表
    const tables = [
      'DEPARTMENTS', 'POSITIONS', 'EMPLOYEES', 'EMPLOYEEDEPARTMENTPOSITIONS',
      'USERCREDENTIALS', 'ROOMS', 'ROOMAMENITIES', 'BOOKINGS',
      'BOOKINGAPPROVALS', 'ROOMACCESSLOG', 'SYSTEMLOGS',
      'ACCESSPERMISSIONS', 'UNLOCKREQUESTS'
    ];
    
    for (const table of tables) {
      try {
        const result = await connection.execute(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        console.log(`Table ${table} exists and has ${result.rows[0][0]} records`);
      } catch (err) {
        console.error(`Error checking table ${table}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error testing tables:', err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

testTables();