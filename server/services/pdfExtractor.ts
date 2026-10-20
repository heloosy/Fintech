import zlib from 'zlib';

export interface PdfParseResult {
  text: string;
  numpages: number;
}

/**
 * Decodes Adobe ASCII85 encoded streams
 */
function decodeAscii85(str: string): Buffer {
  // Strip whitespace and Adobe ASCII85 EOD marker '~>'
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
        val = val * 85 + 84; // pad with 'u' (117 - 33 = 84)
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

/**
 * Decodes ASCIIHex encoded streams
 */
function decodeAsciiHex(str: string): Buffer {
  const clean = str.replace(/[^0-9a-fA-F]/g, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    const hex = clean.substr(i, 2);
    out.push(parseInt(hex.padEnd(2, '0'), 16));
  }
  return Buffer.from(out);
}

/**
 * Decodes PDF string escapes (octal \ooo, \n, \r, \t, etc.)
 */
function decodePdfString(raw: string): string {
  // 1. Octal escapes \000 to \377
  let s = raw.replace(/\\([0-7]{1,3})/g, (_, oct) => {
    return String.fromCharCode(parseInt(oct, 8));
  });
  // 2. Standard escapes
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

/**
 * Extracts visible text from decompressed PDF stream content
 * Supports:
 * - Literal strings in parentheses: (Sample Text) Tj / ' / "
 * - Array strings: [(Text) -20 (More)] TJ
 * - Hex strings: <48656c6c6f> Tj
 * - Line breaks on T*, Td, TD, ET
 */
function extractTextFromStream(content: string): string {
  let text = '';
  const len = content.length;
  let i = 0;

  while (i < len) {
    const ch = content[i];

    // 1. Parenthesized string literal: (...)
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
      i++; // skip closing ')'

      const decoded = decodePdfString(str);
      if (decoded.trim()) {
        text += decoded + ' ';
      }
      continue;
    }

    // 2. Hexadecimal string: <...> (ignoring dictionary markers << >>)
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

    // 3. Newline operators: T*, Td, TD, ET
    if (content.startsWith('T*', i) || content.startsWith('ET', i) || content.startsWith('TD', i)) {
      text += '\n';
      i += 2;
      continue;
    }

    i++;
  }
  return text;
}

/**
 * Decompresses a PDF stream buffer applying filters as needed
 */
function decompressStream(streamData: string, rawHeader: string): string {
  let currentBuffer = Buffer.from(streamData, 'latin1');
  const hasA85 = /ASCII85Decode|A85/i.test(rawHeader) || streamData.trim().endsWith('~>');
  const hasAHx = /ASCIIHexDecode|AHx/i.test(rawHeader);
  const hasFlate = /FlateDecode|Fl/i.test(rawHeader);

  // Handle ASCII85 decode if specified or detected
  if (hasA85) {
    try {
      currentBuffer = decodeAscii85(streamData);
    } catch {
      // ignore
    }
  } else if (hasAHx) {
    try {
      currentBuffer = decodeAsciiHex(streamData);
    } catch {
      // ignore
    }
  }

  // Handle Flate decode
  try {
    return zlib.inflateSync(currentBuffer).toString('latin1');
  } catch {
    try {
      return zlib.inflateRawSync(currentBuffer).toString('latin1');
    } catch {
      // If direct inflate failed and we didn't try ASCII85 yet, try ASCII85 -> Flate
      if (!hasA85 && streamData.includes('~>')) {
        try {
          const a85 = decodeAscii85(streamData);
          try {
            return zlib.inflateSync(a85).toString('latin1');
          } catch {
            return zlib.inflateRawSync(a85).toString('latin1');
          }
        } catch {
          // ignore
        }
      }
      return currentBuffer.toString('latin1');
    }
  }
}

export function parsePdfBuffer(buffer: Buffer): PdfParseResult {
  const raw = buffer.toString('latin1');

  // Count pages accurately
  const pageMatches = raw.match(/\/Type\s*\/Page\b/g);
  const numpages = pageMatches && pageMatches.length > 0 ? pageMatches.length : 1;

  let fullText = '';

  // Match streams with their object headers to read filter specifications
  const streamRegex = /(?:(\d+\s+\d+\s+obj[\s\S]*?>>)\s*)?stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(raw)) !== null) {
    const header = match[1] || '';
    const streamContent = match[2];

    const decompressed = decompressStream(streamContent, header);

    if (
      decompressed.includes('BT') ||
      decompressed.includes('Tj') ||
      decompressed.includes('TJ') ||
      decompressed.includes('Tm')
    ) {
      const text = extractTextFromStream(decompressed);
      if (text.trim().length > 0) {
        fullText += text + '\n';
      }
    }
  }

  // Clean and normalize extracted text
  let clean = fullText
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();

  // Fallback: If structured streams yielded little text, try ASCII text runs (only readable words)
  if (clean.length < 30) {
    const asciiStrings = raw.match(/[A-Za-z0-9][A-Za-z0-9 ,.\-–—:;/'"()$#%&]{12,}/g);
    if (asciiStrings) {
      const filtered = asciiStrings
        .map(s => s.trim())
        .filter(
          s =>
            !s.startsWith('/Filter') &&
            !s.startsWith('/Length') &&
            !s.startsWith('/Type') &&
            !s.startsWith('/Pages') &&
            !s.startsWith('/Font') &&
            !s.startsWith('<<') &&
            !s.startsWith('>>') &&
            !s.startsWith('obj') &&
            !s.startsWith('endobj') &&
            !s.startsWith('stream') &&
            !s.startsWith('endstream') &&
            !s.includes('/Parent') &&
            !s.includes('/MediaBox')
        );
      if (filtered.length > 0) {
        clean = filtered.join('\n');
      }
    }
  }

  return {
    text: clean,
    numpages,
  };
}
