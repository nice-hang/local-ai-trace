/** 内置模型目录中的条目 */
export interface BuiltinModel {
  id: string;
  name: string;
  url: string;
  filename: string;
  size: string;
  bytes: number;
  quantization: string;
  description: string;
  minRam: string;
  contextLength?: number;
}

export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
  speed: string;
  percent: number;
}
