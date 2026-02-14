module.exports = {
  testMatch: ['**/tests/*.test.js', '**/tests/integration/*.test.js'],
  testEnvironment: 'node',
  testTimeout: 10000,
  collectCoverageFrom: [
    'lib/**/*.js',
    '!lib/self-improve.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 60,
      functions: 80,
      statements: 80
    }
  }
};
