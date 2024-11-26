// server/jest.config.js
module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '**/test/**/*.test.js'
    ],
    verbose: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    setupFilesAfterEnv: ['./test/helpers/setup.js'],
    moduleFileExtensions: ['js', 'json'],
    roots: [
        '<rootDir>/src',
        '<rootDir>/test'
    ],
    moduleDirectories: [
        'node_modules',
        'src'
    ],
    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/config/*.js'
    ],
    coverageDirectory: 'coverage',
    testPathIgnorePatterns: [
        '/node_modules/'
    ],
    transform: {
        '^.+\\.js$': 'babel-jest'
    }
};