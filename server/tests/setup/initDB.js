const bcrypt = require('bcrypt');
const { executeQuery } = require('../../src/config/database');

async function resetDatabase() {
  try {
    // 清理所有表数据
    await executeQuery('DELETE FROM UnlockRequests');
    await executeQuery('DELETE FROM SystemLogs');
    await executeQuery('DELETE FROM AccessPermissions');
    await executeQuery('DELETE FROM RoomAccessLog');
    await executeQuery('DELETE FROM BookingApprovals');
    await executeQuery('DELETE FROM Bookings');
    await executeQuery('DELETE FROM RoomAmenities');
    await executeQuery('DELETE FROM Rooms');
    await executeQuery('DELETE FROM UserCredentials');
    await executeQuery('DELETE FROM Employees');
    await executeQuery('DELETE FROM Positions');
    await executeQuery('DELETE FROM Departments');

    // 插入基础数据
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await executeQuery(`
      INSERT INTO Departments (department_id, department_name) 
      VALUES (1, 'Test Department');
    `);

    await executeQuery(`
      INSERT INTO Positions (position_id, position_name) 
      VALUES (1, 'Admin');
    `);

    await executeQuery(`
      INSERT INTO Employees (employee_id, name, email, phone_number)
      VALUES (1, 'Test Admin', 'admin@test.com', '1234567890');
    `);

    await executeQuery(`
      INSERT INTO UserCredentials (user_id, employee_id, username, password_hash)
      VALUES (1, 1, 'admin@test.com', '${hashedPassword}');
    `);

    console.log('Database reset successful with test data.');
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
}

module.exports = { resetDatabase };
