import {
  DEFAULT_EMPTY_PROFILE,
  INITIAL_SEED_CLAIMS,
  SEED_POLICIES,
  SEED_USER_PROFILE,
  SEED_VAULT_DOCUMENTS
} from '../data/seedData';
import { createAuditRecord, verifyAuditChain } from './hashChain';
import type { AuditRecord } from './hashChain';
import { PolicyValidator, SecurityValidationError } from './policyValidator';
import type { Claim, PendingApproval, Policy, ThreatReport, UserProfile, VaultDocument } from '../types';

class InMemoryStore {
  // Genuinely empty workspace by default
  private userProfile: UserProfile = { ...DEFAULT_EMPTY_PROFILE };
  private policies: Policy[] = [];
  private claims: Claim[] = [];
  private vaultDocuments: VaultDocument[] = [];
  private auditRecords: AuditRecord[] = [];
  private pendingApprovals: PendingApproval[] = [];
  private threatReports: ThreatReport[] = [];
  private genesisHash = 'GENESIS_HASH_0000000000000000000000000000000000000000000000000000000000';

  // Interactive Test Toggles (for TC-01 to TC-06)
  public testState = {
    simulateCarrierOutage503: false,
    latencyMs: 300,
    forceMissingRepairEstimate: false,
  };

  // In-memory demo draft state
  private activeClaimDraft: any = null;

  private listeners: Array<() => void> = [];

  constructor() {
    this.initCleanAuditLog();
  }

