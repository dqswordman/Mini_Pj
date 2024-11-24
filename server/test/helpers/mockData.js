// test/helpers/mockData.js
const mockEmployee = {
  EMPLOYEE_ID: 1,
  NAME: 'Test User',
  EMAIL: 'test@example.com',
  PHONE_NUMBER: '1234567890',
  POSITION_NAME: 'Manager',
  PASSWORD_HASH: '$2b$10$abcdefghijklmnopqrstuv',
  IS_LOCKED: 0
};

const mockToken = 'mock.jwt.token';

module.exports = {
  mockEmployee,
  mockToken
};