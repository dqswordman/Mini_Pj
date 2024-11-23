const { executeQuery } = require('../../src/config/database');

const dbUtils = {
  // 清理数据
  async cleanupData() {
    const tables = [
      'UnlockRequests',
      'SystemLogs',
      'AccessPermissions',
      'RoomAccessLog',
      'BookingApprovals',
      'Bookings',
      'RoomAmenities',
      'Rooms',
      'UserCredentials',
      'EmployeeDepartmentPositions',
      'Employees',
      'Positions',
      'Departments'
    ];

    for (const table of tables) {
      await executeQuery(`DELETE FROM ${table}`);
    }
  },

  // 插入测试数据
  async setupTestData() {
    // 部门
    await executeQuery(
      'INSERT INTO Departments (department_id, department_name) VALUES (:1, :2)',
      [1, 'Test Department']
    );

    // 职位
    await executeQuery(
      'INSERT INTO Positions (position_id, position_name) VALUES (:1, :2)',
      [1, 'Admin']
    );
  }
};

module.exports = dbUtils;