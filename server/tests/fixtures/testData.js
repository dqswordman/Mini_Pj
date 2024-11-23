exports.testUsers = {
    admin: {
      email: 'admin@test.com',
      password: 'admin123',
      name: 'Test Admin',
      position: 'Admin'
    },
    manager: {
      email: 'manager@test.com',
      password: 'manager123',
      name: 'Test Manager',
      position: 'Manager'
    },
    user: {
      email: 'user@test.com',
      password: 'user123',
      name: 'Test User',
      position: 'Employee'
    }
  };
  
  exports.testDepartment = {
    name: 'Test Department'
  };
  
  exports.testRoom = {
    name: 'Test Room',
    capacity: 10,
    buildingId: 1,
    floorNumber: 1
  };
  
  exports.testBooking = {
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天
    endTime: new Date(Date.now() + 25 * 60 * 60 * 1000)  // 明天+1小时
  };