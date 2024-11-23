const { executeQuery } = require('../../src/config/database');

async function createTestData() {
  try {
    // 创建测试部门
    await executeQuery(`
      INSERT INTO Departments (department_name) VALUES ('Test Department')
    `);

    // 创建测试职位
    await executeQuery(`
      INSERT INTO Positions (position_name) VALUES ('Test Position')
    `);

    console.log('Test data created successfully');
  } catch (error) {
    console.error('Error creating test data:', error);
    throw error;
  }
}

async function cleanTestData() {
  try {
    // 清理测试数据
    await executeQuery(`DELETE FROM UnlockRequests`);
    await executeQuery(`DELETE FROM SystemLogs`);
    await executeQuery(`DELETE FROM AccessPermissions`);
    await executeQuery(`DELETE FROM RoomAccessLog`);
    await executeQuery(`DELETE FROM BookingApprovals`);
    await executeQuery(`DELETE FROM Bookings`);
    await executeQuery(`DELETE FROM RoomAmenities`);
    await executeQuery(`DELETE FROM Rooms`);
    await executeQuery(`DELETE FROM UserCredentials`);
    await executeQuery(`DELETE FROM EmployeeDepartmentPositions`);
    await executeQuery(`DELETE FROM Employees`);
    await executeQuery(`DELETE FROM Positions`);
    await executeQuery(`DELETE FROM Departments`);

    console.log('Test data cleaned successfully');
  } catch (error) {
    console.error('Error cleaning test data:', error);
    throw error;
  }
}

module.exports = {
  createTestData,
  cleanTestData
};