import React, { useState } from 'react';
import {
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileText,
  ExternalLink,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { inMemoryStore } from '../services/inMemoryStore';
import type { PolicyClause } from '../types';

interface CoverageAnalysisProps {
  onInspectClause: (clause: any, policyName: string, carrier: string) => void;
  onNavigateToWizard: () => void;
}

export const CoverageAnalysis: React.FC<CoverageAnalysisProps> = ({
  onInspectClause,
  onNavigateToWizard,
}) => {
  const policies = inMemoryStore.getPolicies();
  const [selectedTab, setSelectedTab] = useState<'gaps' | 'overlaps' | 'limits'>('gaps');

  return (
    <div className="space-y-6 pb-12 text-xs">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase">
              PORTFOLIO AUDIT
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 font-semibold">Contractual Gap & Overlap Detector</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-1">
            Coverage Analysis & Risk Assessment
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Distinguishes confirmed contractual exclusions from potential coverage gaps using verified clauses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedTab('gaps')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              selectedTab === 'gaps' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Gaps vs Risks (3)
          </button>
          <button
            onClick={() => setSelectedTab('overlaps')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              selectedTab === 'overlaps' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Policy Overlaps (1)
          </button>
          <button
            onClick={() => setSelectedTab('limits')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              selectedTab === 'limits' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Exposure Limits
          </button>
        </div>
      </div>

      {/* Empty State when no policies uploaded */}
      {policies.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 card-shadow text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No policies uploaded for analysis</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto leading-relaxed">
              Upload at least one policy contract in 'My Policies' to detect coverage gaps, sub-limits, and exclusions against your actual schedules.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onNavigateToWizard}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-sm transition-all"
            >
              <span>Upload Policy in Catalog</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => inMemoryStore.loadSampleData()}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold rounded-lg border border-amber-300 transition-colors shadow-2xs"
            >
              <span>Load Sample Data</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* TAB 1: GAPS VS CONFIRMED EXCLUSIONS */}
          {selectedTab === 'gaps' && (
            <div className="space-y-4 animate-in fade-in duration-150">
          {/* Confirmed Risk 1: Surface Flood Exclusion */}
          <div className="bg-white rounded-xl border border-red-200 p-5 card-shadow space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-50 text-red-700 rounded-lg border border-red-200">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.2 rounded text-[9px] font-bold uppercase bg-red-100 text-red-800">
                      CONFIRMED CONTRACTUAL EXCLUSION
                    </span>
                    <span className="font-mono text-slate-500 text-[10px]">
                      Beacon & Oak (POL-HOM-22914)
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mt-0.5">
                    External Surface Water & Flood Exclusion
                  </h3>
                </div>
              </div>

              <button
                onClick={() =>
                  onInspectClause(
                    {
                      id: 'cls-hom-3',
                      section: 'Section 8.3 - External Surface Water Exclusion',
                      title: 'Flood Exclusion Clause',
                      text: 'This policy explicitly excludes any loss caused directly or indirectly by surface water, overflow of water bodies, storm surge, or tidal waves, regardless of concurrent causation.',
                      category: 'Exclusion',
                      keywords: ['flood'],
                      pageNumber: 22,
                      isExclusion: true,
                    },
                    'Heritage Dwelling & Contents Policy',
                    'Beacon & Oak Property Underwriters'
                  )
                }
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
              >
                <span>Inspect Clause 8.3</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-slate-700 leading-relaxed text-xs">
              <strong>Evidence:</strong> While Section 4.2(b) covers internal plumbing leaks, Section 8.3 explicitly bars claims arising from surface water flooding, storm surge, or overflow of water bodies.
            </p>

            <div className="p-3 bg-red-50/60 rounded border border-red-200 flex items-center justify-between text-[11px] text-red-900">
              <span><strong>Recommendation:</strong> Add an external National Flood Insurance Program (NFIP) or private flood rider to eliminate this exposure.</span>
              <button
                onClick={() => alert('Draft endorsement request letter generated for Beacon & Oak.')}
                className="px-2.5 py-1 bg-white border border-red-300 text-red-900 rounded font-semibold hover:bg-red-100"
              >
                Draft Endorsement Request
              </button>
            </div>
          </div>

          {/* Potential Gap 2: Commercial Livery on Motor Policy */}
          <div className="bg-white rounded-xl border border-amber-200 p-5 card-shadow space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800">
                      POTENTIAL OPERATIONAL GAP
                    </span>
                    <span className="font-mono text-slate-500 text-[10px]">
                      Aegis Shield Mutual (POL-MOT-88410)
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mt-0.5">
                    Peer-to-Peer & Commercial Livery Use Exclusion
                  </h3>
                </div>
              </div>

              <button
                onClick={() =>
                  onInspectClause(
                    {
                      id: 'cls-mot-4',
                      section: 'Section 11.2 - Commercial Activity Exclusion',
                      title: 'Livery & Peer-to-Peer Exclusion',
                      text: 'No coverage applies while the Scheduled Vehicle is being utilized to carry persons or property for compensation, including ride-sharing or commercial delivery.',
                      category: 'Exclusion',
                      keywords: ['commercial'],
                      pageNumber: 27,
                      isExclusion: true,
                    },
                    'Aegis Comprehensive Motor Shield',
                    'Aegis Shield Mutual'
                  )
                }
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
              >
                <span>Inspect Clause 11.2</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-slate-700 leading-relaxed text-xs">
              <strong>Evidence:</strong> Section 11.2 excludes vehicle collisions when engaged in commercial delivery or ride-sharing apps. Personal recreational driving remains 100% protected.
            </p>
          </div>

          {/* Confirmed Risk 3: Pre-Existing Waiting Period */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.2 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-800">
                      SCHEDULED MORATORIUM
                    </span>
                    <span className="font-mono text-slate-500 text-[10px]">
                      Valence Health (POL-HLT-41092)
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mt-0.5">
                    12-Month Waiting Period on Pre-Existing Conditions
                  </h3>
                </div>
              </div>

              <button
                onClick={() =>
                  onInspectClause(
                    {
                      id: 'cls-hlt-2',
                      section: 'Section 4.5 - Pre-Existing Conditions Waiting Period',
                      title: 'Twelve-Month Moratorium',
                      text: 'Any symptom or illness for which medical advice or diagnosis was received in the 24 months preceding inception requires an active waiting period of 12 months before benefits accrue.',
                      category: 'Waiting Period',
                      keywords: ['pre-existing'],
                      pageNumber: 14,
                      isExclusion: true,
                    },
                    'Valence Premier Care Comprehensive',
                    'Valence Health & Life'
                  )
                }
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
              >
                <span>Inspect Clause 4.5</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-slate-700 leading-relaxed text-xs">
              <strong>Evidence:</strong> Acute emergency hospitalizations (such as appendectomy) are covered immediately; chronic prior conditions remain excluded until March 1, 2027.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: OVERLAPS */}
      {selectedTab === 'overlaps' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow space-y-4 animate-in fade-in duration-150">
          <div className="p-4 rounded-lg bg-blue-50/70 border border-blue-200 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-700" />
              <span className="font-bold text-sm text-blue-950">
                Detected Overlap: Emergency Medical Evacuation Abroad
              </span>
            </div>
            <p className="text-slate-700 leading-relaxed text-xs">
              Both <span className="font-semibold">Meridian Global Underwriters (POL-TRV-55109)</span> and your <span className="font-semibold">Valence Premier Care International Rider</span> provide emergency air evacuation coverage up to $500,000.
            </p>
            <div className="p-2.5 bg-white rounded border border-blue-100 text-[11px] text-slate-600">
              <strong>Coordination of Benefits:</strong> Travel insurance acts as primary payer for international repatriations, with Valence Health acting as secondary payer for inpatient hospital admission.
            </div>
          </div>
        </div>
      )}

          {/* TAB 3: LIMITS */}
          {selectedTab === 'limits' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow space-y-4 animate-in fade-in duration-150">
              <h3 className="font-bold text-sm text-slate-900">Total Portfolio Coverage Limits</h3>
              <div className="space-y-3">
                {policies.map(p => (
                  <div key={p.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">{p.name}</span>
                      <span className="text-[11px] text-slate-500">{p.carrier} • Deductible: ${p.deductibleAmount}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono text-slate-900 text-sm">${p.coverageLimit.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Policy Limit</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
