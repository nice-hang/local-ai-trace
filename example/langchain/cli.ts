import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import type { BaseMessage } from '@langchain/core/messages';
import { createTracerAgent, LAT_BASE_URL, lastAssistantText, runSingleTurn } from './agent.js';

const HELP = `
命令:
  /exit, /quit  退出
  /clear        清空对话历史（仅当前会话）
  /help         显示此帮助
`.trim();

async function main() {
  console.log(`\n🔗 local-ai-trace + LangChain (${LAT_BASE_URL})\n输入 /help 查看命令。\n`);

  const agent = createTracerAgent();
  let history: BaseMessage[] = [];

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
        history = [];
        console.log('\n（已清空历史）\n');
        continue;
      }

      process.stdout.write('… 思考中\n');
      const result = await runSingleTurn(agent, line, history);
      history = result.messages;

      const reply = lastAssistantText(history);
      if (reply) console.log(`\n助手:\n${reply}\n`);
      else console.log('\n（本轮无文本回复，可能仅有工具调用。）\n');
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
