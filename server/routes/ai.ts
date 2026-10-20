import { Router } from 'express';
import { OllamaClient } from '../services/ollamaClient.js';
import { StorageService } from '../services/storage.js';
import { RetrievalEngine } from '../services/retrievalEngine.js';
import { PromptSecurityService } from '../services/promptSecurity.js';
import { serverConfig, updateServerConfig } from '../config.js';

export const aiRouter = Router();

// GET /api/ai/health - Check if Ollama is reachable and list models
aiRouter.get('/health', async (req, res) => {
  try {
    const health = await OllamaClient.checkHealth();
    return res.json({
      success: true,
      data: health,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Failed to check Ollama health: ${err.message}`,
    });
  }
});

// POST /api/ai/config - Configure model, URL, timeout at runtime
aiRouter.post('/config', (req, res) => {
  try {
    const { ollamaBaseUrl, ollamaModel, ollamaTimeoutMs } = req.body;
    const updated = updateServerConfig({ ollamaBaseUrl, ollamaModel, ollamaTimeoutMs });
    return res.json({
      success: true,
      message: 'Server AI configuration updated.',
      data: updated,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: `Failed to update configuration: ${err.message}`,
    });
  }
});

// POST /api/ai/ask - Grounded Q&A against uploaded documents
aiRouter.post('/ask', async (req, res) => {
  try {
    const { question, documentIds, workspaceId = 'DEFAULT-WORKSPACE', model } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Question is required.',
      });
    }

    // 1. Prompt Injection Screening on Query
    const querySecurity = PromptSecurityService.screenText(question);
    if (!querySecurity.isSafe) {
      return res.status(400).json({
        success: false,
        threatDetected: true,
        error: 'Query blocked: Potential prompt injection or system override pattern detected.',
        mitigation: querySecurity.mitigation,
      });
    }

    // 2. Fetch Chunks strictly isolated to this workspace
    const chunks = await StorageService.getAllChunks(
      workspaceId,
      Array.isArray(documentIds) && documentIds.length > 0 ? documentIds : undefined
    );

    // 3. Retrieve relevant passages if documents exist
    const rawPassages = chunks.length > 0
      ? await RetrievalEngine.retrievePassages(question, chunks, 4)
      : [];

    // Filter to passages that actually match query keywords/phrases
    const relevantPassages = rawPassages.filter(p => p.score >= 1.0);

    // 4. Verify Ollama Health
    const health = await OllamaClient.checkHealth();
    if (!health.available) {
      // If no docs and offline, give clear guidance
      if (chunks.length === 0) {
        return res.status(503).json({
          success: false,
          isOllamaOffline: true,
          error: `Ollama is currently unreachable at ${health.baseUrl}. Please start your local Ollama server ('ollama serve') to chat with the InsureOS Assistant.`,
          canRetry: true,
        });
      }

      return res.status(503).json({
        success: false,
        isOllamaOffline: true,
        error: `Ollama is currently unreachable at ${health.baseUrl}. Please start your local Ollama server ('ollama serve') and ensure the configured model ('${health.configuredModel}') is installed.`,
        details: health.error,
        canRetry: true,
        retrievedEvidencePreview: relevantPassages.map(p => ({
          filename: p.filename,
          page: p.page,
          score: p.score,
          excerpt: p.text.slice(0, 250),
        })),
      });
    }

    if (!health.isModelInstalled) {
      return res.status(404).json({
        success: false,
        isModelMissing: true,
        error: `The configured model '${health.configuredModel}' is not found in your local Ollama installation. Available models: [${health.installedModels.join(', ') || 'None'}]. Run 'ollama run ${health.configuredModel}' or switch to an installed model in Settings.`,
        installedModels: health.installedModels,
        configuredModel: health.configuredModel,
        canRetry: true,
      });
    }

    // 5. Construct Grounded Prompt with Delimiter Isolation
    const systemPrompt = PromptSecurityService.buildGroundedSystemPrompt();
    const evidenceBlock = PromptSecurityService.formatEvidenceContext(relevantPassages);

    const userPromptWithContext = `${evidenceBlock}\n\nUSER QUESTION: ${question.trim()}\n\nProvide a helpful, structured response as the InsureOS Assistant Bot. If matching documents are provided in the evidence above, cite them with filename and page. If the question asks for advice, how to get insurance, or about a policy not on file, explain step-by-step how to obtain it, what documents are needed, and how to upload it to InsureOS.`;

    // 6. Invoke Local Ollama Model (using installed model)
    const modelToUse = (model && health.installedModels.includes(model))
      ? model
      : health.configuredModel;
    const chatResult = await OllamaClient.chat(userPromptWithContext, systemPrompt, modelToUse);

    if (!chatResult.success) {
      return res.status(502).json({
        success: false,
        error: chatResult.error || 'Failed to generate response from local Ollama model.',
        isTimeout: chatResult.isTimeout,
        canRetry: true,
      });
    }

    // 7. Return verified answer with citations
    const citations = relevantPassages.map(p => ({
      documentId: p.documentId,
      filename: p.filename,
      page: p.page,
      chunkId: p.id,
      relevanceScore: p.score,
      excerpt: p.text.length > 300 ? p.text.slice(0, 300) + '...' : p.text,
      matchedTerms: p.matchedTerms,
      extractionMethod: p.extractionMethod || 'native',
      ocrEngineUsed: p.ocrEngineUsed || null,
    }));

    return res.json({
      success: true,
      answer: chatResult.response,
      modelUsed: chatResult.modelUsed,
      totalDurationMs: chatResult.totalDurationMs,
      citations,
      evidenceFound: relevantPassages.length > 0,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Internal AI processing error: ${err.message}`,
    });
  }
});
