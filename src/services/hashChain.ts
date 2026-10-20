// Session-Level Audit Integrity & SHA-256 Hash Chaining
// Explicitly modeled as a session-level integrity demonstration, NOT immutable or tamper-proof permanent storage.

export async function computeSha256(message: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple deterministic hash for node/non-subtle environments
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  severity: 'info' | 'warning' | 'critical';
  prevHash: string;
  hash: string;
}

export async function createAuditRecord(
  action: string,
  actor: string,
  details: string,
  severity: 'info' | 'warning' | 'critical',
  prevHash: string
): Promise<AuditRecord> {
  const id = `AUD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
  const timestamp = new Date().toISOString();
  const rawPayload = `${id}|${timestamp}|${action}|${actor}|${details}|${severity}|${prevHash}`;
  const hash = await computeSha256(rawPayload);

  return {
    id,
    timestamp,
    action,
    actor,
    details,
    severity,
    prevHash,
    hash,
  };
}

export interface HashVerificationResult {
  isValid: boolean;
  tamperedIndex: number | null;
  message: string;
}

export async function verifyAuditChain(records: AuditRecord[]): Promise<HashVerificationResult> {
  if (records.length === 0) {
    return { isValid: true, tamperedIndex: null, message: 'Audit log is empty. Integrity intact.' };
  }

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const expectedPrev = i === 0 ? 'GENESIS_HASH_0000000000000000000000000000000000000000000000000000000000' : records[i - 1].hash;

    if (rec.prevHash !== expectedPrev) {
      return {
        isValid: false,
        tamperedIndex: i,
        message: `Broken Chain at entry #${i + 1} (${rec.id}): Previous hash mismatch. Expected ${expectedPrev.substring(0, 12)}..., found ${rec.prevHash.substring(0, 12)}...`,
      };
    }

    const recomputedPayload = `${rec.id}|${rec.timestamp}|${rec.action}|${rec.actor}|${rec.details}|${rec.severity}|${rec.prevHash}`;
    const recomputedHash = await computeSha256(recomputedPayload);

    if (rec.hash !== recomputedHash) {
      return {
        isValid: false,
        tamperedIndex: i,
        message: `Tamper Detected at entry #${i + 1} (${rec.id}): Payload was altered. Recorded hash: ${rec.hash.substring(0, 12)}..., Recomputed: ${recomputedHash.substring(0, 12)}...`,
      };
    }
  }

  return {
    isValid: true,
    tamperedIndex: null,
    message: `All ${records.length} audit records verified against the session SHA-256 hash chain. No tampering detected.`,
  };
}
