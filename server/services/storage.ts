import fs from 'fs';
import path from 'path';
import { serverConfig } from '../config.js';
import type { ProcessedDocument, DocumentChunk } from './documentProcessor.js';

export class StorageService {
  private static getWorkspaceDir(workspaceId: string): string {
    // Sanitize workspaceId to prevent directory traversal
    const safeWorkspace = workspaceId.replace(/[^a-zA-Z0-9_-]/g, '_') || 'DEFAULT-WORKSPACE';
    const dir = path.join(serverConfig.storageDir, 'workspaces', safeWorkspace);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private static getDocPath(workspaceId: string, docId: string): string {
    const safeDocId = docId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.getWorkspaceDir(workspaceId), `${safeDocId}.json`);
  }

  public static async saveDocument(doc: ProcessedDocument): Promise<void> {
    const filePath = this.getDocPath(doc.workspaceId, doc.id);
    await fs.promises.writeFile(filePath, JSON.stringify(doc, null, 2), 'utf8');
  }

  public static async getDocuments(workspaceId: string): Promise<ProcessedDocument[]> {
    const dir = this.getWorkspaceDir(workspaceId);
    try {
      const files = await fs.promises.readdir(dir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      const docs: ProcessedDocument[] = [];
      for (const file of jsonFiles) {
        try {
          const content = await fs.promises.readFile(path.join(dir, file), 'utf8');
          const doc = JSON.parse(content) as ProcessedDocument;
          // Verify workspace isolation
          if (doc.workspaceId === workspaceId) {
            docs.push(doc);
          }
        } catch (err) {
          console.warn(`[StorageService] Failed to read ${file}:`, err);
        }
      }

      // Sort newest first
      return docs.sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
    } catch {
      return [];
    }
  }

  public static async getDocument(workspaceId: string, docId: string): Promise<ProcessedDocument | null> {
    const filePath = this.getDocPath(workspaceId, docId);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const doc = JSON.parse(content) as ProcessedDocument;
      if (doc.workspaceId !== workspaceId) {
        // Enforce strict workspace isolation
        return null;
      }
      return doc;
    } catch {
      return null;
    }
  }

  public static async deleteDocument(workspaceId: string, docId: string): Promise<boolean> {
    const filePath = this.getDocPath(workspaceId, docId);
    if (!fs.existsSync(filePath)) {
      return false;
    }

    try {
      // First verify ownership
      const content = await fs.promises.readFile(filePath, 'utf8');
      const doc = JSON.parse(content) as ProcessedDocument;
      if (doc.workspaceId !== workspaceId) {
        return false;
      }

      await fs.promises.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  public static async getAllChunks(
    workspaceId: string,
    filterDocIds?: string[]
  ): Promise<DocumentChunk[]> {
    const docs = await this.getDocuments(workspaceId);
    const targetDocs = filterDocIds && filterDocIds.length > 0
      ? docs.filter(d => filterDocIds.includes(d.id))
      : docs;

    const allChunks: DocumentChunk[] = [];
    for (const d of targetDocs) {
      if (Array.isArray(d.chunks)) {
        allChunks.push(...d.chunks);
      }
    }
    return allChunks;
  }
}
