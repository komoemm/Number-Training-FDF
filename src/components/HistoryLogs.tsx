/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, isFirebaseActive } from '../firebase';
import { Clock, RefreshCw, Layers, Database, ChevronDown, ChevronUp, CheckCircle, XCircle, Trash2, Filter, Key, ShieldAlert, Trophy, Award, TrendingUp, Download } from 'lucide-react';
import { TestSession, TypingDetail } from '../types';
import { generateCertificatePDF } from '../utils/pdfGenerator';
import { generateCertificateHTML } from '../utils/htmlGenerator';

interface HistoryLogsProps {
  userId: string;
  refreshTrigger: number;
  isAdmin?: boolean;
}

export default function HistoryLogs({ userId, refreshTrigger, isAdmin = false }: HistoryLogsProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'typing' | 'login'>('dashboard');
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterLoginUser, setFilterLoginUser] = useState<string>('all');

  // Multi-stage inline deletion confirmation state variables (Iframe-safe)
  const [sessionPendingDeleteId, setSessionPendingDeleteId] = useState<string | null>(null);
  const [loginPendingDeleteId, setLoginPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'typing' || activeTab === 'dashboard') {
      fetchSessionHistory();
    } else {
      fetchLoginHistory();
    }
  }, [userId, refreshTrigger, isAdmin, activeTab]);

  const fetchSessionHistory = async () => {
    setLoading(true);
    setErrorStatus(null);
    let fetchedSessions: TestSession[] = [];

    // 1. Fetch from Firestore if Firebase configurations are active
    if (isFirebaseActive && db && userId && userId !== 'sandbox_guest_uid') {
      const path = 'test_sessions';
      try {
        // ALWAYS fetch all trainee records up to 150 for aggregated levels statistics and leaderboard standings
        const queryRef = query(collection(db, path), orderBy('timestamp', 'desc'), limit(150));

        const snapshot = await getDocs(queryRef);
        
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          let timestampDate: Date;
          if (data.timestamp && typeof data.timestamp.toDate === 'function') {
            timestampDate = data.timestamp.toDate();
          } else if (data.timestamp) {
            timestampDate = new Date(data.timestamp);
          } else {
            timestampDate = new Date();
          }

          fetchedSessions.push({
            id: docSnap.id,
            userId: data.userId || 'unknown',
            timestamp: timestampDate,
            totalImagesAttempted: data.totalImagesAttempted,
            correctEntries: data.correctEntries,
            averageTimeMs: data.averageTimeMs,
            level: data.level,
            details: data.details || []
          });
        });
      } catch (err) {
        console.warn('Unable to load from cloud. Retrying local cache fallback...', err);
        try {
          const localData = localStorage.getItem('local_test_sessions');
          if (localData) {
            fetchedSessions = JSON.parse(localData);
          }
        } catch {
          // ignore fallback err
        }
        setErrorStatus('Displaying cached offline entries only.');
      }
    } else {
      // 2. Pure Offline / Sandbox fallback mode
      try {
        const localData = localStorage.getItem('local_test_sessions');
        if (localData) {
          const parsed = JSON.parse(localData);
          fetchedSessions = parsed.map((session: any) => ({
            ...session,
            timestamp: new Date(session.timestamp),
            userId: session.userId || 'guest'
          }));
        }
      } catch (err) {
        console.error('Failed to query local speed session results:', err);
      }
    }

    setSessions(fetchedSessions);
    setLoading(false);
  };

  const fetchLoginHistory = async () => {
    setLoading(true);
    setErrorStatus(null);
    let fetchedLogins: any[] = [];

    // 1. Fetch from Firestore if Firebase active
    if (isFirebaseActive && db && userId && userId !== 'sandbox_guest_uid') {
      const path = 'login_history';
      try {
        const queryRef = isAdmin
          ? query(collection(db, path), orderBy('timestamp', 'desc'), limit(150))
          : query(collection(db, path), where('username', '==', userId), orderBy('timestamp', 'desc'), limit(50));

        const snapshot = await getDocs(queryRef);
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          let timestampDate: Date;
          if (data.timestamp && typeof data.timestamp.toDate === 'function') {
            timestampDate = data.timestamp.toDate();
          } else if (data.timestamp) {
            timestampDate = new Date(data.timestamp);
          } else {
            timestampDate = new Date();
          }

          fetchedLogins.push({
            id: docSnap.id,
            username: data.username || 'unknown',
            role: data.role || 'unknown',
            success: data.success ?? true,
            timestamp: timestampDate,
            userAgent: data.userAgent || 'unknown_agent'
          });
        });
      } catch (err) {
        console.warn('Unable to load login history from cloud. Fallback to local storage...', err);
        try {
          const localData = localStorage.getItem('local_login_history');
          if (localData) {
            fetchedLogins = JSON.parse(localData);
          }
        } catch {}
      }
    } else {
      // 2. Local Fallback
      try {
        const localData = localStorage.getItem('local_login_history');
        if (localData) {
          const parsed = JSON.parse(localData);
          fetchedLogins = parsed.map((log: any) => ({
            ...log,
            timestamp: new Date(log.timestamp)
          }));
        }
      } catch (err) {
        console.error('Failed to query local login history:', err);
      }
    }

    // Role filtration limits (Strict Security Reinforcement)
    if (!isAdmin) {
      fetchedLogins = fetchedLogins.filter(s => s.username === userId);
    }

    setLoginLogs(fetchedLogins);
    setLoading(false);
  };

  const handleDeleteSession = async (timestampToDelete: any, docId?: string) => {
    if (!isAdmin) return;
    
    // Delete from Firestore if docId exists
    if (isFirebaseActive && db && docId) {
      try {
        await deleteDoc(doc(db, 'test_sessions', docId));
      } catch (err) {
        console.error('Failed to delete performance record from cloud database:', err);
      }
    }

    // Delete from local storage fallbacks as well
    try {
      const localData = localStorage.getItem('local_test_sessions');
      if (localData) {
        const parsed = JSON.parse(localData);
        const filtered = parsed.filter((s: any) => s.timestamp !== timestampToDelete);
        localStorage.setItem('local_test_sessions', JSON.stringify(filtered));
      }
    } catch (err) {
      console.error('Failed deleting local log backup:', err);
    }

    fetchSessionHistory();
  };

  const handleDeleteLoginLog = async (logId: string) => {
    if (!isAdmin) return;

    if (isFirebaseActive && db) {
      try {
        await deleteDoc(doc(db, 'login_history', logId));
      } catch (err) {
        console.error('Failed to delete login log from cloud:', err);
      }
    }

    try {
      const localData = localStorage.getItem('local_login_history');
      if (localData) {
        const parsed = JSON.parse(localData);
        const filtered = parsed.filter((l: any) => l.id !== logId);
        localStorage.setItem('local_login_history', JSON.stringify(filtered));
      }
    } catch (err) {
      console.error('Failed deleting local login log:', err);
    }

    fetchLoginHistory();
  };

  const toggleExpandSession = (index: number) => {
    setExpandedSessionId(expandedSessionId === index ? null : index);
  };

  const formatDate = (dateValue: any) => {
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
    const d = new Date(dateValue);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
    return String(dateValue);
  };

  // Get distinct list of usernames in logs to filter of
  const distinctUsers = Array.from(new Set(sessions.map(s => s.userId))).filter(Boolean);
  const distinctLoginUsers = Array.from(new Set(loginLogs.map(l => l.username))).filter(Boolean);

  const displayedSessions = isAdmin
    ? (filterUser === 'all' ? sessions : sessions.filter(s => s.userId === filterUser))
    : sessions.filter(s => s.userId === userId);

  const displayedLogins = filterLoginUser === 'all'
    ? loginLogs
    : loginLogs.filter(l => l.username === filterLoginUser);

  const getLevelBySpeed = (timeMs: number) => {
    const avgSec = timeMs / 1000;
    if (avgSec <= 3.0) return 'A';
    if (avgSec <= 4.0) return 'B';
    if (avgSec <= 5.0) return 'C';
    return 'D';
  };

  // Compute leaderboard and statistics
  const computeDashboardStats = () => {
    const userBestSessions: { [username: string]: TestSession } = {};
    
    sessions.forEach(session => {
      const u = session.userId || 'unknown';
      if (!userBestSessions[u] || session.averageTimeMs < userBestSessions[u].averageTimeMs) {
        userBestSessions[u] = session;
      }
    });

    const leaderboardList = Object.values(userBestSessions).map(session => {
      const u = session.userId || 'unknown';
      const accuracy = session.totalImagesAttempted > 0 
        ? Math.round((session.correctEntries / session.totalImagesAttempted) * 100) 
        : 100;
        
      const lvl = getLevelBySpeed(session.averageTimeMs);
      const totalRuns = sessions.filter(s => s.userId === u).length;

      return {
        userId: u,
        bestTimeMs: session.averageTimeMs,
        level: lvl,
        accuracy,
        totalRuns,
        timestamp: session.timestamp,
      };
    });

    // Sort leaderboard list (lowest averageTimeMs first, i.e., fastest)
    leaderboardList.sort((a, b) => a.bestTimeMs - b.bestTimeMs);

    // Calculate level distributions
    const levelCountsObj = { A: 0, B: 0, C: 0, D: 0 };
    leaderboardList.forEach(entry => {
      const lvl = entry.level as 'A' | 'B' | 'C' | 'D';
      if (levelCountsObj[lvl] !== undefined) {
        levelCountsObj[lvl]++;
      }
    });

    return {
      leaderboard: leaderboardList,
      levelCounts: levelCountsObj,
      totalTraineesCount: leaderboardList.length
    };
  };

  const { leaderboard, levelCounts, totalTraineesCount } = computeDashboardStats();
  const myDashboardEntry = leaderboard.find(e => e.userId === userId);
  const myRank = myDashboardEntry ? leaderboard.indexOf(myDashboardEntry) + 1 : null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" id="history-panel">
      {/* Tabs Layout */}
      <div className="flex border-b border-slate-200 bg-slate-50 justify-between items-center pr-4">
        <div className="flex overflow-x-auto shrink-0 font-sans">
          <button
            onClick={() => { setActiveTab('dashboard'); }}
            className={`py-3.5 px-6 text-xs font-extrabold uppercase tracking-widest border-b-2 cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'dashboard'
                ? 'border-indigo-600 text-indigo-700 bg-white border-r border-slate-200'
                : 'border-transparent text-slate-450 hover:text-slate-700 hover:bg-slate-100/50'
            }`}
          >
            <Trophy className="w-4 h-4 text-indigo-600" />
            <span>📊 Speed Dashboard</span>
          </button>
          <button
            onClick={() => { setActiveTab('typing'); setExpandedSessionId(null); }}
            className={`py-3.5 px-6 text-xs font-extrabold uppercase tracking-widest border-b-2 cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'typing'
                ? 'border-indigo-600 text-indigo-700 bg-white border-x border-slate-200'
                : 'border-transparent text-slate-450 hover:text-slate-700 hover:bg-slate-100/50'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Trainee Typing Logs</span>
          </button>
          <button
            onClick={() => { setActiveTab('login'); }}
            className={`py-3.5 px-6 text-xs font-extrabold uppercase tracking-widest border-b-2 cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'login'
                ? 'border-indigo-600 text-indigo-700 bg-white border-l border-slate-200'
                : 'border-transparent text-slate-450 hover:text-slate-700 hover:bg-slate-100/50'
            }`}
          >
            <Key className="w-4 h-4 text-indigo-600" />
            <span>Login History</span>
          </button>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2.5">
          {activeTab === 'typing' && isAdmin && distinctUsers.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600 shadow-sm">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterUser}
                onChange={(e) => {
                  setFilterUser(e.target.value);
                  setExpandedSessionId(null);
                }}
                className="bg-transparent border-none outline-none font-bold text-slate-700 cursor-pointer text-xs"
              >
                <option value="all">All Trainees ({distinctUsers.length})</option>
                {distinctUsers.map(user => (
                  <option key={user} value={user}>User: {user}</option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'login' && isAdmin && distinctLoginUsers.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600 shadow-sm">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterLoginUser}
                onChange={(e) => setFilterLoginUser(e.target.value)}
                className="bg-transparent border-none outline-none font-bold text-slate-700 cursor-pointer text-xs"
              >
                <option value="all">All Registries ({distinctLoginUsers.length})</option>
                {distinctLoginUsers.map(user => (
                  <option key={user} value={user}>Operator: {user}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={(activeTab === 'typing' || activeTab === 'dashboard') ? fetchSessionHistory : fetchLoginHistory}
            disabled={loading}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition disabled:opacity-50 border border-slate-200 cursor-pointer"
            title="Reload Active Panel Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {errorStatus && (
        <div className="bg-amber-50 text-amber-800 border-b border-slate-200 px-5 py-2 text-xs flex items-center">
          <Database className="w-3.5 h-3.5 mr-1" />
          <span>{errorStatus}</span>
        </div>
      )}

      {/* Main List Box */}
      <div className="p-5" id="history-items">
        {loading && (activeTab === 'dashboard' ? sessions.length === 0 : activeTab === 'typing' ? sessions.length === 0 : loginLogs.length === 0) ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
            <span className="text-xs font-mono">Querying historical registries...</span>
          </div>
        ) : (
          <>
            {/* TAB 0: CLASS SPEED DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-fade-in" id="dashboard-tab-view">
                
                {/* 1. Header & Welcome Standings summary row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                      <TrendingUp className="w-4 h-4 text-indigo-600" /> Class SLA Level Rankings
                    </h3>
                    <p className="text-slate-500 text-xs mt-1.5">
                      Target Japanese bill invoicing standard speed is <strong>under 6.00 seconds</strong> per document, with ≥ 95% accuracy.
                    </p>
                  </div>
                  {myDashboardEntry ? (
                    <div className="bg-white border border-indigo-150 p-2.5 px-4 rounded-lg flex items-center gap-3.5 self-start md:self-auto shadow-sm">
                      <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center font-bold font-sans text-sm shadow-inner">
                        #{myRank}
                      </div>
                      <div className="leading-tight">
                        <span className="block text-[9px] uppercase font-bold text-slate-405 text-slate-400">Your Peak SLA Rank</span>
                        <span className="block text-xs font-extrabold text-slate-750 font-sans mt-0.5">
                          {userId} (Level {myDashboardEntry.level})
                        </span>
                      </div>
                      <div className="h-6 w-px bg-slate-150"></div>
                      <div className="leading-tight">
                        <span className="block text-[9px] uppercase font-bold text-slate-405 text-slate-400 font-sans">Best Speed</span>
                        <span className="block text-xs font-mono font-bold text-indigo-600 mt-0.5">
                          {(myDashboardEntry.bestTimeMs / 1000).toFixed(2)}s
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-250 p-2.5 px-4 rounded-lg self-start md:self-auto text-slate-500 text-xs">
                      No speed sessions completed yet as <strong className="text-slate-800">{userId}</strong>. Take an assessment test to compete!
                    </div>
                  )}
                </div>

                {/* 2. Level Distribution Bento Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Level A Card */}
                  <div className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute -top-4 -right-4 text-emerald-500/5 select-none pointer-events-none">
                      <Trophy className="w-24 h-24" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded uppercase tracking-wider font-sans">
                          Level A
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Expert Tier</span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-500 mt-3 uppercase tracking-wider font-sans">Speed Ceiling</h4>
                      <strong className="block text-slate-800 text-sm mt-0.5">Under 3.00 seconds</strong>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-slate-800 font-sans">{levelCounts.A}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {totalTraineesCount > 0 ? Math.round((levelCounts.A / totalTraineesCount) * 100) : 0}% of operators
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1 rounded overflow-hidden mt-2">
                      <div className="bg-emerald-500 h-full" style={{ width: `${totalTraineesCount > 0 ? (levelCounts.A / totalTraineesCount) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  {/* Level B Card */}
                  <div className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute -top-4 -right-4 text-indigo-500/5 select-none pointer-events-none">
                      <Trophy className="w-24 h-24" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-indigo-805 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded uppercase tracking-wider font-sans w-fit">
                          Level B
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Specialist</span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-500 mt-3 uppercase tracking-wider font-sans">Speed Ceiling</h4>
                      <strong className="block text-slate-800 text-sm mt-0.5 font-sans">3.01 ~ 4.00 seconds</strong>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-slate-800 font-sans">{levelCounts.B}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {totalTraineesCount > 0 ? Math.round((levelCounts.B / totalTraineesCount) * 100) : 0}% of operators
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1 rounded overflow-hidden mt-2">
                      <div className="bg-indigo-500 h-full" style={{ width: `${totalTraineesCount > 0 ? (levelCounts.B / totalTraineesCount) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  {/* Level C Card */}
                  <div className="bg-white border border-amber-100 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute -top-4 -right-4 text-amber-500/5 select-none pointer-events-none">
                      <Trophy className="w-24 h-24" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-amber-805 bg-amber-50 border border-amber-150 px-2 py-0.5 rounded uppercase tracking-wider font-sans w-fit">
                          Level C
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Qualified</span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-500 mt-3 uppercase tracking-wider font-sans">Speed Ceiling</h4>
                      <strong className="block text-slate-800 text-sm mt-0.5 font-sans">4.01 ~ 5.00 seconds</strong>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-slate-800 font-sans">{levelCounts.C}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {totalTraineesCount > 0 ? Math.round((levelCounts.C / totalTraineesCount) * 100) : 0}% of operators
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1 rounded overflow-hidden mt-2">
                      <div className="bg-amber-500 h-full" style={{ width: `${totalTraineesCount > 0 ? (levelCounts.C / totalTraineesCount) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  {/* Level D Card */}
                  <div className="bg-white border border-rose-100 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute -top-4 -right-4 text-rose-500/5 select-none pointer-events-none">
                      <Trophy className="w-24 h-24" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-rose-805 bg-rose-50 border border-rose-150 px-2 py-0.5 rounded uppercase tracking-wider font-sans w-fit">
                          Level D
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Practitioner</span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-500 mt-3 uppercase tracking-wider font-sans">Speed Standard</h4>
                      <strong className="block text-slate-800 text-sm mt-0.5 font-sans">&gt; 5.00 seconds</strong>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-slate-800 font-sans">{levelCounts.D}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {totalTraineesCount > 0 ? Math.round((levelCounts.D / totalTraineesCount) * 100) : 0}% of operators
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1 rounded overflow-hidden mt-2">
                      <div className="bg-rose-500 h-full" style={{ width: `${totalTraineesCount > 0 ? (levelCounts.D / totalTraineesCount) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                </div>

                {/* 3. High-Contrast Speed Leaderboard Table Layout */}
                <div className="bg-white border border-slate-205 rounded-xl overflow-hidden shadow-sm mt-4">
                  <div className="bg-slate-50 px-5 py-4 border-b border-slate-205 flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-slate-600 flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-500 font-bold" /> Live Training Standings ({leaderboard.length} Ranked Operators)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono uppercase font-bold tracking-widest">Speed Rank ascending</span>
                  </div>
                  {leaderboard.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Award className="w-8 h-8 text-slate-350 mx-auto block mb-2" />
                      <p className="text-xs font-semibold">No Operators have registered typing speed scores yet.</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                        Invoices must be catalog-typed fully in standard mode for automatic level evaluation logging in Firestore.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-medium border-collapse min-w-[700px]">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-450 uppercase pb-3 text-[10px] font-bold bg-slate-50/45 text-slate-500 font-sans">
                            <th className="py-3 px-5 text-left w-20">Rank</th>
                            <th className="py-3">Trainee Operator Name</th>
                            <th className="py-3">Level Reached</th>
                            <th className="py-3 font-mono">Best Averaged Speed</th>
                            <th className="py-3 font-sans">Session Accuracy</th>
                            <th className="py-3 text-center">Total Runs</th>
                            <th className="py-3 text-right pr-5">Achieved Date/Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 font-sans text-slate-705 text-slate-700">
                          {leaderboard.map((entry, idx) => {
                            const isMe = entry.userId === userId;
                            const achievedAtLabel = formatDate(entry.timestamp);
                            return (
                              <tr key={entry.userId} className={`transition duration-100 ${isMe ? 'bg-indigo-50/40 hover:bg-slate-100' : 'hover:bg-slate-50'}`}>
                                <td className="py-3.5 px-5 font-bold font-sans">
                                  {idx === 0 ? (
                                    <span className="flex items-center gap-1">
                                      <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                                      <span className="text-amber-600 font-extrabold font-sans">1st</span>
                                    </span>
                                  ) : idx === 1 ? (
                                    <span className="flex items-center gap-1">
                                      <Trophy className="w-4 h-4 text-slate-400 shrink-0" />
                                      <span className="text-slate-500 font-extrabold font-sans">2nd</span>
                                    </span>
                                  ) : idx === 2 ? (
                                    <span className="flex items-center gap-1">
                                      <Trophy className="w-4 h-4 text-amber-750 shrink-0" />
                                      <span className="text-amber-800 font-extrabold font-sans">3rd</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-405 text-slate-400 pl-1 font-bold">{idx + 1}</span>
                                  )}
                                </td>
                                <td className="py-3.5 font-bold">
                                  <span className="flex items-center gap-1.5">
                                    <span className="capitalize text-slate-800">{entry.userId}</span>
                                    {isMe && (
                                      <span className="text-[8px] bg-indigo-600 text-white font-extrabold uppercase px-1.5 py-0.5 rounded tracking-widest font-mono">
                                        ✦ You
                                      </span>
                                    )}
                                  </span>
                                </td>
                                <td className="py-3.5">
                                  <span className={`inline-block text-[10px] px-2.5 py-0.5 rounded font-extrabold uppercase border tracking-wider ${
                                    entry.level === 'A' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                                    entry.level === 'B' ? 'text-indigo-705 text-indigo-705 bg-indigo-50 border-indigo-200' :
                                    entry.level === 'C' ? 'text-amber-705 text-amber-705 bg-amber-50 border-amber-200' :
                                    'text-rose-705 text-rose-705 bg-rose-50 border-rose-200'
                                  }`}>
                                    Level {entry.level || 'D'}
                                  </span>
                                </td>
                                <td className="py-3.5 font-mono text-slate-650 font-bold">
                                  {(entry.bestTimeMs / 1000).toFixed(2)}s
                                </td>
                                <td className="py-3.5 font-semibold text-slate-600">
                                  <span className={`${entry.accuracy >= 95 ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                                    {entry.accuracy}%
                                  </span>
                                </td>
                                <td className="py-3.5 text-center font-mono text-slate-505 text-slate-500 font-bold">
                                  {entry.totalRuns}
                                </td>
                                <td className="py-3.5 text-right pr-5 text-[11px] text-slate-400 font-mono">
                                  {achievedAtLabel}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 1: TYPING PERFORMANCE */}
            {activeTab === 'typing' && (
              displayedSessions.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-center">
                  <Clock className="w-8 h-8 text-slate-300 mb-2" />
                  <span className="text-sm font-semibold text-slate-600">No Typing Performance Records Match</span>
                  <span className="text-xs text-slate-500 mt-1">
                    {filterUser === 'all' 
                      ? 'Complete a test session worksheet to record your score.' 
                      : `No performance statistics found for trainee "${filterUser}"`}
                  </span>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedSessions.map((session, sIdx) => {
                    const accuracy = Math.round((session.correctEntries / session.totalImagesAttempted) * 100);
                    const isExpanded = expandedSessionId === sIdx;
                    const dateLabel = formatDate(session.timestamp);
                    const lvl = getLevelBySpeed(session.averageTimeMs);
                    
                    return (
                      <div key={sIdx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm transition hover:border-slate-305">
                        {/* Summary line */}
                        <div 
                          onClick={() => toggleExpandSession(sIdx)}
                          className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 transition bg-slate-50/10"
                        >
                          <div className="space-y-1">
                            <div className="text-[10px] font-mono text-slate-400 flex flex-wrap items-center gap-2">
                              <span>{dateLabel}</span>
                              {session.userId && (
                                <span className="bg-indigo-50 px-2 py-0.5 rounded text-[10px] text-indigo-700 font-bold border border-indigo-100 uppercase tracking-wider">
                                  Operator: {session.userId}
                                </span>
                              )}
                              {isAdmin && (
                                <span className="bg-emerald-50 px-1.5 py-0.2 rounded text-[9px] text-emerald-700 border border-emerald-100">Verified Log</span>
                              )}
                            </div>
                            <div className="text-sm font-extrabold text-slate-800 flex flex-wrap items-center gap-2">
                              <span>{session.correctEntries} of {session.totalImagesAttempted} correctly typed</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border tracking-wider ml-1 ${
                                lvl === 'A' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                                lvl === 'B' ? 'text-indigo-700 bg-indigo-50 border-indigo-200' :
                                lvl === 'C' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                                'text-rose-700 bg-rose-50 border-rose-200'
                              }`}>
                                Level {lvl}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-end">
                            <div className="flex items-center space-x-6 text-right font-mono">
                              <div>
                                <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Mean Pace</div>
                                <div className="text-xs font-bold text-slate-700">{(session.averageTimeMs / 1000).toFixed(2)}s</div>
                              </div>
                              <div className="h-6 w-[1px] bg-slate-200" />
                              <div>
                                <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Accuracy</div>
                                <div className={`text-xs font-bold ${accuracy >= 95 ? 'text-emerald-600' : 'text-slate-650'}`}>{accuracy}%</div>
                              </div>
                            </div>
                            
                             <div className="flex items-center gap-2">
                              {isAdmin && (() => {
                                const sessionKey = session.id || String(session.timestamp instanceof Date ? session.timestamp.getTime() : session.timestamp);
                                return (
                                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    {sessionPendingDeleteId === sessionKey ? (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSession(session.timestamp, session.id);
                                            setSessionPendingDeleteId(null);
                                          }}
                                          className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold uppercase px-1.5 py-0.5 rounded text-[9px] transition cursor-pointer"
                                        >
                                          Sure?
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSessionPendingDeleteId(null);
                                          }}
                                          className="text-slate-405 hover:text-slate-650 text-[9px] font-bold uppercase transition cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSessionPendingDeleteId(sessionKey);
                                          setTimeout(() => {
                                            setSessionPendingDeleteId(curr => curr === sessionKey ? null : curr);
                                          }, 5000);
                                        }}
                                        className="p-1 px-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                        title="Delete Session Log"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })()}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const avgSec = session.averageTimeMs / 1000;
                                  let rankStr = 'Level D (Needs Practice: > 5.0s)';
                                  if (avgSec <= 3.0) rankStr = 'Level A (Elite Expert: 2.5s ~ 3.0s)';
                                  else if (avgSec <= 4.0) rankStr = 'Level B (Proficient Specialist: 3.1s ~ 4.0s)';
                                  else if (avgSec <= 5.0) rankStr = 'Level C (Qualified Operator: 4.1s ~ 5.0s)';
                                  
                                  generateCertificatePDF(session, lvl, rankStr);
                                }}
                                className="p-1 px-2 rounded text-emerald-700 bg-emerald-50 hover:text-emerald-800 hover:bg-emerald-100 border border-emerald-150 transition cursor-pointer flex items-center gap-1 text-[10px] font-sans font-bold uppercase shrink-0"
                                title="Download PDF Certificate"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">PDF</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const avgSec = session.averageTimeMs / 1000;
                                  let rankStr = 'Level D (Needs Practice: > 5.0s)';
                                  if (avgSec <= 3.0) rankStr = 'Level A (Elite Expert: 2.5s ~ 3.0s)';
                                  else if (avgSec <= 4.0) rankStr = 'Level B (Proficient Specialist: 3.1s ~ 4.0s)';
                                  else if (avgSec <= 5.0) rankStr = 'Level C (Qualified Operator: 4.1s ~ 5.0s)';
                                  
                                  generateCertificateHTML(session, lvl, rankStr);
                                }}
                                className="p-1 px-2 rounded text-blue-700 bg-blue-50 hover:text-blue-800 hover:bg-blue-100 border border-blue-150 transition cursor-pointer flex items-center gap-1 text-[10px] font-sans font-bold uppercase shrink-0"
                                title="Download HTML Certificate & Evidence Log"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">HTML</span>
                              </button>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 font-bold" /> : <ChevronDown className="w-4 h-4 text-slate-400 font-bold" />}
                            </div>
                          </div>
                        </div>

                        {/* Expandable Table Details */}
                        {isExpanded && (
                          <div className="p-4 bg-slate-50 border-t border-slate-200 overflow-x-auto text-xs font-mono">
                            <table className="w-full text-left border-collapse min-w-[500px]">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold text-[9px] pb-2">
                                  <th className="pb-2">Invoice Code Link</th>
                                  <th className="pb-2">Expected Number</th>
                                  <th className="pb-2">Typing Entry</th>
                                  <th className="pb-2">Lapse Duration</th>
                                  <th className="pb-2 text-right">Verification</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-150">
                                {session.details.map((detail, dIdx) => (
                                  <tr key={dIdx} className="hover:bg-slate-100/50 text-slate-700 transition">
                                    <td className="py-2 text-slate-500 font-bold">{detail.imageId.toUpperCase()}</td>
                                    <td className="py-2 text-slate-900 font-extrabold">{detail.expectedNumber}</td>
                                    <td className="py-2 text-slate-800">{detail.typedNumber || <span className="italic text-slate-400">[blank]</span>}</td>
                                    <td className="py-2">{(detail.timeSpentMs / 1000).toFixed(2)}s</td>
                                    <td className="py-2 text-right">
                                      {detail.isCorrect ? (
                                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                                          <CheckCircle className="w-3 h-3 text-emerald-700" /> Match
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                                          <XCircle className="w-3 h-3 text-rose-700" /> Error
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* TAB 2: LOGIN HISTORY */}
            {activeTab === 'login' && (
              displayedLogins.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-center">
                  <Key className="w-8 h-8 text-slate-300 mb-2" />
                  <span className="text-sm font-semibold text-slate-600">No Authentication Log Records Found</span>
                  <span className="text-xs text-slate-500 mt-1">
                    Sign in with your operator credentials to create logs.
                  </span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-450 uppercase pb-3 text-[10px] font-bold">
                        <th className="pb-3 text-left">Timestamp (Date/Time)</th>
                        <th className="pb-3">Operator Username</th>
                        <th className="pb-3">Session Role</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Device Agent Info</th>
                        {isAdmin && <th className="pb-3 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {displayedLogins.map((lg, idx) => (
                        <tr key={lg.id || idx} className="hover:bg-slate-50 transition text-slate-700">
                          <td className="py-3.5 text-slate-500 font-semibold">{formatDate(lg.timestamp)}</td>
                          <td className="py-3.5">
                            <span className="bg-slate-100/80 text-slate-800 px-2.5 py-1 rounded-md font-extrabold uppercase text-[10px] border border-slate-200 leading-none">
                              {lg.username}
                            </span>
                          </td>
                          <td className="py-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                              lg.role === 'admin' 
                                ? 'text-amber-850 bg-amber-50 border-amber-200' 
                                : 'text-blue-800 bg-blue-50 border-blue-200'
                            }`}>
                              {lg.role}
                            </span>
                          </td>
                          <td className="py-3.5">
                            {lg.success ? (
                              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-250 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> SUCCESS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-250 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> BLOCKED/FAILED
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 text-slate-450 text-[10px] max-w-[200px] truncate" title={lg.userAgent}>
                            {lg.userAgent}
                          </td>
                          {isAdmin && (
                            <td className="py-3.5 text-right">
                              <div className="flex justify-end items-center gap-1.5 inline-flex">
                                {loginPendingDeleteId === lg.id ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        handleDeleteLoginLog(lg.id);
                                        setLoginPendingDeleteId(null);
                                      }}
                                      className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold uppercase px-1.5 py-0.5 rounded text-[9px] transition cursor-pointer font-sans"
                                    >
                                      Sure?
                                    </button>
                                    <button
                                      onClick={() => setLoginPendingDeleteId(null)}
                                      className="text-slate-400 hover:text-slate-650 text-[9px] font-bold uppercase transition cursor-pointer font-sans"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setLoginPendingDeleteId(lg.id);
                                      setTimeout(() => {
                                        setLoginPendingDeleteId(curr => curr === lg.id ? null : curr);
                                      }, 5000);
                                    }}
                                    className="p-1 px-2 rounded hover:text-rose-600 hover:bg-rose-50/55 text-slate-400 transition cursor-pointer"
                                    title="Wipe Log Row"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
