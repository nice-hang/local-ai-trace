import { createWriteStream, mkdirSync, existsSync } from 'node:fs';
import { get } from 'node:https';
import { join } from 'node:path';
import { type DownloadProgress } from './types.js';
import { getModelsDir } from './registry.js';

export interface DownloadOptions {
  url: string;
  filename: string;
  onProgress?: (progress: DownloadProgress) => void;
}

export async function downloadModel(options: DownloadOptions): Promise<string> {
  const { url, filename, onProgress } = options;
  const modelsDir = getModelsDir();

  if (!existsSync(modelsDir)) {
    mkdirSync(modelsDir, { recursive: true });
  }

  const destPath = join(modelsDir, filename);

  if (existsSync(destPath)) {
    return destPath;
  }

  return new Promise<string>((resolve, reject) => {
    const urlObj = new URL(url);
    const headers: Record<string, string> = {
      'User-Agent': 'local-ai-trace/0.1.0',
      Accept: 'application/octet-stream',
    };
    // HF_TOKEN 环境变量用于认证 HuggingFace 下载
    const hfToken = process.env.HF_TOKEN;
    if (hfToken && urlObj.hostname.endsWith('huggingface.co')) {
      headers.Authorization = `Bearer ${hfToken}`;
    }
    const options: import('node:https').RequestOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      headers,
      rejectUnauthorized: true,
    };

    get(options, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location;
        if (!redirectUrl) {
          reject(new Error('Redirect with no Location header'));
          return;
        }
        resolve(downloadModel({ url: redirectUrl, filename, onProgress }));
        return;
      }

      if (response.statusCode !== 200) {
        const errMsg = `Download failed with status ${response.statusCode}`;
        if (response.statusCode === 401 || response.statusCode === 403) {
          reject(new Error(`${errMsg} — 请检查模型 URL 是否正确，或设置 HF_TOKEN 环境变量`));
        } else {
          reject(new Error(errMsg));
        }
        return;
      }

      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      let bytesDownloaded = 0;
      let lastChunkTime = Date.now();
      let lastChunkBytes = 0;

      const file = createWriteStream(destPath);

      response.on('data', (chunk: Buffer) => {
        bytesDownloaded += chunk.length;
        file.write(chunk);

        const now = Date.now();
        if (now - lastChunkTime > 200) {
          const elapsed = (now - lastChunkTime) / 1000;
          const chunkBytes = bytesDownloaded - lastChunkBytes;
          const speed = elapsed > 0 ? `${(chunkBytes / elapsed / 1024 / 1024).toFixed(1)} MB/s` : '0 MB/s';

          onProgress?.({
            bytesDownloaded,
            totalBytes,
            speed,
            percent: totalBytes > 0 ? Math.round((bytesDownloaded / totalBytes) * 100) : 0,
          });

          lastChunkTime = now;
          lastChunkBytes = bytesDownloaded;
        }
      });

      response.on('end', () => {
        file.end();
        onProgress?.({
          bytesDownloaded,
          totalBytes,
          speed: 'Done',
          percent: 100,
        });
        resolve(destPath);
      });

      response.on('error', (err) => {
        file.close();
        reject(new Error(`Download error: ${err.message}`));
      });
    }).on('error', (err) => {
      reject(new Error(`HTTP request error: ${err.message}`));
    });
  });
}
