import React, { useState, useEffect } from 'react';
import {
  FileText,
  Car,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  FileCheck2,
  Clock,
  Sparkles,
  Lock,
  Download,
  AlertCircle,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Send,
  HelpCircle,
  Layers,
  Edit2,
  Check,
  Mic,
  MicOff,
  UserCheck,
  Save,
  Trash2,
  FileUp,
  FileSearch,
  Scale
} from 'lucide-react';
import { inMemoryStore } from '../services/inMemoryStore';
import { MockAIService } from '../services/mockAIService';
import { PolicyValidator, SecurityValidationError } from '../services/policyValidator';
import { CarrierGateway } from '../services/carrierGateway';
import { SafetyEngine } from '../services/safetyEngine';
import { ApiClient } from '../services/apiClient';
import type { Claim, ClaimDocument, Policy, TransmissionReceipt } from '../types';

interface UniversalClaimWizardProps {
  onInspectClause: (clause: any, policyName: string, carrier: string) => void;
  onNavigateToClaimsList: () => void;
  onOpenApprovals: () => void;
}

export const UniversalClaimWizard: React.FC<UniversalClaimWizardProps> = ({
  onInspectClause,
  onNavigateToClaimsList,
  onOpenApprovals,
}) => {
  const policies = inMemoryStore.getPolicies();
  const profile = inMemoryStore.getUserProfile();
  const claimantName = profile.fullName || 'Policyholder';
  const claimantId = profile.id || 'USR-LOCAL-001';

  // Fallback unverified policy when user workspace has no uploaded policies
  const unverifiedPolicy: Policy = {
    id: 'POL-UNVERIFIED',
    carrier: 'Unverified Carrier (No Policy Uploaded)',
    carrierContact: {
      email: 'claims@aegis-underwriters.simulated.local',
      hotline: '1-800-555-0199',
      claimsPortalUrl: 'https://claims.aegis.simulated.local',
      allowedRecipientWhitelist: [
        'claims@aegis-underwriters.simulated.local',
        'edi-intake@carrier-gateway.simulated.local',
        'claims@clarion-mutual.simulated.local',
      ],
    },
    category: 'motor',
    name: 'Unverified Policy (Draft)',
    policyNumber: 'UNVERIFIED-DRAFT',
    status: 'pending_renewal',
    premiumAnnual: 0,
    effectiveDate: new Date().toISOString().slice(0, 10),
    renewalDate: '2027-12-31',
    deductibleAmount: 500,
    coverageLimit: 50000,
    verified: false,
    unverifiedFields: ['Deductible', 'Coverage Limit', 'Exclusions', 'Carrier Verification'],
    clauses: [
      {
        id: 'CLS-UNVERIFIED-01',
        section: 'Sec 0.0',
        title: 'Unverified Policy Notice',
        text: 'This claim is being prepared without an uploaded policy. Coverage, limits, and deductible obligations are unverified until an official policy document is uploaded and validated.',
        category: 'Exclusions',
        keywords: ['unverified', 'notice'],
        pageNumber: 1,
      },
    ],
    exclusions: ['Unverified coverage until policy contract is uploaded'],
    originalDocumentName: 'None (Unverified Workspace)',
  };

  const defaultMotorPolicy = policies.find(p => p.category === 'motor') || policies[0] || unverifiedPolicy;

  // User-Facing 4-Step Architecture
  // Step 1: Incident Intake (Internal Stages 1, 2, 3, 4)
  // Step 2: AI Claim Preparation (Internal Stages 5, 6, 7, 8)
  // Step 3: Review & Approval (Internal Stages 9, 10)
  // Step 4: Submission & Tracking (Internal Stages 11, 12, 13)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Underlying 13-Stage Internal Pipeline State
  const [internalStage, setInternalStage] = useState<number>(1);
  const [showUnderlyingPipeline, setShowUnderlyingPipeline] = useState<boolean>(false);

  // In-Memory Draft Status
  const [savedDraftNotice, setSavedDraftNotice] = useState<string | null>(null);
  const [hasExistingDraft, setHasExistingDraft] = useState<boolean>(false);

  // Step 1: Incident Intake States
  const [incidentText, setIncidentText] = useState(
    policies.length > 0
      ? 'Two-vehicle collision occurred at the intersection of Elmwood Ave and 4th St. Third-party vehicle failed to yield on a right-hand turn and struck the front driver-side bumper and grille assembly.'
      : ''
  );
  const [isDictating, setIsDictating] = useState(false);
  const [dictationTime, setDictationTime] = useState(0);

  // Extracted Facts (AI Autonomous Extraction with Inline User Correction)
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
  const [incidentTime, setIncidentTime] = useState(policies.length > 0 ? '14:35 EST' : '14:30');
  const [incidentType, setIncidentType] = useState(policies.length > 0 ? 'Collision - Third-Party Failure to Yield' : 'Collision Damage');
  const [incidentLocation, setIncidentLocation] = useState(policies.length > 0 ? 'Elmwood Ave & 4th St, Fictional Metro District, NY' : 'Elmwood Ave & 4th St');
  const [insuredVehicle, setInsuredVehicle] = useState(policies.length > 0 ? '2024 Apex Horizon EV • VIN: 1HGCR2F83HA029101 • Tag: NY-441-AM' : 'Insured Vehicle (Vehicle Tag / VIN)');
  const [thirdPartyInfo, setThirdPartyInfo] = useState(policies.length > 0 ? 'Driver: Marcus Miller • Vehicle: Blue Sedan • License Plate: NY-882-XY' : 'Third-Party Driver & Tag Details');
  const [policeBlotterRef, setPoliceBlotterRef] = useState(policies.length > 0 ? 'MPD-2026-BLOTTER-9102' : 'POLICE-INCIDENT-PENDING');
  const [estimatedLoss, setEstimatedLoss] = useState<number>(policies.length > 0 ? 4350 : 3500);

  // AI Clarification Query (Step 1 Missing / Ambiguous Information Gate)
  const [injuryStatus, setInjuryStatus] = useState<'none' | 'minor' | 'emergency'>('none');
  const [injuryConfirmed, setInjuryConfirmed] = useState<boolean>(true);

  // Policy Matching & Grounding (Evidence-Based, No Synthetic Percentages)
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(defaultMotorPolicy.id);

  // Step 2: Background Progress & Evidence Checklist States
  // Progress states: Extracting -> Matching Policy -> Checking Evidence -> Preparing Dossier -> Ready for Review
  const [aiProcessingPhase, setAiProcessingPhase] = useState<string>('Ready for Review');
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [processingStageIndex, setProcessingStageIndex] = useState<number>(4);

  const backgroundProgressPhases = [
    { label: 'Extracting Facts', desc: 'Parsing incident narrative, OCR metadata, and location entities' },
    { label: 'Matching Policy', desc: 'Cross-referencing schedule POL-MOT-2024-8841 and Section 3.1' },
    { label: 'Checking Evidence', desc: 'Screening file integrity, checksums, and prompt-injection safety' },
    { label: 'Preparing Dossier', desc: 'Executing deterministic deductible lock ($500.00) & compiling EDI package' },
    { label: 'Ready for Review', desc: 'All preliminary validation gates satisfied' },
  ];

  const [documents, setDocuments] = useState<ClaimDocument[]>(() => {
    const vaultDocs = inMemoryStore.getVaultDocuments();
    if (vaultDocs.length > 0) {
      return [
        {
          id: 'doc-pol-rep',
          name: vaultDocs.find(d => d.title.toLowerCase().includes('police'))?.title || 'Police_Blotter_Incident_Report_7719.pdf',
          type: 'Police Report',
          required: true,
          uploaded: true,
          status: 'verified',
          fileSize: '420 KB',
          uploadedAt: '2026-10-15 09:00',
        },
        {
          id: 'doc-lic',
          name: vaultDocs.find(d => d.title.toLowerCase().includes('license') || d.title.toLowerCase().includes('driver'))?.title || 'Driver_License_Proof.jpg',
          type: "Driver's License",
          required: true,
          uploaded: true,
          status: 'verified',
          fileSize: '1.2 MB',
          uploadedAt: '2026-10-15 09:02',
        },
        {
          id: 'doc-est',
          name: vaultDocs.find(d => d.title.toLowerCase().includes('estimate') || d.title.toLowerCase().includes('repair'))?.title || 'Metro_Collision_Itemized_Estimate_902.pdf',
          type: 'Itemized Repair Estimate',
          required: true,
          uploaded: !inMemoryStore.testState.forceMissingRepairEstimate,
          status: inMemoryStore.testState.forceMissingRepairEstimate ? 'missing' : 'verified',
          fileSize: '680 KB',
          uploadedAt: '2026-10-15 09:10',
        },
        {
          id: 'doc-photo',
          name: vaultDocs.find(d => d.title.toLowerCase().includes('photo') || d.title.toLowerCase().includes('damage'))?.title || 'Front_Bumper_Damage_Photo_1.jpg',
          type: 'Damage Photo',
          required: true,
          uploaded: true,
          status: 'verified',
          fileSize: '2.4 MB',
          uploadedAt: '2026-10-15 09:12',
        },
      ];
    }
    return [
      {
        id: 'doc-pol-rep',
        name: 'Police_Blotter_Incident_Report.pdf',
        type: 'Police Report',
        required: true,
        uploaded: false,
        status: 'missing',
        fileSize: '—',
      },
      {
        id: 'doc-lic',
        name: 'Driver_License_Proof.jpg',
        type: "Driver's License",
        required: true,
        uploaded: false,
        status: 'missing',
        fileSize: '—',
      },
      {
        id: 'doc-est',
        name: 'Itemized_Repair_Estimate.pdf',
        type: 'Itemized Repair Estimate',
        required: true,
        uploaded: false,
        status: 'missing',
        fileSize: '—',
      },
      {
        id: 'doc-photo',
        name: 'Damage_Photos_Scene.jpg',
        type: 'Damage Photo',
        required: true,
        uploaded: false,
        status: 'missing',
        fileSize: '—',
      },
    ];
  });

  // Exemption State (Requirement #2: Separate human authorization flow)
  const [exemptionGranted, setExemptionGranted] = useState(false);
  const [exemptionReason, setExemptionReason] = useState('');
  const [exemptionPendingNotice, setExemptionPendingNotice] = useState(false);

  // Step 3: Review & Explicit Approval States
  const [statutoryDeclarationChecked, setStatutoryDeclarationChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isEditingInStep3, setIsEditingInStep3] = useState(false);

  // Step 4: Submission Receipt & Tracking
  const [receipt, setReceipt] = useState<TransmissionReceipt | null>(null);
  const [generatedAppealLetter, setGeneratedAppealLetter] = useState<string>('');

  const currentPolicy = policies.find(p => p.id === selectedPolicyId) || defaultMotorPolicy;
  const missingEstimate = documents.find(d => d.type === 'Itemized Repair Estimate')?.uploaded === false;

  // Document Intelligence Fact Extraction State
  const [isExtractingFromDocs, setIsExtractingFromDocs] = useState(false);
  const [extractedFactsResult, setExtractedFactsResult] = useState<any>(null);

  const handleExtractFromUploadedDocs = async () => {
    setIsExtractingFromDocs(true);
    const docs = await ApiClient.getDocuments();
    const policyDoc = docs.find(d => d.category === 'Policy Contract');
    const evidenceDocs = docs.filter(d => d.category !== 'Policy Contract').map(d => d.id);

    const result = await ApiClient.extractClaimFacts(policyDoc?.id, evidenceDocs);
    setIsExtractingFromDocs(false);

    if (result.success && result.extractedFacts) {
      const { policy, incident, settlement } = result.extractedFacts;
      setExtractedFactsResult(result.extractedFacts);

      if (incident.incidentDate) setIncidentDate(incident.incidentDate);
      if (incident.incidentLocation) setIncidentLocation(incident.incidentLocation);
      if (incident.estimatedLoss) setEstimatedLoss(incident.estimatedLoss);
      if (incident.incidentSummary) setIncidentText(incident.incidentSummary);
      if (policy.vehicle) setInsuredVehicle(policy.vehicle);

      // Sync checklist
      if (Array.isArray(result.extractedFacts.evidenceChecklist)) {
        setDocuments(prev =>
          prev.map(d => {
            const match = result.extractedFacts.evidenceChecklist.find((ec: any) => ec.type === d.type);
            if (match && match.uploaded) {
              return {
                ...d,
                uploaded: true,
                status: 'verified',
                name: match.matchedDoc || d.name,
              };
            }
            return d;
          })
        );
      }

      alert(`Extracted facts from ${policyDoc ? policyDoc.filename : 'unverified policy'} and ${evidenceDocs.length} evidence document(s).\n\nSettlement Calculated (Deterministic Code):\nTotal Loss: $${settlement.totalLoss.toLocaleString()}\nDeductible: -$${settlement.deductibleApplied.toLocaleString()}\nNet Payable: $${settlement.netPayable.toLocaleString()}`);
    } else {
      alert('Could not extract facts: ' + (result.error || 'No documents available.'));
    }
  };

  // Check for existing in-memory draft on mount
  useEffect(() => {
    const existing = inMemoryStore.getDraft();
    if (existing) {
      setHasExistingDraft(true);
    }
  }, []);

  // Sync test state from inMemoryStore
  useEffect(() => {
    if (inMemoryStore.testState.forceMissingRepairEstimate) {
      setDocuments(prev =>
        prev.map(d =>
          d.type === 'Itemized Repair Estimate'
            ? { ...d, uploaded: false, status: 'missing' }
            : d
        )
      );
      setExemptionGranted(false);
      setCurrentStep(2); // Jump to preparation step to inspect missing document
      setInternalStage(7);
    }
  }, [inMemoryStore.testState.forceMissingRepairEstimate]);

  // Voice dictation simulation timer
  useEffect(() => {
    let interval: any;
    if (isDictating) {
      interval = setInterval(() => setDictationTime(t => t + 1), 1000);
    } else {
      setDictationTime(0);
    }
    return () => clearInterval(interval);
  }, [isDictating]);

  // Save in-memory demo draft
  const handleSaveDraft = () => {
    const draftPayload = {
      currentStep,
      internalStage,
      incidentText,
      incidentDate,
      incidentTime,
      incidentType,
      incidentLocation,
      insuredVehicle,
      thirdPartyInfo,
      policeBlotterRef,
      estimatedLoss,
      injuryStatus,
      selectedPolicyId,
      documents,
      exemptionGranted,
      exemptionReason,
    };
    inMemoryStore.saveDraft(draftPayload);
    setHasExistingDraft(true);
    setSavedDraftNotice('Draft state safely saved to in-memory store.');
    setTimeout(() => setSavedDraftNotice(null), 3000);
  };

  // Resume saved in-memory demo draft
  const handleResumeDraft = () => {
    const draft = inMemoryStore.getDraft();
    if (!draft) return;

    setCurrentStep(draft.currentStep || 1);
    setInternalStage(draft.internalStage || 1);
    if (draft.incidentText) setIncidentText(draft.incidentText);
    if (draft.incidentDate) setIncidentDate(draft.incidentDate);
    if (draft.incidentTime) setIncidentTime(draft.incidentTime);
    if (draft.incidentType) setIncidentType(draft.incidentType);
    if (draft.incidentLocation) setIncidentLocation(draft.incidentLocation);
    if (draft.insuredVehicle) setInsuredVehicle(draft.insuredVehicle);
    if (draft.thirdPartyInfo) setThirdPartyInfo(draft.thirdPartyInfo);
    if (draft.policeBlotterRef) setPoliceBlotterRef(draft.policeBlotterRef);
    if (draft.estimatedLoss) setEstimatedLoss(draft.estimatedLoss);
    if (draft.injuryStatus) setInjuryStatus(draft.injuryStatus);
    if (draft.selectedPolicyId) setSelectedPolicyId(draft.selectedPolicyId);
    if (draft.documents) setDocuments(draft.documents);
    if (draft.exemptionGranted !== undefined) setExemptionGranted(draft.exemptionGranted);
    if (draft.exemptionReason) setExemptionReason(draft.exemptionReason);

    setSavedDraftNotice('Resumed in-memory demo draft successfully.');
    setTimeout(() => setSavedDraftNotice(null), 3000);
  };

  // Discard draft
  const handleDiscardDraft = () => {
    inMemoryStore.clearDraft();
    setHasExistingDraft(false);
    setSavedDraftNotice('In-memory demo draft cleared.');
    setTimeout(() => setSavedDraftNotice(null), 2500);
  };

  // Run AI Preparation background sequence in Step 2
  const triggerAiPreparation = () => {
    setIsAiProcessing(true);
    setProcessingStageIndex(0);
    setAiProcessingPhase('Extracting Facts...');

    // Stage 1 & 4 Audit
    inMemoryStore.recordAudit(
      'AI_INTAKE_EXTRACTED',
      'AI Intake Pipeline',
      `Autonomous extraction completed: Date=${incidentDate}, Location=${incidentLocation}, Loss=$${estimatedLoss}.`,
      'info'
    );

    setTimeout(() => {
      setInternalStage(5); // Dynamic checklist
      setProcessingStageIndex(1);
      setAiProcessingPhase('Matching Policy...');
      inMemoryStore.recordAudit(
        'POLICY_MATCH_GROUNDED',
        'Deterministic Rules Engine',
        `Matched policy '${currentPolicy.name}' (${currentPolicy.policyNumber}) based on collision evidence citations.`,
        'info'
      );
    }, 400);

    setTimeout(() => {
      setInternalStage(6); // Evidence screening
      setProcessingStageIndex(2);
      setAiProcessingPhase('Checking Evidence...');
      inMemoryStore.recordAudit(
        'EVIDENCE_SCREENING_COMPLETED',
        'Safety Engine (Layer 4)',
        `Scanned ${documents.length} evidence attachments for checksum, readability, and prompt injection.`,
        'info'
      );
    }, 800);

    setTimeout(() => {
      setInternalStage(7); // Validation
      setProcessingStageIndex(3);
      setAiProcessingPhase('Preparing Dossier...');
      inMemoryStore.recordAudit(
        'CONTRACTUAL_RULES_VALIDATED',
        'Policy Validator',
        `Enforced statutory deductible $500.00 locked to Section 3.1. Sub-limit $100,000 verified.`,
        'info'
      );
    }, 1200);

    setTimeout(() => {
      setInternalStage(8); // Dossier generation
      setProcessingStageIndex(4);
      setAiProcessingPhase('Ready for Review');
      setIsAiProcessing(false);
    }, 1600);
  };

  // Step Progression Handler
  const handleProceedToStep = (targetStep: number) => {
    // Step 1 -> Step 2
    if (targetStep === 2) {
      triggerAiPreparation();
      setCurrentStep(2);
      return;
    }

    // Step 2 -> Step 3: Hard Validation Gate
    if (targetStep === 3) {
      if (missingEstimate && !exemptionGranted) {
        alert(
          'Progression Blocked: Mandatory evidence missing (Itemized Repair Estimate). Under Section 3.4, repair estimates exceeding $1,000 must include itemized breakdowns. Please upload the estimate or request an authorized supervisor exemption.'
        );
        return;
      }
      setInternalStage(9); // Recipient preview
      inMemoryStore.recordAudit(
        'PRE_SUBMISSION_DOSSIER_COMPILED',
        'Claim Assembler',
        `EDI-CLAIM-V3 compiled for ${currentPolicy.carrierContact.email}. Awaiting human approval gate.`,
        'info'
      );
      setCurrentStep(3);
      return;
    }

    // Step 3 -> Step 4 is triggered via explicit submission
    if (targetStep === 4) {
      if (!statutoryDeclarationChecked) {
        alert('Approval Required: You must review and check the statutory fraud declaration before submission.');
        return;
      }
      handleSubmitClaim();
      return;
    }

    setCurrentStep(targetStep);
  };

  // Voice Dictation Toggle
  const handleToggleVoiceDictation = () => {
    if (isDictating) {
      setIsDictating(false);
      setIncidentText(
        'Two-vehicle collision occurred at the intersection of Elmwood Ave and 4th St. Third-party vehicle failed to yield on a right-hand turn and struck the front driver-side bumper and grille assembly.'
      );
    } else {
      setIsDictating(true);
    }
  };

  // Upload Evidence File
  const handleSimulateEvidenceUpload = (type: string) => {
    setDocuments(prev =>
      prev.map(d =>
        d.type === type ? { ...d, uploaded: true, status: 'verified', fileSize: '850 KB' } : d
      )
    );
  };

  // Real file upload handling for Step 1
  const handleRealEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const sizeStr =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

      // Determine category/type based on filename
      const lower = file.name.toLowerCase();
      let docType = 'Claim Evidence';
      if (lower.includes('police') || lower.includes('blotter')) docType = 'Police Report';
      else if (lower.includes('estimate') || lower.includes('invoice') || lower.includes('repair'))
        docType = 'Itemized Repair Estimate';
      else if (
        lower.includes('photo') ||
        lower.includes('image') ||
        lower.includes('jpg') ||
        lower.includes('png')
      )
        docType = 'Damage Photo';
      else if (lower.includes('dashcam') || lower.includes('video') || lower.includes('mp4'))
        docType = 'Dashcam Footage';

      const newDoc: ClaimDocument = {
        id: `doc-evid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        type: docType,
        required: false,
        uploaded: true,
        status: 'verified',
        fileSize: sizeStr,
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };

      setDocuments(prev => [...prev, newDoc]);

      // Also persist to Vault and sync with Local Backend Intelligence
      inMemoryStore.addVaultDocument({
        id: newDoc.id,
        title: file.name,
        category: 'Claim Evidence',
        policy: currentPolicy?.name || 'Unassigned',
        carrier: currentPolicy?.carrier || 'Carrier Pending',
        uploadDate: new Date().toISOString().split('T')[0],
        fileSize: sizeStr,
        ocrStatus: 'Indexed',
        textExcerpt: `Attached file ${file.name} (${sizeStr}) uploaded via Claim Intake Wizard.`,
      });

      // Index in local backend
      ApiClient.uploadFile(file, docType).catch(err => console.warn('[ClaimWizard] Backend sync error:', err));
    });

    e.target.value = '';
  };

  // Real file upload handling for a specific checklist item in Step 2
  const handleEvidenceItemRealUpload = (
    docId: string,
    docType: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    setDocuments(prev =>
      prev.map(d =>
        d.id === docId || d.type === docType
          ? {
              ...d,
              name: file.name,
              uploaded: true,
              status: 'verified',
              fileSize: sizeStr,
              uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
            }
          : d
      )
    );

    // Also persist to Vault
    inMemoryStore.addVaultDocument({
      id: docId,
      title: file.name,
      category: 'Claim Evidence',
      policy: currentPolicy?.name || 'Unassigned',
      carrier: currentPolicy?.carrier || 'Carrier Pending',
      uploadDate: new Date().toISOString().split('T')[0],
      fileSize: sizeStr,
      ocrStatus: 'Indexed',
      textExcerpt: `Attached file ${file.name} (${sizeStr}) uploaded for ${docType} checklist item.`,
    });

    // Index in local backend
    ApiClient.uploadFile(file, docType).catch(err => console.warn('[ClaimWizard] Backend sync error:', err));

    e.target.value = '';
  };

  // Add new file staging in Step 1
  const handleStageNewFile = () => {
    const newDocId = `doc-supp-${Date.now()}`;
    const newDoc: ClaimDocument = {
      id: newDocId,
      name: `Scene_Dashcam_Recording_${Date.now().toString().slice(-4)}.mp4`,
      type: 'Dashcam Footage',
      required: false,
      uploaded: true,
      status: 'verified',
      fileSize: '14.2 MB',
      uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };
    setDocuments(prev => [...prev, newDoc]);
    alert(`Evidence Staged: Attached ${newDoc.name} to claim intake.`);
  };

  // Test Case TC-03: Upload Adversarial Evidence Document
  const handleUploadAdversarialEvidence = () => {
    const payload = SafetyEngine.getAdversarialSamplePayload();
    const threat = SafetyEngine.analyzeUntrustedText(payload.content);

    inMemoryStore.recordThreat({
      id: `THR-DOC-${Date.now()}`,
      timestamp: new Date().toISOString(),
      source: payload.filename,
      adversarialSnippet: threat.sanitizedSnippet,
      targetAction: 'Force deductible = $0 and disburse $18,500',
      mitigation: 'Threat neutralized. Document tagged as quarantined. Policy contractual deductible remains locked at $500.',
      status: 'quarantined',
    });

    setDocuments(prev => [
      ...prev,
      {
        id: 'doc-adversarial',
        name: payload.filename,
        type: 'Repair Estimate (Adversarial Test)',
        required: false,
        uploaded: true,
        status: 'quarantined',
        threatDetected: true,
        fileSize: '1.1 MB',
      },
    ]);

    alert(
      `OWASP Defense Intercepted: Adversarial prompt injection detected in '${payload.filename}'. File quarantined. Deterministic application logic strictly keeps the $500 deductible.`
    );
  };

  // Supervisor Exemption Request (Requirement #2)
  const handleRequestExemption = () => {
    inMemoryStore.addPendingApproval({
      id: `APPR-EXEMP-${Date.now()}`,
      type: 'document_exemption',
      title: 'Missing Repair Estimate Exemption Request',
      summary: 'Policyholder requested temporary waiver of garage estimate requirement due to vehicle towing delay.',
      details: {
        policyId: currentPolicy.id,
        claimant: `${claimantName} (${claimantId})`,
        missingItem: 'Itemized Repair Estimate',
      },
      status: 'pending',
      timestamp: new Date().toISOString(),
      consequenceWarning:
        'Authorizing an exemption bypasses the mandatory document requirement and permits claim progression to Step 3.',
    });
    setExemptionPendingNotice(true);
    alert(
      'Exemption approval requested. Per security requirement #2, exemptions must follow an explicit, separately authorized demo approval flow. Please visit the Security & Approvals Centre.'
    );
  };

  const handleGrantDemoExemption = () => {
    setExemptionGranted(true);
    setExemptionReason('Authorized demo supervisor waiver: Garage inspection scheduled post-intake.');
    setExemptionPendingNotice(false);
    alert('Demo exemption granted by supervisor. Progression to Step 3 unlocked.');
  };

  // Step 3 -> Step 4 Carrier Submission Dispatch
  const handleSubmitClaim = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);

    const generatedClaimId = `CLM-${new Date().getFullYear()}-${currentPolicy.carrier ? currentPolicy.carrier.slice(0, 5).toUpperCase().replace(/[^A-Z]/g, '') : 'SIM'}-${Math.floor(1000 + Math.random() * 9000)}`;

    const claimToSubmit: Claim = {
      id: generatedClaimId,
      policyId: currentPolicy.id,
      policyName: currentPolicy.name,
      carrier: currentPolicy.carrier,
      category: currentPolicy.category,
      incidentDate,
      incidentLocation,
      status: 'draft',
      incidentDescription: incidentText,
      estimatedLoss,
      deductibleApplied: currentPolicy.deductibleAmount,
      currentStep: 10,
      statutoryDeclarationSigned: statutoryDeclarationChecked,
      recipientEmail: currentPolicy.carrierContact.email,
      timeline: [
        {
          date: new Date().toISOString().replace('T', ' ').slice(0, 16),
          title: 'AI Claim Autopilot Submitted',
          description: `Automated claim intake and preparation reviewed and approved by ${claimantName}.`,
          type: 'info',
        },
      ],
      documents,
      exemptionGranted,
      exemptionReason,
    };

    try {
      const result = await CarrierGateway.submitClaim(claimToSubmit, currentPolicy);
      if (result.success && result.receipt) {
        setReceipt(result.receipt);
        setInternalStage(11); // Transmission confirmed
        inMemoryStore.recordAudit(
          'CARRIER_GATEWAY_DISPATCH_CONFIRMED',
          'Carrier Gateway',
          `Transmission receipt issued for ${result.receipt.referenceNumber || generatedClaimId}. SHA-256: ${result.receipt.sha256Digest.slice(0, 16)}...`,
          'info'
        );
        setCurrentStep(4); // Advance to Step 4: Submission & Tracking
      } else {
        setSubmissionError(result.errorMessage || 'Submission failed.');
      }
    } catch (err: any) {
      setSubmissionError(`Submission Blocked: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 4 Subrogation Appeal Draft Generator
  const handleGenerateAppeal = () => {
    const draft = `FORMAL APPEAL & RECONSIDERATION REQUEST
Date: ${new Date().toLocaleDateString()}
To: Claims Review Committee, ${currentPolicy.carrier}
Reference: Claim #${receipt?.referenceNumber || 'CLM-CURRENT-SIM'}
Policy: ${currentPolicy.name} (${currentPolicy.policyNumber})
Policyholder: ${claimantName} (${claimantId})

Dear Claims Appeals Unit,

I am writing to formally dispute the settlement deduction of $${currentPolicy.deductibleAmount} applied to the repair of my front bumper assembly following the collision on Elmwood Ave.

Under Section 3.1 (Collision Damage Coverage) of my policy schedule, direct impact damages caused by third-party liability without comparative fault are indemnified in full. Attached is the supplemental police blotter report (${policeBlotterRef}) confirming 100% third-party fault by Marcus Miller.

I respectfully request subrogation against the at-fault driver's carrier and immediate refund of the $${currentPolicy.deductibleAmount} deductible.

Sincerely,
${claimantName}
(Simulated Demo Appeal Draft)`;

    setGeneratedAppealLetter(draft);
  };

  // Internal 13-stage names for pipeline inspector
  const internalStageNames = [
    'Stage 1: Incident Intake',
    'Stage 2: Policy Matching',
    'Stage 3: Coverage Assessment',
    'Stage 4: Details Extraction',
    'Stage 5: Dynamic Checklist',
    'Stage 6: Evidence Screening',
    'Stage 7: Deterministic Validation',
    'Stage 8: Claim Dossier Assembly',
    'Stage 9: Recipient Verification',
    'Stage 10: Human Approval Gate',
    'Stage 11: Submission Receipt',
    'Stage 12: SLA Tracking & Timelines',
    'Stage 13: Settlement & Appeal',
  ];

  const userStepTitles = [
    '1. Incident Intake',
    '2. AI Claim Preparation',
    '3. Review & Approval',
    '4. Submission & Tracking',
  ];

  return (
    <div className="space-y-6 pb-12 text-xs font-sans">
      {/* Streamlined 4-Step User Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                AI CLAIM AUTOPILOT
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 font-semibold">
                {currentPolicy.name} ({currentPolicy.carrier})
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Step {currentStep} of 4: {userStepTitles[currentStep - 1].split('. ')[1]}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Draft Controls */}
            <button
              onClick={handleSaveDraft}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              title="Save current claim state to in-memory store"
            >
              <Save className="w-3.5 h-3.5 text-slate-600" />
              <span>Save Demo Draft</span>
            </button>

            {hasExistingDraft && (
              <button
                onClick={handleResumeDraft}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition-colors"
                title="Restore saved in-memory draft"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                <span>Resume Draft</span>
              </button>
            )}

            {/* Toggle for underlying 13-stage execution pipeline */}
            <button
              onClick={() => setShowUnderlyingPipeline(!showUnderlyingPipeline)}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              title="Inspect underlying 13-stage deterministic logic"
            >
              <Layers className="w-3.5 h-3.5 text-blue-700" />
              <span>{showUnderlyingPipeline ? 'Hide Pipeline' : 'Inspect 13-Stage Pipeline'}</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <span className="text-[11px] font-mono text-slate-500 font-bold">
                Step {currentStep}/4
              </span>
              <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className="bg-blue-700 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {savedDraftNotice && (
          <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px] font-medium flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{savedDraftNotice}</span>
            </div>
            {hasExistingDraft && (
              <button
                onClick={handleDiscardDraft}
                className="text-red-700 hover:underline text-[10px] flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Discard
              </button>
            )}
          </div>
        )}

        {/* 4-Step Ribbon */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          {userStepTitles.map((title, idx) => {
            const stepNum = idx + 1;
            const isCurrent = currentStep === stepNum;
            const isCompleted = currentStep > stepNum;

            return (
              <button
                key={stepNum}
                onClick={() => {
                  if (stepNum <= currentStep || (stepNum === currentStep + 1 && !(currentStep === 2 && missingEstimate && !exemptionGranted))) {
                    handleProceedToStep(stepNum);
                  }
                }}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  isCurrent
                    ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-2xs font-bold'
                    : isCompleted
                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'bg-white border-slate-100 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider mb-0.5">
                  <span>Step {stepNum}</span>
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className="text-xs truncate">{title.split('. ')[1]}</div>
              </button>
            );
          })}
        </div>

        {/* Expandable Underlying 13-Stage Execution Pipeline Drawer */}
        {showUnderlyingPipeline && (
          <div className="mt-4 pt-3 border-t border-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-400" />
                Underlying Deterministic 13-Stage Execution Pipeline (All Security Gates Preserved)
              </span>
              <span className="text-[10px] font-mono text-blue-700 font-bold">
                Active Internal Stage: #{internalStage}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
              {internalStageNames.map((name, i) => {
                const stageNum = i + 1;
                const isPassed = internalStage > stageNum;
                const isActive = internalStage === stageNum;

                return (
                  <div
                    key={stageNum}
                    className={`p-1.5 rounded border text-[10px] truncate ${
                      isActive
                        ? 'bg-blue-700 text-white font-bold'
                        : isPassed
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium'
                        : 'bg-slate-50 border-slate-100 text-slate-400'
                    }`}
                    title={name}
                  >
                    <span className="font-mono">#{stageNum}</span> {name.split(': ')[1]}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: INCIDENT INTAKE & AUTONOMOUS EXTRACTION                          */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 card-shadow space-y-5 animate-in fade-in duration-150">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Step 1: Incident Intake</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                AI AUTONOMOUS EXTRACTION
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Describe the incident in natural language, dictate via microphone, or stage evidence files. InsureOS extracts key facts, matches your active policy, and cites verified policy clauses.
            </p>
          </div>

          {/* Narrative Input & Mock Voice Dictation */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 text-xs">Incident Narrative Description:</label>
              <button
                onClick={handleToggleVoiceDictation}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                  isDictating
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isDictating ? (
                  <>
                    <MicOff className="w-3.5 h-3.5" />
                    <span>Stop Voice Dictation ({dictationTime}s)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-blue-700" />
                    <span>Dictate with Microphone</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              rows={3}
              value={incidentText}
              onChange={e => setIncidentText(e.target.value)}
              className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs leading-relaxed text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 font-sans"
              placeholder="Describe what occurred, vehicle details, location, and observed damage..."
            />

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Quick Scenarios:</span>
                <button
                  onClick={() => {
                    setIncidentText(
                      'Two-vehicle collision occurred at the intersection of Elmwood Ave and 4th St. Third-party vehicle failed to yield on a right-hand turn and struck the front driver-side bumper and grille assembly.'
                    );
                    setIncidentDate('2026-10-14');
                    setIncidentTime('14:35 EST');
                    setIncidentType('Collision - Third-Party Failure to Yield');
                    setIncidentLocation('Elmwood Ave & 4th St, Fictional Metro District, NY');
                    setInsuredVehicle('2024 Apex Horizon EV • VIN: 1HGCR2F83HA029101 • Tag: NY-441-AM');
                    setThirdPartyInfo('Driver: Marcus Miller • Vehicle: Blue Sedan • License Plate: NY-882-XY');
                    setPoliceBlotterRef('MPD-2026-BLOTTER-9102');
                    setEstimatedLoss(4350);
                  }}
                  className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700 font-medium"
                >
                  Elmwood Ave Collision (Motor)
                </button>
                <button
                  onClick={() => {
                    setIncidentText(
                      'Sudden plumbing pipe rupture beneath vanity flooded hallway and drywalls with standing water.'
                    );
                    setIncidentDate(new Date().toISOString().slice(0, 10));
                    setIncidentTime('08:15 EST');
                    setIncidentType('Water Damage - Plumbing Rupture');
                    setIncidentLocation('442 Orchard Lane, Primary Residence');
                    setInsuredVehicle('N/A (Property Claim)');
                    setThirdPartyInfo('None (Internal plumbing failure)');
                    setPoliceBlotterRef('N/A (Dispatch #PL-8812)');
                    setEstimatedLoss(3200);
                  }}
                  className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700 font-medium"
                >
                  Bathroom Pipe Rupture (Home)
                </button>
              </div>

              <span className="font-mono text-slate-400">{incidentText.length} characters</span>
            </div>
          </div>

          {/* Evidence Staging in Step 1 */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-white border border-slate-200 text-blue-700">
                <FileUp className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800 text-xs">Stage Initial Evidence Documents</span>
                <p className="text-[11px] text-slate-500">
                  {documents.filter(d => d.uploaded).length} files staged for automated OCR & screening in Step 2.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="step1-real-file-upload"
                multiple
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.mp4"
                onChange={handleRealEvidenceUpload}
                className="hidden"
              />
              <label
                htmlFor="step1-real-file-upload"
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Document / Photo</span>
              </label>
              <button
                type="button"
                onClick={handleStageNewFile}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 font-medium rounded border border-slate-200 text-xs flex items-center gap-1 transition-colors"
                title="Add a sample dashcam clip"
              >
                <span>Sample Clip</span>
              </button>
            </div>
          </div>

          {/* AI Autonomous Fact Extraction & Grounding */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-700" />
                AI Autonomous Fact Extraction & Editable Fields
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExtractFromUploadedDocs}
                  disabled={isExtractingFromDocs}
                  className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded text-xs inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isExtractingFromDocs ? 'animate-spin' : ''}`} />
                  <span>Auto-Extract from Uploaded Documents</span>
                </button>
                <span className="text-[10px] text-purple-800 font-bold bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                  AI-EXTRACTED
                </span>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                  POLICY-GROUNDED
                </span>
              </div>
            </div>

            {/* Citations Box from Fact Extraction */}
            {extractedFactsResult && (
              <div className="p-3 bg-white rounded-lg border border-blue-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 text-xs flex items-center gap-1">
                    <FileSearch className="w-3.5 h-3.5 text-blue-700" />
                    Verified Document Citations & Grounded Settlement Math
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    DETERMINISTIC VERIFICATION
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 bg-slate-50 rounded border border-slate-200 space-y-0.5">
                    <span className="font-bold text-slate-700 block">Settlement Formula:</span>
                    <div>Total Loss: ${extractedFactsResult.settlement.totalLoss.toLocaleString()}</div>
                    <div>Contractual Deductible: -${extractedFactsResult.settlement.deductibleApplied.toLocaleString()}</div>
                    <div className="text-emerald-700 font-bold">Net Claim Payable: ${extractedFactsResult.settlement.netPayable.toLocaleString()}</div>
                  </div>

                  <div className="p-2 bg-slate-50 rounded border border-slate-200 space-y-0.5">
                    <span className="font-bold text-slate-700 block">Extracted Policy & Limits:</span>
                    <div>Policy: {extractedFactsResult.policy.policyNumber}</div>
                    <div>Collision Deductible: ${extractedFactsResult.policy.collisionDeductible || '500'}</div>
                    <div>Coverage Limit: ${extractedFactsResult.policy.collisionLimit?.toLocaleString() || '25,000'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Extracted Editable Facts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-2.5 bg-white rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Incident Date:
                  </span>
                  <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1 rounded">AI-EXTRACTED</span>
                </div>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={e => setIncidentDate(e.target.value)}
                  className="w-full mt-1 font-mono font-bold text-slate-900 border-b border-dashed border-slate-300 focus:outline-none text-xs"
                />
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Incident Time:
                  </span>
                  <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1 rounded">AI-EXTRACTED</span>
                </div>
                <input
                  type="text"
                  value={incidentTime}
                  onChange={e => setIncidentTime(e.target.value)}
                  className="w-full mt-1 font-mono font-bold text-slate-900 border-b border-dashed border-slate-300 focus:outline-none text-xs"
                />
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Estimated Loss:
                  </span>
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 rounded">ESTIMATE</span>
                </div>
                <div className="flex items-center gap-1 mt-1 font-mono font-bold text-slate-900">
                  <span>$</span>
                  <input
                    type="number"
                    value={estimatedLoss}
                    onChange={e => setEstimatedLoss(Number(e.target.value))}
                    className="w-full border-b border-dashed border-slate-300 focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-blue-100 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Incident Location:
                  </span>
                  <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1 rounded">AI-EXTRACTED</span>
                </div>
                <input
                  type="text"
                  value={incidentLocation}
                  onChange={e => setIncidentLocation(e.target.value)}
                  className="w-full mt-1 text-slate-900 font-medium border-b border-dashed border-slate-300 focus:outline-none text-xs"
                />
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Police Blotter Ref:
                  </span>
                  <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1 rounded">AI-EXTRACTED</span>
                </div>
                <input
                  type="text"
                  value={policeBlotterRef}
                  onChange={e => setPoliceBlotterRef(e.target.value)}
                  className="w-full mt-1 font-mono text-slate-900 border-b border-dashed border-slate-300 focus:outline-none text-xs"
                />
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-blue-100 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Insured Vehicle:
                  </span>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">POLICY REGISTER</span>
                </div>
                <input
                  type="text"
                  value={insuredVehicle}
                  onChange={e => setInsuredVehicle(e.target.value)}
                  className="w-full mt-1 text-slate-900 border-b border-dashed border-slate-300 focus:outline-none text-xs"
                />
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-blue-100 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Third-Party & Vehicle Details:
                  </span>
                  <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1 rounded">AI-EXTRACTED</span>
                </div>
                <input
                  type="text"
                  value={thirdPartyInfo}
                  onChange={e => setThirdPartyInfo(e.target.value)}
                  className="w-full mt-1 text-slate-900 border-b border-dashed border-slate-300 focus:outline-none text-xs"
                />
              </div>
            </div>

            {/* AI Critical Ambiguity Resolution Gate */}
            <div className="p-3 bg-white rounded-lg border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-700" />
                  AI Clarification Check: Were any injuries reported at the scene?
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {injuryConfirmed ? 'CONFIRMED BY USER' : 'ACTION REQUIRED'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                InsureOS asks only for critical ambiguities. Injury status determines bodily injury coverage clauses under Section 4.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => {
                    setInjuryStatus('none');
                    setInjuryConfirmed(true);
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold border transition-all ${
                    injuryStatus === 'none'
                      ? 'bg-blue-700 text-white border-blue-700 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  No Injuries Reported (Property Damage Only)
                </button>
                <button
                  onClick={() => {
                    setInjuryStatus('minor');
                    setInjuryConfirmed(true);
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold border transition-all ${
                    injuryStatus === 'minor'
                      ? 'bg-blue-700 text-white border-blue-700 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Minor First-Aid at Scene
                </button>
                <button
                  onClick={() => {
                    setInjuryStatus('emergency');
                    setInjuryConfirmed(true);
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold border transition-all ${
                    injuryStatus === 'emergency'
                      ? 'bg-blue-700 text-white border-blue-700 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Hospitalization / Emergency Medical
                </button>
              </div>
            </div>

            {/* Evidence-Based Matching Policy Schedule & Exact Citations */}
            {!currentPolicy.verified ? (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-300 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span className="font-bold text-amber-900 text-xs">
                      Coverage Status: Unverified (No Active Policy Uploaded)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-200 text-amber-900 border border-amber-300">
                    UNVERIFIED COVERAGE
                  </span>
                </div>
                <div className="text-[11px] text-amber-800 space-y-1.5 pl-6 border-l-2 border-amber-400 ml-1">
                  <p>
                    <strong>• Notice:</strong> No matching policy contract was found in your workspace. You may proceed with incident intake and drafting, but all coverages, statutory deductibles, and sub-limits will be labeled as unverified.
                  </p>
                  <p>
                    <strong>• Recommendation:</strong> Upload a policy PDF in the "My Policies" tab to enable automated clause matching, deductible locks, and verified submission.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white rounded-lg border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900 text-xs">
                      Matched Policy: {currentPolicy.name} ({currentPolicy.policyNumber})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                      VERIFIED POLICY FACT
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700">
                      Deductible: ${currentPolicy.deductibleAmount}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1.5 pl-6 border-l-2 border-blue-300 ml-1">
                  <p>
                    <strong>• Section 3.1 (Collision Impact Coverage):</strong> Direct impact damage to vehicle bumper and fascia indemnified up to $100,000 sub-limit.
                  </p>
                  <p>
                    <strong>• Section 3.4 (Substantiation of Losses):</strong> Itemized estimate from a certified garage required for losses exceeding $1,000.
                  </p>
                  <p>
                    <strong>• Section 7.2 (Notice of Occurrence):</strong> Written notice within 7 calendar days of occurrence (Notice SLA met).
                  </p>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() =>
                      onInspectClause(
                        {
                          title: 'Section 3.1 - Collision Damage Coverage',
                          content:
                            'The insurer will pay for direct, accidental loss of or damage to the insured vehicle caused by collision with another object or vehicle. Subject to contractual deductible of $500.00.',
                        },
                        currentPolicy.name,
                        currentPolicy.carrier
                      )
                    }
                    className="text-blue-700 hover:text-blue-900 text-[11px] font-semibold flex items-center gap-1"
                  >
                    <span>Inspect Full Policy Clause Details</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              id="btn-next-step"
              onClick={() => handleProceedToStep(2)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-sm transition-all text-xs"
            >
              <span>Proceed to AI Preparation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: AI CLAIM PREPARATION & EVIDENCE CHECKLIST                       */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 card-shadow space-y-5 animate-in fade-in duration-150">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Step 2: AI Claim Preparation</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                AUTOMATIC DOSSIER COMPILATION
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              InsureOS screens files for OCR readability and prompt-injection safety, generates the dynamic checklist, executes deterministic deductible rules, and compiles your claim dossier.
            </p>
          </div>

          {/* Background Processing States Bar */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                Background Automation Pipeline: {aiProcessingPhase}
              </span>
              <span className="font-mono text-[10px] font-bold text-slate-500">
                Stage {processingStageIndex + 1} of 5
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {backgroundProgressPhases.map((phase, idx) => {
                const isDone = processingStageIndex >= idx;
                const isCurrent = processingStageIndex === idx && isAiProcessing;

                return (
                  <div
                    key={phase.label}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      isCurrent
                        ? 'bg-blue-50 border-blue-600 text-blue-900 font-bold'
                        : isDone
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-white border-slate-200 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span>{phase.label}</span>
                      {isDone && !isCurrent ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : isCurrent ? (
                        <RefreshCw className="w-3 h-3 text-blue-700 animate-spin" />
                      ) : null}
                    </div>
                    <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-1">{phase.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions & TC-03 Security Test Banner */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-slate-800 text-xs">
                Layer 4 Prompt-Injection & Integrity Filter Active
              </span>
            </div>
            <button
              onClick={handleUploadAdversarialEvidence}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 flex items-center gap-1 shadow-2xs"
              title="Simulate prompt injection attack inside uploaded PDF (TC-03)"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              <span>Test Adversarial Doc (TC-03)</span>
            </button>
          </div>

          {/* Dynamic Evidence Checklist & OCR Status */}
          <div className="space-y-3">
            <span className="font-bold text-slate-700 text-xs uppercase tracking-wider block">
              Required Evidence for {currentPolicy.name}:
            </span>

            <div className="space-y-2">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    doc.threatDetected
                      ? 'bg-red-50/80 border-red-300 text-red-950'
                      : doc.uploaded
                      ? 'bg-white border-slate-200'
                      : 'bg-amber-50/70 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-slate-100 border border-slate-200">
                      <FileText className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{doc.type}</span>
                        {doc.threatDetected && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-600 text-white uppercase">
                            QUARANTINED THREAT
                          </span>
                        )}
                        {doc.uploaded && !doc.threatDetected && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                            OCR VERIFIED
                          </span>
                        )}
                        {!doc.uploaded && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                            MISSING MANDATORY
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-[11px] font-mono mt-0.5">
                        {doc.name} • {doc.fileSize || 'Pending upload'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!doc.uploaded ? (
                      <>
                        <input
                          type="file"
                          id={`evidence-file-${doc.id}`}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.mp4"
                          onChange={e => handleEvidenceItemRealUpload(doc.id, doc.type, e)}
                        />
                        <label
                          htmlFor={`evidence-file-${doc.id}`}
                          className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded text-xs cursor-pointer inline-flex items-center gap-1 shadow-2xs transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Choose File</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleSimulateEvidenceUpload(doc.type)}
                          className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 font-medium rounded border border-slate-200 text-xs transition-colors"
                          title="Use mock document template"
                        >
                          Sample
                        </button>
                      </>
                    ) : (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Validation & Exemption Blocking Gate (TC-02) */}
          {missingEstimate && !exemptionGranted ? (
            <div className="p-4 rounded-lg bg-red-50 border border-red-300 text-red-950 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-red-900">
                    Progression Blocked: Mandatory Evidence Missing
                  </h4>
                  <p className="text-xs text-red-800 mt-0.5 leading-relaxed">
                    Under Section 3.4 of the policy schedule, repair estimates exceeding $1,000 must include an itemized parts breakdown.
                    The <span className="font-semibold underline">Itemized Repair Estimate</span> is missing.
                  </p>
                </div>
              </div>

              {/* Requirement #2: Human Exemption Gate */}
              <div className="p-3 bg-white/90 rounded border border-red-200 text-xs text-slate-800 space-y-2">
                <span className="font-bold text-red-900 block">
                  Mandatory Security Rule (Requirement #2):
                </span>
                <p className="text-slate-600 text-[11px]">
                  The AI assistant cannot grant exemptions independently. Any exemption must follow an explicit, separately authorized demo approval flow.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => handleSimulateEvidenceUpload('Itemized Repair Estimate')}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded text-xs"
                  >
                    Upload Repair Estimate (Resolve Block)
                  </button>
                  <button
                    id="btn-request-demo-exemption"
                    onClick={handleRequestExemption}
                    disabled={exemptionPendingNotice}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-semibold rounded text-xs"
                  >
                    {exemptionPendingNotice ? 'Exemption Pending in Security Centre' : 'Request Demo Exemption (Supervisor Flow)'}
                  </button>
                  <button
                    id="btn-grant-demo-exemption"
                    onClick={handleGrantDemoExemption}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded text-xs"
                    title="Simulate Supervisor One-Click Approval"
                  >
                    Grant Demo Exemption Directly
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-xs text-emerald-900">
                  All mandatory evidence checks passed. Claim dossier compiled automatically.
                  {exemptionGranted && ` (${exemptionReason})`}
                </span>
              </div>
              <span className="font-mono text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                0 UNRESOLVED ISSUES
              </span>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              id="btn-prev-step"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Intake</span>
            </button>

            <button
              id="btn-next-step"
              onClick={() => handleProceedToStep(3)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-sm transition-all text-xs"
            >
              <span>Review Consolidated Claim & Approve</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: CONSOLIDATED REVIEW & MANDATORY HUMAN APPROVAL                    */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 card-shadow space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Step 3: Consolidated Review and Approval</h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Review all incident facts, verified coverage, calculated deductible, attached evidence, and allowlisted recipient before authorizing transmission.
              </p>
            </div>
            <button
              onClick={() => setIsEditingInStep3(!isEditingInStep3)}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-xs"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditingInStep3 ? 'Finish Editing Facts' : 'Edit Facts Inline'}</span>
            </button>
          </div>

          {/* Consolidated Review Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Incident Facts */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  1. Incident Facts & Parties
                </span>
                <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1 rounded">AI-EXTRACTED</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {isEditingInStep3 ? (
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Date:</span>
                      <input
                        type="date"
                        value={incidentDate}
                        onChange={e => setIncidentDate(e.target.value)}
                        className="w-full bg-white p-1 border rounded text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Location:</span>
                      <input
                        type="text"
                        value={incidentLocation}
                        onChange={e => setIncidentLocation(e.target.value)}
                        className="w-full bg-white p-1 border rounded text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Police Ref:</span>
                      <input
                        type="text"
                        value={policeBlotterRef}
                        onChange={e => setPoliceBlotterRef(e.target.value)}
                        className="w-full bg-white p-1 border rounded text-xs font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div><span className="text-slate-400">Date & Time:</span> <strong className="text-slate-800">{incidentDate} at {incidentTime}</strong></div>
                    <div><span className="text-slate-400">Location:</span> <strong className="text-slate-800">{incidentLocation}</strong></div>
                    <div><span className="text-slate-400">Police Ref:</span> <span className="font-mono text-slate-800 font-bold">{policeBlotterRef}</span></div>
                    <div><span className="text-slate-400">Insured Vehicle:</span> <span className="text-slate-800">{insuredVehicle}</span></div>
                    <div><span className="text-slate-400">Third Party:</span> <span className="text-slate-800">{thirdPartyInfo}</span></div>
                    <div><span className="text-slate-400">Injury Status:</span> <strong className="text-emerald-700">None Reported (Confirmed)</strong></div>
                  </>
                )}
              </div>
            </div>

            {/* 2. Contractual Terms & Deductibles */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  2. Contractual Terms & Deductibles
                </span>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">POLICY REGISTER</span>
              </div>
              <div className="space-y-1 text-xs">
                <div><span className="text-slate-400">Policy:</span> <strong className="text-slate-800">{currentPolicy.name}</strong></div>
                <div><span className="text-slate-400">Carrier:</span> <strong className="text-slate-800">{currentPolicy.carrier}</strong></div>
                <div>
                  <span className="text-slate-400">Contractual Deductible:</span>{' '}
                  <strong className="text-amber-800 font-mono font-bold">${currentPolicy.deductibleAmount}</strong>{' '}
                  <span className="text-[10px] text-emerald-700 font-bold">(Locked in Application Logic)</span>
                </div>
                <div>
                  <span className="text-slate-400">Sub-Limit:</span>{' '}
                  <strong className="text-slate-800 font-mono">${currentPolicy.coverageLimit.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Cited Clauses:</span>{' '}
                  <span className="text-slate-700 font-medium">Section 3.1 (Collision), Section 3.4 (Itemized Estimate), Section 7.2 (Notice SLA)</span>
                </div>
              </div>
            </div>

            {/* 3. Compiled Dossier & Financial Summary */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  3. Financial Summary & Net Calculation
                </span>
                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 rounded">ESTIMATE</span>
              </div>
              <div className="grid grid-cols-3 gap-2 p-2 bg-white rounded border border-slate-200 font-mono text-xs">
                <div>
                  <span className="text-slate-400 block text-[9px]">Claimed:</span>
                  <span className="font-bold text-slate-900">${estimatedLoss.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">Deductible:</span>
                  <span className="font-bold text-amber-700">-${currentPolicy.deductibleAmount}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">Net Estimate:</span>
                  <span className="font-bold text-emerald-700">${(estimatedLoss - currentPolicy.deductibleAmount).toLocaleString()}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                Calculated strictly by application logic. Prompt injection or untrusted inputs cannot alter the $500 deductible.
              </p>
            </div>

            {/* 4. Allowlisted Recipient Endpoint */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  4. Validated Destination Endpoint
                </span>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">ALLOWLISTED</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200 font-mono text-xs text-blue-900 font-bold">
                {currentPolicy.carrierContact.email}
              </div>
              <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Verified on Aegis Shield Mutual carrier whitelist register.
              </p>
            </div>
          </div>

          {/* Simulated Disclaimer Banner (Requirement #4) */}
          <div className="p-3 bg-amber-50 rounded-md border border-amber-300 text-[11px] text-amber-950 flex items-start gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              SIMULATED DEMO ACTION: This prototype transmits to an isolated mock carrier gateway.
              The fraud declaration, policyholder approval, carrier dispatch, receipt, and claim outcomes are simulated demo actions and do not constitute legally binding filings or real insurer communications.
            </p>
          </div>

          {/* Statutory Fraud Declaration & Human Signature Box */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-300 space-y-3 text-xs leading-relaxed">
            <h4 className="font-bold text-slate-900">
              Statutory Insurance Fraud & Accuracy Declaration (Demo Template):
            </h4>
            <p className="text-slate-700 font-serif italic text-justify">
              “I hereby declare under penalty of perjury that the facts, incident narrative, vehicle damage details, and attached repair estimates submitted herein are true, accurate, and complete to the best of my knowledge. I understand that submitting intentional false or misleading statements constitutes simulated insurance fraud.”
            </p>

            <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
              <input
                id="chk-statutory-declaration"
                type="checkbox"
                checked={statutoryDeclarationChecked}
                onChange={e => setStatutoryDeclarationChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-700 rounded border-slate-300 focus:ring-blue-600"
              />
              <span className="font-bold text-slate-900 text-xs">
                I, {claimantName}, have reviewed the complete claim dossier, agree to the declaration above, and authorize simulated dispatch to {currentPolicy.carrierContact.email}.
              </span>
            </label>
          </div>

          {submissionError && (
            <div className="p-3 rounded bg-red-50 border border-red-300 text-red-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Submission Blocked:</span>
                <span>{submissionError}</span>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              id="btn-prev-step"
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Preparation</span>
            </button>

            <button
              id="btn-submit-claim"
              onClick={handleSubmitClaim}
              disabled={!statutoryDeclarationChecked || isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 text-white font-bold rounded-lg shadow-sm transition-all text-xs"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Transmitting to Carrier Gateway...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Approve & Submit Claim (Simulated)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: SUBMISSION RECEIPT, SLA TRACKING & APPEAL DRAFTER               */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 card-shadow space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                TRANSMISSION CONFIRMED [SIMULATED - DEMO ONLY]
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Official Submission Receipt & Lifecycle Tracking
              </h3>
            </div>

            <button
              onClick={() => alert('Dossier Receipt PDF downloaded to local prototype cache.')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded border border-slate-200 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Receipt</span>
            </button>
          </div>

          {/* Official Simulated Receipt Box */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-300 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-700">Official Claim Reference:</span>
              <span className="text-sm font-bold text-blue-900">
                {receipt?.referenceNumber || 'CLM-2026-AEGIS-9102'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-slate-400 block">Carrier Gateway:</span>
                <span className="font-bold text-slate-800">{currentPolicy.carrier}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Recipient Endpoint:</span>
                <span className="font-bold text-slate-800">{currentPolicy.carrierContact.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Timestamp (UTC):</span>
                <span className="text-slate-800">{receipt?.timestamp || new Date().toISOString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Transmission Latency:</span>
                <span className="text-slate-800">{receipt?.simulatedLatencyMs || 340}ms</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-2">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Cryptographic SHA-256 Digest:
              </span>
              <span className="text-[10px] text-slate-600 break-all select-all block bg-white p-2 rounded border border-slate-200 mt-1">
                {receipt?.sha256Digest ||
                  '7a9c8e11f00b45d290cae2175a40bb2e1f448102a90e3f114008bc2100ae9811'}
              </span>
            </div>
          </div>

          {/* SLA Tracking Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 uppercase text-[10px] font-bold block">
                Current Status
              </span>
              <span className="text-sm font-bold text-blue-800 mt-0.5 block">
                Under Preliminary Review
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Adjuster Marcus Sterling assigned.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 uppercase text-[10px] font-bold block">
                Insurer Response SLA
              </span>
              <span className="text-sm font-bold text-slate-900 mt-0.5 block font-mono">
                5 Business Days Remaining
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Initial determination window (7 calendar days total).
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 uppercase text-[10px] font-bold block">
                Policyholder Notice SLA
              </span>
              <span className="text-sm font-bold text-emerald-800 mt-0.5 block font-mono">
                Compliant (Reported in 1 Day)
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Section 7.2 notice requirement satisfied.
              </p>
            </div>
          </div>

          {/* Simulated Determination & Subrogation Appeal Drafter */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <span className="font-bold text-slate-800 text-xs block">
              Simulated Determination: Partial Settlement Approved ($3,850.00 Payout) [SIMULATED - DEMO ONLY]
            </span>

            <div className="grid grid-cols-3 gap-2 p-2.5 bg-white rounded border border-slate-200 text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[9px]">Approved Repairs:</span>
                <span className="font-bold text-slate-900">$4,350.00</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Applied Deductible:</span>
                <span className="font-bold text-amber-700">-$500.00</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Net Payout:</span>
                <span className="font-bold text-emerald-700">$3,850.00</span>
              </div>
            </div>

            <p className="text-slate-600 text-xs leading-relaxed">
              <strong>Carrier Explainer:</strong> The $500 deduction is the contractual deductible mandated by Section 3.1.
              If third-party driver Marcus Miller is found 100% at fault by police blotter {policeBlotterRef}, Aegis Shield Mutual may recover this $500 via subrogation.
            </p>

            <button
              id="btn-draft-appeal"
              onClick={handleGenerateAppeal}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Draft Subrogation Deductible Appeal Letter</span>
            </button>
          </div>

          {generatedAppealLetter && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-300 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Generated Structured Appeal Draft:
                </span>
                <button
                  onClick={() => alert('Appeal draft copied to clipboard.')}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700 text-xs font-semibold"
                >
                  Copy Appeal Text
                </button>
              </div>
              <pre className="p-3 bg-white rounded border border-slate-200 font-mono text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {generatedAppealLetter}
              </pre>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              id="btn-prev-step"
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Review Claim Summary</span>
            </button>

            <button
              id="btn-finish-wizard"
              onClick={onNavigateToClaimsList}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors text-xs shadow-2xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Finish & View Claims Registry</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
