import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface ProviderConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  models: string[];
}

export interface AppConfig {
  port: number;
  providers: ProviderConfig[];
}

const CONFIG_DIR = join(homedir(), '.local-ai-trace');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: AppConfig = {
  port: 4321,
  providers: [],
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
    return JSON.parse(raw) as AppConfig;
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

export function getProvider(config: AppConfig, model: string): ProviderConfig | undefined {
  return config.providers.find((p) => p.models.includes(model));
}
