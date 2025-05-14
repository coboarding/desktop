module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.js', '**/tests/**/*.test.js'],
  verbose: true,
  // Set NODE_ENV to 'test' for all tests
  setupFiles: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/renderer/modules/**/*.js',
    '!**/node_modules/**'
  ]
};
