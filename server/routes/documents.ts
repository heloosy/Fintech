import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { DocumentProcessor } from '../services/documentProcessor.js';
import { StorageService } from '../services/storage.js';
import { OcrBridgeService } from '../services/ocrBridge.js';
import { serverConfig, updateServerConfig } from '../config.js';

export const documentsRouter = Router();

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.docx',
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.png',
  '.jpg',
  '.jpeg',
  '.tiff',
  '.bmp',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max limit
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type '${ext}'. Supported formats: PDF, DOCX, TXT, MD, CSV, JSON, PNG, JPG.`));
    }
  },
});

// Helper to extract workspaceId
function getWorkspaceId(req: any): string {
  const header = req.headers['x-workspace-id'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  const query = req.query?.workspaceId;
  if (typeof query === 'string' && query.trim()) return query.trim();
  const body = req.body?.workspaceId;
  if (typeof body === 'string' && body.trim()) return body.trim();
  return 'DEFAULT-WORKSPACE';
}

// GET /api/documents/ocr/status - Inspect OCR engine availability
documentsRouter.get('/ocr/status', async (_req, res) => {
  try {
    const status = await OcrBridgeService.getOcrEngineStatus();
    return res.json({
      success: true,
      ocrEngine: serverConfig.ocrEngine,
      minCharsPerPage: serverConfig.minCharsPerPage,
      engines: status,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Failed to check OCR status: ${err.message}`,
    });
  }
});

// POST /api/documents/ocr/config - Switch active OCR engine
documentsRouter.post('/ocr/config', async (req, res) => {
  try {
    const { engine, minCharsPerPage } = req.body;
    if (engine && !['auto', 'pymupdf', 'tesseract', 'paddleocr'].includes(engine)) {
      return res.status(400).json({
        success: false,
        error: "Invalid OCR engine. Allowed: 'auto', 'pymupdf', 'tesseract', 'paddleocr'.",
      });
    }

    const updated = updateServerConfig({
      ocrEngine: engine,
      minCharsPerPage: typeof minCharsPerPage === 'number' ? minCharsPerPage : undefined,
    });

    const engineStatus = await OcrBridgeService.getOcrEngineStatus();

    return res.json({
      success: true,
      message: `OCR configuration updated to '${updated.ocrEngine}'.`,
      ocrEngine: updated.ocrEngine,
      minCharsPerPage: updated.minCharsPerPage,
      engines: engineStatus,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Failed to update OCR config: ${err.message}`,
    });
  }
});

// GET /api/documents - List all documents in workspace
documentsRouter.get('/', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const docs = await StorageService.getDocuments(workspaceId);

    // Return summaries for listing
    const summaries = docs.map(d => ({
      id: d.id,
      filename: d.filename,
      originalName: d.originalName,
      mimeType: d.mimeType,
      fileSizeFormatted: d.fileSizeFormatted,
      pageCount: d.pageCount,
      wordCount: d.wordCount,
      chunkCount: d.chunks ? d.chunks.length : 0,
      extractionMethod: d.extractionMethod,
      ocrStatus: d.ocrStatus,
      ocrEngineUsed: d.ocrEngineUsed || null,
      warningsCount: d.warnings ? d.warnings.length : 0,
      pages: d.pages || [],
      uploadDate: d.uploadDate,
      category: d.category,
      workspaceId: d.workspaceId,
      previewExcerpt: d.fullText.slice(0, 240),
    }));

    return res.json({
      success: true,
      workspaceId,
      documents: summaries,
      totalCount: summaries.length,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Failed to fetch documents: ${err.message}`,
    });
  }
});

// POST /api/documents/upload - Multipart file upload
documentsRouter.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file was provided in the upload request.',
      });
    }

    const workspaceId = getWorkspaceId(req);
    const processed = await DocumentProcessor.processBuffer(
      file.buffer,
      file.originalname,
      file.mimetype,
      workspaceId
    );

    // Override category if provided in form data
    if (req.body.category) {
      processed.category = req.body.category;
    }

    await StorageService.saveDocument(processed);

    return res.json({
      success: true,
      message: `Successfully processed and indexed ${file.originalname}`,
      document: {
        id: processed.id,
        filename: processed.filename,
        category: processed.category,
        pageCount: processed.pageCount,
        wordCount: processed.wordCount,
        chunkCount: processed.chunks.length,
        fileSizeFormatted: processed.fileSizeFormatted,
        ocrStatus: processed.ocrStatus,
        extractionMethod: processed.extractionMethod,
        ocrEngineUsed: processed.ocrEngineUsed || null,
        pages: processed.pages || [],
        warnings: processed.warnings || [],
        uploadDate: processed.uploadDate,
        previewExcerpt: processed.fullText.slice(0, 300),
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Document processing failed: ${err.message}`,
    });
  }
});

// POST /api/documents/upload-text - Direct text or sample payload upload
documentsRouter.post('/upload-text', async (req, res) => {
  try {
    const { filename, text, category, mimeType = 'text/plain' } = req.body;
    if (!filename || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Filename and text are required.',
      });
    }

    const workspaceId = getWorkspaceId(req);
    const buffer = Buffer.from(text, 'utf8');
    const processed = await DocumentProcessor.processBuffer(
      buffer,
      filename,
      mimeType,
      workspaceId
    );

    if (category) {
      processed.category = category;
    }

    await StorageService.saveDocument(processed);

    return res.json({
      success: true,
      message: `Successfully indexed ${filename}`,
      document: {
        id: processed.id,
        filename: processed.filename,
        category: processed.category,
        pageCount: processed.pageCount,
        wordCount: processed.wordCount,
        chunkCount: processed.chunks.length,
        fileSizeFormatted: processed.fileSizeFormatted,
        ocrStatus: processed.ocrStatus,
        extractionMethod: processed.extractionMethod,
        pages: processed.pages || [],
        warnings: processed.warnings || [],
        uploadDate: processed.uploadDate,
        previewExcerpt: processed.fullText.slice(0, 300),
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Failed to index document: ${err.message}`,
    });
  }
});

// GET /api/documents/:id - Get full document with chunks and page breakdown
documentsRouter.get('/:id', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const doc = await StorageService.getDocument(workspaceId, req.params.id);

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: `Document '${req.params.id}' not found in workspace '${workspaceId}'.`,
      });
    }

    return res.json({
      success: true,
      document: doc,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Failed to retrieve document: ${err.message}`,
    });
  }
});

// DELETE /api/documents/:id - Delete document
documentsRouter.delete('/:id', async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const success = await StorageService.deleteDocument(workspaceId, req.params.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: `Document '${req.params.id}' not found or unauthorized.`,
      });
    }

    return res.json({
      success: true,
      message: `Document '${req.params.id}' removed from workspace storage.`,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Failed to delete document: ${err.message}`,
    });
  }
});
