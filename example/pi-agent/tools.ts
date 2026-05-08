import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Type } from '@sinclair/typebox';
import type { AgentTool } from '@mariozechner/pi-agent-core';

export const readFileTool: AgentTool = {
  name: 'read_file',
  label: 'Read File',
  description: 'Read the contents of a file',
  parameters: Type.Object({
    path: Type.String({ description: 'Absolute path to the file' }),
  }),
  execute: async (_toolCallId, params, _signal, _onUpdate) => {
    if (!existsSync(params.path)) {
      throw new Error(`File not found: ${params.path}`);
    }
    const content = await readFile(params.path, 'utf-8');
    return {
      content: [{ type: 'text', text: content }],
      details: { path: params.path, size: content.length },
    };
  },
};

export const writeFileTool: AgentTool = {
  name: 'write_file',
  label: 'Write File',
  description: 'Write content to a file (creates parent directories if needed)',
  parameters: Type.Object({
    path: Type.String({ description: 'Absolute path to the file' }),
    content: Type.String({ description: 'Content to write' }),
  }),
  execute: async (_toolCallId, params) => {
    const pathParts = params.path.split('/');
    if (pathParts.length > 1) {
      await mkdir(pathParts.slice(0, -1).join('/'), { recursive: true });
    }
    await writeFile(params.path, params.content, 'utf-8');
    return {
      content: [{ type: 'text', text: `Written ${params.content.length} bytes to ${params.path}` }],
      details: { path: params.path, size: params.content.length },
    };
  },
};

export const webFetchTool: AgentTool = {
  name: 'web_fetch',
  label: 'Fetch Web Page',
  description: 'Fetch a URL and return its content as text',
  parameters: Type.Object({
    url: Type.String({ description: 'The URL to fetch' }),
  }),
  execute: async (_toolCallId, params) => {
    try {
      const res = await fetch(params.url, { signal: AbortSignal.timeout(15000) });
      const text = await res.text();
      const stripped = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return {
        content: [{ type: 'text', text: stripped.slice(0, 8000) || '(empty page)' }],
        details: { url: params.url, bytes: text.length },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Error fetching ${params.url}: ${msg}`);
    }
  },
};

export const webSearchTool: AgentTool = {
  name: 'web_search',
  label: 'Search Web',
  description:
    'Search the web for information. When searching in Chinese, use Chinese queries for better results.',
  parameters: Type.Object({
    query: Type.String({ description: 'Search query' }),
  }),
  execute: async (_toolCallId, params) => {
    try {
      const res = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(params.query)}`,
        { signal: AbortSignal.timeout(15000) },
      );
      const html = await res.text();
      const snippets =
        html.match(
          /<a[^>]*class="result__a"[^>]*>[\s\S]*?<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>[\s\S]*?<\/a>/gi,
        ) || [];
      const results = snippets.slice(0, 5).map((s) =>
        s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      );
      return {
        content: [{ type: 'text', text: results.join('\n---\n') || '(no results)' }],
        details: { query: params.query, count: results.length },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Search error: ${msg}`);
    }
  },
};

export const tools: AgentTool[] = [readFileTool, writeFileTool, webFetchTool, webSearchTool];
