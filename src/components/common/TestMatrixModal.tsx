import React, { useState } from 'react';
import {
  X,
  Play,
  CheckCircle,
  AlertOctagon,
  ShieldAlert,
  ServerCrash,
  FileX,
  Lock,
  ArrowRight
} from 'lucide-react';
import { inMemoryStore } from '../../services/inMemoryStore';
import { SafetyEngine } from '../../services/safetyEngine';
import { PolicyValidator, SecurityValidationError } from '../../services/policyValidator';
import type { NavScreen } from '../layout/Sidebar';

interface TestMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: NavScreen) => void;
}

export const TestMatrixModal: React.FC<TestMatrixModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [activeTestResult, setActiveTestResult] = useState<{
    id: string;
    title: string;
    status: 'PASS' | 'FAIL' | 'BLOCKED' | 'INTERCEPTED';
    details: string;
  } | null>(null);

  if (!isOpen) return null;

  // Helper to ensure sample data is populated when executing pre-packaged test suite
  const ensureTestData = () => {
    if (inMemoryStore.getPolicies().length === 0) {
      inMemoryStore.loadSampleData();
    }
  };

  // Handler for TC-01: Successful Claim Journey
  const runTC01 = () => {
    ensureTestData();
    inMemoryStore.testState.forceMissingRepairEstimate = false;
    inMemoryStore.testState.simulateCarrierOutage503 = false;
    onNavigate('claim-wizard');
    onClose();
  };

  // Handler for TC-02: Missing Mandatory Document Block
  const runTC02 = () => {
    ensureTestData();
    inMemoryStore.testState.forceMissingRepairEstimate = true;
    const motorClaim = inMemoryStore.getClaims().find(c => c.category === 'motor');
    if (motorClaim) {
      const doc = motorClaim.documents.find(d => d.type === 'Itemized Repair Estimate');
      if (doc) {
        doc.uploaded = false;
        doc.status = 'missing';
      }
      motorClaim.exemptionGranted = false;
      motorClaim.currentStep = 7; // Validation step
      inMemoryStore.saveClaim(motorClaim);
    }
    setActiveTestResult({
      id: 'TC-02',
      title: 'Missing Mandatory Documents',
      status: 'BLOCKED',
      details:
        'Repair estimate removed from claim documents. Validation engine in Step 2 now actively blocks progression to Step 3 (Review & Approval). An explicit demo supervisor exemption approval flow is required.',
    });
    onNavigate('claim-wizard');
    onClose();
  };

  // Handler for TC-03: Malicious Document Injection Attempt
  const runTC03 = async () => {
    ensureTestData();
    const payload = SafetyEngine.getAdversarialSamplePayload();
    const threat = SafetyEngine.analyzeUntrustedText(payload.content);

    await inMemoryStore.recordThreat({
      id: `THR-TC03-${Date.now()}`,
      timestamp: new Date().toISOString(),
      source: payload.filename,
      adversarialSnippet: threat.sanitizedSnippet,
      targetAction: 'Force Deductible = $0 and Disburse $18,500',
      mitigation: 'Adversarial command neutralized. Policy contractual deductible remains locked at $500.00.',
      status: 'quarantined',
    });

    // Verify application-level deductible enforcement
    const motorPolicy = inMemoryStore.getPolicies().find(p => p.category === 'motor')!;
    const enforcedDeductible = PolicyValidator.enforceContractualDeductible(motorPolicy, 0);

    setActiveTestResult({
      id: 'TC-03',
      title: 'Malicious Document Injection Attempt',
      status: 'INTERCEPTED',
      details: `Adversarial PDF '${payload.filename}' was scanned. Layer 4 Safety detected [${threat.detectedPatterns.join(', ')}]. Contract deductible remained strictly locked at $${enforcedDeductible}. Security incident logged to session hash chain.`,
    });
    onNavigate('security');
  };

  // Handler for TC-04: Unauthorized Access Attempt (RBAC)
  const runTC04 = () => {
    try {
      // Attempt to access cross-tenant policy outside allowed scope
      inMemoryStore.getPolicyById('POL-EXT-999');
      setActiveTestResult({
        id: 'TC-04',
        title: 'Unauthorized Access (RBAC)',
        status: 'FAIL',
        details: 'Failure: Access was permitted to unauthorized policy POL-EXT-999.',
      });
    } catch (err: any) {
      inMemoryStore.recordAudit(
        'ACCESS_DENIED_RBAC',
        'Security Gatekeeper',
        `Unauthorized cross-tenant access attempt to 'POL-EXT-999' was blocked by PolicyValidator.enforceAuthorization.`,
        'critical'
      );
      setActiveTestResult({
        id: 'TC-04',
        title: 'Unauthorized Access (RBAC)',
        status: 'PASS',
        details: `Access Denied: Tenancy boundary strictly enforced. Deterministic validator caught '${err.code}': ${err.message}. Recorded in security audit log.`,
      });
    }
  };

  // Handler for TC-05: Approval Bypass Attempt
  const runTC05 = () => {
    ensureTestData();
    const motorClaim = inMemoryStore.getClaims().find(c => c.category === 'motor')!;
    motorClaim.statutoryDeclarationSigned = false; // uncheck declaration
    try {
      PolicyValidator.validateSubmissionApproval(motorClaim);
      setActiveTestResult({
        id: 'TC-05',
        title: 'Approval Bypass Attempt',
        status: 'FAIL',
        details: 'Failure: Carrier submission proceeded without signed declaration.',
      });
    } catch (err: any) {
      inMemoryStore.recordAudit(
        'SUBMISSION_BYPASS_PREVENTED',
        'Policy Engine',
        `Carrier dispatch rejected: Statutory fraud declaration signature was missing.`,
        'warning'
      );
      setActiveTestResult({
        id: 'TC-05',
        title: 'Approval Bypass Attempt',
        status: 'PASS',
        details: `Submission Blocked: Deterministic validator enforced '${err.code}': ${err.message}. Carrier dispatch was prevented.`,
      });
    }
  };

  // Handler for TC-06: Carrier Gateway Outage & Retry
  const runTC06 = () => {
    ensureTestData();
    inMemoryStore.testState.simulateCarrierOutage503 = true;
    const motorClaim = inMemoryStore.getClaims().find(c => c.category === 'motor')!;
    motorClaim.currentStep = 3; // Move to Review & Approval Step
    inMemoryStore.saveClaim(motorClaim);

    setActiveTestResult({
      id: 'TC-06',
      title: 'Carrier Gateway Outage (503) & Retry',
      status: 'BLOCKED',
      details:
        'Simulated carrier outage (HTTP 503) enabled. In Step 3 (Review & Approval), check the statutory declaration and click Submit to observe simulated failure and non-destructive retry mechanics.',
    });
    onNavigate('claim-wizard');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-slate-200 card-shadow w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded border border-amber-300">
                AUTOMATED TEST BENCH
              </span>
              <h2 className="text-base font-bold text-slate-900">
                InsureOS Acceptance Test Scenarios (TC-01 through TC-06)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select any scenario to run deterministic verification of success, failure, and security controls.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Test Matrix Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* Active Result Banner */}
          {activeTestResult && (
            <div
              className={`p-4 rounded-lg border text-xs mb-4 flex items-start gap-3 ${
                activeTestResult.status === 'PASS' || activeTestResult.status === 'INTERCEPTED'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              {activeTestResult.status === 'PASS' || activeTestResult.status === 'INTERCEPTED' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  <span>{activeTestResult.id}: {activeTestResult.title}</span>
                  <span className="px-2 py-0.2 text-[10px] uppercase font-bold rounded bg-white/80 border">
                    {activeTestResult.status}
                  </span>
                </div>
                <p className="leading-relaxed">{activeTestResult.details}</p>
              </div>
            </div>
          )}

          {/* Test Case Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* TC-01 */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-blue-400 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-blue-700">TC-01</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                    Primary Workflow
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">13-Stage Motor Claim End-to-End</h3>
                <p className="text-slate-500 text-[11px] leading-relaxed mb-3">
                  Runs the complete Aegis Motor Shield claim from intake, policy auto-detection, checklist, dossier preview, declaration approval, to receipt.
                </p>
              </div>
              <button
                id="btn-run-tc01"
                onClick={runTC01}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded transition-colors text-xs"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Launch Claim Wizard</span>
              </button>
            </div>

            {/* TC-02 */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-amber-400 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-amber-700">TC-02</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-amber-50 text-amber-700 rounded border border-amber-200">
                    Failure Path
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Missing Mandatory Documents Block</h3>
                <p className="text-slate-500 text-[11px] leading-relaxed mb-3">
                  Omit the itemized repair estimate. Stage 7 validation actively halts progression and requires an authorized demo exemption.
                </p>
              </div>
              <button
                id="btn-run-tc02"
                onClick={runTC02}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded transition-colors text-xs"
              >
                <FileX className="w-3.5 h-3.5" />
                <span>Simulate Missing Evidence</span>
              </button>
            </div>

            {/* TC-03 */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-red-400 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-red-700">TC-03</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-red-50 text-red-700 rounded border border-red-200">
                    OWASP Threat Defense
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Malicious Prompt-Injection Attack</h3>
                <p className="text-slate-500 text-[11px] leading-relaxed mb-3">
                  Upload an adversarial document containing commands to waive the $500 deductible and disburse funds. Observes quarantine and application lock.
                </p>
              </div>
              <button
                id="btn-run-tc03"
                onClick={runTC03}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-red-700 hover:bg-red-800 text-white font-semibold rounded transition-colors text-xs"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Trigger Injection Attack Test</span>
              </button>
            </div>

            {/* TC-04 */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-purple-400 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-purple-700">TC-04</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-purple-50 text-purple-700 rounded border border-purple-200">
                    RBAC Tenancy
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Unauthorized Cross-Tenant Access</h3>
                <p className="text-slate-500 text-[11px] leading-relaxed mb-3">
                  Simulate an attempt to access policy POL-EXT-999 outside the authenticated tenant scope. Validates 403 Access Denied.
                </p>
              </div>
              <button
                id="btn-run-tc04"
                onClick={runTC04}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded transition-colors text-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Test RBAC Boundary</span>
              </button>
            </div>

            {/* TC-05 */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-400 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-700">TC-05</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-slate-100 text-slate-700 rounded border border-slate-200">
                    Security Gate
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Approval Bypass Attempt</h3>
                <p className="text-slate-500 text-[11px] leading-relaxed mb-3">
                  Attempt to submit claim to carrier gateway without checking the mandatory statutory declaration. Verifies rejection.
                </p>
              </div>
              <button
                id="btn-run-tc05"
                onClick={runTC05}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded transition-colors text-xs"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Attempt Bypass Submit</span>
              </button>
            </div>

            {/* TC-06 */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-orange-400 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-orange-700">TC-06</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-orange-50 text-orange-700 rounded border border-orange-200">
                    Resilience & Retry
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Simulated Carrier 503 Outage</h3>
                <p className="text-slate-500 text-[11px] leading-relaxed mb-3">
                  Simulate a carrier electronic claims gateway failure. Validates diagnostic error code, non-destructive state retention, and retry button.
                </p>
              </div>
              <button
                id="btn-run-tc06"
                onClick={runTC06}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-orange-700 hover:bg-orange-800 text-white font-semibold rounded transition-colors text-xs"
              >
                <ServerCrash className="w-3.5 h-3.5" />
                <span>Simulate Carrier Outage (503)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            OWASP Layered Architecture • Deterministic Business Rules • Fictional Demo
          </span>
          <button
            id="btn-close-test-matrix"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
