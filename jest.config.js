module.exports = {
  testMatch: ['**/tests/*.test.js'],
  testEnvironment: 'node',
  testTimeout: 10000,
  collectCoverageFrom: [
    'lib/**/*.js',
    '!lib/self-improve.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  coverageThresholds: {
    global: {
      lines: 80,
      branches: 60,
      functions: 80,
      statements: 80
    }
  }
};
