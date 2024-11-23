const { executeSQL } = require('./database');

async function checkTriggers() {
  try {
    console.log('Starting trigger check...');
    
    // 执行查询
    const result = await executeSQL(`
      SELECT trigger_name AS trigger_name, 
             table_name AS table_name, 
             triggering_event AS triggering_event, 
             trigger_type AS trigger_type, 
             status AS status, 
             trigger_body AS trigger_body
      FROM user_triggers
      ORDER BY trigger_name
    `);

    // 调试结果
    console.log('Raw query result:', JSON.stringify(result, null, 2));

    // 解析结果
    console.log('\nTrigger Status Report:');
    console.log('======================');

    if (!result.rows || result.rows.length === 0) {
      console.log('No triggers found');
    } else {
      result.rows.forEach(trigger => {
        console.log(`\nTrigger Name: ${trigger.trigger_name}`);
        console.log(`Table: ${trigger.table_name}`);
        console.log(`Event: ${trigger.triggering_event}`);
        console.log(`Type: ${trigger.trigger_type}`);
        console.log(`Status: ${trigger.status}`);
        console.log('Body:');
        console.log(trigger.trigger_body);
        console.log('----------------------');
      });
    }

  } catch (err) {
    console.error('Check failed:', err);
  }
}

// 执行检查
checkTriggers()
  .then(() => {
    console.log('Trigger check completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Trigger check failed:', err);
    process.exit(1);
  });
