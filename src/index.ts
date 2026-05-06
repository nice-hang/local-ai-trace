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

const config = program.command('config').description('Manage configuration');

config
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
