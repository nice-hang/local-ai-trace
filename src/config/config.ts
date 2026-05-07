import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface LocalModelConfig {
  name: string;
  path: string;
  quantization?: string;
  size?: string;
}

export interface AppConfig {
  port: number;
  defaultModel?: string;
  maxRuns: number;
  models: LocalModelConfig[];
}

const CONFIG_DIR = join(homedir(), '.local-ai-trace');

const DEFAULT_CONFIG: AppConfig = {
  port: 4321,
  maxRuns: 1000,
  models: [],
};

export function loadConfig(configDir?: string): AppConfig {
  const dir = configDir ?? CONFIG_DIR;
  const configPath = join(dir, 'config.json');
  if (!existsSync(configPath)) {
    saveConfig(DEFAULT_CONFIG, dir);
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as AppConfig;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (err) {
    console.error(`Warning: failed to parse ${configPath}, using defaults. ${err}`);
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: AppConfig, configDir?: string): void {
  const dir = configDir ?? CONFIG_DIR;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const configPath = join(dir, 'config.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

