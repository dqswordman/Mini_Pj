// test/helpers/setup.js

// 导入必要的 jest 函数
const { jest } = require('@jest/globals');

// Mock the oracledb module
const mockOracledb = {
    getConnection: jest.fn(),
    execute: jest.fn(),
    BIND_OUT: 'BIND_OUT',
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    OBJECT: 'OBJECT',
    outFormat: 'OBJECT',
    createPool: jest.fn(),
    getPool: jest.fn()
};

// Mock modules
jest.mock('oracledb', () => mockOracledb);

jest.mock('../../src/config/database', () => ({
    executeQuery: jest.fn(),
    getConnection: jest.fn(),
    executeSQL: jest.fn()
}));

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

// 全局变量设置
global.beforeEach = beforeEach;
global.jest = jest;

// Clean up mocks before each test
beforeEach(() => {
    jest.clearAllMocks();
});

module.exports = {
    mockOracledb
};