import fs from 'fs';
import zlib from 'zlib';

const filePath = 'C:\\Users\\SYLVIA TOM\\Downloads\\TW_NIAPOLICYSCHEDULECIRTIFICATETW_82787388.pdf';
const buf = fs.readFileSync(filePath);
const raw = buf.toString('latin1');

// Count streams
const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
let m: RegExpExecArray | null;
let streamIdx = 0;
while ((m = streamRegex.exec(raw)) !== null) {
  streamIdx++;
  const streamData = m[1];
  const sBuf = Buffer.from(streamData, 'latin1');
  try {
    const inflated = zlib.inflateSync(sBuf).toString('latin1');
    if (inflated.includes('BT') || inflated.includes('Tj') || inflated.includes('TJ')) {
      console.log(`Stream ${streamIdx} has text! Length:`, inflated.length);
      console.log('Sample:', inflated.slice(0, 300));
    }
  } catch (e) {
    // not flate
  }
}
