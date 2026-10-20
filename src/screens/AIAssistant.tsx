import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  AlertTriangle,
  BookOpen,
  RotateCcw,
  ExternalLink,
  Cpu,
  RefreshCw,
  FileText,
  CheckCircle2,
  Layers,
  ChevronDown,
  Info,
  Upload,
  Plus,
  AlertCircle
} from 'lucide-react';
import { ApiClient, type AICitation, type OllamaHealth, type BackendDocSummary } from '../services/apiClient';
import { inMemoryStore } from '../services/inMemoryStore';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  citations?: AICitation[];
  modelUsed?: string;
  error?: string;
  canRetry?: boolean;
  isOffline?: boolean;
  retrievedEvidencePreview?: Array<{
    filename: string;
    page: number;
    score: number;
    excerpt: string;
  }>;
}

interface AIAssistantProps {
  onInspectClause: (clause: any, policyName: string, carrier: string) => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ onInspectClause }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ollamaHealth, setOllamaHealth] = useState<OllamaHealth | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<BackendDocSummary[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [activeModel, setActiveModel] = useState('qwen2.5:3b');
  const [inspectCitation, setInspectCitation] = useState<AICitation | null>(null);

  // File Upload directly in Assistant
  const assistantFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingInAssistant, setIsUploadingInAssistant] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const checkHealth = async () => {
    setIsCheckingHealth(true);
    const health = await ApiClient.checkAIHealth();
    setOllamaHealth(health);

    // Auto-select installed model if available
    if (health.installedModels && health.installedModels.length > 0) {
      if (health.configuredModel && health.installedModels.includes(health.configuredModel)) {
        setActiveModel(health.configuredModel);
      } else {
        setActiveModel(health.installedModels[0]);
      }
    } else if (health.configuredModel) {
      setActiveModel(health.configuredModel);
    }

    setIsCheckingHealth(false);
  };

  const loadDocuments = async () => {
    const docs = await ApiClient.getDocuments();
    setAvailableDocs(docs);
    // By default, select all uploaded documents
    setSelectedDocIds(docs.map(d => d.id));
  };

  useEffect(() => {
    checkHealth();
    loadDocuments();

    // Listen to in-memory store changes so uploads across the app reflect immediately
    const unsub = inMemoryStore.subscribe(() => {
      loadDocuments();
      checkHealth();
    });

    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Welcome to InsureOS Grounded Document Assistant.\n\nI answer your insurance questions strictly grounded in the documents you select below. Every fact is verified against extracted document passages with exact filename and page citations.\n\nI never invent deductibles, limits, or coverage terms. If the requested information is not in your documents, I will explicitly state that it is not specified.`,
      },
    ]);

    return unsub;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const toggleDocSelection = (id: string) => {
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const selectAllDocs = () => {
    setSelectedDocIds(availableDocs.map(d => d.id));
  };

  const clearDocSelection = () => {
    setSelectedDocIds([]);
  };

  const handleAssistantFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingInAssistant(true);
    const result = await ApiClient.uploadFile(file);
    setIsUploadingInAssistant(false);

    if (result.success && result.document) {
      inMemoryStore.addVaultDocument({
        id: result.document.id,
        title: result.document.filename,
        category: result.document.category,
        policy: 'Assigned Workspace Policy',
        carrier: 'Local Storage Engine',
        uploadDate: result.document.uploadDate,
        fileSize: result.document.fileSizeFormatted,
        ocrStatus: result.document.ocrStatus,
        textExcerpt: result.document.previewExcerpt,
      });

      await loadDocuments();
      setSelectedDocIds(prev => [...prev, result.document.id]);
      alert(`Uploaded & Indexed: ${result.document.filename} (${result.document.chunkCount} chunks, ${result.document.wordCount} words) is now ready in AI Assistant.`);
    } else {
      alert('Upload failed: ' + (result.error || 'Could not index file.'));
    }

    e.target.value = '';
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: textToSend.trim(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsProcessing(true);

    const response = await ApiClient.askAI(textToSend, selectedDocIds, activeModel);
    setIsProcessing(false);

    if (response.success && response.answer) {
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: response.answer,
        citations: response.citations,
        modelUsed: response.modelUsed,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } else {
      // Clear reporting of local AI offline or error - ZERO fake responses
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: response.error || 'Failed to generate response from local AI pipeline.',
        error: response.error,
        canRetry: true,
        isOffline: response.isOllamaOffline,
        retrievedEvidencePreview: response.retrievedEvidencePreview,
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const hasInstalledModels = ollamaHealth?.installedModels && ollamaHealth.installedModels.length > 0;
  const isFullyConnected = ollamaHealth?.available && hasInstalledModels;

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] bg-white rounded-xl border border-slate-200 card-shadow overflow-hidden">
      {/* Top AI Runtime Status Bar */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-white border border-slate-200 text-blue-700">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block">Local AI Runtime (Ollama Engine)</span>
            <div className="flex items-center gap-2 mt-0.5">
              {isFullyConnected ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Ollama Connected ({activeModel})
                </span>
              ) : ollamaHealth?.available && !hasInstalledModels ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Ollama Online • No Models Pulled (run 'ollama pull qwen2.5:3b')
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Ollama Offline ({ollamaHealth?.baseUrl || 'http://127.0.0.1:11434'})
                </span>
              )}
              <span className="text-slate-400 font-mono text-[10px]">
                {availableDocs.length} doc(s) indexed
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasInstalledModels && (
            <select
              value={activeModel}
              onChange={e => setActiveModel(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 text-xs font-mono"
            >
              {ollamaHealth!.installedModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}

          <button
            onClick={checkHealth}
            disabled={isCheckingHealth}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-semibold text-xs inline-flex items-center gap-1 transition-colors"
            title="Ping Ollama server"
          >
            <RefreshCw className={`w-3 h-3 ${isCheckingHealth ? 'animate-spin' : ''}`} />
            <span>Check Status</span>
          </button>
        </div>
      </div>

      {/* Offline Alert Banner if Ollama is not running */}
      {ollamaHealth && !ollamaHealth.available && (
        <div className="p-3 bg-amber-50/80 border-b border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <span className="font-bold">Ollama Local Service is Not Running</span>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              InsureOS strictly connects to your local Ollama daemon. Start Ollama in your terminal using{' '}
              <code className="px-1.5 py-0.5 bg-amber-100 rounded font-mono text-[10px] text-amber-950 font-semibold">ollama serve</code>{' '}
              and ensure your model is pulled with{' '}
              <code className="px-1.5 py-0.5 bg-amber-100 rounded font-mono text-[10px] text-amber-950 font-semibold">ollama run {activeModel}</code>.
            </p>
          </div>
          <button
            onClick={checkHealth}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-xs shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Document Selector Header */}
      <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-slate-600 text-[11px] uppercase tracking-wider flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-blue-700" />
            Ground Answers In:
          </span>

          {availableDocs.length === 0 ? (
            <span className="text-slate-400 italic text-[11px]">
              No documents uploaded yet.
            </span>
          ) : (
            availableDocs.map(doc => {
              const isSelected = selectedDocIds.includes(doc.id);
              return (
                <button
                  key={doc.id}
                  onClick={() => toggleDocSelection(doc.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                  }`}
                  title={`${doc.filename} (${doc.chunkCount} chunks)`}
                >
                  <FileText className="w-3 h-3" />
                  <span className="truncate max-w-[140px]">{doc.filename}</span>
                  {isSelected && <CheckCircle2 className="w-3 h-3 text-blue-700" />}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Upload Button right inside AI Assistant */}
          <input
            ref={assistantFileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt,.md,.csv,.json,.png,.jpg,.jpeg"
            onChange={handleAssistantFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => assistantFileInputRef.current?.click()}
            disabled={isUploadingInAssistant}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded font-semibold text-slate-700 text-xs inline-flex items-center gap-1 shadow-2xs transition-colors"
            title="Upload a new document directly into AI Assistant"
          >
            {isUploadingInAssistant ? (
              <RefreshCw className="w-3 h-3 animate-spin text-blue-700" />
            ) : (
              <Upload className="w-3 h-3 text-blue-700" />
            )}
            <span>{isUploadingInAssistant ? 'Indexing...' : 'Upload Doc'}</span>
          </button>

          {availableDocs.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={selectAllDocs}
                className="text-[11px] text-blue-700 hover:underline font-medium"
              >
                Select All
              </button>
              <span className="text-slate-300">•</span>
              <button
                onClick={clearDocSelection}
                className="text-[11px] text-slate-500 hover:underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">InsureOS Insurance Assistant & Advisory Bot</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Your conversational local AI insurance copilot. You can ask me <strong>any question</strong>—whether analyzing your uploaded policies or asking how to get new insurance coverage.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left w-full text-xs">
              <div
                onClick={() => handleSendMessage('What is my collision deductible under my Aegis auto policy?')}
                className="p-3 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 cursor-pointer transition-all space-y-1"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-700" />
                  <span>Analyze Uploaded Policy</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  "What is my collision deductible under my Aegis auto policy?"
                </p>
              </div>

              <div
                onClick={() => handleSendMessage('I do not have flood insurance. How do I get flood insurance and what documents do I need?')}
                className="p-3 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 cursor-pointer transition-all space-y-1"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>How to Get Insurance</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  "I don't have flood insurance. How do I get one and what documents do I need?"
                </p>
              </div>

              <div
                onClick={() => handleSendMessage('What documents are required to purchase auto insurance?')}
                className="p-3 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 cursor-pointer transition-all space-y-1"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Underwriting Checklist</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  "What documents are required to purchase auto insurance?"
                </p>
              </div>

              <div
                onClick={() => handleSendMessage('What should I do immediately after a motor vehicle accident?')}
                className="p-3 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 cursor-pointer transition-all space-y-1"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  <span>Claims Guidance</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  "What should I do immediately after a motor vehicle accident?"
                </p>
              </div>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-xl p-3.5 space-y-2 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-blue-700 text-white rounded-tr-none'
                  : msg.error
                  ? 'bg-red-50 text-red-900 border border-red-200 rounded-tl-none'
                  : 'bg-slate-50 text-slate-900 border border-slate-200 rounded-tl-none'
              }`}
            >
              <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400">
                <span className="font-bold">
                  {msg.sender === 'user' ? 'You' : `InsureOS Copilot (${msg.modelUsed || activeModel})`}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              <div className="whitespace-pre-wrap">{msg.text}</div>

              {/* Citations Box */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="pt-2 mt-2 border-t border-slate-200/80 space-y-1.5">
                  <span className="font-bold text-[10px] text-slate-600 uppercase tracking-wider block">
                    Grounded Citations & Supporting Evidence:
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {msg.citations.map((c, idx) => (
                      <div
                        key={idx}
                        onClick={() => setInspectCitation(c)}
                        className="p-2 rounded bg-white border border-slate-200 hover:border-blue-400 cursor-pointer transition-all shadow-2xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3 text-blue-700" />
                            {c.filename} (Page {c.page})
                          </span>
                          <div className="flex items-center gap-1.5">
                            {c.extractionMethod && (
                              <span className="text-[9px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {c.extractionMethod}
                              </span>
                            )}
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              Relevance: {c.relevanceScore}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-600 font-mono italic leading-normal">
                          "{c.excerpt}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Retrieved passages preview even if Ollama is offline */}
              {msg.retrievedEvidencePreview && msg.retrievedEvidencePreview.length > 0 && (
                <div className="pt-2 mt-2 border-t border-red-200 space-y-1.5">
                  <span className="font-bold text-[10px] text-red-900 uppercase tracking-wider block">
                    Retrieved Document Passages (Awaiting Ollama Server Startup):
                  </span>
                  {msg.retrievedEvidencePreview.map((item, idx) => (
                    <div key={idx} className="p-2 rounded bg-white border border-red-200 text-[11px] space-y-1">
                      <span className="font-bold text-slate-800">
                        {item.filename} (Page {item.page})
                      </span>
                      <p className="font-mono text-slate-600">"{item.excerpt}"</p>
                    </div>
                  ))}
                  <button
                    onClick={() => handleSendMessage(messages[messages.length - 2]?.text)}
                    className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded text-xs font-semibold inline-flex items-center gap-1 mt-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry Query with Local AI</span>
                  </button>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-700" />
              <span>Analyzing & generating response using local {activeModel}...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center gap-1.5 overflow-x-auto text-[11px]">
        <span className="text-slate-400 font-bold shrink-0">Quick Bot Questions:</span>
        <button
          onClick={() => handleSendMessage('What is my collision deductible under Aegis auto policy?')}
          className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 shrink-0 font-medium transition-colors"
        >
          Auto Deductible
        </button>
        <button
          onClick={() => handleSendMessage('I do not have flood insurance. How do I get flood insurance and what documents do I need?')}
          className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 shrink-0 font-medium transition-colors"
        >
          How to get Flood Insurance?
        </button>
        <button
          onClick={() => handleSendMessage('What documents are required to get auto insurance?')}
          className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 shrink-0 font-medium transition-colors"
        >
          Insurance Checklist
        </button>
        <button
          onClick={() => handleSendMessage('What is the total mitigation invoice from RapidDry and what is the net payable?')}
          className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 shrink-0 font-medium transition-colors"
        >
          Water Mitigation Total
        </button>
        <button
          onClick={() => handleSendMessage('What should I do immediately after an accident?')}
          className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 shrink-0 font-medium transition-colors"
        >
          Accident Next Steps
        </button>
      </div>

      {/* Input Form */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={e => setInputQuery(e.target.value)}
          placeholder={
            selectedDocIds.length > 0
              ? `Ask anything (grounded in ${selectedDocIds.length} doc(s) or general insurance advice)...`
              : 'Ask any insurance question (how to get coverage, claims, concepts, or advice)...'
          }
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-700"
          disabled={isProcessing}
        />
        <button
          type="submit"
          disabled={!inputQuery.trim() || isProcessing}
          className={`px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-all ${
            inputQuery.trim() && !isProcessing
              ? 'bg-blue-700 hover:bg-blue-800 text-white'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask AI</span>
        </button>
      </form>

      {/* Inspect Citation Modal */}
      {inspectCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 card-shadow w-full max-w-lg p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-700" />
                Verified Citation Source
              </span>
              <button
                onClick={() => setInspectCitation(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] grid grid-cols-2 gap-2">
                <div><span className="text-slate-400">Document:</span> {inspectCitation.filename}</div>
                <div><span className="text-slate-400">Page:</span> {inspectCitation.page}</div>
                <div><span className="text-slate-400">Relevance Score:</span> {inspectCitation.relevanceScore}</div>
                <div><span className="text-slate-400">Chunk ID:</span> {inspectCitation.chunkId}</div>
              </div>

              <div>
                <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block mb-1">
                  Supporting Document Excerpt:
                </span>
                <div className="p-3 bg-slate-50 rounded border border-slate-200 font-mono text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap">
                  {inspectCitation.excerpt}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectCitation(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
