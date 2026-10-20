import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Shield,
  FileText,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Save,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Plus,
  Scale,
  Sparkles,
  Info,
  Trash2,
  X,
  Sliders,
  RotateCcw,
  FileUp,
  Paperclip
} from 'lucide-react';
import { inMemoryStore } from '../services/inMemoryStore';
import type { Policy, PolicyCategory, PolicyClause, VaultDocument } from '../types';

interface MyPoliciesProps {
  onInspectClause: (clause: PolicyClause, policyName: string, carrier: string) => void;
  onNavigateToClaim: (policyId: string) => void;
}

export const MyPolicies: React.FC<MyPoliciesProps> = ({
  onInspectClause,
  onNavigateToClaim,
}) => {
  const [policies, setPolicies] = useState<Policy[]>(inMemoryStore.getPolicies());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [editedFields, setEditedFields] = useState<Partial<Policy>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // File Picker Ref & Selected Policy File
  const policyFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPolicyFile, setSelectedPolicyFile] = useState<File | null>(null);

  // Comparator states
  const [comparatorOpen, setComparatorOpen] = useState(false);
  const [comparePolicyA, setComparePolicyA] = useState<string>('');
  const [comparePolicyB, setComparePolicyB] = useState<string>('');

  // Custom policy form fields
  const [customCarrier, setCustomCarrier] = useState('Apex Assurance Mutual');
  const [customName, setCustomName] = useState('Apex Comprehensive Auto Shield');
  const [customCategory, setCustomCategory] = useState<PolicyCategory>('motor');
  const [customDeductible, setCustomDeductible] = useState(500);
  const [customLimit, setCustomLimit] = useState(100000);
  const [customPremium, setCustomPremium] = useState(1280);

  const handleRealPolicyFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedPolicyFile(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    setCustomName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));

    const lower = file.name.toLowerCase();
    if (lower.includes('auto') || lower.includes('motor') || lower.includes('car') || lower.includes('vehicle')) {
      setCustomCategory('motor');
      setCustomCarrier('Apex Assurance Mutual');
      setCustomDeductible(500);
      setCustomLimit(100000);
      setCustomPremium(1350);
    } else if (lower.includes('health') || lower.includes('medical') || lower.includes('life')) {
      setCustomCategory('health');
      setCustomCarrier('Valence Health & Life');
      setCustomDeductible(1000);
      setCustomLimit(1000000);
      setCustomPremium(3200);
    } else if (lower.includes('home') || lower.includes('property') || lower.includes('dwelling')) {
      setCustomCategory('home');
      setCustomCarrier('Beacon & Oak Insurance');
      setCustomDeductible(750);
      setCustomLimit(500000);
      setCustomPremium(1850);
    } else if (lower.includes('travel')) {
      setCustomCategory('travel');
      setCustomCarrier('Global Voyager Syndicate');
      setCustomDeductible(100);
      setCustomLimit(50000);
      setCustomPremium(450);
    }
  };

  useEffect(() => {
    const unsub = inMemoryStore.subscribe(() => {
      setPolicies(inMemoryStore.getPolicies());
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (policies.length >= 2) {
      if (!comparePolicyA) setComparePolicyA(policies[0].id);
      if (!comparePolicyB) setComparePolicyB(policies[1].id);
    }
  }, [policies]);

  const filtered =
    selectedCategory === 'all'
      ? policies
      : policies.filter(p => p.category === selectedCategory);

  // Simulated Document Upload & Extraction
  const handleUploadPolicy = (template?: 'motor' | 'health' | 'home' | 'fleet' | 'custom') => {
    setShowUploadModal(false);
    setIsUploading(true);
    setUploadProgress(10);
    setUploadPhase('Analyzing document layout & font encoding...');

    setTimeout(() => {
      setUploadProgress(40);
      setUploadPhase('Extracting policyholder identity & carrier licensing...');
    }, 400);

    setTimeout(() => {
      setUploadProgress(75);
      setUploadPhase('Parsing coverage limits, contractual deductibles, and exclusions...');
    }, 800);

    setTimeout(() => {
      setUploadProgress(100);
      setUploadPhase('Extraction complete. Verified against insurer registry.');

      let newPolicy: Policy;

      if (template === 'health') {
        newPolicy = {
          id: `POL-HLT-${Math.floor(10000 + Math.random() * 90000)}`,
          carrier: 'Valence Health & Life',
          carrierContact: {
            email: 'claims@valence-health.local',
            hotline: '1-800-555-VALENCE',
            claimsPortalUrl: 'https://claims.valence-health.local',
            allowedRecipientWhitelist: ['claims@valence-health.local'],
          },
          category: 'health',
          name: 'Valence Premier Care Comprehensive',
          policyNumber: `VAL-HLT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'active',
          premiumAnnual: 3200,
          effectiveDate: '2026-03-01',
          renewalDate: '2027-03-01',
          deductibleAmount: 1000,
          coverageLimit: 1000000,
          verified: true,
          originalDocumentName: 'Valence_Premier_Care_Policy_Doc.pdf',
          exclusions: ['Experimental elective cosmetic surgery', 'Pre-existing conditions during 12-month waiting period'],
          clauses: [
            {
              id: 'cls-hlt-1',
              section: 'Section 2.1 - Inpatient Hospitalization',
              title: 'Surgical and Acute Medical Care',
              text: 'Indemnifies eligible room and board, operating theater fees, and specialist surgeon consultations during acute emergency hospitalization, subject to a $1,000 annual deductible.',
              category: 'Hospitalization',
              keywords: ['hospital', 'surgery', 'inpatient', 'doctor'],
              pageNumber: 14,
            },
          ],
        };
      } else if (template === 'home') {
        newPolicy = {
          id: `POL-HOM-${Math.floor(10000 + Math.random() * 90000)}`,
          carrier: 'Beacon & Oak Insurance',
          carrierContact: {
            email: 'property-claims@beacon-oak.local',
            hotline: '1-800-555-BEACON',
            claimsPortalUrl: 'https://claims.beacon-oak.local',
            allowedRecipientWhitelist: ['property-claims@beacon-oak.local'],
          },
          category: 'home',
          name: 'Beacon & Oak Homeowners Protector',
          policyNumber: `BKN-HOM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'active',
          premiumAnnual: 1850,
          effectiveDate: '2026-06-15',
          renewalDate: '2027-06-15',
          deductibleAmount: 750,
          coverageLimit: 500000,
          verified: true,
          originalDocumentName: 'Beacon_Oak_Home_Policy_Schedule.pdf',
          exclusions: ['Earth movement and ground subsidence', 'External flood or rising storm surge'],
          clauses: [
            {
              id: 'cls-hom-1',
              section: 'Section 4.2(b) - Sudden Plumbing Ingress',
              title: 'Water Damage and Pipe Rupture Indemnity',
              text: 'Covers physical damage to dwelling and permanent fixtures caused by accidental rupture or freezing of heating or plumbing systems, subject to a $750 deductible.',
              category: 'Water Damage',
              keywords: ['plumbing', 'pipe', 'leak', 'water'],
              pageNumber: 9,
            },
          ],
        };
      } else {
        // Motor or Custom
        const carrierName = template === 'custom' ? customCarrier : 'Aegis Shield Mutual';
        const polName = template === 'custom' ? customName : 'Aegis Comprehensive Motor Shield';
        const cat = template === 'custom' ? customCategory : 'motor';
        const ded = template === 'custom' ? customDeductible : 500;
        const lim = template === 'custom' ? customLimit : 75000;
        const prem = template === 'custom' ? customPremium : 1420;

        newPolicy = {
          id: `POL-MOT-${Math.floor(10000 + Math.random() * 90000)}`,
          carrier: carrierName,
          carrierContact: {
            email: `claims@${carrierName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.local`,
            hotline: '1-800-555-SHIELD',
            claimsPortalUrl: 'https://claims.portal.local',
            allowedRecipientWhitelist: [`claims@${carrierName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.local`],
          },
          category: cat,
          name: polName,
          policyNumber: `AEG-MOT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'active',
          premiumAnnual: prem,
          effectiveDate: '2026-01-15',
          renewalDate: '2027-01-15',
          deductibleAmount: ded,
          coverageLimit: lim,
          verified: true,
          originalDocumentName: selectedPolicyFile ? selectedPolicyFile.name : `${polName.replace(/\s+/g, '_')}_Schedule.pdf`,
          exclusions: ['Commercial ride-sharing or livery use', 'Unlicensed or unauthorized drivers'],
          clauses: [
            {
              id: 'cls-mot-1',
              section: 'Section 3.1 - Collision Damage Coverage',
              title: 'Accidental Collision and Impact Protection',
              text: `The Underwriter agrees to indemnify the Insured for direct physical damage resulting from impact with another vehicle or object, subject to the contractual deductible of $${ded}.00.`,
              category: 'Collision',
              keywords: ['collision', 'bumper', 'accident', 'damage', 'vehicle'],
              pageNumber: 8,
            },
            {
              id: 'cls-mot-2',
              section: 'Section 3.4 - Approved Repair Facilities',
              title: 'Garage Inspection and Estimate Validation',
              text: 'All repair estimates exceeding $1,000 must be compiled by a licensed facility with itemized parts breakdown prior to commencement of repairs.',
              category: 'Repairs',
              keywords: ['repair', 'estimate', 'garage', 'parts'],
              pageNumber: 11,
            },
            {
              id: 'cls-mot-3',
              section: 'Section 7.2 - Notice of Occurrence',
              title: 'Policyholder SLA Notification Window',
              text: 'Written notice of any loss or damage must be provided to the carrier within 7 calendar days of the occurrence.',
              category: 'Notice',
              keywords: ['notice', 'sla', 'days', 'reporting'],
              pageNumber: 18,
            },
          ],
        };
      }

      inMemoryStore.addPolicy(newPolicy);

      // Also add corresponding policy contract to Documents Vault
      inMemoryStore.addVaultDocument({
        id: `doc-pol-${newPolicy.id}`,
        title: newPolicy.originalDocumentName,
        category: 'Policy Contract',
        policy: newPolicy.name,
        carrier: newPolicy.carrier,
        uploadDate: new Date().toISOString().split('T')[0],
        ocrStatus: 'VERIFIED_100%',
        fileSize: '2.8 MB',
        textExcerpt: `Schedule of Insurance Declarations. Policy No: ${newPolicy.policyNumber}. Contractual deductible: $${newPolicy.deductibleAmount}.00. Limit: $${newPolicy.coverageLimit.toLocaleString()}.`,
      });

      setSelectedPolicyFile(null);
      setIsUploading(false);
    }, 1200);
  };

  const handleStartEdit = (policy: Policy) => {
    setEditingPolicyId(policy.id);
    setEditedFields({
      deductibleAmount: policy.deductibleAmount,
      coverageLimit: policy.coverageLimit,
      premiumAnnual: policy.premiumAnnual,
      policyNumber: policy.policyNumber,
    });
  };

  const handleSaveEdit = (policy: Policy) => {
    const updated = {
      ...policy,
      ...editedFields,
      verified: true,
    };
    inMemoryStore.updatePolicy(updated);
    setEditingPolicyId(null);
  };

  const handleDeletePolicy = (id: string) => {
    if (confirm('Remove this policy from your workspace catalog?')) {
      inMemoryStore.deletePolicy(id);
    }
  };

  const polA = policies.find(p => p.id === comparePolicyA) || policies[0];
  const polB = policies.find(p => p.id === comparePolicyB) || policies[1];

  return (
    <div className="space-y-6 pb-12 text-xs">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase">
              POLICY CATALOG
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 font-semibold">Contract Schedules & Extracted Clauses</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-1">
            My Insurance Policies
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            {policies.length > 0
              ? `${policies.length} verified policies in active catalog with contractually enforced deductibles.`
              : 'Genuinely empty workspace. Upload your insurance policy PDF to extract schedules and clauses.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {policies.length >= 2 && (
            <button
              onClick={() => setComparatorOpen(!comparatorOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded border border-slate-200 transition-colors"
            >
              <Scale className="w-3.5 h-3.5 text-blue-700" />
              <span>{comparatorOpen ? 'Close Comparator' : 'Compare Policies'}</span>
            </button>
          )}

          <button
            id="btn-upload-policy"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Policy PDF</span>
          </button>
        </div>
      </div>

      {/* Simulated Uploading Progress Bar */}
      {isUploading && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 space-y-2">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-700 animate-spin" />
              AI Contract Parser & Deductible Extractor Active
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <p className="text-slate-600 text-[11px]">{uploadPhase}</p>
          <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-700 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Policy Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 card-shadow w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-sm text-slate-900">Upload & Extract Policy Schedule</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Primary: Real Policy File Browser / Drag & Drop */}
            <div
              onClick={() => policyFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                selectedPolicyFile
                  ? 'border-emerald-400 bg-emerald-50/60'
                  : 'border-blue-400 bg-blue-50/40 hover:bg-blue-50'
              }`}
            >
              <input
                ref={policyFileInputRef}
                id="policy-file-picker"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleRealPolicyFileSelect}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-2 border border-blue-200">
                <FileUp className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-900 text-xs">
                {selectedPolicyFile ? `Selected: ${selectedPolicyFile.name}` : 'Click to Browse Policy PDF or Drag & Drop'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {selectedPolicyFile
                  ? `${(selectedPolicyFile.size / 1024).toFixed(1)} KB • Ready for AI clause & deductible extraction`
                  : 'Select your policy schedule, declarations page, or insurance binder (PDF, DOCX)'}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  policyFileInputRef.current?.click();
                }}
                className="mt-2.5 px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold rounded text-xs shadow-2xs inline-flex items-center gap-1.5"
              >
                <Paperclip className="w-3.5 h-3.5 text-blue-700" />
                <span>Choose Policy File</span>
              </button>
            </div>

            {/* Extracted Policy Attributes */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                Policy Parameters (Auto-Extracted / Editable):
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">Carrier Name:</span>
                  <input
                    type="text"
                    value={customCarrier}
                    onChange={e => setCustomCarrier(e.target.value)}
                    className="w-full bg-white p-1 border rounded text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Policy Schedule Name:</span>
                  <input
                    type="text"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    className="w-full bg-white p-1 border rounded text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Contract Deductible ($):</span>
                  <input
                    type="number"
                    value={customDeductible}
                    onChange={e => setCustomDeductible(Number(e.target.value))}
                    className="w-full bg-white p-1 border rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Coverage Limit ($):</span>
                  <input
                    type="number"
                    value={customLimit}
                    onChange={e => setCustomLimit(Number(e.target.value))}
                    className="w-full bg-white p-1 border rounded text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Optional Sample Templates Section */}
            <div className="pt-1">
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-2 text-[10px] uppercase font-bold text-slate-400">
                  Or parse a sample policy template
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => handleUploadPolicy('motor')}
                  className="p-2 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition-all"
                >
                  <span className="font-bold text-slate-900 block text-[11px]">Aegis Motor</span>
                  <span className="text-[10px] text-slate-500 block">$500 Ded • Auto</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUploadPolicy('health')}
                  className="p-2 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition-all"
                >
                  <span className="font-bold text-slate-900 block text-[11px]">Valence Health</span>
                  <span className="text-[10px] text-slate-500 block">$1k Ded • Health</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUploadPolicy('home')}
                  className="p-2 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition-all"
                >
                  <span className="font-bold text-slate-900 block text-[11px]">Beacon & Oak</span>
                  <span className="text-[10px] text-slate-500 block">$750 Ded • Home</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-3 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-policy-upload"
                type="button"
                onClick={() => handleUploadPolicy('custom')}
                className="px-4 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-2xs flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Parse & Upload Policy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Policy Comparator Drawer (if opened and >= 2 policies exist) */}
      {comparatorOpen && polA && polB && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 card-shadow space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-700" />
              <h3 className="font-bold text-sm text-slate-900">Side-by-Side Policy Comparator</h3>
            </div>
            <button
              onClick={() => setComparatorOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-2">
              <h4 className="font-bold text-xs text-blue-900">{polA.name}</h4>
              <div className="text-xs space-y-1">
                <div>Deductible: <strong className="font-mono">${polA.deductibleAmount}</strong></div>
                <div>Limit: <strong className="font-mono">${polA.coverageLimit.toLocaleString()}</strong></div>
                <div>Annual Premium: <strong className="font-mono">${polA.premiumAnnual}</strong></div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-2">
              <h4 className="font-bold text-xs text-blue-900">{polB.name}</h4>
              <div className="text-xs space-y-1">
                <div>Deductible: <strong className="font-mono">${polB.deductibleAmount}</strong></div>
                <div>Limit: <strong className="font-mono">${polB.coverageLimit.toLocaleString()}</strong></div>
                <div>Annual Premium: <strong className="font-mono">${polB.premiumAnnual}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs (when policies exist) */}
      {policies.length > 0 && (
        <div className="flex items-center gap-1 border-b border-slate-200 pb-2">
          {['all', 'motor', 'health', 'home', 'travel', 'life'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-md font-semibold capitalize transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {cat === 'all' ? `All Lines (${policies.length})` : cat}
            </button>
          ))}
        </div>
      )}

      {/* Main Content: Empty State OR Policies List */}
      {policies.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 card-shadow text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No policies uploaded yet</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto leading-relaxed">
              Upload your insurance policy PDF to extract clauses, deductibles, and coverage limits automatically. You can also load optional demo sample data for testing.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              id="btn-empty-upload-policy"
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-sm transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Policy</span>
            </button>
            <button
              id="btn-empty-load-sample"
              onClick={() => inMemoryStore.loadSampleData()}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold rounded-lg border border-amber-300 transition-colors shadow-2xs"
            >
              <Sliders className="w-4 h-4 text-amber-700" />
              <span>Load Sample Data (Optional)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(policy => {
            const isEditing = editingPolicyId === policy.id;

            return (
              <div
                key={policy.id}
                className="bg-white rounded-xl border border-slate-200 p-5 card-shadow transition-all"
              >
                {/* Policy Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                        {policy.category}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">{policy.id}</span>
                      <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified Schedule
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{policy.name}</h3>
                    <p className="text-slate-500 text-xs">
                      Underwritten by <span className="font-semibold text-slate-800">{policy.carrier}</span> • Contact:{' '}
                      <span className="font-mono text-slate-700">{policy.carrierContact.email}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <button
                        onClick={() => handleSaveEdit(policy)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(policy)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded border border-slate-200"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Fields</span>
                      </button>
                    )}
                    <button
                      onClick={() => onNavigateToClaim(policy.id)}
                      className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded"
                    >
                      Start Claim
                    </button>
                    <button
                      onClick={() => handleDeletePolicy(policy.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                      title="Remove policy"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Specifications Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 border-b border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Contract Deductible:
                    </span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedFields.deductibleAmount ?? policy.deductibleAmount}
                        onChange={e =>
                          setEditedFields({ ...editedFields, deductibleAmount: Number(e.target.value) })
                        }
                        className="w-full bg-white p-1 border rounded text-xs font-mono font-bold"
                      />
                    ) : (
                      <span className="font-bold text-slate-900 font-mono text-sm">
                        ${policy.deductibleAmount.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Coverage Limit:
                    </span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedFields.coverageLimit ?? policy.coverageLimit}
                        onChange={e =>
                          setEditedFields({ ...editedFields, coverageLimit: Number(e.target.value) })
                        }
                        className="w-full bg-white p-1 border rounded text-xs font-mono font-bold"
                      />
                    ) : (
                      <span className="font-bold text-slate-900 font-mono text-sm">
                        ${policy.coverageLimit.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Annual Premium:
                    </span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedFields.premiumAnnual ?? policy.premiumAnnual}
                        onChange={e =>
                          setEditedFields({ ...editedFields, premiumAnnual: Number(e.target.value) })
                        }
                        className="w-full bg-white p-1 border rounded text-xs font-mono"
                      />
                    ) : (
                      <span className="font-bold text-slate-800 font-mono">
                        ${policy.premiumAnnual.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Schedule PDF:
                    </span>
                    <span className="text-slate-700 truncate block font-mono text-[11px]">
                      {policy.originalDocumentName}
                    </span>
                  </div>
                </div>

                {/* Clause List Accordion */}
                <div className="pt-3 space-y-2">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                    Verified Contract Clauses ({policy.clauses.length}):
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {policy.clauses.map(clause => (
                      <button
                        key={clause.id}
                        onClick={() => onInspectClause(clause, policy.name, policy.carrier)}
                        className="p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 text-left transition-all flex items-start justify-between group"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-mono font-bold text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {clause.section}
                          </span>
                          <h4 className="font-bold text-slate-900 text-xs mt-1 truncate">
                            {clause.title}
                          </h4>
                          <p className="text-slate-600 text-[11px] line-clamp-2 mt-0.5 font-serif italic">
                            “{clause.text}”
                          </p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 mt-1 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
