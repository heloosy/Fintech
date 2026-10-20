import React, { useState, useEffect } from 'react';
import {
  History,
  Hash,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  RotateCcw,
  RefreshCw,
  Search
} from 'lucide-react';
import { inMemoryStore } from '../services/inMemoryStore';
import { verifyAuditChain } from '../services/hashChain';
import type { HashVerificationResult, AuditRecord } from '../services/hashChain';

export const ActivityLog: React.FC = () => {
  const [records, setRecords] = useState<AuditRecord[]>(inMemoryStore.getAuditRecords());
  const [verificationResult, setVerificationResult] = useState<HashVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    const unsub = inMemoryStore.subscribe(() => {
      setRecords(inMemoryStore.getAuditRecords());
    });
    return unsub;
  }, []);

  const handleVerify = async () => {
    setIsVerifying(true);
    const result = await verifyAuditChain(records);
    setVerificationResult(result);
    setIsVerifying(false);
  };

  const handleSimulateTamper = (index: number) => {
    inMemoryStore.simulateTamperAuditRecord(index);
    setRecords(inMemoryStore.getAuditRecords());
    setVerificationResult(null);
    alert(`Entry #${index + 1} modified. Click 'Verify Audit Log Integrity' to run the SHA-256 chain verification and detect the discrepancy.`);
  };

  const filtered = records.filter(
    r =>
      r.action.toLowerCase().includes(filterQuery.toLowerCase()) ||
      r.actor.toLowerCase().includes(filterQuery.toLowerCase()) ||
      r.details.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 text-xs">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase">
              SESSION AUDIT LOG
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 font-semibold">Cryptographic Hash Chaining</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-1">
            Activity Trail & Integrity Verification
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Demonstration of session-level tamper detection using sequential SHA-256 digests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-tamper-audit-entry"
            onClick={() => handleSimulateTamper(0)}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold rounded-lg transition-colors text-xs"
            title="Simulate manual modification of entry #1 to test integrity verification failure"
          >
            Simulate Tampering on Entry #1
          </button>
          <button
            id="btn-verify-audit-log"
            onClick={handleVerify}
            disabled={isVerifying}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-2xs transition-colors text-xs"
          >
            <Hash className="w-3.5 h-3.5" />
            <span>{isVerifying ? 'Verifying...' : 'Verify Audit Log Integrity'}</span>
          </button>
        </div>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
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
            <h4 className="font-bold text-sm mb-1">
              {verificationResult.isValid ? 'Hash Chain Integrity Confirmed' : 'Integrity Check Failed — Tamper Detected!'}
            </h4>
            <p className="leading-relaxed">{verificationResult.message}</p>
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 card-shadow overflow-hidden">
        <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
            Session Audit Trail ({records.length} Events)
          </span>
          <input
            type="text"
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            placeholder="Filter audit events..."
            className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs w-52"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Timestamp (UTC)</th>
                <th className="p-3">Action</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Event Details</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Current Hash</th>
                <th className="p-3 text-right">Tamper Demo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filtered.map((rec, idx) => (
                <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                  <td className="p-3 font-mono text-slate-600 whitespace-nowrap text-[11px]">
                    {rec.timestamp.slice(11, 19)}
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-900 font-mono text-[11px]">
                      {rec.action}
                    </span>
                  </td>
                  <td className="p-3 text-slate-700 whitespace-nowrap">{rec.actor}</td>
                  <td className="p-3 text-slate-800 max-w-sm truncate" title={rec.details}>
                    {rec.details}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                        rec.severity === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : rec.severity === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {rec.severity}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[10px] text-blue-700 max-w-[110px] truncate" title={rec.hash}>
                    {rec.hash.slice(0, 10)}...
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleSimulateTamper(idx)}
                      className="text-[10px] text-amber-700 hover:text-amber-900 font-bold underline"
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
  );
};
