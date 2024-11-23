const { executeSQL } = require('./database');

async function testDatabaseStructure() {
  try {
    console.log('Testing database structure...');

    // 测试表结构
    const tablesResult = await executeSQL(
      "SELECT table_name FROM user_tables ORDER BY table_name"
    );
    console.log('Tables found:', tablesResult.rows);

    // 测试序列
    const sequencesResult = await executeSQL(
      "SELECT sequence_name FROM user_sequences ORDER BY sequence_name"
    );
    console.log('Sequences found:', sequencesResult.rows);

    // 测试触发器
    const triggersResult = await executeSQL(
      "SELECT trigger_name, status FROM user_triggers"
    );
    console.log('Triggers status:', triggersResult.rows);

    // 测试基本插入
    await executeSQL(`
      INSERT INTO Departments (department_name) 
      VALUES ('IT Department')
    `);
    
    // 验证插入
    const deptResult = await executeSQL(
      "SELECT * FROM Departments WHERE department_name = 'IT Department'"
    );
    console.log('Department insert test:', deptResult.rows);

    console.log('All tests completed successfully');

  } catch (err) {
    console.error('Test failed:', err);
    throw err;
  }
}

// 运行测试
console.log('Starting database tests...');
testDatabaseStructure()
  .then(() => {
    console.log('Tests completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Tests failed:', err);
    process.exit(1);
  });