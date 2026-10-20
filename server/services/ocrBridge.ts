import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { serverConfig } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PageExtractionResult {
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

export interface PythonExtractorResponse {
  success: boolean;
  pageCount: number;
  totalWords: number;
  fullText: string;
  overallMethod: string;
  overallStatus: 'Indexed' | 'OCR Verified' | 'Unsupported Format' | 'Needs Review' | 'Empty Extraction';
  pages: PageExtractionResult[];
  warnings: string[];
  ocrAvailability: {
    pymupdf: boolean;
    tesseract: boolean;
    paddleocr: boolean;
  };
  error?: string;
}

export class OcrBridgeService {
  private static scriptPath = path.resolve(__dirname, '..', 'python', 'document_extractor.py');

  /**
   * Check status of available OCR engines in Python
   */
  public static async getOcrEngineStatus(): Promise<{
    pymupdf: boolean;
    tesseract: boolean;
    paddleocr: boolean;
    activeEngine: string;
    pythonAvailable: boolean;
  }> {
    const defaultRes = {
      pymupdf: false,
      tesseract: false,
      paddleocr: false,
      activeEngine: serverConfig.ocrEngine,
      pythonAvailable: false,
    };

    if (!fs.existsSync(this.scriptPath)) {
      return defaultRes;
    }

    return new Promise(resolve => {
      execFile('python', [this.scriptPath, '--status-only', '--input', 'status'], { timeout: 8000 }, (err, stdout) => {
        if (err || !stdout) {
          resolve(defaultRes);
          return;
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve({
            pymupdf: Boolean(parsed.pymupdf),
            tesseract: Boolean(parsed.tesseract),
            paddleocr: Boolean(parsed.paddleocr),
            activeEngine: serverConfig.ocrEngine,
            pythonAvailable: true,
          });
        } catch {
          resolve(defaultRes);
        }
      });
    });
  }

  /**
   * Process a document with the Python PyMuPDF + Selective OCR pipeline
   */
  public static async extractDocument(
    filePath: string,
    ocrEngine: string = serverConfig.ocrEngine,
    minChars: number = serverConfig.minCharsPerPage
  ): Promise<PythonExtractorResponse> {
    return new Promise(resolve => {
      if (!fs.existsSync(this.scriptPath)) {
        resolve({
          success: false,
          pageCount: 0,
          totalWords: 0,
          fullText: '',
          overallMethod: 'failed',
          overallStatus: 'Needs Review',
          pages: [],
          warnings: ['Python OCR bridge script not found.'],
          ocrAvailability: { pymupdf: false, tesseract: false, paddleocr: false },
          error: 'Script not found',
        });
        return;
      }

      const args = [
        this.scriptPath,
        '--input',
        filePath,
        '--engine',
        ocrEngine,
        '--min-chars',
        String(minChars),
      ];

      execFile('python', args, { timeout: 35000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          console.warn(`[OcrBridge] Python execution error:`, err.message, stderr);
          resolve({
            success: false,
            pageCount: 0,
            totalWords: 0,
            fullText: '',
            overallMethod: 'failed',
            overallStatus: 'Needs Review',
            pages: [],
            warnings: [`Python execution error: ${err.message}`],
            ocrAvailability: { pymupdf: false, tesseract: false, paddleocr: false },
            error: err.message,
          });
          return;
        }

        try {
          const data = JSON.parse(stdout.trim());
          resolve(data as PythonExtractorResponse);
        } catch (jsonErr: any) {
          console.warn(`[OcrBridge] Failed to parse JSON from Python script:`, jsonErr.message);
          resolve({
            success: false,
            pageCount: 0,
            totalWords: 0,
            fullText: '',
            overallMethod: 'failed',
            overallStatus: 'Needs Review',
            pages: [],
            warnings: ['Failed to parse JSON output from Python extractor.'],
            ocrAvailability: { pymupdf: false, tesseract: false, paddleocr: false },
            error: jsonErr.message,
          });
        }
      });
    });
  }
}
