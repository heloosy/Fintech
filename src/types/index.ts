// Fictional InsureOS Types & Domain Models

export type PolicyCategory = 'motor' | 'health' | 'home' | 'travel' | 'life';

export interface PolicyClause {
  id: string;
  section: string;
  title: string;
  text: string;
  category: string;
  keywords: string[];
  pageNumber: number;
  isExclusion?: boolean;
}

export interface Policy {
  id: string;
  carrier: string;
  carrierContact: {
    email: string;
    hotline: string;
    claimsPortalUrl: string;
    allowedRecipientWhitelist: string[];
  };
  category: PolicyCategory;
  name: string;
  policyNumber: string;
  status: 'active' | 'pending_renewal' | 'expired';
  premiumAnnual: number;
  effectiveDate: string;
  renewalDate: string;
  deductibleAmount: number; // Contractually fixed; cannot be changed by AI or unverified doc
  coverageLimit: number;
  verified: boolean;
  unverifiedFields?: string[];
  clauses: PolicyClause[];
  exclusions: string[];
  waitingPeriodDays?: number;
  originalDocumentName: string;
}

export interface ClaimDocument {
  id: string;
  name: string;
  type: string;
  required: boolean;
  uploaded: boolean;
  status: 'verified' | 'missing' | 'quarantined' | 'pending';
  fileSize?: string;
  uploadedAt?: string;
  threatDetected?: boolean;
}

export interface ClaimTimelineEvent {
  date: string;
  title: string;
  description: string;
  type: 'info' | 'action' | 'success' | 'alert';
}

export interface TransmissionReceipt {
  referenceNumber: string;
  timestamp: string;
  sha256Digest: string;
  status: string;
  recipient: string;
  simulatedLatencyMs: number;
}

export interface Claim {
  id: string;
  policyId: string;
  policyName: string;
  carrier: string;
  category: PolicyCategory;
  incidentDate: string;
  incidentLocation: string;
  submissionDate?: string;
  status: 'draft' | 'under_review' | 'action_required' | 'approved' | 'settled' | 'appealing';
  incidentDescription: string;
  estimatedLoss: number;
  approvedPayout?: number;
  deductibleApplied: number; // strictly enforced by application validator
  currentStep: number; // 1 to 13
  timeline: ClaimTimelineEvent[];
  documents: ClaimDocument[];
  exemptionGranted?: boolean;
  exemptionReason?: string;
  statutoryDeclarationSigned: boolean;
  recipientEmail: string;
  transmissionReceipt?: TransmissionReceipt;
  rejectionReason?: string;
  appealDraft?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  severity: 'info' | 'warning' | 'critical';
  prevHash: string;
  hash: string;
}

export interface ThreatReport {
  id: string;
  timestamp: string;
  source: string;
  adversarialSnippet: string;
  targetAction: string;
  mitigation: string;
  status: 'quarantined' | 'mitigated';
}

export interface PendingApproval {
  id: string;
  type: 'claim_submission' | 'document_exemption' | 'declaration_signature' | 'outbound_dispatch';
  title: string;
  summary: string;
  details: Record<string, string | number | boolean>;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
  consequenceWarning: string;
}

export interface VaultDocument {
  id: string;
  title: string;
  category: 'Policy Contract' | 'Claim Evidence' | 'Submission Receipt' | 'Medical Document' | 'Other';
  policy: string;
  carrier: string;
  uploadDate: string;
  ocrStatus: string;
  fileSize: string;
  textExcerpt: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  accountStatus: string;
  tenantId?: string;
}
