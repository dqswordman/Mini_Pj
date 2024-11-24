// test/helpers/dbMock.js
jest.mock('oracledb', () => ({
    getConnection: jest.fn(),
    execute: jest.fn(),
    BIND_OUT: 'BIND_OUT',
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    OBJECT: 'OBJECT',
    outFormat: 'OBJECT'
  }));
  
  jest.mock('../../src/config/database', () => ({
    executeQuery: jest.fn(),
    getConnection: jest.fn(),
    oracledb: {
      BIND_OUT: 'BIND_OUT',
      NUMBER: 'NUMBER',
      STRING: 'STRING'
    }
  }));
  
  module.exports = require('oracledb');