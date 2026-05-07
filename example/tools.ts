import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tool } from 'langchain';
import { z } from 'zod';

async function readLocalFile(absPath: string): Promise<string> {
  if (!existsSync(absPath)) return `Error: file not found: ${absPath}`;
  return readFile(absPath, 'utf-8');
}

async function writeLocalFile(absPath: string, content: string): Promise<string> {
  const pathParts = absPath.split('/');
  if (pathParts.length > 1) {
    await mkdir(pathParts.slice(0, -1).join('/'), { recursive: true });
  }
  await writeFile(absPath, content, 'utf-8');
  return `Written ${content.length} bytes to ${absPath}`;
}

async function fetchUrlText(url: string): Promise<string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    const stripped = text
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return stripped.slice(0, 8000) || '(empty page)';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error fetching ${url}: ${msg}`;
  }
}

async function searchWeb(query: string): Promise<string> {
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(15000) },
    );
    const html = await res.text();
    const snippets =
      html.match(/<a[^>]*class="result__a"[^>]*>[\s\S]*?<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>[\s\S]*?<\/a>/gi) || [];
    const results = snippets.slice(0, 5).map((s) =>
      s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    );
    return results.join('\n---\n') || '(no results)';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Search error: ${msg}`;
  }
}

export const readFileTool = tool(
  async ({ path }) => readLocalFile(path),
  {
    name: 'read_file',
    description: 'Read the contents of a file',
    schema: z.object({
      path: z.string().describe('Absolute path to the file'),
    }),
  },
);

export const writeFileTool = tool(
  async ({ path, content }) => writeLocalFile(path, content),
  {
    name: 'write_file',
    description: 'Write content to a file (creates parent directories if needed)',
    schema: z.object({
      path: z.string().describe('Absolute path to the file'),
      content: z.string().describe('Content to write'),
    }),
  },
);

export const webFetchTool = tool(
  async ({ url }) => fetchUrlText(url),
  {
    name: 'web_fetch',
    description: 'Fetch a URL and return its content as text',
    schema: z.object({
      url: z.string().describe('The URL to fetch'),
    }),
  },
);

export const webSearchTool = tool(
  async ({ query }) => searchWeb(query),
  {
    name: 'web_search',
    description:
      'Search the web for information. When searching in Chinese, use Chinese queries for better results.',
    schema: z.object({
      query: z.string().describe('Search query'),
    }),
  },
);

export const tracerTools = [readFileTool, writeFileTool, webFetchTool, webSearchTool];
