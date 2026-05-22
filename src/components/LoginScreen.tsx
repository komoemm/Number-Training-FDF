/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Key, AlertCircle, Sparkles, Zap, ArrowRight } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (username: string, passwordText: string) => { success: boolean; error?: string };
  localUsers: any[];
}

export default function LoginScreen({ onLogin, localUsers }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim()) {
      setErrorMsg('Please enter a username.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter a password.');
      return;
    }

    const res = onLogin(username, password);
    if (!res.success) {
      setErrorMsg(res.error || 'Authentication error.');
    }
  };

  const handleShortcutLogin = (user: string, pass: string) => {
    setErrorMsg(null);
    setUsername(user);
    setPassword(pass);
    const res = onLogin(user, pass);
    if (!res.success) {
      setErrorMsg(res.error || 'Authentication error.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 select-none font-sans" id="login-screen-root">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Upper Title Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 text-[11px] font-bold text-indigo-400 font-sans uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
            <span>JP-QIN-13 WORKSTATION PORTAL</span>
          </div>
          
          <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none font-sans pt-2">
            Support Training System
          </h1>
          <p className="text-slate-400 text-xs font-mono tracking-widest uppercase">
            Qualified Invoice Speed Assessment
          </p>
        </div>

        {/* Central Authorization Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6" id="login-card">
          <div className="space-y-1 text-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-100 tracking-tight pt-2">Operator Sign-In</h2>
            <p className="text-xs text-slate-500">Provide sandbox credentials to access assessment modules</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                User Name / Operator ID
              </label>
              <div className="relative flex items-center">
                <UserCheck className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950/80 hover:bg-slate-950 focus:bg-slate-950 text-slate-100 placeholder-slate-600 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition"
                  id="username-input"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Secure Password
              </label>
              <div className="relative flex items-center">
                <Key className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/80 hover:bg-slate-950 focus:bg-slate-950 text-slate-100 placeholder-slate-600 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition animate-none"
                  id="password-input"
                />
              </div>
            </div>

            {/* Error Indicators */}
            {errorMsg && (
              <div className="flex items-start gap-2 bg-rose-950/40 border border-rose-900/50 rounded-xl p-3 text-xs text-rose-300 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Login button */}
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-lg hover:shadow-indigo-500/20 text-xs sm:text-sm uppercase tracking-wider font-sans mt-2"
              id="login-submit-button"
            >
              <span>Authenticate Operator</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </form>

          {/* Quick Shortcuts Box for Easy Testing */}
          <div className="border-t border-slate-800/80 pt-5 space-y-3" id="shortcut-accounts">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Default Sandbox Accounts
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Admin login tag */}
              <button
                type="button"
                onClick={() => handleShortcutLogin('admin', 'admin')}
                className="flex flex-col items-start bg-slate-950 hover:bg-slate-950/50 active:bg-slate-950 hover:border-slate-700/80 border border-slate-800/60 rounded-xl p-2.5 text-left transition cursor-pointer text-xs"
              >
                <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                  👑 Administrator
                </span>
                <span className="text-[10px] text-indigo-400 font-semibold font-mono mt-0.5">admin / admin</span>
                <span className="text-[8px] text-slate-500 mt-1">Has full operator control & reports access</span>
              </button>

              {/* Trainee login tag */}
              <button
                type="button"
                onClick={() => handleShortcutLogin('guest', 'guest')}
                className="flex flex-col items-start bg-slate-950 hover:bg-slate-950/50 active:bg-slate-950 hover:border-slate-700/80 border border-slate-800/60 rounded-xl p-2.5 text-left transition cursor-pointer text-xs"
              >
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  🎓 Practice Student
                </span>
                <span className="text-[10px] text-pink-400 font-semibold font-mono mt-0.5">guest / guest</span>
                <span className="text-[8px] text-slate-500 mt-1">Practices speed runs on prepared datasets</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info label */}
        <div className="text-center">
          <p className="text-[10px] text-slate-600 font-mono">
            Support Training Offline Module // ISO-6004 Typing Standard
          </p>
        </div>
      </div>
    </div>
  );
}
