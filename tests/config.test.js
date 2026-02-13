/**
 * Tests for config file support (lib/config.js)
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { loadConfig, readConfigFile, mergeConfig, DEFAULTS, CONFIG_FILES, ALLOWED_KEYS } = require('../lib/config');

let testDir;

beforeEach(async () => {
  testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'config-test-'));
});

afterEach(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});

describe('loadConfig', () => {
  test('returns defaults when no config file exists', async () => {
    const config = await loadConfig(testDir);
    expect(config).toEqual(DEFAULTS);
  });

  test('reads ralph.config.json', async () => {
    await fs.writeFile(
      path.join(testDir, 'ralph.config.json'),
      JSON.stringify({ tier: 'large', concurrency: 4 })
    );

    const config = await loadConfig(testDir);
    expect(config.tier).toBe('large');
    expect(config.concurrency).toBe(4);
    expect(config.timeout).toBe(DEFAULTS.timeout); // unchanged
  });

  test('reads .ralphrc', async () => {
    await fs.writeFile(
      path.join(testDir, '.ralphrc'),
      JSON.stringify({ webhookUrl: 'https://example.com/hook' })
    );

    const config = await loadConfig(testDir);
    expect(config.webhookUrl).toBe('https://example.com/hook');
  });

  test('ralph.config.json takes priority over .ralphrc', async () => {
    await fs.writeFile(
      path.join(testDir, 'ralph.config.json'),
      JSON.stringify({ tier: 'large' })
    );
    await fs.writeFile(
      path.join(testDir, '.ralphrc'),
      JSON.stringify({ tier: 'micro' })
    );

    const config = await loadConfig(testDir);
    expect(config.tier).toBe('large');
  });

  test('programmatic overrides take priority over file config', async () => {
    await fs.writeFile(
      path.join(testDir, 'ralph.config.json'),
      JSON.stringify({ tier: 'large', concurrency: 4 })
    );

    const config = await loadConfig(testDir, { tier: 'micro' });
    expect(config.tier).toBe('micro');
    expect(config.concurrency).toBe(4); // from file
  });

  test('ignores unknown keys in config file', async () => {
    await fs.writeFile(
      path.join(testDir, 'ralph.config.json'),
      JSON.stringify({ tier: 'large', unknownKey: 'value', dangerousFlag: true })
    );

    const config = await loadConfig(testDir);
    expect(config.tier).toBe('large');
    expect(config.unknownKey).toBeUndefined();
    expect(config.dangerousFlag).toBeUndefined();
  });

  test('throws on invalid JSON', async () => {
    await fs.writeFile(
      path.join(testDir, 'ralph.config.json'),
      'not valid json {'
    );

    await expect(loadConfig(testDir)).rejects.toThrow('Invalid JSON');
  });

  test('throws when config file is not an object', async () => {
    await fs.writeFile(
      path.join(testDir, 'ralph.config.json'),
      JSON.stringify([1, 2, 3])
    );

    await expect(loadConfig(testDir)).rejects.toThrow('must contain a JSON object');
  });

  test('handles all supported config keys', async () => {
    const fullConfig = {
      tier: 'medium',
      timeout: 600000,
      webhookUrl: 'https://hooks.slack.com/test',
      autoApproveGates: true,
      concurrency: 3,
      verbose: false,
      notifications: false,
      eventLog: false,
      stallThresholdMs: 300000,
      stallPollMs: 15000,
      maxRetries: 5
    };

    await fs.writeFile(
      path.join(testDir, 'ralph.config.json'),
      JSON.stringify(fullConfig)
    );

    const config = await loadConfig(testDir);
    expect(config).toEqual(fullConfig);
  });
});

describe('readConfigFile', () => {
  test('returns empty object when no file exists', async () => {
    const result = await readConfigFile(testDir);
    expect(result).toEqual({});
  });

  test('filters out unknown keys', async () => {
    await fs.writeFile(
      path.join(testDir, 'ralph.config.json'),
      JSON.stringify({ tier: 'large', bogus: 123 })
    );

    const result = await readConfigFile(testDir);
    expect(result.tier).toBe('large');
    expect(result.bogus).toBeUndefined();
  });
});

describe('mergeConfig', () => {
  test('defaults fill in missing values', () => {
    const result = mergeConfig({}, {});
    expect(result).toEqual(DEFAULTS);
  });

  test('file config overrides defaults', () => {
    const result = mergeConfig({ tier: 'large' }, {});
    expect(result.tier).toBe('large');
    expect(result.timeout).toBe(DEFAULTS.timeout);
  });

  test('overrides beat file config', () => {
    const result = mergeConfig({ tier: 'large' }, { tier: 'micro' });
    expect(result.tier).toBe('micro');
  });

  test('undefined overrides do not clobber file config', () => {
    const result = mergeConfig({ tier: 'large' }, { tier: undefined });
    expect(result.tier).toBe('large');
  });

  test('ignores unknown override keys', () => {
    const result = mergeConfig({}, { notAKey: 'value' });
    expect(result.notAKey).toBeUndefined();
  });
});

describe('DEFAULTS', () => {
  test('has expected shape', () => {
    expect(DEFAULTS.tier).toBe('small');
    expect(DEFAULTS.timeout).toBe(300000);
    expect(DEFAULTS.concurrency).toBe(2);
    expect(DEFAULTS.autoApproveGates).toBe(false);
    expect(DEFAULTS.maxRetries).toBe(3);
  });
});

describe('CONFIG_FILES', () => {
  test('lists supported filenames', () => {
    expect(CONFIG_FILES).toContain('ralph.config.json');
    expect(CONFIG_FILES).toContain('.ralphrc');
  });
});

describe('ALLOWED_KEYS', () => {
  test('matches DEFAULTS keys', () => {
    const defaultKeys = Object.keys(DEFAULTS);
    expect([...ALLOWED_KEYS].sort()).toEqual(defaultKeys.sort());
  });
});
