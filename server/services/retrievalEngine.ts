import type { DocumentChunk } from './documentProcessor.js';
import { DocumentProcessor } from './documentProcessor.js';
import { OllamaClient } from './ollamaClient.js';

export interface RetrievedPassage {
  id: string;
  documentId: string;
  filename: string;
  page: number;
  chunkIndex: number;
  score: number;
  text: string;
  matchedTerms: string[];
  extractionMethod?: string;
  ocrEngineUsed?: string | null;
}

export class RetrievalEngine {
  public static async retrievePassages(
    query: string,
    chunks: DocumentChunk[],
    topK: number = 4
  ): Promise<RetrievedPassage[]> {
    if (!chunks || chunks.length === 0 || !query || query.trim().length === 0) {
      return [];
    }

    const queryTokens = DocumentProcessor.tokenize(query);
    const lowerQuery = query.toLowerCase().trim();

    // Calculate document frequency for BM25-like inverse document frequency (IDF)
    const dfMap = new Map<string, number>();
    chunks.forEach(chunk => {
      const uniqueTokens = new Set(chunk.tokens);
      uniqueTokens.forEach(t => {
        dfMap.set(t, (dfMap.get(t) || 0) + 1);
      });
    });

    const totalDocs = chunks.length;

    // Optional: Attempt local embeddings from Ollama if available
    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await OllamaClient.generateEmbedding(query);
    } catch {
      queryEmbedding = null;
    }

    const scoredChunks: Array<{ chunk: DocumentChunk; score: number; matchedTerms: string[] }> = [];

    for (const chunk of chunks) {
      let bm25Score = 0;
      const matchedTerms: string[] = [];
      const lowerChunkText = chunk.text.toLowerCase();

      // Keyword & BM25 Scoring
      const chunkTokenCounts = new Map<string, number>();
      chunk.tokens.forEach(t => {
        chunkTokenCounts.set(t, (chunkTokenCounts.get(t) || 0) + 1);
      });

      for (const token of queryTokens) {
        const tf = chunkTokenCounts.get(token) || 0;
        if (tf > 0) {
          matchedTerms.push(token);
          const df = dfMap.get(token) || 1;
          const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1);
          // Standard BM25 term saturation
          const k1 = 1.5;
          const b = 0.75;
          const avgDocLength = 100;
          const docLength = chunk.tokens.length;
          const termScore = idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLength / avgDocLength))));
          bm25Score += termScore;
        }
      }

      // Exact phrase match bonus
      if (lowerQuery.length > 5 && lowerChunkText.includes(lowerQuery)) {
        bm25Score += 8.0;
      } else {
        // Multi-word phrase parts (e.g. "collision deductible", "itemized estimate")
        const phrases = lowerQuery.split(/[?,!.;]/).map(s => s.trim()).filter(s => s.length > 8);
        for (const phrase of phrases) {
          if (lowerChunkText.includes(phrase)) {
            bm25Score += 4.0;
          }
        }
      }

      // Keyword boost for high-value insurance terms
      const highValueTerms = ['deductible', 'limit', 'coverage', 'estimate', 'exclusion', 'comprehensive', 'collision'];
      for (const hvt of highValueTerms) {
        if (queryTokens.includes(hvt) && chunkTokenCounts.has(hvt)) {
          bm25Score += 2.0;
        }
      }

      // Document name & entity match boost (e.g. if query mentions 'Apex', 'Police', 'Policy', 'Aegis', 'St. Jude')
      const cleanFilename = chunk.filename.toLowerCase().replace(/[^a-z0-9]/g, ' ');
      for (const token of queryTokens) {
        if (token.length >= 4 && cleanFilename.includes(token)) {
          bm25Score += 4.5;
        }
      }

      // If we have query embeddings, calculate cosine similarity
      let vectorScore = 0;
      if (queryEmbedding) {
        // Simple embedding comparison placeholder if chunk has pre-computed vector
        vectorScore = 0;
      }

      const totalScore = bm25Score + vectorScore;

      if (totalScore > 0.05) {
        scoredChunks.push({
          chunk,
          score: totalScore,
          matchedTerms: Array.from(new Set(matchedTerms)),
        });
      }
    }

    // Sort by descending score
    scoredChunks.sort((a, b) => b.score - a.score);

    // Return top K passages
    return scoredChunks.slice(0, topK).map(item => ({
      id: item.chunk.id,
      documentId: item.chunk.documentId,
      filename: item.chunk.filename,
      page: item.chunk.page,
      chunkIndex: item.chunk.chunkIndex,
      score: Number(item.score.toFixed(3)),
      text: item.chunk.text,
      matchedTerms: item.matchedTerms,
      extractionMethod: item.chunk.extractionMethod || 'native',
      ocrEngineUsed: item.chunk.ocrEngineUsed || null,
    }));
  }
}
