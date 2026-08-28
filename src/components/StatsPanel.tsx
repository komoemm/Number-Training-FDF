/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Award, Zap, Percent, Clock, Trophy, TrendingUp, Filter, Globe, Sparkles, CheckCircle2 } from 'lucide-react';
import { TestSession, LeaderboardEntry, TrainingMode } from '../types';

interface StatsPanelProps {
  currentIndex: number;
  totalCount: number;
  correctCount: number;
  elapsedMs: number;
  averageTimeMs: number;
  isTestActive: boolean;
  trainingMode?: TrainingMode;
}

export default function StatsPanel({
  currentIndex,
  totalCount,
  correctCount,
  elapsedMs,
  averageTimeMs,
  isTestActive,
  trainingMode = 'easy_20'
}: StatsPanelProps) {
  
  // Calculate running accuracy
  const totalCompleted = currentIndex;
  const accuracy = totalCompleted > 0 ? Math.round((correctCount / totalCompleted) * 100) : 100;
  
  // High-precision elapsed time in seconds
  const currentElapsedSec = (elapsedMs / 1000).toFixed(2);
  const averageTimeSec = averageTimeMs > 0 ? (averageTimeMs / 1000).toFixed(2) : '0.00';

  // Calculate Characters Per Minute (CPM) based on typical 14 characters typed per average speed
  const characterCount = 14; 
  const cpm = averageTimeMs > 0 ? Math.round((characterCount / (averageTimeMs / 1000)) * 60) : 0;
  const wpm = Math.round(cpm / 5);

  // Meter ratios
  const progressRatio = isTestActive ? Math.round(((currentIndex) / totalCount) * 100) : 100;
  const clockRatio = isTestActive ? Math.min((elapsedMs / 6000) * 100, 100) : 0;
  // Speed ratio: map 0-10s average to 100% to 0%
  const speedRatio = averageTimeMs > 0 ? Math.max(0, Math.min(100, Math.round(((10000 - averageTimeMs) / 10000) * 100))) : 0;

  return (
    <div className="space-y-3">
      {/* Mode Tag Ribbon when active */}
      {isTestActive && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            {trainingMode === 'hard_180' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-purple-50 text-purple-800 border border-purple-200 shadow-xs font-sans tracking-wide">
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                ⚡ Hard Mode (180 Invoices Extreme Endurance)
              </span>
            ) : trainingMode === 'normal_90' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 shadow-xs font-sans tracking-wide">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                🔵 Normal Mode (90 Invoices Official Assessment)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs font-sans tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                🟢 Easy Mode (20 Invoices Benchmark)
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-slate-400 font-bold">
            Target SLA &lt; 6.00s / Doc
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-dashboard-grid">
        {/* 1. Progress State */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center space-x-3.5 shadow-sm transition">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              Worksheet Progress
            </span>
            <span className="block text-2xl font-bold text-slate-800 mt-1 font-mono">
              {isTestActive ? `${currentIndex + 1}/${totalCount}` : `Completed`}
            </span>
            {/* Visual Gauge */}
            <div className="mt-2 h-1 w-full bg-slate-100 overflow-hidden rounded">
               <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${progressRatio}%` }}></div>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-1">
              {isTestActive ? `${totalCount - currentIndex - 1} pending` : 'All tasks completed'}
            </span>
          </div>
        </div>

        {/* 2. Precision Timer */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center space-x-3.5 shadow-sm transition">
          <div className={`p-3 rounded-xl transition-colors ${
            parseFloat(currentElapsedSec) > 6.0 && isTestActive ? 'bg-amber-50 text-amber-600 animate-pulse' : 'bg-indigo-50 text-indigo-600'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              Active Scan Clock
            </span>
            <span className={`block text-2xl font-bold mt-1 font-mono transition-colors ${
              parseFloat(currentElapsedSec) > 6.0 && isTestActive ? 'text-amber-600' : 'text-slate-800'
            }`}>
              {isTestActive ? `${currentElapsedSec}s` : '0.00s'}
            </span>
            {/* Visual Gauge */}
            <div className="mt-2 h-1 w-full bg-slate-100 overflow-hidden rounded">
               <div className={`h-full transition-all duration-100 ${
                 parseFloat(currentElapsedSec) > 6.0 ? 'bg-amber-500' : 'bg-indigo-500'
               }`} style={{ width: `${clockRatio}%` }}></div>
            </div>
            <span className={`text-[10px] block mt-1 truncate ${parseFloat(currentElapsedSec) > 6.0 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
              {parseFloat(currentElapsedSec) > 6.0 ? 'Exceeds SLA targets' : 'Target: < 6.00s'}
            </span>
          </div>
        </div>

        {/* 3. Operational Integrity/Accuracy */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center space-x-3.5 shadow-sm transition">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Percent className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              Accuracy Metric
            </span>
            <span className="block text-2xl font-bold text-slate-800 mt-1 font-mono">
              {accuracy}%
            </span>
            {/* Visual Gauge */}
            <div className="mt-2 h-1 w-full bg-slate-100 overflow-hidden rounded">
               <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${accuracy}%` }}></div>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1 truncate">
              {correctCount}/{totalCompleted} correct entries
            </span>
          </div>
        </div>

        {/* 4. Average Typing Speed */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center space-x-3.5 shadow-sm transition">
          <div className="p-3 bg-pink-50 text-pink-600 rounded-xl">
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              Mean Input Pace
            </span>
            <span className="block text-2xl font-bold text-slate-800 mt-1 font-mono">
              {averageTimeSec}s
            </span>
            {/* Visual Gauge */}
            <div className="mt-2 h-1 w-full bg-slate-100 overflow-hidden rounded">
               <div className="bg-pink-550 h-full transition-all duration-300" style={{ width: `${speedRatio}%`, backgroundColor: 'rgb(236 72 153)' }}></div>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1 truncate font-mono">
              {cpm > 0 ? `${cpm} CPM | ${wpm} WPM` : 'No logs cataloged'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Speed Dashboard Component with Easy / Normal / All Modes
// -------------------------------------------------------------

export type ModeFilter = 'normal_90' | 'hard_180' | 'easy_20' | 'all';

export interface SpeedDashboardProps {
  sessions: TestSession[];
  userId: string;
  isAdmin?: boolean;
  formatDate: (date: any) => string;
}

export function SpeedDashboard({
  sessions,
  userId,
  isAdmin = false,
  formatDate
}: SpeedDashboardProps) {
  // Requirement 1: Normal Mode (90 Invoices) is the strict DEFAULT view
  const [activeModeFilter, setActiveModeFilter] = useState<ModeFilter>('normal_90');

  const getSessionMode = (session: TestSession): TrainingMode => {
    if (session.trainingMode) return session.trainingMode;
    // Fallback for legacy documents
    if (session.totalImagesAttempted > 90) return 'hard_180';
    if (session.totalImagesAttempted > 20) return 'normal_90';
    return 'easy_20';
  };

  const getLevelBySpeed = (timeMs: number): string => {
    const avgSec = timeMs / 1000;
    if (avgSec <= 3.0) return 'A';
    if (avgSec <= 4.0) return 'B';
    if (avgSec <= 5.0) return 'C';
    return 'D';
  };

  // Filter sessions matching activeModeFilter (isolates Normal 90 vs Hard 180 vs Easy 20)
  const filteredSessions = sessions.filter(session => {
    if (activeModeFilter === 'all') return true;
    return getSessionMode(session) === activeModeFilter;
  });

  // Calculate Leaderboard based on filtered sessions
  const computeLeaderboard = (): {
    leaderboard: LeaderboardEntry[];
    levelCounts: { A: number; B: number; C: number; D: number };
    totalTraineesCount: number;
    easyCount: number;
    normalCount: number;
    hardCount: number;
  } => {
    const userBestMap: { [key: string]: TestSession } = {};
    let easyCount = 0;
    let normalCount = 0;
    let hardCount = 0;

    // Count overall mode runs
    sessions.forEach(s => {
      const m = getSessionMode(s);
      if (m === 'easy_20') easyCount++;
      else if (m === 'hard_180') hardCount++;
      else normalCount++;
    });

    filteredSessions.forEach(session => {
      const u = session.userId || session.operatorId || 'unknown';
      if (!userBestMap[u] || session.averageTimeMs < userBestMap[u].averageTimeMs) {
        userBestMap[u] = session;
      }
    });

    const leaderboardList: LeaderboardEntry[] = Object.values(userBestMap).map(session => {
      const u = session.userId || session.operatorId || 'unknown';
      const accuracy = session.totalImagesAttempted > 0 
        ? Math.round((session.correctEntries / session.totalImagesAttempted) * 100) 
        : 100;
        
      const lvl = session.level || getLevelBySpeed(session.averageTimeMs);
      const totalRuns = filteredSessions.filter(s => (s.userId || s.operatorId) === u).length;

      return {
        userId: u,
        operatorId: session.operatorId || u,
        bestTimeMs: session.averageTimeMs,
        level: lvl,
        accuracy: session.accuracy ?? accuracy,
        totalRuns,
        timestamp: session.timestamp,
        trainingMode: getSessionMode(session)
      };
    });

    // Sort ascending by bestTimeMs (fastest speed first)
    leaderboardList.sort((a, b) => a.bestTimeMs - b.bestTimeMs);

    // Compute distribution counts
    const levelCounts = { A: 0, B: 0, C: 0, D: 0 };
    leaderboardList.forEach(entry => {
      const lvl = entry.level as 'A' | 'B' | 'C' | 'D';
      if (levelCounts[lvl] !== undefined) {
        levelCounts[lvl]++;
      }
    });

    return {
      leaderboard: leaderboardList,
      levelCounts,
      totalTraineesCount: leaderboardList.length,
      easyCount,
      normalCount,
      hardCount
    };
  };

  const { leaderboard, levelCounts, totalTraineesCount } = computeLeaderboard();
  const myDashboardEntry = leaderboard.find(e => e.userId === userId || e.operatorId === userId);
  const myRank = myDashboardEntry ? leaderboard.indexOf(myDashboardEntry) + 1 : null;

  return (
    <div className="space-y-6 animate-fade-in" id="dashboard-tab-view">
      
      {/* Requirement 3: Segmented Control with 3 Modes + Combined at the top of the leaderboard */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs" id="segmented-mode-bar-container">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 pl-1 flex items-center gap-1.5 font-sans">
            <Filter className="w-3.5 h-3.5 text-indigo-600" /> Mode Select:
          </span>
          <div 
            className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200" 
            id="speed-dashboard-mode-filter"
            role="tablist"
            aria-label="Speed assessment mode selection"
          >
            
            {/* Option 1: Official Training (90 Invoices) [Default] */}
            <button
              onClick={() => setActiveModeFilter('normal_90')}
              role="tab"
              aria-selected={activeModeFilter === 'normal_90'}
              aria-label="Official Training (90 Invoices) Mode"
              className={`px-3.5 py-2 rounded-lg text-xs font-bold font-sans transition flex items-center gap-2 cursor-pointer ${
                activeModeFilter === 'normal_90'
                  ? 'bg-blue-600 text-white font-extrabold shadow-sm shadow-blue-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              id="filter-btn-normal"
            >
              <span className={`w-2 h-2 rounded-full ${activeModeFilter === 'normal_90' ? 'bg-white animate-pulse' : 'bg-blue-600'}`}></span>
              <span>🔵 Official Training (90) [Default]</span>
            </button>

            {/* Option 2: Extreme Endurance (180 Invoices) */}
            <button
              onClick={() => setActiveModeFilter('hard_180')}
              role="tab"
              aria-selected={activeModeFilter === 'hard_180'}
              aria-label="Extreme Endurance (180 Invoices) Mode"
              className={`px-3.5 py-2 rounded-lg text-xs font-bold font-sans transition flex items-center gap-2 cursor-pointer ${
                activeModeFilter === 'hard_180'
                  ? 'bg-purple-600 text-white font-extrabold shadow-sm shadow-purple-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              id="filter-btn-hard"
            >
              <span className={`w-2 h-2 rounded-full ${activeModeFilter === 'hard_180' ? 'bg-white animate-pulse' : 'bg-purple-600'}`}></span>
              <span>🟣 Extreme Endurance (180)</span>
            </button>

            {/* Option 3: Practice Benchmark (20 Invoices) */}
            <button
              onClick={() => setActiveModeFilter('easy_20')}
              role="tab"
              aria-selected={activeModeFilter === 'easy_20'}
              aria-label="Practice Benchmark (20 Invoices) Mode"
              className={`px-3.5 py-2 rounded-lg text-xs font-bold font-sans transition flex items-center gap-2 cursor-pointer ${
                activeModeFilter === 'easy_20'
                  ? 'bg-emerald-600 text-white font-extrabold shadow-sm shadow-emerald-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              id="filter-btn-easy"
            >
              <span className={`w-2 h-2 rounded-full ${activeModeFilter === 'easy_20' ? 'bg-white animate-pulse' : 'bg-emerald-600'}`}></span>
              <span>🟢 Practice Benchmark (20)</span>
            </button>

            {/* Option 4: Combined Logs */}
            <button
              onClick={() => setActiveModeFilter('all')}
              role="tab"
              aria-selected={activeModeFilter === 'all'}
              aria-label="Combined All Logs Mode"
              className={`px-3.5 py-2 rounded-lg text-xs font-bold font-sans transition flex items-center gap-2 cursor-pointer ${
                activeModeFilter === 'all'
                  ? 'bg-indigo-600 text-white font-extrabold shadow-sm shadow-indigo-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              id="filter-btn-all"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>🌐 Combined Logs</span>
            </button>

          </div>
        </div>

        {/* Mode Summary Indicator */}
        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2.5 px-2">
          <span>
            Active View: <strong className="text-slate-800 uppercase font-sans">
              {activeModeFilter === 'normal_90' ? '★ Official Assessment (90)' : activeModeFilter === 'hard_180' ? '⚡ Extreme Endurance (180)' : activeModeFilter === 'easy_20' ? 'Practice Benchmark (20)' : 'Combined All'}
            </strong>
          </span>
          <span className="text-slate-300">|</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">{filteredSessions.length} sessions</span>
        </div>
      </div>

      {/* 1. Header & Welcome Standings summary row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl">
        <div>
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 leading-none">
            <TrendingUp className="w-4 h-4 text-indigo-600" /> 
            {activeModeFilter === 'normal_90' && 'Official SLA Level Rankings (90 Invoices)'}
            {activeModeFilter === 'hard_180' && 'Extreme Endurance SLA Level Rankings (180 Invoices Master Tier)'}
            {activeModeFilter === 'easy_20' && 'Practice Benchmark SLA Rankings (20 Invoices)'}
            {activeModeFilter === 'all' && 'Combined SLA Level Rankings'}
          </h3>
          <p className="text-slate-500 text-xs mt-1.5">
            {activeModeFilter === 'normal_90' && (
              <>Official Japanese invoice standard requirement: <strong>under 6.00 seconds</strong> per document across 90 invoices with ≥ 95% accuracy.</>
            )}
            {activeModeFilter === 'hard_180' && (
              <>Extreme endurance master tier standard: sustained speed <strong>under 6.00 seconds</strong> (target &lt; 3.00s for Level A) across 180 invoices with ≥ 95% accuracy.</>
            )}
            {activeModeFilter === 'easy_20' && (
              <>Practice speed benchmark: <strong>20-invoice warm-up drill</strong> for entry rhythm and typing speed tuning.</>
            )}
            {activeModeFilter === 'all' && (
              <>Aggregated performance records across all official 90-invoice endurance, 180-invoice extreme master, and 20-invoice warm-up sessions.</>
            )}
          </p>
        </div>
        {myDashboardEntry ? (
          <div className="bg-white border border-indigo-150 p-2.5 px-4 rounded-lg flex items-center gap-3.5 self-start md:self-auto shadow-sm">
            <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center font-bold font-sans text-sm shadow-inner">
              #{myRank}
            </div>
            <div className="leading-tight">
              <span className="block text-[9px] uppercase font-bold text-slate-400">
                {activeModeFilter === 'normal_90' ? 'Official Peak Rank' : activeModeFilter === 'hard_180' ? 'Hard 180 Peak Rank' : activeModeFilter === 'easy_20' ? 'Practice Best Rank' : 'Combined Rank'}
              </span>
              <span className="block text-xs font-extrabold text-slate-800 font-sans mt-0.5">
                {userId} (Level {myDashboardEntry.level})
              </span>
            </div>
            <div className="h-6 w-px bg-slate-150"></div>
            <div className="leading-tight">
              <span className="block text-[9px] uppercase font-bold text-slate-400 font-sans">Best Speed</span>
              <span className="block text-xs font-mono font-bold text-indigo-600 mt-0.5">
                {(myDashboardEntry.bestTimeMs / 1000).toFixed(2)}s
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-250 p-2.5 px-4 rounded-lg self-start md:self-auto text-slate-500 text-xs">
            No speed sessions recorded yet in <strong className="text-slate-800">{activeModeFilter === 'normal_90' ? 'Official 90 Mode' : activeModeFilter === 'hard_180' ? 'Hard 180 Mode' : activeModeFilter === 'easy_20' ? 'Practice 20 Mode' : 'any mode'}</strong> for <strong className="text-slate-800">{userId}</strong>.
          </div>
        )}
      </div>

      {/* 2. Level Distribution Bento Cards (Strictly calculated from filtered mode) */}
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
              <span className="text-xs text-slate-400 font-medium">
                {activeModeFilter === 'hard_180' ? 'Master Endurance' : 'Expert Tier'}
              </span>
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
            <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${totalTraineesCount > 0 ? (levelCounts.A / totalTraineesCount) * 100 : 0}%` }}></div>
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
            <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${totalTraineesCount > 0 ? (levelCounts.B / totalTraineesCount) * 100 : 0}%` }}></div>
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
            <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${totalTraineesCount > 0 ? (levelCounts.C / totalTraineesCount) * 100 : 0}%` }}></div>
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
            <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${totalTraineesCount > 0 ? (levelCounts.D / totalTraineesCount) * 100 : 0}%` }}></div>
          </div>
        </div>

      </div>

      {/* 3. High-Contrast Speed Leaderboard Table Layout */}
      <div className="bg-white border border-slate-205 rounded-xl overflow-hidden shadow-sm mt-4">
        
        {/* Requirement 2: Clear Visual Separation in Standings Header */}
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-205 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700 flex items-center gap-2 font-sans">
            {activeModeFilter === 'normal_90' && (
              <span className="flex items-center gap-1.5 text-blue-900 font-extrabold">
                <Trophy className="w-4 h-4 text-amber-500 font-bold" /> 
                🏆 OFFICIAL TRAINING STANDINGS (90 INVOICES ENDURANCE)
              </span>
            )}
            {activeModeFilter === 'hard_180' && (
              <span className="flex items-center gap-1.5 text-purple-900 font-extrabold">
                <Trophy className="w-4 h-4 text-purple-600 font-bold" /> 
                ⚡ EXTREME ENDURANCE STANDINGS (180 INVOICES MASTER TIER)
              </span>
            )}
            {activeModeFilter === 'easy_20' && (
              <span className="flex items-center gap-1.5 text-emerald-900 font-extrabold">
                <Trophy className="w-4 h-4 text-emerald-600 font-bold" /> 
                🎯 PRACTICE BENCHMARK STANDINGS (20 INVOICES WARM-UP)
              </span>
            )}
            {activeModeFilter === 'all' && (
              <span className="flex items-center gap-1.5 text-indigo-900 font-extrabold">
                <Globe className="w-4 h-4 text-indigo-600 font-bold" /> 
                🌐 COMBINED SPEED LOGS &amp; STANDINGS
              </span>
            )}
          </span>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-mono uppercase font-bold tracking-wider bg-white border border-slate-200 px-2.5 py-1 rounded-md">
              {leaderboard.length} Ranked Operators
            </span>
          </div>
        </div>

        {leaderboard.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Award className="w-8 h-8 text-slate-350 mx-auto block mb-2" />
            <p className="text-xs font-semibold text-slate-700">
              {activeModeFilter === 'normal_90' 
                ? 'No operators have registered official 90-invoice speed endurance scores yet.' 
                : activeModeFilter === 'hard_180'
                ? 'No operators have registered 180-invoice extreme endurance scores yet.'
                : activeModeFilter === 'easy_20' 
                ? 'No operators have registered 20-invoice practice scores yet.' 
                : 'No speed test sessions have been cataloged yet.'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed font-sans">
              {activeModeFilter === 'normal_90'
                ? 'Launch an Official 90-Invoice Assessment test from the practice module to record your verified ranking!'
                : activeModeFilter === 'hard_180'
                ? 'Launch an Extreme Endurance 180-Invoice test to record your master tier standing!'
                : 'Launch a 20-Invoice practice benchmark test to record warm-up timings.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium border-collapse min-w-[780px]" id="leaderboard-standings-table">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase pb-3 text-[10px] font-bold bg-slate-50/70 font-sans">
                  <th className="py-3 px-5 text-left w-20">Rank</th>
                  <th className="py-3">Trainee Operator Name</th>
                  <th className="py-3">Mode</th>
                  <th className="py-3">Level Reached</th>
                  <th className="py-3 font-mono">Best Averaged Speed</th>
                  <th className="py-3 font-sans">Session Accuracy</th>
                  <th className="py-3 text-center">Total Runs</th>
                  <th className="py-3 text-right pr-5">Achieved Date/Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 font-sans text-slate-700">
                {leaderboard.map((entry, idx) => {
                  const isMe = entry.userId === userId || entry.operatorId === userId;
                  const achievedAtLabel = formatDate(entry.timestamp);
                  const isEasy = entry.trainingMode === 'easy_20';
                  const isHard = entry.trainingMode === 'hard_180';

                  return (
                    <tr key={`${entry.userId}-${idx}`} className={`transition duration-100 ${isMe ? 'bg-indigo-50/40 hover:bg-slate-100' : 'hover:bg-slate-50'}`}>
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
                          <span className="text-slate-400 pl-1 font-bold">{idx + 1}</span>
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

                      {/* Requirement 4: UI Badge Clarification */}
                      <td className="py-3.5">
                        {isHard ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 inline-block">
                            ⚡ HARD (180)
                          </span>
                        ) : isEasy ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
                            PRACTICE (20)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 inline-block">
                            ★ OFFICIAL (90)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded font-extrabold text-[10px] uppercase tracking-wider border ${
                          entry.level === 'A' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          entry.level === 'B' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          entry.level === 'C' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          Level {entry.level}
                        </span>
                      </td>
                      <td className="py-3.5 font-mono font-bold text-slate-900">
                        {(entry.bestTimeMs / 1000).toFixed(2)}s
                      </td>
                      <td className="py-3.5 font-bold">
                        <span className={`${entry.accuracy >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {entry.accuracy}%
                        </span>
                      </td>
                      <td className="py-3.5 text-center font-mono text-slate-600 font-semibold">
                        {entry.totalRuns}
                      </td>
                      <td className="py-3.5 text-right pr-5 font-mono text-[11px] text-slate-400">
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
  );
}
