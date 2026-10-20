import { parsePdfBuffer } from './pdfExtractor.js';
import { OcrBridgeService, PageExtractionResult } from './ocrBridge.js';
import { serverConfig } from '../config.js';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

export interface DocumentChunk {
  id: string;
  documentId: string;
  filename: string;
  page: number;
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
  tokens: string[];
  extractionMethod?: string;
  ocrEngineUsed?: string | null;
  status?: string;
}

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

export interface ProcessedDocument {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  pageCount: number;
  wordCount: number;
  chunks: DocumentChunk[];
  pages?: DocumentPageSummary[];
  fullText: string;
  extractionMethod: string;
  ocrStatus: 'Indexed' | 'OCR Verified' | 'Unsupported Format' | 'Needs Review' | 'Empty Extraction';
  ocrEngineUsed?: string | null;
  warnings?: string[];
  uploadDate: string;
  workspaceId: string;
  category: 'Policy Contract' | 'Claim Evidence' | 'Submission Receipt' | 'Estimate' | 'Medical' | 'General';
}

export class DocumentProcessor {
  private static tempDir = path.resolve(serverConfig.storageDir, 'temp');

  private static ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  public static async processBuffer(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    workspaceId: string = 'DEFAULT-WORKSPACE',
    documentId?: string
  ): Promise<ProcessedDocument> {
    const docId = documentId || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const lowerName = filename.toLowerCase();
    this.ensureTempDir();

    let fullText = '';
    let pageCount = 1;
    let extractionMethod = 'text';
    let ocrStatus: ProcessedDocument['ocrStatus'] = 'Indexed';
    let ocrEngineUsed: string | null = null;
    let pagesSummary: DocumentPageSummary[] = [];
    const warnings: string[] = [];

    // 1. PDF Documents: Primary = PyMuPDF native extraction + Selective per-page OCR
    if (lowerName.endsWith('.pdf') || mimeType === 'application/pdf') {
      const tempPath = path.join(this.tempDir, `${docId}.pdf`);
      try {
        fs.writeFileSync(tempPath, buffer);
        const pyResult = await OcrBridgeService.extractDocument(
          tempPath,
          serverConfig.ocrEngine,
          serverConfig.minCharsPerPage
        );

        if (pyResult.success && pyResult.pageCount > 0) {
          fullText = pyResult.fullText;
          pageCount = pyResult.pageCount;
          extractionMethod = pyResult.overallMethod;
          ocrStatus = pyResult.overallStatus;
          pagesSummary = pyResult.pages;
          if (pyResult.warnings && pyResult.warnings.length > 0) {
            warnings.push(...pyResult.warnings);
          }
          // Check if any page used OCR
          const ocrPage = pyResult.pages.find(p => p.ocrEngineUsed);
          if (ocrPage) {
            ocrEngineUsed = ocrPage.ocrEngineUsed;
          }
        } else {
          // Fallback to pure-JS stream parser if Python returned failure
          warnings.push(pyResult.error || 'PyMuPDF execution unavailable; using JS native stream parser.');
          const parsed = parsePdfBuffer(buffer);
          fullText = parsed.text;
          pageCount = parsed.numpages;
          extractionMethod = 'pdf-stream-native';
          ocrStatus = fullText.length > 30 ? 'Indexed' : 'Needs Review';
          pagesSummary = [
            {
              pageNumber: 1,
              text: fullText,
              characterCount: fullText.length,
              wordCount: fullText.split(/\s+/).filter(Boolean).length,
              extractionMethod: 'pdf-stream-native',
              ocrEngineUsed: null,
              status: fullText.length > 30 ? 'clean' : 'incomplete',
              insufficientText: fullText.length <= 30,
              warning: fullText.length <= 30 ? 'Insufficient text extracted from PDF stream' : null,
            },
          ];
        }
      } catch (err: any) {
        console.warn(`[DocumentProcessor] PDF processing error:`, err.message);
        warnings.push(`PDF parse error: ${err.message}`);
        const parsed = parsePdfBuffer(buffer);
        fullText = parsed.text;
        pageCount = parsed.numpages;
        extractionMethod = 'pdf-fallback';
        ocrStatus = fullText.length > 20 ? 'Indexed' : 'Needs Review';
      } finally {
        if (fs.existsSync(tempPath)) {
          try {
            fs.unlinkSync(tempPath);
          } catch {
            // ignore
          }
        }
      }
    }
    // 2. Image Files (PNG, JPG, JPEG, TIFF): Process with OCR
    else if (
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.tiff') ||
      mimeType.startsWith('image/')
    ) {
      const ext = path.extname(filename) || '.png';
      const tempPath = path.join(this.tempDir, `${docId}${ext}`);
      try {
        fs.writeFileSync(tempPath, buffer);
        const imgResult = await OcrBridgeService.extractDocument(tempPath, serverConfig.ocrEngine);

        if (imgResult.success && imgResult.totalWords > 0) {
          fullText = imgResult.fullText;
          pageCount = 1;
          extractionMethod = imgResult.overallMethod;
          ocrStatus = imgResult.overallStatus;
          pagesSummary = imgResult.pages;
        } else {
          fullText = `[Scanned visual evidence: ${filename} - Size: ${this.formatFileSize(buffer.length)}]. No embedded text layer detected.`;
          pageCount = 1;
          extractionMethod = 'unsupported';
          ocrStatus = 'Needs Review';
          warnings.push(`Image OCR (${serverConfig.ocrEngine}) yielded no readable text or engine binary is not installed.`);
          pagesSummary = [
            {
              pageNumber: 1,
              text: fullText,
              characterCount: fullText.length,
              wordCount: 9,
              extractionMethod: 'unsupported',
              ocrEngineUsed: null,
              status: 'incomplete',
              insufficientText: true,
              warning: 'No text extracted from image',
            },
          ];
        }
      } catch (err: any) {
        fullText = `[Image evidence: ${filename}].`;
        extractionMethod = 'unsupported';
        ocrStatus = 'Needs Review';
        warnings.push(`Image processing error: ${err.message}`);
      } finally {
        if (fs.existsSync(tempPath)) {
          try {
            fs.unlinkSync(tempPath);
          } catch {
            // ignore
          }
        }
      }
    }
    // 3. DOCX Documents
    else if (
      lowerName.endsWith('.docx') ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        fullText = result.value.trim();
        extractionMethod = 'docx';
        pageCount = Math.max(1, Math.ceil(fullText.length / 2500));
        ocrStatus = 'Indexed';
        pagesSummary = [
          {
            pageNumber: 1,
            text: fullText,
            characterCount: fullText.length,
            wordCount: fullText.split(/\s+/).filter(Boolean).length,
            extractionMethod: 'docx',
            ocrEngineUsed: null,
            status: 'clean',
            insufficientText: false,
            warning: null,
          },
        ];
      } catch (err: any) {
        fullText = this.fallbackExtractAscii(buffer);
        extractionMethod = 'unsupported';
        ocrStatus = 'Needs Review';
        warnings.push(`DOCX parse error: ${err.message}`);
      }
    }
    // 4. Plain Text, Markdown, CSV, JSON
    else {
      fullText = buffer.toString('utf8').trim();
      extractionMethod = 'text';
      ocrStatus = fullText.length > 0 ? 'Indexed' : 'Empty Extraction';
      pageCount = Math.max(1, Math.ceil(fullText.length / 2500));
      pagesSummary = [
        {
          pageNumber: 1,
          text: fullText,
          characterCount: fullText.length,
          wordCount: fullText.split(/\s+/).filter(Boolean).length,
          extractionMethod: 'text',
          ocrEngineUsed: null,
          status: fullText.length > 0 ? 'clean' : 'empty',
          insufficientText: fullText.length === 0,
          warning: null,
        },
      ];
    }

