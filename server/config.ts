import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerConfig {
  port: number;
  host: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  ollamaTimeoutMs: number;
  storageDir: string;
  ocrEngine: 'auto' | 'pymupdf' | 'tesseract' | 'paddleocr';
  minCharsPerPage: number;
}

export const serverConfig: ServerConfig = {
  port: Number(process.env.PORT) || 3001,
  host: process.env.HOST || '127.0.0.1',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'qwen2.5:3b',
  ollamaTimeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS) || 60000,
  storageDir: process.env.STORAGE_DIR || path.join(__dirname, 'data'),
  ocrEngine: (process.env.INSUREOS_OCR_ENGINE as any) || 'auto',
  minCharsPerPage: Number(process.env.MIN_CHARS_PER_PAGE) || 40,
};

export function updateServerConfig(updates: Partial<Pick<ServerConfig, 'ollamaBaseUrl' | 'ollamaModel' | 'ollamaTimeoutMs' | 'ocrEngine' | 'minCharsPerPage'>>) {
  if (updates.ollamaBaseUrl !== undefined) {
    serverConfig.ollamaBaseUrl = updates.ollamaBaseUrl.trim().replace(/\/+$/, '');
  }
  if (updates.ollamaModel !== undefined && updates.ollamaModel.trim()) {
    serverConfig.ollamaModel = updates.ollamaModel.trim();
  }
  if (updates.ollamaTimeoutMs !== undefined && updates.ollamaTimeoutMs > 0) {
    serverConfig.ollamaTimeoutMs = updates.ollamaTimeoutMs;
  }
  if (updates.ocrEngine !== undefined) {
    serverConfig.ocrEngine = updates.ocrEngine;
  }
  if (updates.minCharsPerPage !== undefined && updates.minCharsPerPage >= 0) {
    serverConfig.minCharsPerPage = updates.minCharsPerPage;
  }
  return { ...serverConfig };
}
