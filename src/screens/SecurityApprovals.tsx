import React, { useState, useEffect } from 'react';
import {
  Lock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Hash,
  Play,
  RotateCcw,
  FileText,
  AlertOctagon,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { inMemoryStore } from '../services/inMemoryStore';
import { verifyAuditChain } from '../services/hashChain';
import type { HashVerificationResult, AuditRecord } from '../services/hashChain';
import type { PendingApproval, ThreatReport } from '../types';

export const SecurityApprovals: React.FC = () => {
  const [approvals, setApprovals] = useState<PendingApproval[]>(inMemoryStore.getPendingApprovals());
  const [threats, setThreats] = useState<ThreatReport[]>(inMemoryStore.getThreatReports());
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>(inMemoryStore.getAuditRecords());

  const [verificationResult, setVerificationResult] = useState<HashVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const unsub = inMemoryStore.subscribe(() => {
      setApprovals(inMemoryStore.getPendingApprovals());
      setThreats(inMemoryStore.getThreatReports());
      setAuditRecords(inMemoryStore.getAuditRecords());
    });
    return unsub;
  }, []);

  const handleResolveApproval = (id: string, status: 'approved' | 'rejected') => {
    inMemoryStore.resolvePendingApproval(id, status);
  };

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    const result = await verifyAuditChain(auditRecords);
    setVerificationResult(result);
    setIsVerifying(false);
  };

  const handleSimulateTamper = (index: number) => {
    inMemoryStore.simulateTamperAuditRecord(index);
    setAuditRecords(inMemoryStore.getAuditRecords());
    setVerificationResult(null);
    alert(`Entry #${index + 1} was tampered with (unauthorized modification appended to details without updating the recorded SHA-256 digest). Click 'Verify Hash Chain Integrity' to observe detection!`);
  };

  return (
    <div className="space-y-6 pb-12 text-xs">
      {/* Security Architecture Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase">
              GOVERNANCE & APPROVALS
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 font-semibold">OWASP Layered Defense Architecture</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-1">
            Security Control Centre, Approvals & Session Audit Integrity
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Strict human-in-the-loop approval gates, prompt injection defense bench, and session-level cryptographic hash chaining.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Hash className="w-3.5 h-3.5" />
            <span>{isVerifying ? 'Verifying Chain...' : 'Verify Hash Chain Integrity'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: PENDING CONSEQUENTIAL ACTION APPROVALS */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Consequential Action Approvals Queue ({approvals.filter(a => a.status === 'pending').length})
            </h3>
            <p className="text-slate-500 text-[11px]">
              Outgoing carrier submissions, statutory declarations, and document exemptions cannot execute without explicit authorization.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            Human-in-the-Loop Mandatory
          </span>
        </div>

        {approvals.filter(a => a.status === 'pending').length === 0 ? (
          <div className="p-6 text-center rounded-lg bg-slate-50 border border-dashed border-slate-200 text-slate-500">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
            <p className="font-semibold text-xs text-slate-700">No Pending Approvals</p>
            <p className="text-[11px]">All outbound dispatches and document exemptions have been reviewed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {approvals.filter(a => a.status === 'pending').map(item => (
              <div
                key={item.id}
                className="p-4 rounded-lg border border-amber-300 bg-amber-50/40 text-amber-950 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-200 text-amber-900">
                        {item.type.replace('_', ' ')}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">{item.id}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs mt-1">{item.title}</h4>
                    <p className="text-slate-700 text-xs mt-0.5">{item.summary}</p>
                  </div>
                  <span className="text-slate-400 font-mono text-[10px]">{item.timestamp.slice(11, 19)} UTC</span>
                </div>

                {/* Details Breakdown */}
                <div className="p-2.5 rounded bg-white border border-amber-200 text-[11px] grid grid-cols-2 gap-2">
                  {Object.entries(item.details).map(([k, v]) => (
                    <div key={k}>
                      <span className="text-slate-400 uppercase text-[10px] font-bold block">{k}:</span>
                      <span className="font-semibold text-slate-800">{String(v)}</span>
                    </div>
                  ))}
                </div>

                {/* Consequence Warning */}
                <div className="p-2 rounded bg-amber-100/70 border border-amber-300 text-[11px] text-amber-900 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Consequence Warning:</strong> {item.consequenceWarning}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => handleResolveApproval(item.id, 'rejected')}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded"
                  >
                    Reject Action
                  </button>
                  <button
                    onClick={() => handleResolveApproval(item.id, 'approved')}
                    className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded shadow-2xs"
                  >
                    Authorize Action
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: PROMPT INJECTION & UNTRUSTED DATA TEST BENCH */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Prompt Injection & Untrusted Data Defense Bench (Layer 4)
            </h3>
            <p className="text-slate-500 text-[11px]">
              Uploaded documents and incoming emails are treated strictly as untrusted data, never as executable instructions.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            Active Sanitizer
          </span>
        </div>

        {threats.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 flex items-center justify-between">
            <span className="text-xs">
              No active prompt injection attempts intercepted in this session.
            </span>
            <span className="text-[11px] text-slate-400">
              Use 'Test Scenarios (TC-03)' to simulate an adversarial estimate upload.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {threats.map(threat => (
              <div
                key={threat.id}
                className="p-4 rounded-lg bg-red-50 border border-red-300 text-red-950 space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span className="font-bold text-red-900 text-xs">
                      Threat Neutralized: {threat.source}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-600 text-white uppercase">
                      QUARANTINED
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">{threat.timestamp.slice(11, 19)} UTC</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-red-800 block">
                    Targeted Action Override Attempt:
                  </span>
                  <span className="font-semibold text-xs text-red-900">{threat.targetAction}</span>
                </div>

                <div className="p-2.5 bg-white rounded border border-red-200 font-mono text-[11px] text-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold mb-1">
                    Adversarial Payload Snippet (Isolated as passive text):
                  </span>
                  “{threat.adversarialSnippet}”
                </div>

                <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    <strong>Application Guard:</strong> {threat.mitigation}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: SESSION AUDIT INTEGRITY & SHA-256 HASH CHAINING */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Session-Level Audit Integrity (SHA-256 Hash Chain)
            </h3>
            <p className="text-slate-500 text-[11px]">
              Explicitly modeled as a session-level integrity demonstration, NOT immutable or tamper-proof permanent storage.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSimulateTamper(0)}
              className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 font-semibold rounded text-xs"
              title="Test Requirement #3: Modify an event and test if verification fails"
            >
              Simulate Tampering on Entry #1
            </button>
          </div>
        </div>

        {/* Verification Result Banner */}
        {verificationResult && (
          <div
            className={`p-4 rounded-lg border text-xs flex items-start gap-2.5 ${
              verificationResult.isValid
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-red-50 border-red-300 text-red-950'
            }`}
          >
            {verificationResult.isValid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold block text-sm mb-0.5">
                {verificationResult.isValid ? 'Hash Chain Integrity Verified' : 'Cryptographic Tamper Detected!'}
              </span>
              <p className="leading-relaxed">{verificationResult.message}</p>
            </div>
          </div>
        )}

        {/* Audit Log Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">SHA-256 Digest</th>
                  <th className="p-3 text-right">Tamper Test</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditRecords.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 font-sans">
                    <td className="p-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap text-[11px] font-mono">
                      {rec.timestamp.slice(11, 19)}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-900 font-mono text-[11px]">
                        {rec.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{rec.actor}</td>
                    <td className="p-3 text-slate-700 max-w-xs truncate" title={rec.details}>
                      {rec.details}
                    </td>
                    <td className="p-3 font-mono text-[10px] text-blue-700 max-w-[120px] truncate" title={rec.hash}>
                      {rec.hash.slice(0, 12)}...
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleSimulateTamper(idx)}
                        className="text-[10px] font-semibold text-amber-700 hover:text-amber-900 underline"
                      >
                        Tamper
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
