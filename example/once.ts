/**
 * 单次非交互运行：npm run once -- "你的问题"
 * 不传参数时使用与旧版 agent 类似的默认提示。
 */
import { createTracerAgent, lastAssistantText, runSingleTurn } from './agent.js';

async function main() {
  const text =
    process.argv.slice(2).join(' ') ||
    'Tell me something interesting. You can use web_fetch to find something.';

  const agent = createTracerAgent();
  const { messages } = await runSingleTurn(agent, text, []);
  const reply = lastAssistantText(messages);
  console.log(reply || '(no assistant text)');
}

main().catch(console.error);
