import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig, saveConfig, type AppConfig } from '../src/config/config.js';

const TEST_CONFIG_DIR = join(process.env.TMPDIR || '/tmp', '.local-ai-trace-test');

describe('config', () => {
  beforeEach(() => {
    if (!existsSync(TEST_CONFIG_DIR)) {
      mkdirSync(TEST_CONFIG_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
  });

  it('should return default config when no config file exists', () => {
    const config = loadConfig(TEST_CONFIG_DIR);
    expect(config.port).toBe(4321);
    expect(config.models).toEqual([]);
  });

  it('should save and load config correctly', () => {
    const config: AppConfig = {
      port: 4321,
      maxRuns: 1000,
      models: [{ name: 'qwen2.5-1.5b', path: '/tmp/test.gguf' }],
    };
    saveConfig(config, TEST_CONFIG_DIR);
    const loaded = loadConfig(TEST_CONFIG_DIR);
    expect(loaded.port).toBe(4321);
    expect(loaded.models).toHaveLength(1);
    expect(loaded.models[0].name).toBe('qwen2.5-1.5b');
  });

  it('should fill missing fields for old config format', () => {
    const oldConfig = { port: 4321 };
    saveConfig(oldConfig as any, TEST_CONFIG_DIR);
    const config = loadConfig(TEST_CONFIG_DIR);
    expect(config.maxRuns).toBe(1000);
    expect(config.models).toEqual([]);
  });
});
