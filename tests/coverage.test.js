/**
 * Coverage configuration tests
 *
 * Verifies that jest.config.js has coverage settings properly configured
 * and that the coverage thresholds are reasonable.
 */

const jestConfig = require('../jest.config');

describe('Jest coverage configuration', () => {
  test('collectCoverageFrom includes lib/**/*.js', () => {
    expect(jestConfig.collectCoverageFrom).toBeDefined();
    expect(jestConfig.collectCoverageFrom).toContain('lib/**/*.js');
  });

  test('excludes self-improve.js from coverage', () => {
    expect(jestConfig.collectCoverageFrom).toContain('!lib/self-improve.js');
  });

  test('coverage directory is set', () => {
    expect(jestConfig.coverageDirectory).toBe('coverage');
  });

  test('coverage reporters include text and lcov', () => {
    expect(jestConfig.coverageReporters).toContain('text');
    expect(jestConfig.coverageReporters).toContain('lcov');
  });

  test('coverage thresholds require >= 80% lines', () => {
    expect(jestConfig.coverageThresholds).toBeDefined();
    expect(jestConfig.coverageThresholds.global.lines).toBeGreaterThanOrEqual(80);
  });

  test('coverage thresholds require >= 80% statements', () => {
    expect(jestConfig.coverageThresholds.global.statements).toBeGreaterThanOrEqual(80);
  });

  test('coverage thresholds require >= 80% functions', () => {
    expect(jestConfig.coverageThresholds.global.functions).toBeGreaterThanOrEqual(80);
  });

  test('coverage thresholds require >= 60% branches', () => {
    expect(jestConfig.coverageThresholds.global.branches).toBeGreaterThanOrEqual(60);
  });
});
