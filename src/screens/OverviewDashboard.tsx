import React, { useState, useEffect } from 'react';
import {
  Shield,
  Car,
  Heart,
  Home,
  Plane,
  FileText,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  BarChart3,
  FileCheck2,
  Calendar,
  DollarSign,
  CheckCircle2,
  ExternalLink,
  Upload,
  Files,
  FileSpreadsheet,
  History,
  Send,
  RotateCcw,
  Plus,
  Sliders
} from 'lucide-react';
import { inMemoryStore } from '../services/inMemoryStore';
import type { NavScreen } from '../components/layout/Sidebar';
import type { Policy, PolicyCategory, VaultDocument, Claim } from '../types';
import type { AuditRecord } from '../services/hashChain';

interface OverviewDashboardProps {
  onNavigate: (screen: NavScreen) => void;
  onInspectClause: (clause: any, policyName: string, carrier: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  onNavigate,
  onInspectClause,
}) => {
  const [policies, setPolicies] = useState<Policy[]>(inMemoryStore.getPolicies());
  const [claims, setClaims] = useState<Claim[]>(inMemoryStore.getClaims());
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>(inMemoryStore.getVaultDocuments());
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>(inMemoryStore.getAuditRecords());
  const [profile, setProfile] = useState(inMemoryStore.getUserProfile());

  // Quick AI query on dashboard
  const [dashQuery, setDashQuery] = useState('');

  useEffect(() => {
    const unsub = inMemoryStore.subscribe(() => {
      setPolicies(inMemoryStore.getPolicies());
      setClaims(inMemoryStore.getClaims());
      setVaultDocs(inMemoryStore.getVaultDocuments());
      setAuditRecords(inMemoryStore.getAuditRecords());
      setProfile(inMemoryStore.getUserProfile());
    });
    return unsub;
  }, []);

  const activeClaims = claims.filter(c => c.status !== 'settled');
  const totalAnnualPremium = policies.reduce((acc, p) => acc + p.premiumAnnual, 0);
  const isWorkspaceEmpty = policies.length === 0 && claims.length === 0 && vaultDocs.length === 0;

  const handleLoadSampleData = async () => {
    await inMemoryStore.loadSampleData();
  };

  const handleResetWorkspace = async () => {
    if (confirm('Reset workspace to empty state? All demo policies, claims, and documents will be cleared.')) {
      await inMemoryStore.resetToEmptyWorkspace();
    }
  };

  const getCategoryIcon = (category: PolicyCategory) => {
    switch (category) {
      case 'motor':
        return <Car className="w-5 h-5 text-blue-700" />;
      case 'health':
        return <Heart className="w-5 h-5 text-emerald-700" />;
      case 'home':
        return <Home className="w-5 h-5 text-amber-700" />;
      case 'travel':
        return <Plane className="w-5 h-5 text-indigo-700" />;
      case 'life':
        return <Shield className="w-5 h-5 text-purple-700" />;
      default:
        return <Shield className="w-5 h-5 text-slate-700" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 text-xs">
      {/* Portfolio Header & Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                isWorkspaceEmpty
                  ? 'bg-slate-50 text-slate-700 border-slate-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
            >
              {isWorkspaceEmpty ? 'EMPTY WORKSPACE' : 'PORTFOLIO DASHBOARD'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-mono">
              ID: {profile.id || 'USR-LOCAL-001'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            {profile.fullName && profile.fullName !== 'Policyholder'
              ? `Welcome back, ${profile.fullName}`
              : 'Policyholder Workspace'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {policies.length > 0
              ? `${policies.length} insurance ${policies.length === 1 ? 'policy' : 'policies'} active in workspace catalog.`
              : 'Genuinely empty workspace. Upload your policy PDF or document to get started.'}
          </p>
        </div>

        {/* Global Quick Action Launchpads & Optional Demo Tools */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-dash-upload-policy"
            onClick={() => onNavigate('policies')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg shadow-sm transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Policy</span>
          </button>

          <button
            id="btn-dash-start-claim"
            onClick={() => onNavigate('claim-wizard')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-sm transition-all"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Start Claim</span>
          </button>

          {isWorkspaceEmpty ? (
            <button
              id="btn-dash-load-sample"
              onClick={handleLoadSampleData}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs rounded-lg border border-amber-300 transition-colors shadow-2xs"
              title="Optionally load fictional demo policies, claims, and documents"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-700" />
              <span>Load Sample Data</span>
            </button>
          ) : (
            <button
              id="btn-dash-reset-workspace"
              onClick={handleResetWorkspace}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 transition-colors"
              title="Reset workspace to empty state"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span>Reset to Empty</span>
            </button>
          )}
        </div>
      </div>

      {/* Realistic Metric Cards (Accurately reflects actual workspace data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Active Policies */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 card-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Total Active Policies</span>
            <Shield className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{policies.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            {policies.length === 0
              ? 'No policies uploaded yet'
              : `${policies.length} verified against contract schedules`}
          </p>
        </div>

        {/* Metric 2: Open Claims */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 card-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Open Claims</span>
            <Clock className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{activeClaims.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            {activeClaims.length === 0
              ? 'No active claims'
              : `${activeClaims.length} awaiting insurer determination`}
          </p>
        </div>

        {/* Metric 3: Annual Premium Exposure */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 card-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Annual Premium Exposure</span>
            <DollarSign className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ${totalAnnualPremium.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {policies.length === 0
              ? '$0.00 in current workspace'
              : `Across ${new Set(policies.map(p => p.carrier)).size} active carriers`}
          </p>
        </div>

        {/* Metric 4: Upcoming Renewals */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 card-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Upcoming Renewals</span>
            <Calendar className="w-4 h-4 text-indigo-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {policies.filter(p => p.renewalDate && p.renewalDate !== 'N/A').length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {policies.length === 0 ? 'No renewals scheduled' : 'Tracked from schedule declarations'}
          </p>
        </div>
      </div>

      {/* Active Claim Follow-Up Banner (ONLY shown when real active claims exist) */}
      {activeClaims.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-amber-900">
                Active Claim Follow-Up: {activeClaims[0].policyName}
              </h4>
              <p className="mt-0.5 text-amber-800">
                Claim <span className="font-mono font-bold">{activeClaims[0].id}</span> is{' '}
                <span className="font-semibold">{activeClaims[0].status.replace('_', ' ')}</span> with carrier{' '}
                <span className="font-semibold">{activeClaims[0].carrier}</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('claims')}
              className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-md transition-colors shadow-2xs"
            >
              Track in Timeline
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5 DASHBOARD CORE SECTIONS WITH USEFUL EMPTY STATES                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. My Policies Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-700" />
              <h3 className="font-bold text-sm text-slate-900">My Policies</h3>
            </div>
            {policies.length > 0 && (
              <button
                onClick={() => onNavigate('policies')}
                className="text-blue-700 hover:underline font-semibold text-xs flex items-center gap-0.5"
              >
                <span>View All ({policies.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {policies.length === 0 ? (
            <div className="py-8 text-center space-y-3 bg-slate-50/70 rounded-lg border border-dashed border-slate-300 p-6">
              <div className="w-10 h-10 mx-auto rounded-full bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">No policies uploaded yet</h4>
                <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                  Upload your policy contract PDF to extract coverage limits, deductibles, exclusions, and verified clauses.
                </p>
              </div>
              <button
                onClick={() => onNavigate('policies')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Policy</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {policies.map(p => (
                <div
                  key={p.id}
                  className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-slate-50 border border-slate-100">
                      {getCategoryIcon(p.category)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{p.name}</h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {p.carrier} • Deductible: ${p.deductibleAmount}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('policies')}
                    className="text-xs text-blue-700 hover:text-blue-900 font-semibold"
                  >
                    Inspect
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. My Documents Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Files className="w-4 h-4 text-blue-700" />
              <h3 className="font-bold text-sm text-slate-900">My Documents</h3>
            </div>
            {vaultDocs.length > 0 && (
              <button
                onClick={() => onNavigate('documents')}
                className="text-blue-700 hover:underline font-semibold text-xs flex items-center gap-0.5"
              >
                <span>Vault ({vaultDocs.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {vaultDocs.length === 0 ? (
            <div className="py-8 text-center space-y-3 bg-slate-50/70 rounded-lg border border-dashed border-slate-300 p-6">
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
                <Files className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">No documents yet</h4>
                <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                  Upload policy contracts, repair invoices, or police reports to start analyzing your records.
                </p>
              </div>
              <button
                onClick={() => onNavigate('documents')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {vaultDocs.slice(0, 4).map(doc => (
                <div
                  key={doc.id}
                  className="p-3 rounded-lg border border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-slate-900 text-xs truncate block">{doc.title}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {doc.category} • {doc.fileSize}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200 shrink-0">
                    {doc.ocrStatus}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Claims Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-700" />
              <h3 className="font-bold text-sm text-slate-900">Claims</h3>
            </div>
            {claims.length > 0 && (
              <button
                onClick={() => onNavigate('claims')}
                className="text-blue-700 hover:underline font-semibold text-xs flex items-center gap-0.5"
              >
                <span>Registry ({claims.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {claims.length === 0 ? (
            <div className="py-8 text-center space-y-3 bg-slate-50/70 rounded-lg border border-dashed border-slate-300 p-6">
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">No claims created yet</h4>
                <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                  Start an AI-assisted guided claim workflow or file from an uploaded incident narrative.
                </p>
              </div>
              <button
                onClick={() => onNavigate('claim-wizard')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Claim</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {claims.map(c => (
                <div
                  key={c.id}
                  onClick={() => onNavigate('claims')}
                  className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-bold text-blue-900 text-xs">{c.id}</span>
                    <h4 className="font-bold text-slate-900 text-xs">{c.policyName}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{c.incidentDescription}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 uppercase shrink-0">
                    {c.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. AI Assistant Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-700" />
              <h3 className="font-bold text-sm text-slate-900">AI Insurance Assistant</h3>
            </div>
            <button
              onClick={() => onNavigate('assistant')}
              className="text-blue-700 hover:underline font-semibold text-xs flex items-center gap-0.5"
            >
              <span>Open Chat</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {policies.length === 0 ? (
              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-blue-950 text-xs space-y-1">
                <span className="font-bold block flex items-center gap-1.5 text-blue-900">
                  <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                  Grounded Intelligence Notice:
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Users must upload documents to ask document-specific questions. InsureOS grounds all answers strictly in your verified contracts and will not guess or extrapolate unverified terms.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Ask questions grounded strictly in your active policy contracts ({policies.map(p => p.name).join(', ')}).
              </p>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={dashQuery}
                onChange={e => setDashQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && dashQuery.trim()) {
                    onNavigate('assistant');
                  }
                }}
                placeholder={
                  policies.length === 0
                    ? 'Upload documents to ask document-specific questions...'
                    : 'Ask about coverage, deductibles, or claim requirements...'
                }
                className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-900"
              />
              <button
                onClick={() => onNavigate('assistant')}
                className="px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5. Session Activity & Audit Log Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-700" />
              <h3 className="font-bold text-sm text-slate-900">Activity & Session Audit</h3>
            </div>
            <button
              onClick={() => onNavigate('activity')}
              className="text-blue-700 hover:underline font-semibold text-xs flex items-center gap-0.5"
            >
              <span>Full Audit Trail ({auditRecords.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] text-slate-500">
              Showing only events that actually occurred during the current session or persisted workspace:
            </p>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {auditRecords.slice(-5).reverse().map((r, i) => (
                <div
                  key={r.id || i}
                  className="p-2.5 rounded bg-slate-50 border border-slate-100 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono text-[11px]">
                          {r.action}
                        </span>
                        <span className="text-slate-400 text-[10px]">by {r.actor}</span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">{r.details}</p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                    {r.timestamp.split('T')[1]?.slice(0, 8) || 'Now'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
