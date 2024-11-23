const { executeSQL } = require('./database');

async function fixTriggers() {
  try {
    console.log('Step 1: Checking current triggers...');
    const checkResult = await executeSQL(
      "SELECT trigger_name, status FROM user_triggers WHERE trigger_name = 'DEPT_BI_TRG'"
    );
    console.log('Current trigger status:', checkResult.rows);

    console.log('\nStep 2: Dropping old trigger...');
    try {
      await executeSQL('DROP TRIGGER dept_bi_trg');
      console.log('Old trigger dropped successfully');
    } catch (err) {
      console.log('No old trigger to drop');
    }

    console.log('\nStep 3: Creating new trigger...');
    const createTrigger = `
CREATE OR REPLACE TRIGGER dept_bi_trg 
BEFORE INSERT ON Departments 
FOR EACH ROW
BEGIN
  SELECT dept_seq.nextval
  INTO   :new.department_id
  FROM   dual;
END;
`;

    await executeSQL(createTrigger);
    console.log('New trigger created successfully');

    console.log('\nStep 4: Verifying trigger status...');
    const verifyResult = await executeSQL(
      "SELECT trigger_name, status FROM user_triggers WHERE trigger_name = 'DEPT_BI_TRG'"
    );
    console.log('New trigger status:', verifyResult.rows);

    console.log('\nStep 5: Testing trigger...');
    await executeSQL(`DELETE FROM Departments WHERE department_name = 'Test Department'`);
    await executeSQL(`
      INSERT INTO Departments (department_name) 
      VALUES ('Test Department')
    `);
    
    const insertResult = await executeSQL(
      "SELECT * FROM Departments WHERE department_name = 'Test Department'"
    );
    console.log('Test insert result:', insertResult.rows);

    console.log('\nAll steps completed successfully');

  } catch (err) {
    console.error('Fix failed:', err);
    throw err;
  }
}

// 运行修复
console.log('Starting trigger fix process...');
fixTriggers()
  .then(() => {
    console.log('Trigger fix completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Trigger fix failed:', err);
    process.exit(1);
  });