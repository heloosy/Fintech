import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  ExternalLink,
  Plus,
  RefreshCw,
  Scale,
  Calendar,
  DollarSign,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { inMemoryStore } from '../services/inMemoryStore';
import type { Claim } from '../types';

interface ClaimsTrackingProps {
  onStartNewClaim: () => void;
  onOpenWizardStage: (stage: number) => void;
}

export const ClaimsTracking: React.FC<ClaimsTrackingProps> = ({
  onStartNewClaim,
  onOpenWizardStage,
}) => {
  const [claims, setClaims] = useState<Claim[]>(inMemoryStore.getClaims());
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(claims[0] || null);

  useEffect(() => {
    const unsub = inMemoryStore.subscribe(() => {
      const updated = inMemoryStore.getClaims();
      setClaims(updated);
      if (!selectedClaim && updated.length > 0) {
        setSelectedClaim(updated[0]);
      } else if (selectedClaim && !updated.find(c => c.id === selectedClaim.id)) {
        setSelectedClaim(updated[0] || null);
      }
    });
    return unsub;
  }, [selectedClaim]);

  const getStatusBadge = (status: Claim['status']) => {
    switch (status) {
      case 'under_review':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            UNDER REVIEW
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            APPROVED
          </span>
        );
      case 'action_required':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            ACTION REQUIRED
          </span>
        );
      case 'settled':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            SETTLED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
            DRAFT
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 text-xs">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase">
              CLAIMS REGISTRY
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 font-semibold">Active & Historical Filings</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-1">
            Claims Lifecycle Tracking & Timelines
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            {claims.length > 0
              ? `${claims.length} claims registered in workspace with SLA milestones and determination tracking.`
              : 'Genuinely empty workspace. No claims have been created yet.'}
          </p>
        </div>

        <button
          id="btn-start-new-claim"
          onClick={onStartNewClaim}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-2xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Start New Claim</span>
        </button>
      </div>

      {/* Main Content: Empty State OR Claims Grid */}
      {claims.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 card-shadow text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No claims created yet</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto leading-relaxed">
              File a new claim using the AI Claim Autopilot or start from an uploaded incident narrative.
            </p>
          </div>
          <div className="pt-2">
            <button
              id="btn-empty-create-claim"
              onClick={onStartNewClaim}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-sm transition-all mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create Claim</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 1/3: Claims Cards */}
          <div className="lg:col-span-1 space-y-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Select Claim to Inspect ({claims.length})
            </span>
            {claims.map(claim => {
              const isSelected = selectedClaim?.id === claim.id;

              return (
                <div
                  key={claim.id}
                  onClick={() => setSelectedClaim(claim)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-500 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-mono font-bold text-blue-900 text-xs">{claim.id}</span>
                    {getStatusBadge(claim.status)}
                  </div>

                  <h4 className="font-bold text-slate-900 text-xs">{claim.policyName}</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-2">
                    {claim.incidentDescription}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      Claimed:{' '}
                      <strong className="text-slate-900 font-mono">
                        ${claim.estimatedLoss.toLocaleString()}
                      </strong>
                    </span>
                    <span className="text-blue-700 font-semibold flex items-center gap-0.5">
                      View Timeline
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right 2/3: Selected Claim Detail & Chronological Timeline */}
          {selectedClaim && (
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 card-shadow space-y-5">
              {/* Detail Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {selectedClaim.id}
                    </span>
                    {getStatusBadge(selectedClaim.status)}
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mt-0.5">
                    {selectedClaim.policyName}
                  </h3>
                  <p className="text-slate-500 text-xs">
                    Carrier: {selectedClaim.carrier} • Incident Date: {selectedClaim.incidentDate}
                  </p>
                </div>

                {selectedClaim.category === 'motor' && (
                  <button
                    onClick={() => onOpenWizardStage(13)}
                    className="px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 rounded font-semibold text-xs transition-colors"
                  >
                    Open in Claim Wizard
                  </button>
                )}
              </div>

              {/* Financial & Deductible Box */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-center font-mono text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans">
                    Estimated Loss:
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    ${selectedClaim.estimatedLoss.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans">
                    Enforced Deductible:
                  </span>
                  <span className="font-bold text-amber-700 text-sm">
                    -${selectedClaim.deductibleApplied.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans">
                    Estimated Payout:
                  </span>
                  <span className="font-bold text-emerald-700 text-sm">
                    $
                    {Math.max(
                      0,
                      selectedClaim.estimatedLoss - selectedClaim.deductibleApplied
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Attached Claim Evidence */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Attached Claim Documents ({selectedClaim.documents?.length || 0}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedClaim.documents?.map(doc => (
                    <div
                      key={doc.id}
                      className="p-2.5 rounded bg-white border border-slate-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                        <div className="truncate">
                          <span className="font-bold text-slate-900 block truncate">{doc.type}</span>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                            {doc.name}
                          </span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase shrink-0">
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chronological Timeline */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Chronological SLA & Event Audit Trail:
                </span>

                <div className="space-y-3 pl-2 border-l-2 border-blue-200 ml-2">
                  {selectedClaim.timeline?.map((ev, i) => (
                    <div key={i} className="relative pl-4">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white" />
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{ev.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{ev.date}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{ev.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
