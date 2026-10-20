import fs from 'fs';
import { DocumentProcessor } from '../services/documentProcessor';
import { StorageService } from '../services/storage';

async function fixWorkspaceDocs() {
  const filePath = 'C:\\Users\\SYLVIA TOM\\Downloads\\01_sample_motor_policy.pdf';
  if (fs.existsSync(filePath)) {
    const buf = fs.readFileSync(filePath);
    console.log('Processing 01_sample_motor_policy.pdf...');
    const processed = await DocumentProcessor.processBuffer(
      buf,
      '01_sample_motor_policy.pdf',
      'application/pdf',
      'LOCAL-WORKSPACE',
      'doc-1792503800532-3oek0'
    );
    await StorageService.saveDocument(processed);
    console.log('Saved corrected doc-1792503800532-3oek0:');
    console.log('Words:', processed.wordCount);
    console.log('Chunks:', processed.chunks.length);
    console.log('Excerpt:', processed.fullText.slice(0, 200));

    // Also remove the old duplicate doc-1792503705223-wkixb
    await StorageService.deleteDocument('LOCAL-WORKSPACE', 'doc-1792503705223-wkixb');
    console.log('Cleaned up old duplicate.');
  }
}

fixWorkspaceDocs().catch(console.error);
