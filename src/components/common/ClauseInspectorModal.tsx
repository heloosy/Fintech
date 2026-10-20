import React from 'react';
import { X, ShieldCheck, FileText, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';
import type { PolicyClause } from '../../types';

interface ClauseInspectorModalProps {
  clause: PolicyClause | null;
  policyName?: string;
  carrier?: string;
  originalDocumentName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ClauseInspectorModal: React.FC<ClauseInspectorModalProps> = ({
  clause,
  policyName = 'Policy Schedule',
  carrier = 'Underwriter',
  originalDocumentName = 'Policy_Document.pdf',
  isOpen,
  onClose,
}) => {
  if (!isOpen || !clause) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-slate-200 card-shadow w-full max-w-2xl overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-700" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Verbatim Clause Inspector</h3>
              <p className="text-[11px] text-slate-500">{policyName} • {carrier}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
              {clause.section}
            </span>
            <span className="px-2 py-0.5 rounded font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Contractually Verified
            </span>
            <span className="px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
              <FileText className="w-3 h-3 text-slate-500" />
              Page {clause.pageNumber} in {originalDocumentName}
            </span>
            {clause.isExclusion && (
              <span className="px-2 py-0.5 rounded font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-600" />
                Explicit Exclusion Clause
              </span>
            )}
          </div>

          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1">{clause.title}</h4>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Category: {clause.category}
            </span>
          </div>

          {/* Legal Excerpt Parchment Box */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 font-serif text-slate-800 leading-relaxed text-sm shadow-inner relative">
            <div className="absolute top-2 right-2 text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest">
              Contract Excerpt
            </div>
            “{clause.text}”
          </div>

          {/* Matching Keywords */}
          {clause.keywords && clause.keywords.length > 0 && (
            <div>
              <span className="text-[11px] font-bold text-slate-500 block mb-1">
                Indexed Deterministic Keywords:
              </span>
              <div className="flex flex-wrap gap-1">
                {clause.keywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Anti-Hallucination Disclaimer */}
          <div className="p-3 bg-blue-50/60 rounded-md border border-blue-200/80 text-[11px] text-blue-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <p>
              This text is pulled directly from the parsed policy contract schedule on file. InsureOS operates with deterministic grounding: no terms, deductibles, or limits are fabricated or hallucinated.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
