/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Award, Zap, Percent, Clock, AlertCircle } from 'lucide-react';

interface StatsPanelProps {
  currentIndex: number;
  totalCount: number;
  correctCount: number;
  elapsedMs: number;
  averageTimeMs: number;
  isTestActive: boolean;
}

export default function StatsPanel({
  currentIndex,
  totalCount,
  correctCount,
  elapsedMs,
  averageTimeMs,
  isTestActive
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
  );
}
