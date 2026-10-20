import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  User,
  Bell,
  Trash2,
  RefreshCw,
  Server,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Database,
  Cpu,
  Save
} from 'lucide-react';
import { inMemoryStore } from '../services/inMemoryStore';
import { ApiClient, type OllamaHealth } from '../services/apiClient';

export const SettingsSecurity: React.FC = () => {
  const profile = inMemoryStore.getUserProfile();

  const [carrier503, setCarrier503] = useState(inMemoryStore.testState.simulateCarrierOutage503);
  const [latency, setLatency] = useState(inMemoryStore.testState.latencyMs);

  // Ollama Configuration State
  const [ollamaUrl, setOllamaUrl] = useState('http://127.0.0.1:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3:8b');
  const [ollamaTimeout, setOllamaTimeout] = useState(60000);
  const [aiHealth, setAiHealth] = useState<OllamaHealth | null>(null);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setIsTestingAi(true);
    const health = await ApiClient.checkAIHealth();
    setAiHealth(health);
    if (health.baseUrl) setOllamaUrl(health.baseUrl);
    if (health.configuredModel) setOllamaModel(health.configuredModel);
    setIsTestingAi(false);
  };

  const handleSaveAiConfig = async () => {
    setSaveStatus(null);
    const res = await ApiClient.updateAIConfig({
      ollamaBaseUrl: ollamaUrl,
      ollamaModel: ollamaModel,
      ollamaTimeoutMs: ollamaTimeout,
    });
    if (res.success) {
      setSaveStatus('Configuration updated successfully.');
      await checkHealth();
    } else {
      setSaveStatus(`Error: ${res.error}`);
    }
  };

  const handleToggle503 = (enabled: boolean) => {
    setCarrier503(enabled);
    inMemoryStore.testState.simulateCarrierOutage503 = enabled;
  };

  const handleLatencyChange = (val: number) => {
    setLatency(val);
    inMemoryStore.testState.latencyMs = val;
  };

  const handlePurgeLocalCache = () => {
    localStorage.clear();
    alert('Non-sensitive browser UI preferences purged. Note: InsureOS strictly keeps all policy schedules, medical data, and credentials in volatile memory and never in persistent browser storage.');
  };

  const handleLoadSampleData = () => {
    if (confirm('Load fictional demo dataset? This will populate sample policies, claims, documents, and demo persona.')) {
      inMemoryStore.loadSampleData();
      alert('Demo data loaded successfully.');
      window.location.reload();
    }
  };

  const handleResetEmptyWorkspace = () => {
    if (confirm('Reset workspace to a genuinely clean empty state? All sample policies, claims, and documents will be removed.')) {
      inMemoryStore.resetToEmptyWorkspace();
      alert('Workspace reset to clean empty state.');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              TENANT ISOLATION
            </span>
            <span className="text-slate-500 font-semibold">Tenant: {profile.tenantId || profile.id}</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-1">
            System Settings, Tenancy Controls & Local AI Runtime
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Strict isolation guarantees: No sensitive documents or credentials stored in persistent browser storage.
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Local AI Runtime & Ollama Configuration */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow space-y-4 md:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-700" />
              <h3 className="font-bold text-sm text-slate-900">Local AI Runtime & Ollama Configuration</h3>
            </div>
            <div className="flex items-center gap-2">
              {aiHealth?.available ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Ollama Daemon Online
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Ollama Daemon Offline
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            InsureOS connects to your locally installed Ollama instance without sending private policy data or claims over the public internet. Ensure Ollama is running (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">ollama serve</code>) on localhost.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">
                Ollama Base URL:
              </label>
              <input
                type="text"
                value={ollamaUrl}
                onChange={e => setOllamaUrl(e.target.value)}
                placeholder="http://127.0.0.1:11434"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">
                Target Model Name:
              </label>
              <input
                type="text"
                value={ollamaModel}
                onChange={e => setOllamaModel(e.target.value)}
                placeholder="llama3:8b, mistral, etc."
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">
                Timeout (ms):
              </label>
              <input
                type="number"
                value={ollamaTimeout}
                onChange={e => setOllamaTimeout(Number(e.target.value))}
                step="5000"
                min="5000"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-xs"
              />
            </div>
          </div>

          {aiHealth && (
            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs font-mono space-y-1">
              <div><span className="text-slate-400">Daemon Status:</span> {aiHealth.available ? 'Reachable' : 'Unreachable'}</div>
              <div><span className="text-slate-400">Configured Model:</span> {aiHealth.configuredModel} (Installed: {aiHealth.isModelInstalled ? 'Yes' : 'No'})</div>
              <div><span className="text-slate-400">Installed Models:</span> [{aiHealth.installedModels.join(', ') || 'None found'}]</div>
              {aiHealth.error && <div className="text-amber-700"><span className="text-slate-400">Notice:</span> {aiHealth.error}</div>}
            </div>
          )}

          {saveStatus && (
            <div className="p-2.5 rounded bg-blue-50 text-blue-900 border border-blue-200 text-xs font-semibold">
              {saveStatus}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSaveAiConfig}
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded text-xs inline-flex items-center gap-1.5 shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save AI Configuration</span>
            </button>
            <button
              onClick={checkHealth}
              disabled={isTestingAi}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded border border-slate-200 text-xs inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingAi ? 'animate-spin' : ''}`} />
              <span>Test Connection</span>
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="w-4 h-4 text-blue-700" />
            <h3 className="font-bold text-sm text-slate-900">Authenticated Policyholder Profile</h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold block">Full Name:</span>
              <span className="font-bold text-slate-900 text-sm">{profile.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold block">Identifier:</span>
              <span className="font-mono text-slate-800">{profile.id}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold block">Contact Email:</span>
              <span className="font-mono text-slate-800">{profile.email}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold block">Physical Address:</span>
              <span className="text-slate-700">{profile.address}</span>
            </div>
          </div>
        </div>

        {/* Data Retention & Local Isolation */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Database className="w-4 h-4 text-blue-700" />
            <h3 className="font-bold text-sm text-slate-900">Data Storage & Demo Tools</h3>
          </div>

          <p className="text-slate-600 leading-relaxed text-xs">
            In accordance with architectural requirements, <span className="font-semibold text-slate-900">localStorage</span> is used strictly for non-sensitive UI settings. Actual policy contracts, medical discharge summaries, and bank details reside solely in isolated volatile memory.
          </p>

          <div className="pt-2 flex flex-col gap-2">
            <button
              id="btn-load-sample-data"
              onClick={handleLoadSampleData}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Load Sample Demo Data (Policies, Claims & Documents)</span>
            </button>

            <button
              id="btn-reset-empty-workspace"
              onClick={handleResetEmptyWorkspace}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset Workspace to Clean Empty State</span>
            </button>

            <button
              id="btn-purge-local-cache"
              onClick={handlePurgeLocalCache}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Purge Local UI Cache (localStorage)</span>
            </button>
          </div>
        </div>

        {/* Carrier Simulation Testing Controls */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 card-shadow space-y-4 md:col-span-2">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Sliders className="w-4 h-4 text-amber-700" />
            <h3 className="font-bold text-sm text-slate-900">Carrier Gateway Simulation Controls (TC-06)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  id="chk-carrier-503"
                  type="checkbox"
                  checked={carrier503}
                  onChange={e => handleToggle503(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <div>
                  <span className="font-bold text-slate-900 text-xs block">
                    Simulate Carrier Gateway Failure (HTTP 503)
                  </span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">
                    When enabled, carrier submission dispatches return a 503 Service Unavailable error to test failure handling and non-destructive retry mechanics.
                  </span>
                </div>
              </label>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between font-bold text-slate-700 text-xs">
                <span>Simulated Network Latency:</span>
                <span className="font-mono text-blue-700">{latency}ms</span>
              </div>
              <input
                type="range"
                min="0"
                max="1500"
                step="100"
                value={latency}
                onChange={e => handleLatencyChange(Number(e.target.value))}
                className="w-full accent-blue-700"
              />
              <span className="text-[10px] text-slate-400 block">
                Adjusts simulated carrier EDI dispatch latency.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
