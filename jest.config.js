module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.js'],
  verbose: true,
  // Set NODE_ENV to 'test' for all tests
  setupFiles: ['<rootDir>/jest.setup.js']
};
