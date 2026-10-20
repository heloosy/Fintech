import React from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  FileSpreadsheet,
  Clock,
  Sparkles,
  BarChart3,
  Files,
  LockKeyhole,
  History,
  Settings,
  RefreshCw,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { inMemoryStore } from '../../services/inMemoryStore';

export type NavScreen =
  | 'overview'
  | 'policies'
  | 'claim-wizard'
  | 'claims'
  | 'assistant'
  | 'analysis'
  | 'documents'
  | 'security'
  | 'activity'
  | 'settings';

interface SidebarProps {
  activeScreen: NavScreen;
  onNavigate: (screen: NavScreen) => void;
  pendingApprovalsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  onNavigate,
  pendingApprovalsCount,
}) => {
  const profile = inMemoryStore.getUserProfile();

  const navItems = [
    { id: 'overview' as NavScreen, label: 'Overview', icon: LayoutDashboard },
    { id: 'policies' as NavScreen, label: 'My Policies', icon: ShieldCheck },
    { id: 'claim-wizard' as NavScreen, label: 'Start a Claim (13-Stage)', icon: FileSpreadsheet, highlight: true },
    { id: 'claims' as NavScreen, label: 'Claims Tracking', icon: Clock },
    { id: 'assistant' as NavScreen, label: 'AI Assistant', icon: Sparkles },
    { id: 'analysis' as NavScreen, label: 'Coverage Analysis', icon: BarChart3 },
    { id: 'documents' as NavScreen, label: 'Documents Vault', icon: Files },
    {
      id: 'security' as NavScreen,
      label: 'Security & Approvals',
      icon: LockKeyhole,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    { id: 'activity' as NavScreen, label: 'Activity & Audit Log', icon: History },
    { id: 'settings' as NavScreen, label: 'Settings & Security', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            I
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight text-lg">InsureOS</span>
            <span className="text-[10px] font-semibold tracking-wider text-blue-700 uppercase ml-1.5 px-1.5 py-0.5 bg-blue-50 rounded border border-blue-200">
              Enterprise
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-500 font-medium mt-1">AI Insurance Operating System</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Workspace Navigation
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          if (item.highlight) {
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all mb-2 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-blue-700'}`} />
                  <span>{item.label}</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-700/20 text-blue-900">
                  Wizard
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-100 text-blue-800 font-semibold border-l-4 border-blue-700 rounded-l-none'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs px-2 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Policyholder Profile & Quick Reset */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/80">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-2 rounded-md bg-white border border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs border border-slate-300">
            {profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'PH'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 truncate flex items-center gap-1">
              {profile.fullName}
              <UserCheck className="w-3 h-3 text-emerald-600 inline" />
            </p>
            <p className="text-[10px] text-slate-500 truncate font-mono">{profile.id}</p>
          </div>
        </div>

        <div className="space-y-1">
          <button
            id="sidebar-load-sample-data"
            onClick={() => {
              if (confirm('Load fictional demo dataset? This will populate sample policies, claims, documents, and demo persona.')) {
                inMemoryStore.loadSampleData();
                window.location.reload();
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
            title="Load Sample Demo Data"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Load Sample Data</span>
          </button>

          <button
            id="sidebar-reset-empty"
            onClick={() => {
              if (confirm('Reset workspace to a clean empty state? All sample policies, claims, and documents will be removed.')) {
                inMemoryStore.resetToEmptyWorkspace();
                window.location.reload();
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded border border-slate-200 transition-colors"
            title="Reset Workspace to Clean Empty State"
          >
            <RefreshCw className="w-3 h-3 text-slate-500" />
            <span>Reset to Empty</span>
          </button>
        </div>

        <div className="mt-2 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          <span>Fictional Demo Session</span>
        </div>
      </div>
    </aside>
  );
};
