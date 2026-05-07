#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('lat')
  .description('local-ai-trace - Local LLM tracing server')
  .version('0.1.0');

program
  .command('start')
  .description('Start the local-ai-trace server')
  .option('-p, --port <number>', 'Server port', '4321')
  .action(async (options) => {
    const { startServer } = await import('./cli/start.js');
    await startServer({ port: parseInt(options.port, 10) });
  });

// model
const model = program.command('model').description('Manage local models');

model
  .command('list')
  .description('List installed and available models')
  .action(async () => {
    const { listModels } = await import('./cli/model.js');
    await listModels();
  });

model
  .command('add')
  .description('Download and install a model')
  .argument('<id>', 'Model ID (e.g. qwen2.5-1.5b)')
  .option('--url <url>', 'Custom download URL (for models not in builtin list)')
  .action(async (id, options) => {
    try {
      const { addModel } = await import('./cli/model.js');
      await addModel(id, options);
    } catch (err: any) {
      console.error(err.message);
      process.exit(1);
    }
  });

model
  .command('remove')
  .description('Remove a model from config')
  .argument('<id>', 'Model ID')
  .action(async (id) => {
    try {
      const { removeModel } = await import('./cli/model.js');
      await removeModel(id);
    } catch (err: any) {
      console.error(err.message);
      process.exit(1);
    }
  });

model
  .command('default')
  .description('Set the default model')
  .argument('<id>', 'Model ID')
  .action(async (id) => {
    try {
      const { setDefaultModel } = await import('./cli/model.js');
      await setDefaultModel(id);
    } catch (err: any) {
      console.error(err.message);
      process.exit(1);
    }
  });

// config
const configCmd = program.command('config').description('Manage configuration');

configCmd
  .command('list')
  .description('Show current configuration')
  .action(async () => {
    const { showConfig } = await import('./cli/config.js');
    showConfig();
  });

const provider = program.command('provider').description('Manage API providers');

provider
  .command('add')
  .description('Add a provider')
  .argument('<name>', 'Provider name (e.g. openai)')
  .option('--api-key <key>', 'API key')
  .option('--base-url <url>', 'Base URL')
  .option('--models <models>', 'Comma-separated model list')
  .action(async (name, options) => {
    const { addProvider } = await import('./cli/config.js');
    await addProvider(name, options);
  });

provider
  .command('list')
  .description('List configured providers')
  .action(async () => {
    const { listProviders } = await import('./cli/config.js');
    await listProviders();
  });

provider
  .command('remove')
  .description('Remove a provider')
  .argument('<name>', 'Provider name')
  .action(async (name) => {
    const { removeProvider } = await import('./cli/config.js');
    await removeProvider(name);
  });

program.parse(process.argv);
