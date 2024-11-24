// test/helpers/setup.js
const oracledb = require('oracledb');

// Mock the oracledb module
jest.mock('oracledb', () => ({
  getConnection: jest.fn(),
  execute: jest.fn(),
  BIND_OUT: 'BIND_OUT',
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  OBJECT: 'OBJECT',
  outFormat: 'OBJECT',
  createPool: jest.fn(),
  getPool: jest.fn()
}));

// Mock the database config
jest.mock('../../src/config/database', () => ({
  executeQuery: jest.fn(),
  getConnection: jest.fn(),
  executeSQL: jest.fn(),
  oracledb
}));

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

// Clean up mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});