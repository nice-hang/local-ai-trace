import OpenAI from 'openai';
import { tools, executeToolCall } from './tools.js';

const LAT_BASE_URL = 'http://localhost:4321/v1';

const client = new OpenAI({
  baseURL: LAT_BASE_URL,
  apiKey: 'not-needed',  // local-ai-trace accepts any key
});

async function main() {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: [
      'You are a capable general-purpose agent. You can:',
      '- Read and write files on the local filesystem',
      '- Fetch web pages to get current information',
      '- Search the web for answers',
      '',
      'Use the tools available to you to accomplish the user\'s requests.',
      'When you have enough information, provide a clear summary.',
    ].join('\n') },
    { role: 'user', content: process.argv[2] || 'Tell me something interesting. You can use web_fetch to find something.' },
  ];

  console.log(`\n🔗 local-ai-trace agent (${LAT_BASE_URL})\n`);

  let turns = 0;
  while (turns++ < 10) {
    const res = await client.chat.completions.create({
      model: 'any',  // local-ai-trace accepts any model name
      messages,
      tools: tools as any,
      stream: false,
    });

    const msg = res.choices[0].message;

    if (msg.content) {
      console.log(`  ${msg.content}\n`);
    }

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      break;  // 没有 tool call = 任务完成
    }

    messages.push(msg);
    for (const tc of msg.tool_calls) {
      process.stdout.write(`  🛠  ${tc.function.name}(${tc.function.arguments}) … `);
      const result = await executeToolCall(tc as any);
      console.log(`done (${result.length} chars)`);
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result,
      });
    }
  }

  console.log(`\n✨ Done (${turns} turn${turns > 1 ? 's' : ''})`);
}

main().catch(console.error);
