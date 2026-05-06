import OpenAI from 'openai';
import { type ProviderConfig } from '../config/config.js';
import { type RunInputs, type RunOutputs, type ToolCall } from '../trace/types.js';

export interface ProxyResult {
  outputs: RunOutputs;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export async function proxyChatCompletion(
  provider: ProviderConfig,
  inputs: RunInputs
): Promise<ProxyResult> {
  const client = new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseUrl,
    timeout: 30_000,
  });

  let response: OpenAI.Chat.Completions.ChatCompletion;
  try {
    response = await client.chat.completions.create({
      model: inputs.model as string,
      messages: inputs.messages as OpenAI.Chat.ChatCompletionMessageParam[],
      tools: inputs.tools as OpenAI.Chat.ChatCompletionTool[] | undefined,
      temperature: inputs.temperature as number | undefined,
      max_tokens: inputs.max_tokens as number | undefined,
      stream: false,
    });
  } catch (err) {
    throw new Error(`Proxy request to ${provider.name} failed: ${(err as Error).message}`);
  }

  const choice = response.choices?.[0];
  if (!choice) {
    throw new Error(`Proxy request returned no choices (model may have been filtered)`);
  }

  const toolCalls: ToolCall[] | undefined = choice.message.tool_calls?.map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: tc.function.arguments,
    result: undefined,
  }));

  return {
    outputs: {
      content: choice.message.content,
      finish_reason: choice.finish_reason ?? null,
      tool_calls: toolCalls,
    },
    promptTokens: response.usage?.prompt_tokens || 0,
    completionTokens: response.usage?.completion_tokens || 0,
    totalTokens: response.usage?.total_tokens || 0,
  };
}
