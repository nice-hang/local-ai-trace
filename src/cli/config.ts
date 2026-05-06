import { loadConfig, saveConfig, type ProviderConfig } from '../config/config.js';

export function showConfig(): void {
  const config = loadConfig();
  console.log(JSON.stringify(config, null, 2));
}

export async function addProvider(
  name: string,
  options: { apiKey?: string; baseUrl?: string; models?: string }
): Promise<void> {
  const config = loadConfig();

  if (config.providers.some((p) => p.name === name)) {
    throw new Error(`Provider "${name}" already exists. Remove it first.`);
  }

  const provider: ProviderConfig = {
    name,
    apiKey: options.apiKey || '',
    baseUrl: options.baseUrl || 'https://api.openai.com/v1',
    models: options.models ? options.models.split(',').map((m) => m.trim()) : [],
  };

  config.providers.push(provider);
  saveConfig(config);
  console.log(`Provider "${name}" added.`);
}

export async function listProviders(): Promise<void> {
  const config = loadConfig();
  if (config.providers.length === 0) {
    console.log('No providers configured.');
    return;
  }
  for (const p of config.providers) {
    console.log(`${p.name}: ${p.baseUrl} (${p.models.join(', ') || 'no models'})`);
  }
}

export async function removeProvider(name: string): Promise<void> {
  const config = loadConfig();
  const idx = config.providers.findIndex((p) => p.name === name);
  if (idx === -1) {
    throw new Error(`Provider "${name}" not found.`);
  }
  config.providers.splice(idx, 1);
  saveConfig(config);
  console.log(`Provider "${name}" removed.`);
}
