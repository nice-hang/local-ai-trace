import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createPiAgent } from './agent.js';
import { tools } from './tools.js';

const HELP = `
命令:
  /exit, /quit  退出
  /clear        清空对话历史（仅当前会话）
  /help         显示此帮助
`.trim();

async function main() {
  const agent = createPiAgent();
  const model = agent.state.model;
  console.log(`\n🤖 pi-agent
  模型: ${model.id}
  地址: ${model.baseUrl}
  推理: ${model.reasoning ? '开启' : '关闭'}
  工具: ${tools.map((t) => t.name).join(', ')}
输入 /help 查看命令。
`);
  const rl = readline.createInterface({ input, output });

  try {
    while (true) {
      const line = (await rl.question('你> ')).trim();
      if (!line) continue;

      if (line === '/exit' || line === '/quit') break;
      if (line === '/help') {
        console.log(`\n${HELP}\n`);
        continue;
      }
      if (line === '/clear') {
        agent.reset();
        console.log('\n（已清空历史）\n');
        continue;
      }

      process.stdout.write('\n');

      // Subscribe to streaming events for real-time output
      const unsubscribe = agent.subscribe((event) => {
        if (event.type === 'tool_execution_start') {
          process.stdout.write(`  🔧 ${event.toolName}...\n`);
        } else if (event.type === 'tool_execution_end') {
          process.stdout.write(`  ✅ ${event.toolName} 完成\n`);
        } else if (event.type === 'message_update') {
          const delta = event.assistantMessageEvent;
          if (delta.type === 'text_delta') {
            process.stdout.write(delta.delta);
          }
        } else if (event.type === 'agent_end') {
          const last = event.messages[event.messages.length - 1];
          if (last?.role === 'assistant' && last.errorMessage) {
            process.stdout.write(`\n  ⚠️ 错误: ${last.errorMessage}\n`);
          }
        }
      });

      try {
        await agent.prompt(line);
      } finally {
        unsubscribe();
      }

      process.stdout.write('\n\n');
    }
  } finally {
    rl.close();
  }

  console.log('\n再见。\n');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
