// jest.config.js
module.exports = {
  testEnvironment: 'node',
  // 只执行test目录下的测试文件
  testMatch: [
    '**/test/**/*.test.js'
  ],
  // 明确忽略配置文件夹
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/config/'
  ],
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // 设置测试环境
  setupFiles: ['<rootDir>/test/helpers/setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};