module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    '^wx-server-sdk$': '<rootDir>/tests/setup.js'
  }
};