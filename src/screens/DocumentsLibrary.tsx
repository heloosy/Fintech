import React, { useState, useEffect, useRef } from 'react';
import {
  Files,
  Search,
  Download,
  Eye,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Lock,
  X,
  Upload,
  Plus,
  Trash2,
  Sparkles,
  FileUp,
  Layers,
  RefreshCw,
  Cpu,
  SlidersHorizontal,
  ChevronRight,
  Info
} from 'lucide-react';
import { ApiClient, type BackendDocSummary, type DocumentPageSummary } from '../services/apiClient';
import { inMemoryStore } from '../services/inMemoryStore';

export const DocumentsLibrary: React.FC = () => {
  const [documents, setDocuments] = useState<BackendDocSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showOcrConfigModal, setShowOcrConfigModal] = useState(false);

  // OCR Engine State
  const [ocrConfig, setOcrConfig] = useState<{
    ocrEngine: string;
    minCharsPerPage: number;
    engines: {
      pymupdf: boolean;
      tesseract: boolean;
      paddleocr: boolean;
      activeEngine: string;
      pythonAvailable: boolean;
    };
  }>({
    ocrEngine: 'auto',
    minCharsPerPage: 40,
    engines: {
      pymupdf: false,
      tesseract: false,
      paddleocr: false,
      activeEngine: 'auto',
      pythonAvailable: false,
    },
  });

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRealFile, setSelectedRealFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<BackendDocSummary['category']>('Claim Evidence');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [uploadStatusAlert, setUploadStatusAlert] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    details?: string[];
  } | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    const docs = await ApiClient.getDocuments();
    setDocuments(docs);
    setLoading(false);
  };

  const fetchOcrStatus = async () => {
    const status = await ApiClient.getOcrEngineStatus();
    if (status.success) {
      setOcrConfig({
        ocrEngine: status.ocrEngine,
        minCharsPerPage: status.minCharsPerPage,
        engines: status.engines,
      });
    }
  };

  useEffect(() => {
    fetchDocs();
    fetchOcrStatus();
    const unsub = inMemoryStore.subscribe(() => {
      fetchDocs();
    });
    return unsub;
  }, []);

  const handleRealFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedRealFile(file);

    // Auto-detect category from file name
    const lowerName = file.name.toLowerCase();
    if (lowerName.includes('policy') || lowerName.includes('contract')) {
      setUploadCategory('Policy Contract');
    } else if (lowerName.includes('estimate') || lowerName.includes('invoice') || lowerName.includes('repair')) {
      setUploadCategory('Estimate');
    } else if (lowerName.includes('medical') || lowerName.includes('discharge')) {
      setUploadCategory('Medical');
    } else {
      setUploadCategory('Claim Evidence');
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedRealFile) {
      alert('Please select a file to upload from your computer.');
      return;
    }

    setIsUploading(true);
    setUploadStatusAlert(null);
    setUploadProgressMsg('Step 1/3: Ingesting binary and validating file type...');

    const timer1 = setTimeout(() => {
      setUploadProgressMsg('Step 2/3: Attempting native PyMuPDF text extraction...');
    }, 450);

    const timer2 = setTimeout(() => {
      setUploadProgressMsg('Step 3/3: Evaluating page text sufficiency & selective OCR...');
    }, 1200);

    try {
      const result = await ApiClient.uploadFile(selectedRealFile, uploadCategory);
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsUploading(false);

      if (result.success && result.document) {
        const doc = result.document;
        const hasWarnings = doc.warnings && doc.warnings.length > 0;
        const isNeedsReview = doc.ocrStatus === 'Needs Review' || doc.ocrStatus === 'Empty Extraction';

        if (isNeedsReview || hasWarnings) {
          setUploadStatusAlert({
            type: 'warning',
            message: `Document indexed with review flags: ${doc.filename} (${doc.chunkCount} chunks, ${doc.wordCount} words). Status: ${doc.ocrStatus}.`,
            details: doc.warnings,
          });
        } else {
          setUploadStatusAlert({
            type: 'success',
            message: `Success: Indexed ${doc.filename} (${doc.chunkCount} chunks, ${doc.wordCount} words) via ${doc.extractionMethod}.`,
          });
        }

        // Mirror to inMemoryStore
        inMemoryStore.addVaultDocument({
          id: doc.id,
          title: doc.filename,
          category: doc.category,
          policy: 'Assigned Workspace Policy',
          carrier: 'Local Storage Engine',
          uploadDate: doc.uploadDate,
          fileSize: doc.fileSizeFormatted,
          ocrStatus: doc.ocrStatus,
          textExcerpt: doc.previewExcerpt,
        });

        setSelectedRealFile(null);
        await fetchDocs();

        if (!isNeedsReview) {
          setTimeout(() => {
            setShowUploadModal(false);
            setUploadStatusAlert(null);
          }, 1500);
        }
      } else {
        setUploadStatusAlert({
          type: 'error',
          message: result.error || 'Failed to process and index document.',
        });
      }
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsUploading(false);
      setUploadStatusAlert({
        type: 'error',
        message: `Upload error: ${err.message}`,
      });
    }
  };

  const handleUploadSamplePreset = async (sampleKey: 'policy' | 'estimate' | 'incident' | 'adversarial') => {
    setIsUploading(true);
    setUploadProgressMsg(`Indexing sample ${sampleKey} into local backend...`);

    const result = await ApiClient.uploadSample(sampleKey);
    setIsUploading(false);

    if (result.success && result.document) {
      setUploadStatusAlert({
        type: 'success',
        message: `Sample indexed: ${result.document.filename} (${result.document.chunkCount} chunks, ${result.document.wordCount} words).`,
      });

      inMemoryStore.addVaultDocument({
        id: result.document.id,
        title: result.document.filename,
        category: result.document.category,
        policy: sampleKey === 'policy' ? 'Aegis Comprehensive Motor Shield' : 'Active Claim',
        carrier: 'Aegis Shield Mutual',
        uploadDate: result.document.uploadDate,
        fileSize: result.document.fileSizeFormatted,
        ocrStatus: result.document.ocrStatus,
        textExcerpt: result.document.previewExcerpt,
      });

      await fetchDocs();
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadStatusAlert(null);
      }, 1000);
    } else {
      setUploadStatusAlert({
        type: 'error',
        message: result.error || 'Failed to index sample document.',
      });
    }
  };

  const handleDeleteDocument = async (id: string, filename: string) => {
    if (confirm(`Permanently delete '${filename}' from local document intelligence store?`)) {
      await ApiClient.deleteDocument(id);
      inMemoryStore.deleteVaultDocument(id);
      await fetchDocs();
    }
  };

  const handleOpenPreview = async (docSummary: BackendDocSummary) => {
    try {
      const res = await fetch(`/api/documents/${docSummary.id}`, {
        headers: { 'X-Workspace-Id': inMemoryStore.getUserProfile().tenantId || 'DEFAULT-WORKSPACE' },
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewDoc(data.document);
      } else {
        setPreviewDoc(docSummary);
      }
    } catch {
      setPreviewDoc(docSummary);
    }
  };

  const handleSaveOcrConfig = async (newEngine: 'auto' | 'pymupdf' | 'tesseract' | 'paddleocr') => {
    const res = await ApiClient.setOcrConfig({ engine: newEngine });
    if (res.success) {
      await fetchOcrStatus();
      setShowOcrConfigModal(false);
    } else {
      alert(res.error || 'Failed to update OCR config.');
    }
  };

  const renderStatusBadge = (doc: BackendDocSummary) => {
    const status = doc.ocrStatus;
    const method = doc.extractionMethod;

    if (status === 'Needs Review') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 w-max">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          <span>Needs Review ({method})</span>
        </span>
      );
    }

    if (status === 'Empty Extraction' || status === 'Unsupported Format') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-800 border border-red-200 flex items-center gap-1 w-max">
          <AlertTriangle className="w-3 h-3 text-red-600" />
          <span>{status}</span>
        </span>
      );
    }

    if (status === 'OCR Verified') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1 w-max">
          <Cpu className="w-3 h-3 text-teal-600" />
          <span>OCR Verified ({doc.ocrEngineUsed || 'Tesseract'})</span>
        </span>
      );
    }

    // Default 'Indexed'
    if (method === 'pymupdf-native') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-max">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>PyMuPDF Native</span>
        </span>
      );
    }

    if (method === 'hybrid') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1 w-max">
          <Layers className="w-3 h-3 text-indigo-600" />
          <span>Hybrid Native+OCR</span>
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1 w-max">
        <CheckCircle2 className="w-3 h-3 text-slate-600" />
        <span>Indexed ({method})</span>
      </span>
    );
  };

  const filtered = documents.filter(doc => {
    const matchesQuery =
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || doc.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Files className="w-5 h-5 text-blue-700" />
            <span>Documents Vault & Ingestion Pipeline</span>
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            {documents.length > 0
              ? `${documents.length} document(s) ingested with PyMuPDF native extraction & selective OCR. Isolated by tenant.`
              : 'Genuinely empty workspace. Upload your real policy contracts, estimates, or incident statements.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* OCR Engine config button */}
          <button
            onClick={() => setShowOcrConfigModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg border border-slate-200 text-xs transition-colors"
            title="Configure OCR Pipeline Engine"
          >
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            <span>OCR: <strong className="uppercase">{ocrConfig.ocrEngine}</strong></span>
          </button>

          <button
            onClick={fetchDocs}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg border border-slate-200 text-xs transition-colors"
            title="Refresh document index"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            id="btn-vault-upload-doc"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* OCR Engine Configuration Modal */}
      {showOcrConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 card-shadow w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-sm text-slate-900">OCR Engine Selection & Engine Health</h3>
              </div>
              <button
                onClick={() => setShowOcrConfigModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              InsureOS extracts native text using <strong>PyMuPDF</strong> first. Only pages with insufficient text (&lt; {ocrConfig.minCharsPerPage} characters) trigger the secondary OCR pipeline.
            </p>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                Host Engine Availability:
              </span>
              <div className="space-y-2">
                {/* PyMuPDF Engine */}
                <div className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">PyMuPDF Native & OCR</span>
                    <span className="text-[11px] text-slate-500">Fast native text extraction with C-level speed</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ocrConfig.engines.pymupdf ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {ocrConfig.engines.pymupdf ? 'Installed (v2.0)' : 'Not Found'}
                  </span>
                </div>

                {/* Tesseract Engine */}
                <div className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">Tesseract OCR</span>
                    <span className="text-[11px] text-slate-500">Open-source optical character recognition</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ocrConfig.engines.tesseract ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {ocrConfig.engines.tesseract ? 'Available' : 'Host Binary Required'}
                  </span>
                </div>

                {/* PaddleOCR Engine */}
                <div className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">PaddleOCR (Evaluation)</span>
                    <span className="text-[11px] text-slate-500">Deep learning OCR suite for complex forms</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ocrConfig.engines.paddleocr ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {ocrConfig.engines.paddleocr ? 'Available' : 'Optional Module'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-800">Select Active OCR Strategy:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'auto', label: 'Auto (Recommended)', desc: 'PyMuPDF Native + Auto OCR' },
                  { id: 'pymupdf', label: 'PyMuPDF', desc: 'Native & Built-in OCR' },
                  { id: 'tesseract', label: 'Tesseract', desc: 'Standard Tesseract Engine' },
                  { id: 'paddleocr', label: 'PaddleOCR', desc: 'Deep learning OCR' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleSaveOcrConfig(opt.id as any)}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                      ocrConfig.ocrEngine === opt.id
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-[10px] text-slate-500 font-normal">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowOcrConfigModal(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 card-shadow w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-sm text-slate-900">Upload & Ingest Document (Production Pipeline)</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Alert banner in modal */}
            {uploadStatusAlert && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold space-y-1 ${
                  uploadStatusAlert.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : uploadStatusAlert.type === 'warning'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {uploadStatusAlert.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : uploadStatusAlert.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  )}
                  <span>{uploadStatusAlert.message}</span>
                </div>
                {uploadStatusAlert.details && uploadStatusAlert.details.length > 0 && (
                  <ul className="pl-6 list-disc text-[11px] font-normal text-amber-900">
                    {uploadStatusAlert.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Primary: Real File Browser / Drag & Drop */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                selectedRealFile
                  ? 'border-emerald-400 bg-emerald-50/60'
                  : 'border-blue-400 bg-blue-50/40 hover:bg-blue-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.tiff,.bmp"
                onChange={handleRealFileSelect}
                className="hidden"
              />

              <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                <FileUp className="w-6 h-6" />
              </div>

              {selectedRealFile ? (
                <div>
                  <p className="font-bold text-emerald-900 text-xs">{selectedRealFile.name}</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    {(selectedRealFile.size / 1024).toFixed(1)} KB • Ready for PyMuPDF ingestion
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-slate-800 text-xs">Choose a file or drag & drop here</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    PDF, DOCX, TXT, PNG, JPG (Max 25 MB).
                  </p>
                  <p className="text-[10px] text-blue-600 font-mono mt-0.5">
                    Native PyMuPDF extraction with per-page selective OCR fallback
                  </p>
                </div>
              )}
            </div>

            {/* Category Selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Document Classification Category:</label>
              <select
                value={uploadCategory}
                onChange={e => setUploadCategory(e.target.value as any)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="Policy Contract">Policy Contract (Auto, Home, General)</option>
                <option value="Estimate">Repair Estimate / Appraisal / Invoice</option>
                <option value="Claim Evidence">Claim Evidence / Police Report / Photos</option>
                <option value="Medical">Medical Bills / Physician Notes</option>
                <option value="General">General / Correspondence</option>
              </select>
            </div>

            {/* Sample Preload Options */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
                Or Load Pre-built Test Samples:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleUploadSamplePreset('policy')}
                  className="p-2 rounded border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition-all"
                >
                  <span className="font-bold text-slate-900 block text-[11px]">Motor Policy</span>
                  <span className="text-[10px] text-slate-500 block">Aegis $500 Deductible Schedule</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUploadSamplePreset('estimate')}
                  className="p-2 rounded border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition-all"
                >
                  <span className="font-bold text-slate-900 block text-[11px]">Apex Estimate</span>
                  <span className="text-[10px] text-slate-500 block">$4,350 Repair Appraisal</span>
                </button>
              </div>
            </div>

            {/* Upload progress indicator */}
            {isUploading && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center space-y-1">
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-blue-900">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{uploadProgressMsg}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
                className="px-3 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-vault-upload"
                type="button"
                onClick={handleUploadSubmit}
                disabled={!selectedRealFile || isUploading}
                className={`px-4 py-1.5 rounded font-semibold text-xs shadow-2xs flex items-center gap-1.5 ${
                  selectedRealFile && !isUploading
                    ? 'bg-blue-700 hover:bg-blue-800 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Ingest & Index Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      {documents.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search documents by filename or category..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {['all', 'Policy Contract', 'Estimate', 'Claim Evidence', 'Medical'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded font-medium text-[11px] transition-colors ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat === 'all' ? 'All Types' : cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content: Empty State OR Documents Table */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 card-shadow text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
            <Files className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No documents indexed in this workspace</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto leading-relaxed">
              Upload your policy contracts, repair estimates, or incident statements. They will be processed and indexed locally with PyMuPDF native extraction and selective OCR.
            </p>
          </div>
          <div className="pt-2">
            <button
              id="btn-empty-upload-doc"
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-sm transition-all mx-auto"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-3">Document Filename</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Pages / Chunks</th>
                  <th className="p-3">Extraction Pipeline</th>
                  <th className="p-3">Date & Size</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-semibold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                      <span className="truncate max-w-xs">{doc.filename}</span>
                    </td>
                    <td className="p-3 text-slate-600 text-xs">{doc.category}</td>
                    <td className="p-3 text-slate-600 text-xs font-mono">
                      {doc.pageCount} p • {doc.chunkCount} chunks ({doc.wordCount} words)
                    </td>
                    <td className="p-3">
                      {renderStatusBadge(doc)}
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {doc.uploadDate} • {doc.fileSizeFormatted}
                    </td>
                    <td className="p-3 text-right space-x-1.5">
                      <button
                        onClick={() => handleOpenPreview(doc)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Pages</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete from local store"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document Page-by-Page Extraction Inspection Drawer / Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 card-shadow w-full max-w-2xl max-h-[90vh] flex flex-col p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-sm text-slate-900 truncate max-w-md">{previewDoc.filename}</h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 text-xs flex-1">
              {/* Summary Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded bg-slate-50 border border-slate-200 font-mono text-[11px]">
                <div><span className="text-slate-400">Pages:</span> {previewDoc.pageCount}</div>
                <div><span className="text-slate-400">Words:</span> {previewDoc.wordCount}</div>
                <div><span className="text-slate-400">Pipeline:</span> {previewDoc.extractionMethod}</div>
                <div><span className="text-slate-400">Status:</span> {previewDoc.ocrStatus}</div>
              </div>

              {/* Warnings Banner if any */}
              {previewDoc.warnings && previewDoc.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Extraction Warnings / Review Items</span>
                  </div>
                  <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                    {previewDoc.warnings.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Page-by-Page Provenance Breakdown */}
              {previewDoc.pages && previewDoc.pages.length > 0 ? (
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 text-xs block uppercase tracking-wider">
                    Page-by-Page Extraction Breakdown ({previewDoc.pages.length} Pages)
                  </span>
                  <div className="space-y-2">
                    {previewDoc.pages.map((p: DocumentPageSummary) => (
                      <div key={p.pageNumber} className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-700">
                              {p.pageNumber}
                            </span>
                            <span>Page {p.pageNumber}</span>
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-slate-500">
                              {p.wordCount} words • {p.characterCount} chars
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.status === 'clean'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : p.status === 'ocr_applied'
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {p.extractionMethod}
                            </span>
                          </div>
                        </div>

                        {p.warning && (
                          <div className="text-[10px] text-amber-700 bg-amber-50/60 p-1.5 rounded border border-amber-200">
                            {p.warning}
                          </div>
                        )}

                        <div className="text-[11px] font-mono bg-slate-50 p-2 rounded border border-slate-100 text-slate-700 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                          {p.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block mb-1">
                    Indexed Text Excerpt:
                  </span>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 font-mono text-[11px] leading-relaxed text-slate-800 max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {previewDoc.previewExcerpt || previewDoc.fullText}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
