import React, { useState } from 'react';
import {
  Search,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  FileCheck2,
  ExternalLink,
  Info
} from 'lucide-react';
import { inMemoryStore } from '../../services/inMemoryStore';
import type { NavScreen } from './Sidebar';

interface TopNavProps {
  activeScreen: NavScreen;
  onNavigate: (screen: NavScreen) => void;
  onOpenTestMatrix: () => void;
  onOpenClauseInspector?: (clauseText: string, sectionTitle: string) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeScreen,
  onNavigate,
  onOpenTestMatrix,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ title: string; subtitle: string; screen: NavScreen }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  const screenTitles: Record<NavScreen, { title: string; category: string }> = {
    overview: { title: 'Executive Overview', category: 'Portfolio Dashboard' },
    policies: { title: 'Policy Repository & Clause Inspector', category: 'Insurance Contracts' },
    'claim-wizard': { title: '13-Stage Universal Claim Wizard', category: 'Automated Claims Processing' },
    claims: { title: 'Claims Tracking & Timeline Registry', category: 'Active Dispatches' },
    assistant: { title: 'Clause-Grounded AI Insurance Assistant', category: 'Natural Language Intelligence' },
    analysis: { title: 'Portfolio Coverage Analysis & Gap Finder', category: 'Risk & Exposure' },
    documents: { title: 'Searchable Document Vault & Evidence', category: 'Digital Records' },
    security: { title: 'Security & Approvals Centre', category: 'Access Control & Audit' },
    activity: { title: 'Session Audit Log & Integrity Verifier', category: 'SHA-256 Hash Chaining' },
    settings: { title: 'System Settings & Tenancy Controls', category: 'Configuration' },
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const lower = q.toLowerCase();
    const results: Array<{ title: string; subtitle: string; screen: NavScreen }> = [];

    // Search policies
    const policies = inMemoryStore.getPolicies();
    for (const p of policies) {
      if (p.name.toLowerCase().includes(lower) || p.carrier.toLowerCase().includes(lower) || p.policyNumber.toLowerCase().includes(lower)) {
        results.push({
          title: p.name,
          subtitle: `Policy (${p.carrier}) • Deductible: $${p.deductibleAmount}`,
          screen: 'policies',
        });
      }
      for (const c of p.clauses) {
        if (c.title.toLowerCase().includes(lower) || c.text.toLowerCase().includes(lower)) {
          results.push({
            title: c.section,
            subtitle: `Clause in ${p.name} • ${c.title}`,
            screen: 'policies',
          });
        }
      }
    }

    // Search claims
    const claims = inMemoryStore.getClaims();
    for (const clm of claims) {
      if (clm.id.toLowerCase().includes(lower) || clm.incidentDescription.toLowerCase().includes(lower)) {
        results.push({
          title: `Claim ${clm.id}`,
          subtitle: `${clm.policyName} • Status: ${clm.status}`,
          screen: 'claims',
        });
      }
    }

    setSearchResults(results.slice(0, 6));
  };

  const current = screenTitles[activeScreen] || { title: 'InsureOS', category: 'Enterprise' };

  return (
    <header className="fixed top-0 left-64 right-0 z-20 bg-white border-b border-slate-200">
      {/* High-Visibility Simulated Prototype Notice Bar */}
      <div className="bg-slate-900 text-slate-100 px-6 py-1.5 text-[11px] font-medium flex items-center justify-between tracking-wide border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold rounded text-[9px] uppercase tracking-wider">
            SIMULATION
          </span>
          <span className="text-slate-300">
            DEMO ENVIRONMENT — ALL DATA, CARRIERS, CONTRACT CLAUSES, AND TRANSMISSIONS ARE SIMULATED PROTOTYPES.
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
            OWASP Layered Guard: Active
          </span>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-slate-300">Tenant: {inMemoryStore.getUserProfile().tenantId || inMemoryStore.getUserProfile().id}</span>
        </div>
      </div>

      {/* Main Top Navigation Header */}
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        {/* Breadcrumb / Title */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {current.category}
          </span>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">
            {current.title}
          </h1>
        </div>

        {/* Global Search & Action Center */}
        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search policies, clauses, claims..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white text-slate-800"
            />

            {/* Quick Search Dropdown */}
            {isSearching && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-50">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">
                  Search Results
                </div>
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onNavigate(res.screen);
                      setIsSearching(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <p className="text-xs font-semibold text-slate-900 truncate">{res.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">{res.subtitle}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Test Matrix & Failure Paths Button */}
          <button
            id="btn-test-scenarios"
            onClick={onOpenTestMatrix}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs"
            title="Interactive Test Scenarios: TC-01 to TC-06"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-700" />
            <span>Test Scenarios (TC-01..06)</span>
          </button>

          {/* Start Claim Shortcut */}
          {activeScreen !== 'claim-wizard' && (
            <button
              id="btn-top-start-claim"
              onClick={() => onNavigate('claim-wizard')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-700 hover:bg-blue-800 text-white shadow-2xs transition-colors"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Start Claim</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
