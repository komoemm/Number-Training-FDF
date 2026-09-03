/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, isFirebaseActive, isQuotaError } from '../firebase';
import { Clock, RefreshCw, Layers, Database, ChevronDown, ChevronUp, CheckCircle, XCircle, Trash2, Filter, Key, ShieldAlert, Trophy, Award, TrendingUp, Download, RotateCcw } from 'lucide-react';
import { TestSession, TypingDetail, TrainingCategory } from '../types';
import { generateCertificatePDF } from '../utils/pdfGenerator';
import { generateCertificateHTML } from '../utils/htmlGenerator';
import { evaluateCategoryLevel, getCategoryRankDetails } from '../utils/speedRanking';
import { SpeedDashboard } from './StatsPanel';

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
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'easy' | 'normal' | 'hard'>('all');
  const [filterLoginUser, setFilterLoginUser] = useState<string>('all');

  // Multi-stage inline deletion confirmation state variables (Iframe-safe)
  const [sessionPendingDeleteId, setSessionPendingDeleteId] = useState<string | null>(null);
  const [loginPendingDeleteId, setLoginPendingDeleteId] = useState<string | null>(null);

  const TEN_MINUTES_MS = 10 * 60 * 1000;

  // Cache-aware Tab Switching: Only fetch if state & session cache are empty
  useEffect(() => {
    if (activeTab === 'typing' || activeTab === 'dashboard') {
      if (sessions.length === 0) {
        fetchSessionHistory(false);
      }
    } else if (activeTab === 'login') {
      if (loginLogs.length === 0) {
        fetchLoginHistory(false);
      }
    }
  }, [userId, isAdmin, activeTab]);

  // When refreshTrigger increments (e.g. newly submitted typing run), invalidate and reload
  useEffect(() => {
    if (refreshTrigger > 0) {
      try {
        sessionStorage.removeItem('cached_session_history');
      } catch {}
      if (activeTab === 'typing' || activeTab === 'dashboard') {
        fetchSessionHistory(true);
      }
    }
  }, [refreshTrigger]);

  const fetchSessionHistory = async (forceCloud = false) => {
    // 1. In-memory check: if data already loaded in state and not forcing cloud sync, return immediately
    if (!forceCloud && sessions.length > 0) {
      return;
    }

    // 2. SessionStorage cache check: if cached within 10 minutes, restore from storage without Firestore reads
    if (!forceCloud) {
      try {
        const cachedRaw = sessionStorage.getItem('cached_session_history');
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          const ageMs = Date.now() - (cached.timestamp || 0);
          if (ageMs < TEN_MINUTES_MS && Array.isArray(cached.data) && cached.data.length > 0) {
            const restoredSessions: TestSession[] = cached.data.map((s: any) => ({
              ...s,
              timestamp: new Date(s.timestamp)
            }));
            setSessions(restoredSessions);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Notice loading session history from session cache:', err);
      }
    }

    setLoading(true);
    setErrorStatus(null);
    let fetchedSessions: TestSession[] = [];

    // 3. Fetch from Firestore only when cache is empty or explicit sync requested
    const isKnownQuota = sessionStorage.getItem('firestore_quota_exceeded') === 'true';
    if (isFirebaseActive && db && userId && userId !== 'sandbox_guest_uid' && !isKnownQuota) {
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
            userId: data.userId || data.operatorId || 'unknown',
            operatorId: data.operatorId || data.userId || 'unknown',
            timestamp: timestampDate,
            totalImagesAttempted: data.totalImagesAttempted || 20,
            correctEntries: data.correctEntries ?? 0,
            averageTimeMs: data.averageTimeMs ?? 0,
            averageSpeed: data.averageSpeed ?? (data.averageTimeMs ? +(data.averageTimeMs / 1000).toFixed(2) : 0),
            accuracy: data.accuracy ?? (data.totalImagesAttempted > 0 ? Math.round(((data.correctEntries || 0) / data.totalImagesAttempted) * 100) : 100),
            level: data.level,
            trainingMode: data.trainingMode || (data.totalImagesAttempted > 90 ? 'hard_180' : data.totalImagesAttempted > 20 ? 'normal_90' : 'easy_20'),
            category: data.category || 'tax_number',
            details: data.details || []
          });
        });
      } catch (err) {
        if (isQuotaError(err)) {
          sessionStorage.setItem('firestore_quota_exceeded', 'true');
          console.warn('Firestore daily read quota reached; using local session cache.');
          setErrorStatus('Displaying cached offline entries (Firestore free daily read quota reached).');
        } else {
          console.warn('Unable to load from cloud. Retrying local cache fallback...', err);
          setErrorStatus('Displaying cached offline entries only.');
        }
        try {
          const localData = localStorage.getItem('local_test_sessions');
          if (localData) {
            fetchedSessions = JSON.parse(localData);
          }
        } catch {
          // ignore fallback err
        }
      }
    } else {
      // Pure Offline / Sandbox fallback mode
      try {
        const localData = localStorage.getItem('local_test_sessions');
        if (localData) {
          const parsed = JSON.parse(localData);
          fetchedSessions = parsed.map((session: any) => ({
            ...session,
            timestamp: new Date(session.timestamp),
            userId: session.userId || session.operatorId || 'guest',
            operatorId: session.operatorId || session.userId || 'guest',
            category: session.category || 'tax_number',
            trainingMode: session.trainingMode || (session.totalImagesAttempted > 90 ? 'hard_180' : session.totalImagesAttempted > 20 ? 'normal_90' : 'easy_20')
          }));
        }
      } catch (err) {
        console.warn('Failed to query local speed session results:', err);
      }
    }

    setSessions(fetchedSessions);
    try {
      sessionStorage.setItem('cached_session_history', JSON.stringify({
        timestamp: Date.now(),
        data: fetchedSessions
      }));
    } catch {}
    setLoading(false);
  };

  const fetchLoginHistory = async (forceCloud = false) => {
    // 1. In-memory check: if data already in state and not forcing cloud sync, return immediately
    if (!forceCloud && loginLogs.length > 0) {
      return;
    }

    // 2. SessionStorage cache check: if cached within 10 minutes, restore from storage
    if (!forceCloud) {
      try {
        const cachedRaw = sessionStorage.getItem('cached_login_history');
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          const ageMs = Date.now() - (cached.timestamp || 0);
          if (ageMs < TEN_MINUTES_MS && Array.isArray(cached.data) && cached.data.length > 0) {
            const restoredLogins = cached.data.map((l: any) => ({
              ...l,
              timestamp: new Date(l.timestamp)
            }));
            setLoginLogs(restoredLogins);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Notice loading login history from session cache:', err);
      }
    }

    setLoading(true);
    setErrorStatus(null);
    let fetchedLogins: any[] = [];

    // 3. Fetch from Firestore only when cache is empty or explicit sync requested
    const isKnownQuota = sessionStorage.getItem('firestore_quota_exceeded') === 'true';
    if (isFirebaseActive && db && userId && userId !== 'sandbox_guest_uid' && !isKnownQuota) {
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
        if (isQuotaError(err)) {
          sessionStorage.setItem('firestore_quota_exceeded', 'true');
          console.warn('Firestore daily read quota reached; using local login history.');
        } else {
          console.warn('Unable to load login history from cloud. Fallback to local storage...', err);
        }
        try {
          const localData = localStorage.getItem('local_login_history');
          if (localData) {
            fetchedLogins = JSON.parse(localData);
          }
        } catch {}
      }
    } else {
      // Local Fallback
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
        console.warn('Failed to query local login history:', err);
      }
    }

    // Role filtration limits (Strict Security Reinforcement)
    if (!isAdmin) {
      fetchedLogins = fetchedLogins.filter(s => s.username === userId);
    }

    setLoginLogs(fetchedLogins);
    try {
      sessionStorage.setItem('cached_login_history', JSON.stringify({
        timestamp: Date.now(),
        data: fetchedLogins
      }));
    } catch {}
    setLoading(false);
  };

  const handleDeleteSession = async (timestampToDelete: any, docId?: string) => {
    if (!isAdmin) return;
    
    // Delete from Firestore if docId exists and quota not known to be exceeded
    if (isFirebaseActive && db && docId && !sessionStorage.getItem('firestore_quota_exceeded')) {
      try {
        await deleteDoc(doc(db, 'test_sessions', docId));
      } catch (err) {
        if (isQuotaError(err)) {
          sessionStorage.setItem('firestore_quota_exceeded', 'true');
          console.warn('Firestore quota exceeded while deleting session. Removed locally.');
        } else {
          console.warn('Failed to delete performance record from cloud database:', err);
        }
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
      console.warn('Failed deleting local log backup:', err);
    }

    // Update state and session cache directly without re-reading all documents from Firestore
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== docId && s.timestamp !== timestampToDelete);
      try {
        sessionStorage.setItem('cached_session_history', JSON.stringify({
          timestamp: Date.now(),
          data: updated
        }));
      } catch {}
      return updated;
    });
  };

  const handleDeleteLoginLog = async (logId: string) => {
    if (!isAdmin) return;

    if (isFirebaseActive && db && !sessionStorage.getItem('firestore_quota_exceeded')) {
      try {
        await deleteDoc(doc(db, 'login_history', logId));
      } catch (err) {
        if (isQuotaError(err)) {
          sessionStorage.setItem('firestore_quota_exceeded', 'true');
          console.warn('Firestore quota exceeded while deleting login log. Removed locally.');
        } else {
          console.warn('Failed to delete login log from cloud:', err);
        }
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
      console.warn('Failed deleting local login log:', err);
    }

    // Update state and session cache directly without re-reading all documents from Firestore
    setLoginLogs(prev => {
      const updated = prev.filter(l => l.id !== logId);
      try {
        sessionStorage.setItem('cached_login_history', JSON.stringify({
          timestamp: Date.now(),
          data: updated
        }));
      } catch {}
      return updated;
    });
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

  // Get distinct list of usernames in logs to filter with useMemo
  const distinctUsers = useMemo(() => {
    return Array.from(new Set(sessions.map(s => s.userId))).filter(Boolean);
  }, [sessions]);

  const distinctLoginUsers = useMemo(() => {
    return Array.from(new Set(loginLogs.map(l => l.username))).filter(Boolean);
  }, [loginLogs]);

  // Optimized memoized session filtering
  const displayedSessions = useMemo(() => {
    return sessions.filter((session) => {
      // 1. Filter by Trainee / User
      if (isAdmin) {
        if (filterUser !== 'all' && session.userId !== filterUser) return false;
      } else {
        if (session.userId !== userId) return false;
      }

      // 2. Filter by Category
      if (filterCategory !== 'all') {
        const cat = session.category || 'tax_number';
        if (cat !== filterCategory) return false;
      }

      // 3. Filter by Difficulty mode or totalCount (20, 90, 180)
      if (filterDifficulty !== 'all') {
        const diffStr = ((session as any).difficulty || session.trainingMode || '').toString().toLowerCase();
        const totalCount = (session as any).totalCount ?? session.totalImagesAttempted ?? 0;

        if (filterDifficulty === 'easy') {
          const isEasy =
            diffStr.includes('easy') ||
            diffStr === 'easy_20' ||
            totalCount === 20 ||
            (totalCount > 0 && totalCount <= 20);
          if (!isEasy) return false;
        } else if (filterDifficulty === 'normal') {
          const isNormal =
            diffStr.includes('normal') ||
            diffStr.includes('medium') ||
            diffStr === 'normal_90' ||
            totalCount === 90 ||
            (totalCount > 20 && totalCount <= 90);
          if (!isNormal) return false;
        } else if (filterDifficulty === 'hard') {
          const isHard =
            diffStr.includes('hard') ||
            diffStr === 'hard_180' ||
            totalCount === 180 ||
            totalCount > 90;
          if (!isHard) return false;
        }
      }

      return true;
    });
  }, [sessions, isAdmin, filterUser, userId, filterCategory, filterDifficulty]);

  // Optimized memoized login logs filtering
  const displayedLogins = useMemo(() => {
    if (filterLoginUser === 'all') return loginLogs;
    return loginLogs.filter((l) => l.username === filterLoginUser);
  }, [loginLogs, filterLoginUser]);

  // Filter state indicators and reset handler
  const isTypingFilterActive = filterCategory !== 'all' || filterUser !== 'all' || filterDifficulty !== 'all';
  const isLoginFilterActive = filterLoginUser !== 'all';
  const isAnyFilterActive = activeTab === 'typing' ? isTypingFilterActive : activeTab === 'login' ? isLoginFilterActive : false;

  const handleResetFilters = () => {
    if (activeTab === 'typing') {
      setFilterCategory('all');
      setFilterUser('all');
      setFilterDifficulty('all');
      setExpandedSessionId(null);
    } else if (activeTab === 'login') {
      setFilterLoginUser('all');
    }
  };

  const getLevelBySpeed = (timeMs: number, category: TrainingCategory = 'tax_number') => {
    return evaluateCategoryLevel(timeMs, category);
  };

  // Compute leaderboard and statistics with useMemo
  const { leaderboard, levelCounts, totalTraineesCount } = useMemo(() => {
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
        
      const sessionCat = (session.category as TrainingCategory) || 'tax_number';
      const lvl = session.level || evaluateCategoryLevel(session.averageTimeMs, sessionCat);
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
  }, [sessions]);

  const myDashboardEntry = useMemo(() => leaderboard.find(e => e.userId === userId), [leaderboard, userId]);
  const myRank = myDashboardEntry ? leaderboard.indexOf(myDashboardEntry) + 1 : null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" id="history-panel">
      {/* Tabs Layout */}
      <div className="flex border-b border-slate-200 bg-slate-50 justify-between items-center pr-4">
        <div className="flex overflow-x-auto shrink-0 font-sans" role="tablist" aria-label="History logs navigation tabs">
          <button
            onClick={() => { setActiveTab('dashboard'); }}
            role="tab"
            aria-selected={activeTab === 'dashboard'}
            aria-label="Speed Dashboard Standings tab"
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
            role="tab"
            aria-selected={activeTab === 'typing'}
            aria-label="Trainee Typing Logs tab"
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
            role="tab"
            aria-selected={activeTab === 'login'}
            aria-label="Login History registries tab"
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
        <div className="flex items-center gap-2 flex-wrap py-2">
          {activeTab === 'typing' && (
            <>
              {/* 1. Difficulty filter chips */}
              <div
                className="inline-flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-lg border border-slate-200"
                role="group"
                aria-label="Filter logs by difficulty mode"
              >
                {[
                  { value: 'all' as const, label: 'All Modes' },
                  { value: 'easy' as const, label: 'Easy (20)' },
                  { value: 'normal' as const, label: 'Normal (90)' },
                  { value: 'hard' as const, label: 'Hard (180)' }
                ].map((chip) => {
                  const isSelected = filterDifficulty === chip.value;
                  return (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => {
                        setFilterDifficulty(chip.value);
                        setExpandedSessionId(null);
                      }}
                      aria-pressed={isSelected}
                      aria-label={`Filter by ${chip.label}`}
                      className={`px-2 py-0.5 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              {/* 2. Compact All Categories Dropdown */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 py-0.5 text-xs text-slate-600 shadow-2xs">
                <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                <select
                  value={filterCategory}
                  aria-label="Filter logs by category"
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setExpandedSessionId(null);
                  }}
                  className="bg-transparent border-none outline-none font-semibold text-slate-700 cursor-pointer text-xs py-0.5 pr-0.5"
                >
                  <option value="all">All Categories</option>
                  <option value="tax_number">🧾 Tax Number (QIN)</option>
                  <option value="date_number">📅 Date Number</option>
                  <option value="phone_number">📞 Phone Number</option>
                </select>
              </div>

              {/* 3. Compact All Trainees Dropdown (Admin Only) */}
              {isAdmin && distinctUsers.length > 0 && (
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 py-0.5 text-xs text-slate-600 shadow-2xs">
                  <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                  <select
                    value={filterUser}
                    aria-label="Filter logs by trainee"
                    onChange={(e) => {
                      setFilterUser(e.target.value);
                      setExpandedSessionId(null);
                    }}
                    className="bg-transparent border-none outline-none font-semibold text-slate-700 cursor-pointer text-xs py-0.5 pr-0.5"
                  >
                    <option value="all">All Trainees ({distinctUsers.length})</option>
                    {distinctUsers.map((user) => (
                      <option key={user} value={user}>User: {user}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {activeTab === 'login' && isAdmin && distinctLoginUsers.length > 0 && (
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 py-0.5 text-xs text-slate-600 shadow-2xs">
              <Filter className="w-3 h-3 text-slate-400 shrink-0" />
              <select
                value={filterLoginUser}
                aria-label="Filter login history by operator"
                onChange={(e) => setFilterLoginUser(e.target.value)}
                className="bg-transparent border-none outline-none font-semibold text-slate-700 cursor-pointer text-xs py-0.5 pr-0.5"
              >
                <option value="all">All Registries ({distinctLoginUsers.length})</option>
                {distinctLoginUsers.map((user) => (
                  <option key={user} value={user}>Operator: {user}</option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Reset button that appears only when any filter is active */}
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              aria-label="Reset active filters"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer shadow-2xs"
              title="Reset all filters to default"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={() => {
              if (activeTab === 'typing' || activeTab === 'dashboard') {
                fetchSessionHistory(true);
              } else {
                fetchLoginHistory(true);
              }
            }}
            disabled={loading}
            aria-label="Force refresh active panel logs from Cloud"
            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition disabled:opacity-50 border border-slate-200 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Force refresh logs from Cloud database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-[10px] uppercase font-bold text-slate-600 hidden sm:inline">Sync Cloud</span>
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
              <SpeedDashboard
                sessions={sessions}
                userId={userId}
                isAdmin={isAdmin}
                formatDate={formatDate}
              />
            )}

            {/* TAB 1: TYPING PERFORMANCE */}
            {activeTab === 'typing' && (
              displayedSessions.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-center">
                  <Clock className="w-8 h-8 text-slate-300 mb-2" />
                  <span className="text-sm font-semibold text-slate-600">No Typing Performance Records Match</span>
                  <span className="text-xs text-slate-500 mt-1 max-w-sm">
                    {isTypingFilterActive
                      ? 'No records match your selected difficulty, category, or trainee filters.'
                      : filterUser === 'all' 
                        ? 'Complete a test session worksheet to record your score.' 
                        : `No performance statistics found for trainee "${filterUser}"`}
                  </span>
                  {isTypingFilterActive && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition border border-indigo-200 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedSessions.map((session, sIdx) => {
                    const accuracy = Math.round((session.correctEntries / session.totalImagesAttempted) * 100);
                    const isExpanded = expandedSessionId === sIdx;
                    const dateLabel = formatDate(session.timestamp);
                    const sessionCat = (session.category as TrainingCategory) || 'tax_number';
                    const lvl = session.level || evaluateCategoryLevel(session.averageTimeMs, sessionCat);
                    const isHardMode = session.trainingMode === 'hard_180' || session.totalImagesAttempted > 90;
                    const isNormalMode = session.trainingMode === 'normal_90' || (session.totalImagesAttempted > 20 && !isHardMode);
                    
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
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {session.category === 'date_number' ? '📅 Date No' : session.category === 'phone_number' ? '📞 Phone No' : '🧾 Tax No'}
                              </span>
                              {isHardMode ? (
                                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-300 uppercase tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                                  Hard (180)
                                </span>
                              ) : isNormalMode ? (
                                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200 uppercase tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                  Normal (90)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200 uppercase tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Easy (20)
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
                                          aria-label="Confirm delete session"
                                          className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold uppercase px-1.5 py-0.5 rounded text-[9px] transition cursor-pointer"
                                        >
                                          Sure?
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSessionPendingDeleteId(null);
                                          }}
                                          aria-label="Cancel delete session"
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
                                        aria-label={`Delete session log from ${session.userId}`}
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
                                  const rankDetails = getCategoryRankDetails(session.averageTimeMs, sessionCat);
                                  generateCertificatePDF(session, rankDetails.level, rankDetails.name);
                                }}
                                aria-label={`Download PDF Performance Certificate for session taken by ${session.userId}`}
                                className="p-1 px-2 rounded text-emerald-700 bg-emerald-50 hover:text-emerald-800 hover:bg-emerald-100 border border-emerald-150 transition cursor-pointer flex items-center gap-1 text-[10px] font-sans font-bold uppercase shrink-0"
                                title="Download PDF Certificate"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">PDF</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rankDetails = getCategoryRankDetails(session.averageTimeMs, sessionCat);
                                  generateCertificateHTML(session, rankDetails.level, rankDetails.name);
                                }}
                                aria-label={`Download HTML Evidence Certificate for session taken by ${session.userId}`}
                                className="p-1 px-2 rounded text-blue-700 bg-blue-50 hover:text-blue-800 hover:bg-blue-100 border border-blue-150 transition cursor-pointer flex items-center gap-1 text-[10px] font-sans font-bold uppercase shrink-0"
                                title="Download HTML Certificate & Evidence Log"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">HTML</span>
                              </button>
                              <div aria-hidden="true">
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 font-bold" /> : <ChevronDown className="w-4 h-4 text-slate-400 font-bold" />}
                              </div>
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
