import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  BookOpen
} from 'lucide-react';
import { inMemoryStore } from '../services/inMemoryStore';

interface LoginOnboardingProps {
  onLoginSuccess: () => void;
}

export const LoginOnboarding: React.FC<LoginOnboardingProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'demo' | 'email' | 'mobile'>('demo');
  const profile = inMemoryStore.getUserProfile();
  const [emailInput, setEmailInput] = useState(profile.email || 'policyholder@workspace.local');
  const [consentChecked, setConsentChecked] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(1);

  const handleDemoLogin = () => {
    if (!consentChecked) {
      alert('Please review and check the data processing consent before proceeding.');
      return;
    }
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 text-xs font-sans">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 card-shadow overflow-hidden">
        {/* Institutional Branding Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-lg text-white shadow-xs">
              I
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight">InsureOS</h1>
              <p className="text-[11px] text-slate-400">Enterprise AI Insurance Autopilot</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40 uppercase">
            Simulated Demo
          </span>
        </div>

        {/* Content Tabs */}
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Sign in to Policyholder Portal</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Secure client-side session with isolated volatile state.
            </p>
          </div>

          {/* Quick Demo Switch */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-blue-700 text-white uppercase">
                  SESSION READY
                </span>
                <h3 className="font-bold text-slate-900 text-xs mt-1">
                  Launch Policyholder Session
                </h3>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Sign in immediately to local clean workspace session:
                </p>
              </div>
              <UserCheck className="w-5 h-5 text-blue-700" />
            </div>

            <div className="p-2.5 rounded bg-white border border-blue-100 flex items-center justify-between font-mono text-[11px]">
              <div>
                <span className="font-bold text-slate-800">{profile.fullName}</span>
                <span className="text-slate-400 block text-[10px]">{profile.id}</span>
              </div>
              <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Workspace Active
              </span>
            </div>

            {/* Document Processing & Privacy Consent */}
            <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={e => setConsentChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-700 rounded border-slate-300 focus:ring-blue-600"
              />
              <span className="text-[11px] text-slate-700 leading-relaxed">
                I consent to automated policy clause extraction and acknowledge that all data, claims dispatches, and policy schedules in this prototype are fictional simulations.
              </span>
            </label>

            <button
              onClick={handleDemoLogin}
              className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-sm transition-all text-xs flex items-center justify-center gap-1.5"
            >
              <span>Launch InsureOS Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3-Step Governance Walkthrough */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
              How InsureOS Handles Policy Data & Security:
            </span>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="font-bold text-blue-700 block text-[10px]">1. Verifiable</span>
                <span className="text-slate-600 text-[10px]">Answers cite exact contract clauses.</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="font-bold text-blue-700 block text-[10px]">2. Deterministic</span>
                <span className="text-slate-600 text-[10px]">Application logic locks $500 deductible.</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="font-bold text-blue-700 block text-[10px]">3. OWASP Guard</span>
                <span className="text-slate-600 text-[10px]">Threat bench blocks prompt injection.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <span>Institutional FinTech Aesthetic</span>
          <span>Version 2.0-PROTOTYPE</span>
        </div>
      </div>
    </div>
  );
};
