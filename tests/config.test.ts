import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig, saveConfig, getProvider, type AppConfig } from '../src/config/config.js';

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
    expect(config.providers).toEqual([]);
  });

  it('should save and load config correctly', () => {
    const config: AppConfig = {
      port: 4321,
      providers: [{ name: 'openai', apiKey: 'sk-test', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o'] }],
    };
    saveConfig(config, TEST_CONFIG_DIR);
    const loaded = loadConfig(TEST_CONFIG_DIR);
    expect(loaded.port).toBe(4321);
    expect(loaded.providers).toHaveLength(1);
    expect(loaded.providers[0].name).toBe('openai');
  });

  it('should find provider by model name', () => {
    const config: AppConfig = {
      port: 4321,
      providers: [{ name: 'openai', apiKey: 'sk-test', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini'] }],
    };
    const provider = getProvider(config, 'gpt-4o');
    expect(provider).toBeDefined();
    expect(provider!.name).toBe('openai');
  });

  it('should return undefined for unknown model', () => {
    const config: AppConfig = { port: 4321, providers: [] };
    expect(getProvider(config, 'unknown-model')).toBeUndefined();
  });
});
