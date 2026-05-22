/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, isFirebaseActive } from '../firebase';
import { Clock, RefreshCw, Layers, Database, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';
import { TestSession, TypingDetail } from '../types';

interface HistoryLogsProps {
  userId: string;
  refreshTrigger: number;
}

export default function HistoryLogs({ userId, refreshTrigger }: HistoryLogsProps) {
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchSessionHistory();
  }, [userId, refreshTrigger]);

  const fetchSessionHistory = async () => {
    setLoading(true);
    setErrorStatus(null);
    let fetchedSessions: TestSession[] = [];

    // 1. Fetch from Firestore if Firebase configurations are present
    if (isFirebaseActive && db && userId && userId !== 'sandbox_guest_uid') {
      const path = 'test_sessions';
      try {
        const queryRef = query(
          collection(db, path),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(15)
        );
        const snapshot = await getDocs(queryRef);
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Safely resolve nested firestore Timestamp values
          let timestampDate: Date;
          if (data.timestamp && typeof data.timestamp.toDate === 'function') {
            timestampDate = data.timestamp.toDate();
          } else if (data.timestamp) {
            timestampDate = new Date(data.timestamp);
          } else {
            timestampDate = new Date();
          }

          fetchedSessions.push({
            userId: data.userId,
            timestamp: timestampDate,
            totalImagesAttempted: data.totalImagesAttempted,
            correctEntries: data.correctEntries,
            averageTimeMs: data.averageTimeMs,
            details: data.details || []
          });
        });
      } catch (err) {
        console.warn('Unable to load from cloud. Retrying local cache fallback...', err);
        // Fallback to local logs on security or connection blocks
        try {
          const localData = localStorage.getItem('local_test_sessions');
          if (localData) {
            fetchedSessions = JSON.parse(localData);
          }
        } catch (localErr) {
          console.error('Failed parsing local sessions fallback:', localErr);
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
            timestamp: new Date(session.timestamp)
          }));
        }
      } catch (err) {
        console.error('Failed to query local speed session results:', err);
      }
    }

    setSessions(fetchedSessions);
    setLoading(false);
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
        minute: '2-digit'
      });
    }
    return String(dateValue);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" id="history-panel">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Historical Typing Log</h3>
        </div>
        <button
          onClick={fetchSessionHistory}
          disabled={loading}
          className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition disabled:opacity-50 border border-slate-200 cursor-pointer"
          title="Reload History"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {errorStatus && (
        <div className="bg-amber-50 text-amber-700 border-b border-slate-200 px-5 py-2 text-xs flex items-center">
          <Database className="w-3.5 h-3.5 mr-1" />
          <span>{errorStatus}</span>
        </div>
      )}

      {/* List content */}
      <div className="p-5" id="history-items">
        {loading && sessions.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
            <span className="text-xs">Loading logs...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-center">
            <Clock className="w-8 h-8 text-slate-300 mb-2" />
            <span className="text-sm font-semibold text-slate-600">No previous records</span>
            <span className="text-xs text-slate-500 mt-1">Complete a 20-image test series to log your score.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session, sIdx) => {
              const accuracy = Math.round((session.correctEntries / session.totalImagesAttempted) * 100);
              const isExpanded = expandedSessionId === sIdx;
              const dateLabel = formatDate(session.timestamp);
              
              return (
                <div key={sIdx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm transition hover:border-slate-350">
                  {/* Summary trigger line */}
                  <div 
                    onClick={() => toggleExpandSession(sIdx)}
                    className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 transition bg-slate-50/20"
                  >
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                        <span>{dateLabel}</span>
                        {session.userId === 'sandbox_guest_uid' ? (
                          <span className="bg-slate-100 px-1.5 py-0.2 rounded text-[10px] text-slate-500 font-bold">Sandbox</span>
                        ) : (
                          <span className="bg-indigo-50 px-1.5 py-0.2 rounded text-[10px] text-indigo-600 font-bold border border-indigo-100">Firestore</span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        {session.correctEntries} of {session.totalImagesAttempted} correct
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 w-full md:w-auto justify-between md:justify-end">
                      <div className="flex items-center space-x-6 text-right">
                        <div>
                          <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Mean Speed</div>
                          <div className="text-sm font-bold text-slate-700 font-mono">{(session.averageTimeMs / 1000).toFixed(2)}s</div>
                        </div>
                        <div className="h-6 w-[1px] bg-slate-200" />
                        <div>
                          <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Accuracy</div>
                          <div className={`text-sm font-bold font-mono ${accuracy >= 95 ? 'text-emerald-600' : 'text-slate-650'}`}>{accuracy}%</div>
                        </div>
                      </div>
                      
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Breakdown Table */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 overflow-x-auto text-xs">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold text-[9px] font-mono">
                            <th className="pb-2">ID</th>
                            <th className="pb-2">Expected (Correct)</th>
                            <th className="pb-2">Your Typing Entry</th>
                            <th className="pb-2">Time Spent</th>
                            <th className="pb-2 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150">
                          {session.details.map((detail, dIdx) => (
                            <tr key={dIdx} className="hover:bg-slate-100/50 text-slate-700 font-mono transition">
                              <td className="py-2.5 text-slate-500 font-bold">{detail.imageId.toUpperCase()}</td>
                              <td className="py-2.5 text-slate-900 font-bold">{detail.expectedNumber}</td>
                              <td className="py-2.5 text-slate-700">{detail.typedNumber || <span className="italic text-slate-400">[blank]</span>}</td>
                              <td className="py-2.5">{(detail.timeSpentMs / 1000).toFixed(2)}s</td>
                              <td className="py-2.5 text-right font-bold">
                                {detail.isCorrect ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded text-[10px] uppercase font-bold">
                                    <CheckCircle className="w-3 h-3 text-emerald-700" /> Match
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded text-[10px] uppercase font-bold animate-pulse">
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
        )}
      </div>
    </div>
  );
}
