import { serverConfig } from '../config.js';

export interface OllamaHealthStatus {
  available: boolean;
  baseUrl: string;
  configuredModel: string;
  isModelInstalled: boolean;
  installedModels: string[];
  error?: string;
}

export interface OllamaChatResponse {
  success: boolean;
  response?: string;
  modelUsed?: string;
  totalDurationMs?: number;
  error?: string;
  isTimeout?: boolean;
}

export class OllamaClient {
  public static async checkHealth(timeoutMs: number = 4000): Promise<OllamaHealthStatus> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${serverConfig.ollamaBaseUrl}/api/tags`, {
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        return {
          available: false,
          baseUrl: serverConfig.ollamaBaseUrl,
          configuredModel: serverConfig.ollamaModel,
          isModelInstalled: false,
          installedModels: [],
          error: `Ollama returned HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const data = await res.json() as { models?: Array<{ name: string }> };
      const models = Array.isArray(data.models) ? data.models.map(m => m.name) : [];
      let isInstalled = models.some(m =>
        m.toLowerCase() === serverConfig.ollamaModel.toLowerCase() ||
        m.toLowerCase().startsWith(serverConfig.ollamaModel.toLowerCase() + ':') ||
        serverConfig.ollamaModel.toLowerCase().startsWith(m.toLowerCase() + ':')
      );

      // Auto-switch to installed model if the configured one is not present
      if (!isInstalled && models.length > 0) {
        console.log(`[OllamaClient] Configured model '${serverConfig.ollamaModel}' not found. Auto-selecting installed model: '${models[0]}'`);
        serverConfig.ollamaModel = models[0];
        isInstalled = true;
      }

      return {
        available: true,
        baseUrl: serverConfig.ollamaBaseUrl,
        configuredModel: serverConfig.ollamaModel,
        isModelInstalled: isInstalled,
        installedModels: models,
      };
    } catch (err: any) {
      clearTimeout(timer);
      const isAbort = err.name === 'AbortError';
      const msg = isAbort
        ? `Connection timed out after ${timeoutMs}ms while contacting Ollama at ${serverConfig.ollamaBaseUrl}`
        : `Cannot connect to Ollama at ${serverConfig.ollamaBaseUrl}: ${err.message || 'Connection refused'}. Verify Ollama is running ('ollama serve').`;

      return {
        available: false,
        baseUrl: serverConfig.ollamaBaseUrl,
        configuredModel: serverConfig.ollamaModel,
        isModelInstalled: false,
        installedModels: [],
        error: msg,
      };
    }
  }

  public static async chat(
    userPrompt: string,
    systemPrompt?: string,
    modelOverride?: string
  ): Promise<OllamaChatResponse> {
    const model = modelOverride || serverConfig.ollamaModel;
    const controller = new AbortController();
    const timeoutMs = serverConfig.ollamaTimeoutMs;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    try {
      const messages: Array<{ role: string; content: string }> = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: userPrompt });

      const res = await fetch(`${serverConfig.ollamaBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          options: {
            temperature: 0.1, // Low temperature for deterministic factual policy retrieval
            top_p: 0.9,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        return {
          success: false,
          error: `Ollama error (HTTP ${res.status}): ${errorText || res.statusText}`,
          modelUsed: model,
        };
      }

      const data = await res.json() as { message?: { content: string }; total_duration?: number };
      const content = data.message?.content?.trim();

      if (!content) {
        return {
          success: false,
          error: 'Ollama returned an empty response.',
          modelUsed: model,
        };
      }

      return {
        success: true,
        response: content,
        modelUsed: model,
        totalDurationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      clearTimeout(timer);
      const isTimeout = err.name === 'AbortError';
      const errorMsg = isTimeout
        ? `Ollama request timed out after ${timeoutMs / 1000}s while waiting for model '${model}'.`
        : `Failed to contact Ollama at ${serverConfig.ollamaBaseUrl}: ${err.message || 'Offline'}. Ensure Ollama is running.`;

      return {
        success: false,
        error: errorMsg,
        isTimeout,
        modelUsed: model,
      };
    }
  }

  public static async generateEmbedding(text: string, modelOverride?: string): Promise<number[] | null> {
    const model = modelOverride || serverConfig.ollamaModel;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${serverConfig.ollamaBaseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: text.slice(0, 2000),
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      if (!res.ok) return null;

      const data = await res.json() as { embedding?: number[] };
      return Array.isArray(data.embedding) ? data.embedding : null;
    } catch {
      clearTimeout(timer);
      return null;
    }
  }
}
