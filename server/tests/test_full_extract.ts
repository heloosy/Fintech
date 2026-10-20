import fs from 'fs';
import zlib from 'zlib';

function decodeAscii85(str: string): Buffer {
  const clean = str.replace(/\s+/g, '').replace(/~>.*$/, '');
  const out: number[] = [];
  let i = 0;
  while (i < clean.length) {
    if (clean[i] === 'z') {
      out.push(0, 0, 0, 0);
      i++;
      continue;
    }
    let count = 0;
    let val = 0;
    for (let j = 0; j < 5; j++) {
      if (i + j < clean.length) {
        val = val * 85 + (clean.charCodeAt(i + j) - 33);
        count++;
      } else {
        val = val * 85 + 84;
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

function decodePdfString(raw: string): string {
  let s = raw.replace(/\\([0-7]{1,3})/g, (_, oct) => {
    return String.fromCharCode(parseInt(oct, 8));
  });
  s = s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
  return s;
}

function extractTextFromStream(content: string): string {
  let text = '';
  const len = content.length;
  let i = 0;

  while (i < len) {
    const ch = content[i];

    if (ch === '(') {
      let depth = 1;
      i++;
      let str = '';
      while (i < len && depth > 0) {
        if (content[i] === '\\') {
          str += content[i];
          i++;
          if (i < len) {
            str += content[i];
            i++;
          }
          continue;
        }
        if (content[i] === '(') {
          depth++;
        } else if (content[i] === ')') {
          depth--;
          if (depth === 0) {
            break;
          }
        }
        str += content[i];
        i++;
      }
      i++;

      const decoded = decodePdfString(str);
      if (decoded.trim()) {
        text += decoded + ' ';
      }
      continue;
    }

    if (ch === '<' && content[i + 1] !== '<') {
      let j = i + 1;
      while (j < len && content[j] !== '>') {
        j++;
      }
      const hexStr = content.slice(i + 1, j).replace(/\s+/g, '');
      i = j + 1;
      let dec = '';
      for (let k = 0; k < hexStr.length; k += 2) {
        const byte = parseInt(hexStr.substr(k, 2), 16);
        if (byte >= 32 && byte <= 126) dec += String.fromCharCode(byte);
      }
      if (dec.trim()) {
        text += dec + ' ';
      }
      continue;
    }

    if (content.startsWith('T*', i) || content.startsWith('ET', i)) {
      text += '\n';
      i += 2;
      continue;
    }

    i++;
  }
  return text;
}

const filePath = 'C:\\Users\\SYLVIA TOM\\Downloads\\TW_NIAPOLICYSCHEDULECIRTIFICATETW_82787388.pdf';
const buf = fs.readFileSync(filePath);
const raw = buf.toString('latin1');

const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
let match: RegExpExecArray | null;
let allText = '';

while ((match = streamRegex.exec(raw)) !== null) {
  const streamData = match[1];
  let currentBuffer = Buffer.from(streamData, 'latin1');
  
  let decompressed = '';
  try {
    decompressed = zlib.inflateSync(currentBuffer).toString('latin1');
  } catch {
    try {
      decompressed = zlib.inflateRawSync(currentBuffer).toString('latin1');
    } catch {
      try {
        const a85 = decodeAscii85(streamData);
        try {
          decompressed = zlib.inflateSync(a85).toString('latin1');
        } catch {
          decompressed = zlib.inflateRawSync(a85).toString('latin1');
        }
      } catch {
        decompressed = streamData;
      }
    }
  }
  
  if (decompressed.includes('BT') || decompressed.includes('Tj')) {
    const extracted = extractTextFromStream(decompressed);
    allText += extracted + '\n';
  }
}

console.log('================ EXTRACTED TW_NIA ================');
console.log('Total characters:', allText.length);
console.log('Word count:', allText.split(/\s+/).filter(Boolean).length);
console.log('--- CONTENT PREVIEW ---');
console.log(allText.slice(0, 1500));
