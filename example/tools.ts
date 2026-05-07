import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to the file' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description: 'Write content to a file (creates parent directories if needed)',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to the file' },
          content: { type: 'string', description: 'Content to write' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'web_fetch',
      description: 'Fetch a URL and return its content as text',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to fetch' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: 'Search the web for information. When searching in Chinese, use Chinese queries for better results.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
  },
];

type ToolCall = {
  id: string;
  function: { name: string; arguments: string };
};

export async function executeToolCall(toolCall: ToolCall): Promise<string> {
  const { name, arguments: argsStr } = toolCall.function;
  const args = JSON.parse(argsStr);

  switch (name) {
    case 'read_file': {
      const { path } = args;
      if (!existsSync(path)) return `Error: file not found: ${path}`;
      const content = await readFile(path, 'utf-8');
      return content;
    }

    case 'write_file': {
      const { path, content } = args;
      const { mkdir } = await import('node:fs/promises');
      const pathParts = path.split('/');
      if (pathParts.length > 1) {
        await mkdir(pathParts.slice(0, -1).join('/'), { recursive: true });
      }
      await writeFile(path, content, 'utf-8');
      return `Written ${content.length} bytes to ${path}`;
    }

    case 'web_fetch': {
      const { url } = args;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        const text = await res.text();
        // Try to extract meaningful content from HTML
        const stripped = text
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return stripped.slice(0, 8000) || '(empty page)';
      } catch (err: any) {
        return `Error fetching ${url}: ${err.message}`;
      }
    }

    case 'web_search': {
      const { query } = args;
      try {
        const res = await fetch(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
          { signal: AbortSignal.timeout(15000) },
        );
        const html = await res.text();
        const snippets = html.match(/<a[^>]*class="result__a"[^>]*>[\s\S]*?<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>[\s\S]*?<\/a>/gi) || [];
        const results = snippets.slice(0, 5).map((s) =>
          s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        );
        return results.join('\n---\n') || '(no results)';
      } catch (err: any) {
        return `Search error: ${err.message}`;
      }
    }

    default:
      return `Unknown tool: ${name}`;
  }
}
