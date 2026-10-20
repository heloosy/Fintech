import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { TestMatrixModal } from './components/common/TestMatrixModal';
import { ClauseInspectorModal } from './components/common/ClauseInspectorModal';
import { LoginOnboarding } from './screens/LoginOnboarding';
import { OverviewDashboard } from './screens/OverviewDashboard';
import { MyPolicies } from './screens/MyPolicies';
import { UniversalClaimWizard } from './screens/UniversalClaimWizard';
import { ClaimsTracking } from './screens/ClaimsTracking';
import { AIAssistant } from './screens/AIAssistant';
import { CoverageAnalysis } from './screens/CoverageAnalysis';
import { DocumentsLibrary } from './screens/DocumentsLibrary';
import { SecurityApprovals } from './screens/SecurityApprovals';
import { ActivityLog } from './screens/ActivityLog';
import { SettingsSecurity } from './screens/SettingsSecurity';
import { inMemoryStore } from './services/inMemoryStore';
import type { NavScreen } from './components/layout/Sidebar';
import type { PolicyClause } from './types';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [activeScreen, setActiveScreen] = useState<NavScreen>('overview');
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  // Modal States
  const [isTestMatrixOpen, setIsTestMatrixOpen] = useState<boolean>(false);
  const [clauseInspectorData, setClauseInspectorData] = useState<{
    clause: PolicyClause | null;
    policyName?: string;
    carrier?: string;
    isOpen: boolean;
  }>({
    clause: null,
    isOpen: false,
  });

  useEffect(() => {
    const updateStats = () => {
      const pending = inMemoryStore.getPendingApprovals().filter(a => a.status === 'pending').length;
      setPendingApprovalsCount(pending);
    };

    updateStats();
    const unsub = inMemoryStore.subscribe(updateStats);
    return unsub;
  }, []);

  const handleOpenClauseInspector = (clause: any, policyName: string, carrier: string) => {
    setClauseInspectorData({
      clause,
      policyName,
      carrier,
      isOpen: true,
    });
  };

  const handleCloseClauseInspector = () => {
    setClauseInspectorData(prev => ({ ...prev, isOpen: false }));
  };

  if (!isAuthenticated) {
    return <LoginOnboarding onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 select-text">
      {/* Persistent Left Sidebar */}
      <Sidebar
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
        pendingApprovalsCount={pendingApprovalsCount}
      />

      {/* Fixed Compact Top Navigation Bar */}
      <TopNav
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
        onOpenTestMatrix={() => setIsTestMatrixOpen(true)}
      />

      {/* Spacious Main Content Area (1440px desktop-first layout) */}
      <main className="ml-64 pt-24 px-8 pb-12 w-[calc(100%-16rem)] max-w-[1440px] flex-1">
        {activeScreen === 'overview' && (
          <OverviewDashboard
            onNavigate={setActiveScreen}
            onInspectClause={handleOpenClauseInspector}
          />
        )}

        {activeScreen === 'policies' && (
          <MyPolicies
            onInspectClause={handleOpenClauseInspector}
            onNavigateToClaim={policyId => setActiveScreen('claim-wizard')}
          />
        )}

        {activeScreen === 'claim-wizard' && (
          <UniversalClaimWizard
            onInspectClause={handleOpenClauseInspector}
            onNavigateToClaimsList={() => setActiveScreen('claims')}
            onOpenApprovals={() => setActiveScreen('security')}
          />
        )}

        {activeScreen === 'claims' && (
          <ClaimsTracking
            onStartNewClaim={() => setActiveScreen('claim-wizard')}
            onOpenWizardStage={stage => setActiveScreen('claim-wizard')}
          />
        )}

        {activeScreen === 'assistant' && (
          <AIAssistant onInspectClause={handleOpenClauseInspector} />
        )}

        {activeScreen === 'analysis' && (
          <CoverageAnalysis
            onInspectClause={handleOpenClauseInspector}
            onNavigateToWizard={() => setActiveScreen('claim-wizard')}
          />
        )}

        {activeScreen === 'documents' && <DocumentsLibrary />}

        {activeScreen === 'security' && <SecurityApprovals />}

        {activeScreen === 'activity' && <ActivityLog />}

        {activeScreen === 'settings' && <SettingsSecurity />}
      </main>

      {/* Global Acceptance Test Runner Modal (TC-01 through TC-06) */}
      <TestMatrixModal
        isOpen={isTestMatrixOpen}
        onClose={() => setIsTestMatrixOpen(false)}
        onNavigate={setActiveScreen}
      />

      {/* Global Verbatim Clause Inspector Modal */}
      <ClauseInspectorModal
        clause={clauseInspectorData.clause}
        policyName={clauseInspectorData.policyName}
        carrier={clauseInspectorData.carrier}
        isOpen={clauseInspectorData.isOpen}
        onClose={handleCloseClauseInspector}
      />
    </div>
  );
}

export default App;
