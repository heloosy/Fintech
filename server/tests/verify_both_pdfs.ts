import fs from 'fs';
import { parsePdfBuffer } from '../services/pdfExtractor';

console.log('--- Testing 01_sample_motor_policy.pdf ---');
const buf1 = fs.readFileSync('C:\\Users\\SYLVIA TOM\\Downloads\\01_sample_motor_policy.pdf');
const res1 = parsePdfBuffer(buf1);
console.log('Result 1 text length:', res1.text.length);
console.log('Result 1 word count:', res1.text.split(/\s+/).filter(Boolean).length);
console.log('Result 1 pages:', res1.numpages);
console.log('Result 1 preview:\n', res1.text.slice(0, 400));

console.log('\n--- Testing TW_NIA PDF ---');
const buf2 = fs.readFileSync('C:\\Users\\SYLVIA TOM\\Downloads\\TW_NIAPOLICYSCHEDULECIRTIFICATETW_82787388.pdf');
const res2 = parsePdfBuffer(buf2);
console.log('Result 2 text length:', res2.text.length);
console.log('Result 2 word count:', res2.text.split(/\s+/).filter(Boolean).length);
console.log('Result 2 pages:', res2.numpages);
console.log('Result 2 preview:\n', res2.text.slice(0, 400));
