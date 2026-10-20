import fs from 'fs';
import { parsePdfBuffer } from '../services/pdfExtractor';

const filePath = 'C:\\Users\\SYLVIA TOM\\Downloads\\TW_NIAPOLICYSCHEDULECIRTIFICATETW_82787388.pdf';
const buf = fs.readFileSync(filePath);
const res = parsePdfBuffer(buf);
console.log('TW_NIA Text Length:', res.text.length);
console.log('TW_NIA Word Count:', res.text.split(/\s+/).filter(Boolean).length);
console.log('Sample:', res.text.slice(0, 500));
