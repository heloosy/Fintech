import { inMemoryStore } from './inMemoryStore';
import { SAMPLE_TEST_DOCUMENTS } from '../data/sampleTestFiles';

export interface DocumentPageSummary {
  pageNumber: number;
  text: string;
  characterCount: number;
  wordCount: number;
  extractionMethod: string;
  ocrEngineUsed: string | null;
  status: 'clean' | 'ocr_applied' | 'incomplete' | 'empty';
  insufficientText: boolean;
  warning: string | null;
}

export interface BackendDocSummary {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSizeFormatted: string;
  pageCount: number;
  wordCount: number;
  chunkCount: number;
  extractionMethod: string;
  ocrStatus: string;
  ocrEngineUsed?: string | null;
  warningsCount?: number;
  pages?: DocumentPageSummary[];
  uploadDate: string;
  category: 'Policy Contract' | 'Claim Evidence' | 'Submission Receipt' | 'Estimate' | 'Medical' | 'General';
  workspaceId: string;
  previewExcerpt: string;
}

export interface OllamaHealth {
  available: boolean;
  baseUrl: string;
  configuredModel: string;
  isModelInstalled: boolean;
  installedModels: string[];
  error?: string;
}

export interface AICitation {
  documentId: string;
  filename: string;
  page: number;
  chunkId: string;
  relevanceScore: number;
  excerpt: string;
  matchedTerms: string[];
  extractionMethod?: string;
  ocrEngineUsed?: string | null;
}

export interface AskAIResponse {
  success: boolean;
  answer?: string;
  modelUsed?: string;
  totalDurationMs?: number;
  citations: AICitation[];
  evidenceFound: boolean;
  isOllamaOffline?: boolean;
  isModelMissing?: boolean;
  error?: string;
  retrievedEvidencePreview?: Array<{
    filename: string;
    page: number;
    score: number;
    excerpt: string;
  }>;
}

export class ApiClient {
  private static getWorkspaceId(): string {
    const profile = inMemoryStore.getUserProfile();
    return profile.tenantId || 'DEFAULT-WORKSPACE';
  }

  private static getHeaders(contentType?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Workspace-Id': this.getWorkspaceId(),
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    return headers;
  }

  // 1. Ollama AI Health Check
  public static async checkAIHealth(): Promise<OllamaHealth> {
    try {
      const res = await fetch('/api/ai/health', {
        headers: this.getHeaders(),
      });
      if (!res.ok) {
        return {
          available: false,
          baseUrl: 'http://127.0.0.1:11434',
          configuredModel: 'llama3:8b',
          isModelInstalled: false,
          installedModels: [],
          error: `Server responded with status ${res.status}`,
        };
      }
      const data = await res.json();
      return data.data;
    } catch (err: any) {
      return {
        available: false,
        baseUrl: 'http://127.0.0.1:11434',
        configuredModel: 'llama3:8b',
        isModelInstalled: false,
        installedModels: [],
        error: `Backend API unreachable: ${err.message}`,
      };
    }
  }

  // 2. Configure Ollama at Runtime
  public static async updateAIConfig(params: {
    ollamaBaseUrl?: string;
    ollamaModel?: string;
    ollamaTimeoutMs?: number;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: this.getHeaders('application/json'),
        body: JSON.stringify(params),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // 3. List Workspace Documents
  public static async getDocuments(): Promise<BackendDocSummary[]> {
    try {
      const res = await fetch('/api/documents', {
        headers: this.getHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.documents || [];
    } catch {
      return [];
    }
  }

  // 4. Upload File to Backend
  public static async uploadFile(
    file: File,
    category?: string
  ): Promise<{ success: boolean; document?: any; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (category) {
        formData.append('category', category);
      }

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'X-Workspace-Id': this.getWorkspaceId(),
        },
        body: formData,
      });

      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // 5. Upload Sample Document
  public static async uploadSample(sampleKey: 'policy' | 'estimate' | 'incident' | 'adversarial'): Promise<{ success: boolean; document?: any; error?: string }> {
    const sample = SAMPLE_TEST_DOCUMENTS[sampleKey];
    if (!sample) return { success: false, error: 'Unknown sample key' };

    try {
      const res = await fetch('/api/documents/upload-text', {
        method: 'POST',
        headers: this.getHeaders('application/json'),
        body: JSON.stringify({
          filename: sample.filename,
          text: sample.content,
          category: sample.category,
        }),
      });

      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // 6. Delete Document
  public static async deleteDocument(docId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      const data = await res.json();
      return !!data.success;
    } catch {
      return false;
    }
  }

  // 7. Grounded Ask AI
  public static async askAI(
    question: string,
    documentIds?: string[],
    model?: string
  ): Promise<AskAIResponse> {
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: this.getHeaders('application/json'),
        body: JSON.stringify({
          question,
          documentIds,
          workspaceId: this.getWorkspaceId(),
          model,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          isOllamaOffline: data.isOllamaOffline,
          isModelMissing: data.isModelMissing,
          error: data.error || `HTTP ${res.status}: Failed to generate AI response`,
          citations: [],
          evidenceFound: false,
          retrievedEvidencePreview: data.retrievedEvidencePreview,
        };
      }

      return data;
    } catch (err: any) {
      return {
        success: false,
        error: `Could not reach InsureOS API service: ${err.message}. Ensure backend is running.`,
        citations: [],
        evidenceFound: false,
      };
    }
  }

  // 8. Extract Claim Facts Deterministically
  public static async extractClaimFacts(
    policyDocumentId?: string,
    evidenceDocumentIds?: string[]
  ): Promise<any> {
    try {
      const res = await fetch('/api/claims/extract-facts', {
        method: 'POST',
        headers: this.getHeaders('application/json'),
        body: JSON.stringify({
          policyDocumentId,
          evidenceDocumentIds,
          workspaceId: this.getWorkspaceId(),
        }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // 9. Inspect OCR Engine Status
  public static async getOcrEngineStatus(): Promise<{
    success: boolean;
    ocrEngine: string;
    minCharsPerPage: number;
    engines: {
      pymupdf: boolean;
      tesseract: boolean;
      paddleocr: boolean;
      activeEngine: string;
      pythonAvailable: boolean;
    };
    error?: string;
  }> {
    try {
      const res = await fetch('/api/documents/ocr/status', {
        headers: this.getHeaders(),
      });
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        ocrEngine: 'auto',
        minCharsPerPage: 40,
        engines: { pymupdf: false, tesseract: false, paddleocr: false, activeEngine: 'auto', pythonAvailable: false },
        error: err.message,
      };
    }
  }

  // 10. Update Active OCR Engine Configuration
  public static async setOcrConfig(params: {
    engine?: 'auto' | 'pymupdf' | 'tesseract' | 'paddleocr';
    minCharsPerPage?: number;
  }): Promise<{ success: boolean; message?: string; ocrEngine?: string; error?: string }> {
    try {
      const res = await fetch('/api/documents/ocr/config', {
        method: 'POST',
        headers: this.getHeaders('application/json'),
        body: JSON.stringify(params),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