  private async initCleanAuditLog() {
    this.auditRecords = [];
    await this.recordAudit(
      'SESSION_INITIALIZED',
      'System Security Core',
      'Session cryptographic hash chain initialized. Clean workspace ready.',
      'info'
    );
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // --- User Profile ---
  public getUserProfile(): UserProfile {
    return { ...this.userProfile };
  }

  public setUserProfile(profile: Partial<UserProfile>) {
    this.userProfile = { ...this.userProfile, ...profile };
    this.notify();
  }

  // --- Policies (with RBAC enforcement) ---
  public getPolicies(): Policy[] {
    return [...this.policies];
  }

  public getPolicyById(id: string): Policy {
    // TC-04 Test Case: Unauthorized Access Attempt
    const allowedIds = this.policies.map(p => p.id);
    PolicyValidator.enforceAuthorization(id, allowedIds);

    const found = this.policies.find(p => p.id === id);
    if (!found) {
      throw new SecurityValidationError('ERR_NOT_FOUND', `Policy '${id}' not found.`);
    }
    return found;
  }

  public addPolicy(newPolicy: Policy) {
    this.policies.unshift(newPolicy);
    this.recordAudit(
      'POLICY_UPLOADED',
      this.userProfile.fullName || 'User',
      `New policy '${newPolicy.name}' (${newPolicy.policyNumber}) added to catalog. Deductible: $${newPolicy.deductibleAmount}.`,
      'info'
    );
    this.notify();
  }

  public updatePolicy(updated: Policy) {
    this.policies = this.policies.map(p => (p.id === updated.id ? updated : p));
    this.recordAudit(
      'POLICY_UPDATED',
      this.userProfile.fullName || 'User',
      `Policy fields edited and verified by policyholder for '${updated.id}'.`,
      'info'
    );
    this.notify();
  }

  public deletePolicy(id: string) {
    this.policies = this.policies.filter(p => p.id !== id);
    this.recordAudit(
      'POLICY_REMOVED',
      this.userProfile.fullName || 'User',
      `Policy '${id}' removed from workspace catalog.`,
      'info'
    );
    this.notify();
  }

  // --- Vault Documents ---
  public getVaultDocuments(): VaultDocument[] {
    return [...this.vaultDocuments];
  }

  public addVaultDocument(doc: VaultDocument) {
    this.vaultDocuments.unshift(doc);
    this.recordAudit(
      'DOCUMENT_UPLOADED',
      this.userProfile.fullName || 'User',
      `Document '${doc.title}' (${doc.category}) uploaded and indexed in vault.`,
      'info'
    );
    this.notify();
  }

  public deleteVaultDocument(id: string) {
    this.vaultDocuments = this.vaultDocuments.filter(d => d.id !== id);
    this.recordAudit(
      'DOCUMENT_DELETED',
      this.userProfile.fullName || 'User',
      `Document '${id}' deleted from vault.`,
      'info'
    );
    this.notify();
  }

  // --- Claims ---
  public getClaims(): Claim[] {
    return [...this.claims];
  }

  public getClaimById(id: string): Claim | undefined {
    return this.claims.find(c => c.id === id);
  }

  public saveClaim(claim: Claim) {
    const idx = this.claims.findIndex(c => c.id === claim.id);
    if (idx >= 0) {
      this.claims[idx] = { ...claim };
    } else {
      this.claims.unshift({ ...claim });
    }
    this.notify();
  }

  // --- In-Memory Demo Claim Draft ---
  public saveDraft(draft: any) {
    this.activeClaimDraft = {
      ...draft,
      savedAt: new Date().toISOString(),
    };
    this.recordAudit(
      'DRAFT_SAVED',
      this.userProfile.fullName || 'User',
      `In-memory claim draft saved at step ${draft.currentStep || 1} with ${draft.documents?.length || 0} staged documents.`,
      'info'
    );
    this.notify();
  }

  public getDraft(): any | null {
    return this.activeClaimDraft ? JSON.parse(JSON.stringify(this.activeClaimDraft)) : null;
  }

  public clearDraft() {
    this.activeClaimDraft = null;
    this.recordAudit(
      'DRAFT_CLEARED',
      this.userProfile.fullName || 'User',
      'Active in-memory claim draft discarded.',
      'info'
    );
    this.notify();
  }

  // --- Session Audit Log with Hash Chain ---
  public async recordAudit(
    action: string,
    actor: string,
    details: string,
    severity: 'info' | 'warning' | 'critical' = 'info'
  ) {
    const prevHash =
      this.auditRecords.length > 0
        ? this.auditRecords[this.auditRecords.length - 1].hash
        : this.genesisHash;

    const record = await createAuditRecord(action, actor, details, severity, prevHash);
    this.auditRecords.push(record);
    this.notify();
  }

  public getAuditRecords(): AuditRecord[] {
    return [...this.auditRecords];
  }

  /**
   * Intentionally alters an event's details WITHOUT updating the SHA-256 hash.
   * Demonstrates session-level audit integrity and tamper detection!
   */
  public simulateTamperAuditRecord(index: number) {
    if (index >= 0 && index < this.auditRecords.length) {
      const target = this.auditRecords[index];
      target.details = target.details + ' [UNAUTHORIZED_MANUAL_TAMPER_MODIFICATION]';
      this.notify();
    }
  }

  public async verifyIntegrity() {
    return await verifyAuditChain(this.auditRecords);
  }

  // --- Approvals Queue ---
  public getPendingApprovals(): PendingApproval[] {
    return [...this.pendingApprovals];
  }

  public addPendingApproval(approval: PendingApproval) {
    this.pendingApprovals.unshift(approval);
    this.recordAudit(
      'APPROVAL_REQUESTED',
      'Security Gatekeeper',
      `Pending approval generated for '${approval.title}'. Consequence warning: ${approval.consequenceWarning}`,
      'warning'
    );
    this.notify();
  }

  public resolvePendingApproval(id: string, status: 'approved' | 'rejected') {
    const item = this.pendingApprovals.find(a => a.id === id);
    if (item) {
      item.status = status;
      this.recordAudit(
        status === 'approved' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
        this.userProfile.fullName || 'User',
        `Action '${item.title}' was ${status} by authenticated policyholder.`,
        status === 'approved' ? 'info' : 'warning'
      );
      this.notify();
    }
  }

  // --- Threat Reports (Prompt Injection & Malicious Document Interceptions) ---
  public getThreatReports(): ThreatReport[] {
    return [...this.threatReports];
  }

  public recordThreat(threat: ThreatReport) {
    this.threatReports.unshift(threat);
    this.recordAudit(
      'PROMPT_INJECTION_INTERCEPTED',
      'Safety Engine (Layer 4)',
      `Threat payload neutralized in '${threat.source}'. Target action: ${threat.targetAction}. Quarantined without executing commands.`,
      'critical'
    );
    this.notify();
  }

  // --- Optional Demo Data Loading ---
  public async loadSampleData() {
    this.userProfile = { ...SEED_USER_PROFILE };
    this.policies = JSON.parse(JSON.stringify(SEED_POLICIES));
    this.claims = JSON.parse(JSON.stringify(INITIAL_SEED_CLAIMS));
    this.vaultDocuments = JSON.parse(JSON.stringify(SEED_VAULT_DOCUMENTS));
    await this.recordAudit(
      'SAMPLE_DATA_LOADED',
      this.userProfile.fullName,
      'Optional sample policies (5), claims, and documents loaded upon explicit user action.',
      'info'
    );
    this.notify();
  }

  // --- Reset to Genuinely Empty Workspace ---
  public async resetToEmptyWorkspace() {
    this.userProfile = { ...DEFAULT_EMPTY_PROFILE };
    this.policies = [];
    this.claims = [];
    this.vaultDocuments = [];
    this.pendingApprovals = [];
    this.threatReports = [];
    this.activeClaimDraft = null;
    this.testState = {
      simulateCarrierOutage503: false,
      latencyMs: 300,
      forceMissingRepairEstimate: false,
    };
    this.initCleanAuditLog();
    this.notify();
  }

  // Legacy reset method pointing to resetToEmptyWorkspace
  public resetToDefaults() {
    this.resetToEmptyWorkspace();
  }
}

export const inMemoryStore = new InMemoryStore();
