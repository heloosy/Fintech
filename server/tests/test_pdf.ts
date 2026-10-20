import fs from 'fs';
import zlib from 'zlib';

function decodeAscii85(str: string): Buffer {
  // Strip whitespace and EOD marker ~>
  const clean = str.replace(/\s+/g, '').replace(/~>.*$/, '');
  const out: number[] = [];
  let i = 0;
  while (i < clean.length) {
    if (clean[i] === 'z') {
      out.push(0, 0, 0, 0);
      i++;
      continue;
    }
    // Take up to 5 chars
    let count = 0;
    let val = 0;
    for (let j = 0; j < 5; j++) {
      if (i + j < clean.length) {
        val = val * 85 + (clean.charCodeAt(i + j) - 33);
        count++;
      } else {
        val = val * 85 + 84; // pad with 'u' (117-33 = 84)
      }
    }
    const b0 = (val >>> 24) & 0xff;
    const b1 = (val >>> 16) & 0xff;
    const b2 = (val >>> 8) & 0xff;
    const b3 = val & 0xff;
    if (count >= 2) out.push(b0);
    if (count >= 3) out.push(b1);
    if (count >= 4) out.push(b2);
    if (count >= 5) out.push(b3);
    i += count;
  }
  return Buffer.from(out);
}

const filePath = 'C:\\Users\\SYLVIA TOM\\Downloads\\01_sample_motor_policy.pdf';
const buf = fs.readFileSync(filePath);
const raw = buf.toString('latin1');

// Look at object 8
const obj8Start = raw.indexOf('8 0 obj');
const obj8End = raw.indexOf('endobj', obj8Start);
const obj8 = raw.slice(obj8Start, obj8End);
console.log('Object 8 header:', obj8.slice(0, 100));

const streamStart = obj8.indexOf('stream');
let dataStart = streamStart + 6;
if (obj8[dataStart] === '\r') dataStart++;
if (obj8[dataStart] === '\n') dataStart++;
const streamEnd = obj8.lastIndexOf('endstream');
const streamSlice = obj8.slice(dataStart, streamEnd).trim();

console.log('Stream length:', streamSlice.length);
console.log('Stream starts with:', streamSlice.slice(0, 50));
console.log('Stream ends with:', streamSlice.slice(-50));

const ascii85Decoded = decodeAscii85(streamSlice);
console.log('ASCII85 Decoded length:', ascii85Decoded.length);

try {
  const inflated = zlib.inflateSync(ascii85Decoded);
  console.log('SUCCESS! Inflated length:', inflated.length);
  console.log('--- INFLATED TEXT PREVIEW ---');
  console.log(inflated.toString('latin1').slice(0, 1000));
} catch (e: any) {
  console.log('Inflate error:', e.message);
  try {
    const inflatedRaw = zlib.inflateRawSync(ascii85Decoded);
    console.log('SUCCESS with raw inflate! Length:', inflatedRaw.length);
    console.log(inflatedRaw.toString('latin1').slice(0, 1000));
  } catch (e2: any) {
    console.log('Raw inflate error:', e2.message);
  }
}