    const wordCount = fullText.split(/\s+/).filter(Boolean).length;
    const category = this.inferCategory(filename, fullText);

    // Build chunks with page and method provenance
    const chunks = this.createChunks(docId, filename, fullText, pagesSummary);

    return {
      id: docId,
      filename,
      originalName: filename,
      mimeType,
      fileSizeBytes: buffer.length,
      fileSizeFormatted: this.formatFileSize(buffer.length),
      pageCount,
      wordCount,
      chunks,
      pages: pagesSummary,
      fullText,
      extractionMethod,
      ocrStatus,
      ocrEngineUsed,
      warnings,
      uploadDate: new Date().toISOString().split('T')[0],
      workspaceId,
      category,
    };
  }

  private static fallbackExtractAscii(buffer: Buffer): string {
    const raw = buffer.toString('latin1');
    const strings = raw.match(/[\x20-\x7E\r\n]{5,}/g);
    if (!strings) return '';
    return strings
      .map(s => s.trim())
      .filter(s => s.length > 10 && !s.startsWith('/Filter') && !s.startsWith('/Length'))
      .join('\n');
  }

  private static inferCategory(filename: string, text: string): ProcessedDocument['category'] {
    const combined = `${filename} ${text}`.toLowerCase();
    if (combined.includes('policy') || combined.includes('coverage') || combined.includes('deductible')) {
      return 'Policy Contract';
    }
    if (
      combined.includes('estimate') ||
      combined.includes('invoice') ||
      combined.includes('repair') ||
      combined.includes('body shop')
    ) {
      return 'Estimate';
    }
    if (
      combined.includes('police') ||
      combined.includes('blotter') ||
      combined.includes('collision') ||
      combined.includes('incident')
    ) {
      return 'Claim Evidence';
    }
    if (combined.includes('medical') || combined.includes('discharge') || combined.includes('physician')) {
      return 'Medical';
    }
    if (combined.includes('receipt') || combined.includes('transmission')) {
      return 'Submission Receipt';
    }
    return 'General';
  }

  private static createChunks(
    documentId: string,
    filename: string,
    fullText: string,
    pages: DocumentPageSummary[]
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const targetChunkSize = 1500;
    const overlapSize = 300;

    if (!fullText || fullText.trim().length === 0) {
      return chunks;
    }

    if (pages && pages.length > 0) {
      let globalChunkIdx = 0;
      pages.forEach(p => {
        // If the page content is under 2500 characters (standard policy/estimate page),
        // keep the entire page intact as a single cohesive chunk so tables & itemized lines are not split!
        if (p.text.length <= 2500) {
          chunks.push({
            id: `${documentId}-p${p.pageNumber}-c${globalChunkIdx++}`,
            documentId,
            filename,
            page: p.pageNumber,
            chunkIndex: globalChunkIdx,
            startOffset: 0,
            endOffset: p.text.length,
            text: p.text,
            tokens: this.tokenize(p.text),
            extractionMethod: p.extractionMethod,
            ocrEngineUsed: p.ocrEngineUsed,
            status: p.status,
          });
        } else {
          const pageChunks = this.splitTextIntoChunks(p.text, targetChunkSize, overlapSize);
          pageChunks.forEach(pc => {
            chunks.push({
              id: `${documentId}-p${p.pageNumber}-c${globalChunkIdx++}`,
              documentId,
              filename,
              page: p.pageNumber,
              chunkIndex: globalChunkIdx,
              startOffset: pc.startOffset,
              endOffset: pc.endOffset,
              text: pc.text,
              tokens: this.tokenize(pc.text),
              extractionMethod: p.extractionMethod,
              ocrEngineUsed: p.ocrEngineUsed,
              status: p.status,
            });
          });
        }
      });
      return chunks;
    }

    const textChunks = this.splitTextIntoChunks(fullText, targetChunkSize, overlapSize);
    textChunks.forEach((tc, idx) => {
      chunks.push({
        id: `${documentId}-c${idx}`,
        documentId,
        filename,
        page: 1,
        chunkIndex: idx,
        startOffset: tc.startOffset,
        endOffset: tc.endOffset,
        text: tc.text,
        tokens: this.tokenize(tc.text),
      });
    });

    return chunks;
  }

  private static splitTextIntoChunks(
    text: string,
    maxSize: number,
    overlap: number
  ): Array<{ text: string; startOffset: number; endOffset: number }> {
    const result: Array<{ text: string; startOffset: number; endOffset: number }> = [];
    if (!text || text.length === 0) return result;

    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + maxSize, text.length);

      if (end < text.length) {
        const paragraphBreak = text.lastIndexOf('\n\n', end);
        if (paragraphBreak > start + 300) {
          end = paragraphBreak + 2;
        } else {
          const sentenceBreak = text.lastIndexOf('. ', end);
          if (sentenceBreak > start + 300) {
            end = sentenceBreak + 2;
          }
        }
      }

      const chunkText = text.slice(start, end).trim();
      if (chunkText.length > 0) {
        result.push({
          text: chunkText,
          startOffset: start,
          endOffset: end,
        });
      }

      if (end >= text.length) break;
      start = Math.max(start + 1, end - overlap);
    }

    return result;
  }

  public static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s$]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1);
  }

  private static formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  }
}
