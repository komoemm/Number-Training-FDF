/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { db, auth, isFirebaseActive, handleFirestoreError, OperationType } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateDataset, renderReceiptToDataUrl } from './utils/receiptGenerator';
import { GeneratedInvoiceData, TypingDetail, TestSession } from './types';
import InvoiceViewer from './components/InvoiceViewer';
import StatsPanel from './components/StatsPanel';
import HistoryLogs from './components/HistoryLogs';
import { 
  Zap, Keyboard, ShieldAlert, CheckCircle2, ChevronRight, ChevronLeft,
  RotateCcw, LogIn, LogOut, HelpCircle, Trophy, BarChart2, Check, X, Bookmark,
  Clock, Database, Upload, Play, Trash2, Plus, FileImage, Edit
} from 'lucide-react';

const TEST_SIZE = 20;

export default function App() {
  // Authentication & System states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Setup tabs selection
  const [activeSetupTab, setActiveSetupTab] = useState<'standard' | 'custom'>('standard');
  
  // Custom invoices uploaded from local system
  const [customInvoices, setCustomInvoices] = useState<(GeneratedInvoiceData & { customImageUrl?: string })[]>(() => {
    try {
      const saved = localStorage.getItem('custom_uploaded_invoices');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Custom invoice creation fields states
  const [customExpectedCode, setCustomExpectedCode] = useState<string>('');
  const [customCompanyName, setCustomCompanyName] = useState<string>('');
  const [uploadProgressError, setUploadProgressError] = useState<string | null>(null);
  
  // Custom bulk labeling & previewing indices
  const [labelingModalIndex, setLabelingModalIndex] = useState<number | null>(null);

  // Core Speed Test States
  const [isTestActive, setIsTestActive] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [expectedDataset, setExpectedDataset] = useState<GeneratedInvoiceData[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({}); // pre-rendered data-urls
  
  // Timer States
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);

  // Active Typist Input Form Values
  const [typedValue, setTypedValue] = useState<string>('');
  const [lastCharacterValid, setLastCharacterValid] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Session stats lists
  const [sessionResults, setSessionResults] = useState<TypingDetail[]>([]);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [averageTimeMs, setAverageTimeMs] = useState<number>(0);

  // Page level display state managers
  const [testComplete, setTestComplete] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [cheatTriggerMsg, setCheatTriggerMsg] = useState<string | null>(null);

  // Listen to Firebase Authenticated user states
  useEffect(() => {
    if (isFirebaseActive && auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setAuthLoading(false);
      });
      return unsubscribe;
    } else {
      setAuthLoading(false);
    }
  }, []);

  // Sync state loops to increment active item chronometer clock
  useEffect(() => {
    if (isTestActive) {
      startTimeRef.current = performance.now();
      setElapsedMs(0);

      // Start the display tick updates
      timerIntervalRef.current = window.setInterval(() => {
        const delta = performance.now() - startTimeRef.current;
        setElapsedMs(Math.round(delta));
      }, 37) as unknown as number;
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [currentIndex, isTestActive]);

  // Handle automatic autofocus when image state changes
  useEffect(() => {
    if (isTestActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, isTestActive]);

  /**
   * Google Auth Popup flow provider helper
   */
  const handleGoogleLogin = async () => {
    if (!isFirebaseActive || !auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Google Sign-In failed:', err);
    }
  };

  const handleLogout = async () => {
    if (!isFirebaseActive || !auth) return;
    try {
      await signOut(auth);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  /**
   * Initializes the 20-image dataset and pre-renders images into Data URLs
   * so that switching images has absolutely zero visual download/loading delay.
   */
  const startTestingSession = () => {
    setCheatTriggerMsg(null);
    setSaveError(null);
    const freshDataset = generateDataset(TEST_SIZE);
    
    // Pre-render canvas to dataURI to support immediate background preloading offline
    const urls: Record<string, string> = {};
    freshDataset.forEach(item => {
      urls[item.id] = renderReceiptToDataUrl(item);
    });

    setExpectedDataset(freshDataset);
    setImageUrls(urls);
    
    setSessionResults([]);
    setCorrectCount(0);
    setAverageTimeMs(0);
    setCurrentIndex(0);
    setTypedValue('');
    setTestComplete(false);
    setIsTestActive(true);
    
    // Silently preload image tag 1 in background
    if (freshDataset.length > 1) {
      const preloadImg = new Image();
      preloadImg.src = urls[freshDataset[1].id];
    }
  };

  /**
   * Initializes a custom speed testing session using the uploaded invoices library.
   */
  const startCustomTestingSession = () => {
    if (customInvoices.length === 0) return;
    
    setCheatTriggerMsg(null);
    setSaveError(null);

    // Set custom invoices as the active dataset
    setExpectedDataset(customInvoices);
    
    // Map of urls is simply base64s themselves
    const urls: Record<string, string> = {};
    customInvoices.forEach(item => {
      urls[item.id] = item.customImageUrl || '';
    });
    setImageUrls(urls);
    
    setSessionResults([]);
    setCorrectCount(0);
    setAverageTimeMs(0);
    setCurrentIndex(0);
    setTypedValue('');
    setTestComplete(false);
    setIsTestActive(true);
  };

  /**
   * Reads multiple user uploaded invoice images and adds them to the testing pool.
   * Auto-extracts 13-digit numbers from filenames if present!
   */
  const handleCustomImagesUpload = async (files: FileList | File[]) => {
    setUploadProgressError(null);
    const fileArray = Array.from(files);
    
    if (fileArray.length === 0) return;

    // Filter out non-images
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setUploadProgressError('Invalid file format. Please upload standard image files (PNG/JPG).');
      return;
    }

    const newItems: (GeneratedInvoiceData & { customImageUrl: string })[] = [];
    let hasSizeIssues = false;

    // Asynchronously read all files as Data URLs
    const readPromises = imageFiles.map((file, idx) => {
      return new Promise<void>((resolve) => {
        // limit image size to max 3MB to avoid localStorage quota overload
        if (file.size > 3 * 1024 * 1024) {
          hasSizeIssues = true;
          resolve();
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const base64Url = reader.result as string;
          const customId = `cust_${Date.now().toString().slice(-4)}_${idx}_${Math.floor(Math.random() * 1000)}`;
          
          // Pattern-match filename text for any continuous sequence of 13 digits, or T accompanied by 13 digits (e.g. T1234567890123)
          let expected = '';
          const tMatch = file.name.match(/T\d{13}/i);
          if (tMatch) {
            expected = tMatch[0].toUpperCase();
          } else {
            const digitMatch = file.name.match(/\d{13}/);
            if (digitMatch) {
              expected = `T${digitMatch[0]}`;
            }
          }

          // If no pattern extracted, use customExpectedCode input value (if non-empty), otherwise fallback to random JP-QIN tax code
          if (!expected) {
            expected = customExpectedCode.trim().toUpperCase();
          }
          if (!expected) {
            const randomDigits = Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join('');
            expected = `T${randomDigits}`;
          }

          let company = customCompanyName.trim();
          if (!company) {
            // strip extension
            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            company = baseName.slice(0, 24);
          }

          const newCustom: GeneratedInvoiceData & { customImageUrl: string } = {
            id: customId,
            expectedNumber: expected,
            companyName: company || 'Custom Invoice Upload',
            invoiceDate: new Date().toLocaleDateString('ja-JP'),
            totalAmount: 'N/A',
            difficulty: 'medium',
            style: 'modern',
            customImageUrl: base64Url
          };

          newItems.push(newCustom);
          resolve();
        };

        reader.onerror = () => {
          resolve();
        };

        reader.readAsDataURL(file);
      });
    });

    await Promise.all(readPromises);

    if (newItems.length === 0) {
      if (hasSizeIssues) {
        setUploadProgressError('Some files were too large. Please upload images smaller than 3MB.');
      } else {
        setUploadProgressError('Failed to parse uploaded images.');
      }
      return;
    }

    const updated = [...customInvoices, ...newItems];
    setCustomInvoices(updated);

    // quota protection try-catch block for localstorage write failures
    try {
      localStorage.setItem('custom_uploaded_invoices', JSON.stringify(updated));
    } catch (err) {
      console.warn('LocalStorage size limit exceeded:', err);
      setUploadProgressError('Some custom files are only stored in webpage memory because localStorage size quota was exceeded.');
    }

    // Reset inputs
    setCustomExpectedCode('');
    setCustomCompanyName('');
  };

  /**
   * Generates a realistic invoice canvas in-memory to let users test custom mode immediately
   */
  const handleAddSampleToCustomList = () => {
    const randomCount = customInvoices.length + 1;
    const rawNum = `T${Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join('')}`;
    const sampleId = `smpl_${Date.now().toString().slice(-4)}`;
    const tempDataset: GeneratedInvoiceData = {
      id: sampleId,
      expectedNumber: rawNum,
      companyName: `中野実業株式会社 [Sample ${randomCount}]`,
      invoiceDate: new Date().toLocaleDateString('ja-JP'),
      totalAmount: `${(3500 + randomCount * 850).toLocaleString()}円`,
      difficulty: 'medium',
      style: 'modern',
      note: '※ サンプルカスタムデータ'
    };
    
    const base64Url = renderReceiptToDataUrl(tempDataset);
    const newCustom = {
      ...tempDataset,
      customImageUrl: base64Url
    };
    const updated = [...customInvoices, newCustom];
    setCustomInvoices(updated);
    localStorage.setItem('custom_uploaded_invoices', JSON.stringify(updated));
  };

  /**
   * Removes an invoice from the custom sandbox list
   */
  const handleDeleteCustomInvoice = (id: string) => {
    const updated = customInvoices.filter(item => item.id !== id);
    setCustomInvoices(updated);
    localStorage.setItem('custom_uploaded_invoices', JSON.stringify(updated));
  };

  /**
   * Updates expected tax code for a specific custom invoice in real-time
   */
  const updateCustomInvoiceCode = (id: string, newCode: string) => {
    const formattedCode = newCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const updated = customInvoices.map(inv => {
      if (inv.id === id) {
        return { ...inv, expectedNumber: formattedCode };
      }
      return inv;
    });
    setCustomInvoices(updated);
    try {
      localStorage.setItem('custom_uploaded_invoices', JSON.stringify(updated));
    } catch {
      // quota limit fallback silently handled in memory
    }
  };

  /**
   * Updates company name for a specific custom invoice in real-time
   */
  const updateCustomInvoiceCompany = (id: string, newCompany: string) => {
    const updated = customInvoices.map(inv => {
      if (inv.id === id) {
        return { ...inv, companyName: newCompany };
      }
      return inv;
    });
    setCustomInvoices(updated);
    try {
      localStorage.setItem('custom_uploaded_invoices', JSON.stringify(updated));
    } catch {
      // quota limit fallback silently handled in memory
    }
  };

  /**
   * Safe Callback from Image fully loaded Event in InvoiceViewer.
   * We capture performance.now() the exact millisecond thermal scan is drawn.
   */
  const handleInvoiceImageOnLoad = () => {
    startTimeRef.current = performance.now();
  };

  /**
   * Handles character-level checks and filters to block copies/bypasses.
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    
    // Block special characters: only keep alphanumeric [a-zA-Z0-9]
    const cleaned = rawVal.replace(/[^a-zA-Z0-9]/g, '');
    
    setTypedValue(cleaned);

    const currentInvoice = expectedDataset[currentIndex];
    const expectedRaw = currentInvoice.expectedNumber; // always e.g. "T1234567890123"

    // Real-time character comparison feedback
    if (cleaned.length > 0) {
      const typedSlice = cleaned.toLowerCase();
      const expectedSlice = expectedRaw.substring(0, cleaned.length).toLowerCase();
      setLastCharacterValid(typedSlice === expectedSlice);
    } else {
      setLastCharacterValid(null);
    }

    // Determine expected length rules (either 14 characters including 'T', or 13 if typed without 'T')
    const hasT = expectedRaw.toUpperCase().startsWith('T');
    const inputHasT = cleaned.toUpperCase().startsWith('T');
    
    const targetLength = (hasT && inputHasT) ? 14 : 13;

    // Direct auto-advance on matching boundary length
    if (cleaned.length >= targetLength) {
      verifyAndAdvanceSession(cleaned, targetLength);
    }
  };

  /**
   * Evaluates speed capture and writes entry metrics securely,
   * then moves index pointer or transitions to completion screen.
   */
  const verifyAndAdvanceSession = (typedText: string, lengthToEvaluate: number) => {
    // 1. Terminate chronology
    const endTimestamp = performance.now();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const durationMs = Math.round(endTimestamp - startTimeRef.current);
    const currentInvoice = expectedDataset[currentIndex];

    // Evaluate correct (compare sanitized values)
    const sanitizedExpected = currentInvoice.expectedNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
    const sanitizedTyped = typedText.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Allow correct match either from raw exact comparison, or stripped numbers matching
    const isCorrect = (sanitizedExpected === sanitizedTyped) || 
      (sanitizedExpected.endsWith(sanitizedTyped) && sanitizedTyped.length === 13);

    const resultEntry: TypingDetail = {
      imageId: currentInvoice.id,
      expectedNumber: currentInvoice.expectedNumber,
      typedNumber: typedText.toUpperCase(),
      timeSpentMs: durationMs,
      isCorrect
    };

    const nextResults = [...sessionResults, resultEntry];
    setSessionResults(nextResults);

    let nextCorrectCount = correctCount;
    if (isCorrect) {
      nextCorrectCount += 1;
      setCorrectCount(nextCorrectCount);
    }

    // Clear and adjust input for next
    setTypedValue('');
    setLastCharacterValid(null);

    const nextIndex = currentIndex + 1;

    // Check if session completes
    if (nextIndex >= expectedDataset.length) {
      finalizeSessionLog(nextResults, nextCorrectCount);
    } else {
      // Advance to next index
      setCurrentIndex(nextIndex);
      
      // Background preload candidate image at nextIndex + 1 to keep latency strictly at zero!
      if (nextIndex + 1 < expectedDataset.length) {
        const nextInvId = expectedDataset[nextIndex + 1].id;
        const nextDataUri = imageUrls[nextInvId];
        if (nextDataUri) {
          const img = new Image();
          img.src = nextDataUri;
        }
      }
    }
  };

  /**
   * Finalizes score aggregation and saves payload to Firebase or Sandbox storage.
   */
  const finalizeSessionLog = async (completedResults: TypingDetail[], finalCorrect: number) => {
    setIsTestActive(false);
    setTestComplete(true);

    // Calculate average milliseconds
    const totalMs = completedResults.reduce((acc, curr) => acc + curr.timeSpentMs, 0);
    const avgMs = completedResults.length > 0 ? Math.round(totalMs / completedResults.length) : 0;
    setAverageTimeMs(avgMs);

    setIsSaving(true);
    setSaveError(null);

    const activeUserId = currentUser ? currentUser.uid : 'sandbox_guest_uid';

    // Construct exactly conformant payload
    const rawPayload = {
      userId: activeUserId,
      totalImagesAttempted: completedResults.length,
      correctEntries: finalCorrect,
      averageTimeMs: avgMs,
      details: completedResults.map(r => ({
        imageId: r.imageId,
        expectedNumber: r.expectedNumber,
        typedNumber: r.typedNumber,
        timeSpentMs: r.timeSpentMs,
        isCorrect: r.isCorrect
      }))
    };

    // Prepare client-side visual timestamp
    const now = new Date();

    // 1. Write locally to assure Sandbox guest functionality
    try {
      const localData = localStorage.getItem('local_test_sessions');
      const prevList = localData ? JSON.parse(localData) : [];
      
      const localLogEntry = {
        ...rawPayload,
        timestamp: now.toISOString()
      };
      
      localStorage.setItem('local_test_sessions', JSON.stringify([localLogEntry, ...prevList]));
    } catch (err) {
      console.error('Failed writing locally:', err);
    }

    // 2. Safely upload to Firestore if Connected & Authenticated
    if (isFirebaseActive && db && currentUser && activeUserId !== 'sandbox_guest_uid') {
      const pathCollection = 'test_sessions';
      const newSessionDocId = `session_${now.getTime()}`;

      try {
        const cloudPayload = {
          ...rawPayload,
          timestamp: serverTimestamp() // compliant with spec timestamp rule
        };
        
        await setDoc(doc(db, pathCollection, newSessionDocId), cloudPayload);
      } catch (err) {
        // Enforce the standard handles error payload callback rule
        try {
          handleFirestoreError(err, OperationType.CREATE, `${pathCollection}/${newSessionDocId}`);
        } catch (wrappedErr: any) {
          setSaveError('Cloud sync blocked. Logs retained in local history fallback.');
          console.error('Wrapped Firestore protection error:', wrappedErr.message);
        }
      }
    }

    setIsSaving(false);
    // Refresh history viewer
    setRefreshTrigger(prev => prev + 1);
  };

  /**
   * Anti-Cheating guards: blocking attempts to paste values.
   */
  const handlePastePrevent = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setCheatTriggerMsg('Clipboard paste access is strictly security-blocked during testing.');
    setTimeout(() => setCheatTriggerMsg(null), 4000);
  };

  const handleCopyPrevent = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setCheatTriggerMsg('Text copy actions are disabled to prevent credential extraction.');
    setTimeout(() => setCheatTriggerMsg(null), 4000);
  };

  // Determine typing tier
  const evaluateRank = () => {
    if (correctCount < 16) return { name: 'Tier D - Support Needed', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
    const avgSec = averageTimeMs / 1000;
    if (avgSec <= 3.5) return { name: 'Tier S - Elite Master', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30 font-bold animate-pulse' };
    if (avgSec <= 4.8) return { name: 'Tier A - Professional Specialist', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (avgSec <= 6.0) return { name: 'Tier B - Standard Proficient', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
    return { name: 'Tier C - Below SLA Target', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
  };

  const currentRank = evaluateRank();

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800 font-sans" id="speedtest-root">
      {/* 1. Global Navigation Bar */}
      <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-6 border-b border-slate-800 sticky top-0 z-30 shrink-0 select-none">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-500 w-8 h-8 rounded flex items-center justify-center font-bold text-sm text-white shadow-lg">DT</div>
          <h1 className="text-xs sm:text-sm font-semibold tracking-wide uppercase">
            Data Entry Speed Assessment <span className="text-slate-400 font-normal ml-2 hidden md:inline">// JP-QIN-13</span>
          </h1>
        </div>
        
        {/* Auth status & Connection indicator */}
        <div className="flex items-center gap-6 text-xs" id="authentication-widget">
          {/* Status Label */}
          <div className="hidden sm:flex flex-col items-end leading-none">
            <span className="text-slate-400 uppercase tracking-tighter text-[9px] font-bold">Operator</span>
            <span className="font-medium mt-1">
              {currentUser ? (currentUser.displayName || 'k_tanaka_08') : 'Guest-User'}
            </span>
          </div>

          <div className="w-px h-8 bg-slate-700 hidden sm:block"></div>

          <div className="flex flex-col items-end leading-none">
            <span className="text-slate-400 uppercase tracking-tighter text-[9px] font-bold">Session Mode</span>
            <span className="font-medium mt-1 flex items-center gap-1">
              {isFirebaseActive ? (
                <span className="text-sky-400">Firebase.Active</span>
              ) : (
                <span className="text-amber-405">Sandbox.Guest</span>
              )}
            </span>
          </div>

          {currentUser && (
            <>
              <div className="w-px h-8 bg-slate-700"></div>
              <button
                onClick={handleLogout}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-450 transition text-[10px] font-bold uppercase cursor-pointer"
                title="Sign Out Workstation"
              >
                Signout
              </button>
            </>
          )}

          {!currentUser && isFirebaseActive && (
            <>
              <div className="w-px h-8 bg-slate-700"></div>
              <button
                onClick={handleGoogleLogin}
                className="px-2 py-1 bg-indigo-500 hover:bg-indigo-400 text-white rounded text-[10px] font-bold transition uppercase cursor-pointer"
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </header>

      {/* 2. Main Workstation Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Anti-paste Warning Overlay Card */}
        {cheatTriggerMsg && (
          <div className="bg-rose-950/40 text-rose-300 border border-rose-900/50 rounded-xl p-4 flex items-center space-x-3 animate-bounce">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wide">Security Restriction Active</h4>
              <p className="text-xs mt-0.5">{cheatTriggerMsg}</p>
            </div>
          </div>
        )}

        {/* A. Benchmark configuration start panel */}
        {!isTestActive && !testComplete && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="setup-panel">
            {/* Guide Instructions column */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-sm animate-fade-in">
              <div className="space-y-6">
                {/* Dynamic Configuration Navigation Tabs */}
                <div className="flex border-b border-slate-200 font-sans mb-2">
                  <button
                    onClick={() => { setActiveSetupTab('standard'); setUploadProgressError(null); }}
                    className={`pb-3 px-1 sm:px-4 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition flex items-center gap-2 ${
                      activeSetupTab === 'standard'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>Benchmark Mode (20 Receipts)</span>
                  </button>
                  <button
                    onClick={() => { setActiveSetupTab('custom'); setUploadProgressError(null); }}
                    className={`pb-3 px-1 sm:px-4 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition flex items-center gap-2 ${
                      activeSetupTab === 'custom'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Custom Uploads Portal</span>
                  </button>
                </div>

                {activeSetupTab === 'standard' ? (
                  <>
                    <div className="space-y-2">
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
                        Data Entry Workstation <span className="text-indigo-650 text-xs font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">v1.1</span>
                      </h2>
                      <p className="text-slate-500 text-sm leading-relaxed">
                        This high-precision typing analyzer evaluates keypress latencies, operator split speeds, and accuracy rates for processing 13-digit Japanese Qualified Invoice Tax Numbers (登録番号) from receipts.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                          <Bookmark className="w-3.5 h-3.5 text-indigo-600" /> 1. Input Rule
                        </h3>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          Numbers always begin with <strong>&quot;T&quot; followed by 13 digits</strong> (e.g. T1234567890123). Type raw digits exactly as seen.
                        </p>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-pink-500" /> 2. Auto-Advance
                        </h3>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          Do not press &quot;Enter&quot;. The moment you reach exactly <strong>14 characters</strong> (with T) or <strong>13 characters</strong> (digits only), it instantly validates and loads the next card!
                        </p>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" /> 3. Performance Timing
                        </h3>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          Timing starts precisely when the image displays on screen (`onLoad`) and records ending values on the final keystroke.
                        </p>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> 4. SLA Standard
                        </h3>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          Target speed is <strong>under 6.00 seconds</strong> per invoice. Ideal standard accuracy is <strong>95% or greater</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 border-t border-slate-150 pt-6">
                      <button
                        onClick={startTestingSession}
                        className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 shadow-sm hover:shadow-indigo-500/10 text-sm uppercase tracking-wider cursor-pointer font-sans"
                      >
                        <span>Launch 20-Invoice speed test</span>
                        <ChevronRight className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        Custom Document Sandbox
                      </h2>
                      <p className="text-slate-500 text-xs">
                        Upload raw image files of real customer bills or sample invoices with tax registration numbers to practice and run assessments on custom files.
                      </p>
                    </div>

                    {/* Form block */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-3">
                        Step 1: Input Document Attributes:
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                            Expected Tax Number <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. T1234567890123"
                            maxLength={14}
                            value={customExpectedCode}
                            onChange={(e) => setCustomExpectedCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                            className="w-full p-2 bg-white border border-slate-205 text-xs text-slate-800 font-mono rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                            Invoice Issuer (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Acme Corporation"
                            maxLength={36}
                            value={customCompanyName}
                            onChange={(e) => setCustomCompanyName(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-205 text-xs text-slate-800 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                          />
                        </div>
                      </div>

                      {/* Drop area */}
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleCustomImagesUpload(e.target.files);
                            }
                          }}
                        />
                        <div className="border border-dashed border-slate-300 bg-white hover:bg-slate-50 p-4 rounded-lg text-center transition flex flex-col items-center justify-center space-y-1">
                          <Upload className="w-5 h-5 text-indigo-500 animate-pulse" />
                          <div className="text-[11px] text-slate-600 font-bold">
                            Click to select multiple invoice photos or drag & drop them here
                          </div>
                          <span className="text-[9px] text-slate-400 font-sans text-center">
                            Accepts PNG, JPG (Multi-select enabled, Max 3MB each)<br/>
                            <span className="text-indigo-650 font-semibold text-[10px]">Tip: Includes auto-extraction of 13-digit codes directly from filenames!</span>
                          </span>
                        </div>
                      </div>

                      {uploadProgressError && (
                        <div className="text-[11px] text-rose-605 bg-rose-50 border border-rose-100 rounded px-2.5 py-1.5 mt-2 font-medium font-sans">
                          {uploadProgressError}
                        </div>
                      )}
                    </div>

                    {/* Files Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 flex items-center gap-1">
                          <FileImage className="w-3.5 h-3.5 text-indigo-650" /> Loaded Pool Invoices ({customInvoices.length})
                        </span>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddSampleToCustomList}
                            className="text-[9px] bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-705 px-2 py-1 rounded font-bold cursor-pointer transition uppercase tracking-wider"
                          >
                            + Populate Sample Image
                          </button>
                          {customInvoices.length > 0 && (
                            <button
                              onClick={() => {
                                setCustomInvoices([]);
                                localStorage.removeItem('custom_uploaded_invoices');
                              }}
                              className="text-[9px] hover:bg-rose-50 border border-transparent text-rose-600 px-2 py-1 rounded font-bold cursor-pointer transition uppercase tracking-wider"
                            >
                              Clear Pool
                            </button>
                          )}
                        </div>
                      </div>

                      {customInvoices.length === 0 ? (
                        <div className="border border-slate-150 rounded-xl p-6 text-center bg-slate-50/45">
                          <p className="text-slate-400 text-xs font-semibold leading-none">No custom invoices loaded yet</p>
                          <p className="text-[10px] text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                            Input a correct tax code above and select/drop your customer invoice image, or click <strong className="text-indigo-650 cursor-pointer" onClick={handleAddSampleToCustomList}>Populate Sample Image</strong> to instantly test the flow!
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                          {customInvoices.map((inv, idx) => (
                            <div key={inv.id} className="flex bg-slate-50 border border-slate-200 rounded-lg p-2 items-center justify-between group hover:border-indigo-200 hover:bg-slate-50/80 transition relative">
                              <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-1">
                                {/* Thumbnail with Zoom Overlays */}
                                <div 
                                  onClick={() => setLabelingModalIndex(idx)}
                                  className="w-12 h-10 border border-slate-200 rounded bg-white overflow-hidden shrink-0 flex items-center justify-center cursor-pointer relative group-hover:border-indigo-300 shadow-sm"
                                  title="Click to zoom and review details"
                                >
                                  <img
                                    src={inv.customImageUrl}
                                    alt="Invoice thumbnail"
                                    className="object-cover w-full h-full group-hover:scale-105 transition duration-150"
                                  />
                                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center">
                                    <Plus className="w-3.5 h-3.5 text-white" />
                                  </div>
                                </div>
                                
                                {/* Inline Editable Fields */}
                                <div className="flex-1 min-w-0 space-y-1">
                                  <input
                                    type="text"
                                    value={inv.companyName}
                                    placeholder="Issuer Name (e.g. Aeon)"
                                    onChange={(e) => updateCustomInvoiceCompany(inv.id, e.target.value)}
                                    className="w-full text-[10px] font-bold text-slate-700 bg-transparent hover:bg-white focus:bg-white border-b border-transparent hover:border-slate-300 focus:border-indigo-500 rounded px-1 py-0.5 outline-none transition"
                                    title="Click to rename business/issuer"
                                  />
                                  <div className="flex items-center gap-1 pl-1">
                                    <span className="text-[9px] text-indigo-650 font-mono font-bold shrink-0">Code:</span>
                                    <input
                                      type="text"
                                      value={inv.expectedNumber}
                                      maxLength={14}
                                      placeholder="T1234567890123"
                                      onChange={(e) => updateCustomInvoiceCode(inv.id, e.target.value)}
                                      className="w-full text-[10px] font-mono text-indigo-700 bg-transparent hover:bg-white focus:bg-white border-b border-transparent hover:border-slate-300 focus:border-indigo-505 rounded px-1 py-0.5 outline-none font-bold transition tracking-wider uppercase"
                                      title="Enter 13-digit registration code"
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              {/* Action Bar Column */}
                              <div className="flex flex-col items-center gap-1 shrink-0">
                                <button
                                  onClick={() => setLabelingModalIndex(idx)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer transition"
                                  title="Open Labeling Assistant"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCustomInvoice(inv.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition shrink-0"
                                  title="Remove image from sandbox"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 border-t border-slate-150 pt-4">
                      <button
                        onClick={startCustomTestingSession}
                        disabled={customInvoices.length === 0}
                        className={`w-full sm:w-auto px-6 py-3 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 font-sans tracking-wide text-xs uppercase ${
                          customInvoices.length > 0 
                            ? 'bg-indigo-600 hover:bg-indigo-500 cursor-pointer shadow-sm hover:shadow-indigo-500/15' 
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200 opacity-70'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-white text-white" />
                        <span>Launch Session ({customInvoices.length} Custom Invoices)</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Workplace Context parameters / Guest Fallback help */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm animate-fade-in">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-indigo-600">
                  <Database className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Storage & Analytics</span>
                </div>
                
                <h3 className="font-bold text-slate-700">System Integration Checklist</h3>
                
                <div className="space-y-3.5 text-xs text-slate-500 leading-relaxed">
                  <div className="flex items-start space-x-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Firebase integration successfully initialized</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    {isFirebaseActive ? (
                      <span className="text-emerald-500 font-bold">✓</span>
                    ) : (
                      <span className="text-amber-500 font-bold">!</span>
                    )}
                    <span>
                      {isFirebaseActive 
                        ? 'Cloud database bound and actively writing to Cloud Run' 
                        : 'Credentials waiting: client operating under dynamic LocalStorage Sandbox'}
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    {currentUser ? (
                      <span className="text-emerald-500 font-bold">✓</span>
                    ) : (
                      <span className="text-slate-400 font-bold">○</span>
                    )}
                    <span>{currentUser ? `Authorized as employee: ${currentUser.displayName}` : 'Active user: Anonymous Practitioner'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-150 text-slate-500 text-xs space-y-2">
                <p className="font-bold text-slate-700 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-600" /> What am I typing?
                </p>
                <p className="text-[11px] leading-relaxed">
                  Japanese Qualified Invoices output numbers in the following format:
                  <code className="block text-[11px] bg-white px-2 py-1 select-all font-mono text-indigo-600 rounded border border-slate-205 mt-1">
                    登録番号: T1234567890123
                  </code> 
                  You skip spacers/hyphens and input only alphanumeric strings.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* B. ACTIVE WORKSTATION SESSION RUNNING */}
        {isTestActive && expectedDataset[currentIndex] && (
          <div className="space-y-6 animate-fade-in" id="active-test-container">
            {/* Real-time stats header banner */}
            <StatsPanel
              currentIndex={currentIndex}
              totalCount={expectedDataset.length}
              correctCount={correctCount}
              elapsedMs={elapsedMs}
              averageTimeMs={
                sessionResults.length > 0 
                  ? Math.round(sessionResults.reduce((sum, r) => sum + r.timeSpentMs, 0) / sessionResults.length) 
                  : 0
              }
              isTestActive={true}
            />

            {/* Split Screen Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Column: Image Scan Workstation (5 cols) */}
              <div className="lg:col-span-7">
                <InvoiceViewer
                  currentInvoice={expectedDataset[currentIndex]}
                  onImageLoaded={handleInvoiceImageOnLoad}
                  isLoading={false}
                />
              </div>

              {/* Right Column: Key Entry Node (5 cols) */}
              <div className="lg:col-span-5 flex flex-col justify-between bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="space-y-6">
                  {/* Title card */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Data Entry Port
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 uppercase font-mono tracking-wider">
                      Target ID: {expectedDataset[currentIndex].id.toUpperCase()} Scan 
                    </p>
                    {/* Visual stream progress line */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3.5">
                      <div 
                        className="bg-indigo-650 h-1.5 transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / TEST_SIZE) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Typing form input container */}
                  <div className="space-y-3.5 relative">
                    <label htmlFor="numeric-speed-input" className="block text-xs font-bold text-slate-700 uppercase tracking-widest">
                      Character Sequence Input
                    </label>

                    {/* Alphanumeric Text Field */}
                    <div className="relative">
                      <input
                        id="numeric-speed-input"
                        ref={inputRef}
                        type="text"
                        value={typedValue}
                        onChange={handleInputChange}
                        onPaste={handlePastePrevent}
                        onCopy={handleCopyPrevent}
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        placeholder={expectedDataset[currentIndex].expectedNumber.startsWith('T') ? "T..." : "13..."}
                        className={`w-full py-4 px-5 text-center text-3xl font-bold tracking-[0.2em] font-mono text-slate-800 placeholder:text-slate-300 bg-slate-50 border focus:ring-4 outline-none rounded-xl transition ${
                          lastCharacterValid === true ? 'border-emerald-500 focus:ring-emerald-50 bg-emerald-50/10 text-emerald-800' : 
                          lastCharacterValid === false ? 'border-rose-500 focus:ring-rose-50 bg-rose-50/10 text-rose-800' : 'border-slate-250 focus:ring-indigo-100'
                        }`}
                      />

                      {/* Character limit feedback ticks */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 flex items-center justify-center">
                        <span className="text-[11px] font-bold font-mono text-slate-400 bg-white border border-slate-205 px-1.5 py-0.5 rounded tracking-wide">
                          {typedValue.length} / {expectedDataset[currentIndex].expectedNumber.startsWith('T') && typedValue.startsWith('T') ? 14 : 13}
                        </span>
                      </div>
                    </div>

                    {/* Character check visual indicator ribbon */}
                    <div className="flex justify-center space-x-1 h-1.5">
                      {Array.from({ length: expectedDataset[currentIndex].expectedNumber.startsWith('T') && typedValue.startsWith('T') ? 14 : 13 }).map((_, idx) => {
                        let dotColor = 'bg-slate-100 border border-slate-200';
                        if (idx < typedValue.length) {
                          if (lastCharacterValid === false && idx === typedValue.length - 1) {
                            dotColor = 'bg-rose-500';
                          } else {
                            dotColor = 'bg-indigo-600';
                          }
                        }
                        return (
                          <div 
                            key={idx} 
                            className={`w-3.5 h-1.5 rounded-full transition-colors ${dotColor}`} 
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Entry help parameters cards */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block font-semibold">
                      Workstation Entry Specifications:
                    </span>
                    <ul className="text-xs text-slate-550 space-y-1.5 leading-relaxed list-disc list-inside">
                      <li>Paste is blocked for security and verification metrics.</li>
                      <li>Double-check letters and casing: Capital <strong className="text-slate-800">T</strong> followed by 13 digits.</li>
                      <li>If you skip typing &quot;T&quot;, enter just the 13 digits (e.g. 1234567890123) and it will advance correctly.</li>
                      <li>Clicking outside? Use <button onClick={() => inputRef.current?.focus()} className="text-indigo-600 hover:text-indigo-500 underline cursor-pointer font-bold">Refocus Field</button> button.</li>
                    </ul>
                  </div>
                </div>

                {/* Left Time threshold bar */}
                <div className="mt-8 border-t border-slate-150 pt-4 flex justify-between items-center text-slate-500 text-[11px] font-mono">
                  <span>Image ID: {expectedDataset[currentIndex].id.toUpperCase()}</span>
                  <span className={elapsedMs > 6000 ? 'text-rose-600 font-bold' : ''}>
                    Pace: {(elapsedMs / 1000).toFixed(1)}s / 6.0s
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* C. WORKSHEET TEST COMPLETE - RESULTS */}
        {testComplete && (
          <div className="space-y-6 animate-fade-in" id="results-display-screen">
            
            {/* Real-time stats header banner */}
            <StatsPanel
              currentIndex={TEST_SIZE}
              totalCount={TEST_SIZE}
              correctCount={correctCount}
              elapsedMs={0}
              averageTimeMs={averageTimeMs}
              isTestActive={false}
            />

            {/* Main high card results summary block */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden animate-fade-in">
              
              {/* Background visual graphics */}
              <div className="absolute top-0 right-0 p-10 select-none pointer-events-none opacity-[0.02] text-indigo-600">
                <Trophy className="w-96 h-96" />
              </div>

              {/* Layout Content wrapper */}
              <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
                <div className="space-y-4 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200">
                      <Trophy className="w-10 h-10 animate-bounce" />
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
                        Assessment Finalized
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">
                        Workspace review and analytics scores successfully registered.
                      </p>
                    </div>
                  </div>

                  {/* Rank Display Badge */}
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <span className="text-xs uppercase text-slate-400 font-bold tracking-widest font-mono">Evaluation Rating:</span>
                    <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${currentRank.color}`}>
                      {currentRank.name}
                    </span>
                  </div>
                  
                  {saveError && (
                    <div className="p-2 border border-rose-200 bg-rose-50 text-rose-700 rounded text-xs flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{saveError}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <button
                    onClick={startTestingSession}
                    className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer text-sm uppercase tracking-wider"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Run Another Worksheet Test</span>
                  </button>
                  <button
                    onClick={() => {
                      setTestComplete(false);
                      setIsTestActive(false);
                    }}
                    className="px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition flex items-center justify-center border border-slate-205 gap-1.5 cursor-pointer text-sm"
                  >
                    <span>Return to Configuration</span>
                  </button>
                </div>
              </div>

              {/* Item details table logs list card */}
              <div className="mt-10 border-t border-slate-150 pt-8" id="itemized-analysis-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-indigo-650" /> Complete Worksheet Analysis ({expectedDataset.length} Invoices)
                  </h3>
                  <span className="text-xs font-mono text-slate-400">SORTED BY CHRONOLOGY</span>
                </div>

                {/* Items grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider pb-3 text-[10px]">
                        <th className="pb-3 text-left">No.</th>
                        <th className="pb-3">Image ID</th>
                        <th className="pb-3">Expected (Invoice Tax code)</th>
                        <th className="pb-3 text-slate-600">Your Typing Entry</th>
                        <th className="pb-3">Lapse Speed</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {sessionResults.map((result, idx) => {
                        const meetsSLA = result.timeSpentMs <= 6000;
                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition text-slate-700">
                            <td className="py-3 font-semibold text-slate-405">{String(idx + 1).padStart(2, '0')}</td>
                            <td className="py-3 text-slate-505">{result.imageId.toUpperCase()}</td>
                            <td className="py-3 font-bold text-slate-900">{result.expectedNumber}</td>
                            <td className="py-3 text-slate-755">{result.typedNumber || <span className="italic text-slate-400 font-normal leading-none">[skipped]</span>}</td>
                            <td className={`py-3 font-semibold ${meetsSLA ? 'text-indigo-600' : 'text-amber-600'}`}>
                              {(result.timeSpentMs / 1000).toFixed(2)}s {meetsSLA ? '(Meets SLA)' : '(Over 6.0s)'}
                            </td>
                            <td className="py-3 text-right">
                              {result.isCorrect ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded text-[10px] uppercase font-bold border border-emerald-200">
                                  <Check className="w-3.5 h-3.5 text-emerald-700" /> Match
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2.5 py-1 rounded text-[10px] uppercase font-bold border border-rose-200">
                                  <X className="w-3.5 h-3.5 text-rose-700" /> Mismatch
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Bottom Section: Historical logs */}
        <HistoryLogs 
          userId={currentUser ? currentUser.uid : 'sandbox_guest_uid'} 
          refreshTrigger={refreshTrigger}
        />

      </main>

      {/* Footer System Indicator */}
      <footer className="bg-slate-900 border-t border-slate-950 py-6 text-center text-slate-400 text-xs mt-auto select-none font-sans">
        <p className="font-semibold text-white">Qualified Invoice Speed Analyzer Node | JP-QIN-13</p>
        <p className="mt-1 text-slate-400 text-[11px]">ISO-6004 Typing Speed Standard Integration. High precision performance.now() chronometer active.</p>
      </footer>

      {/* Interactive Batch Labeling Assistant Lightbox modal */}
      {labelingModalIndex !== null && customInvoices[labelingModalIndex] && (() => {
        const inv = customInvoices[labelingModalIndex];
        
        // Handlers for Navigating
        const handleNextLabel = () => {
          if (labelingModalIndex < customInvoices.length - 1) {
            setLabelingModalIndex(labelingModalIndex + 1);
          } else {
            setLabelingModalIndex(null); // Close on last item
          }
        };

        const handlePrevLabel = () => {
          if (labelingModalIndex > 0) {
            setLabelingModalIndex(labelingModalIndex - 1);
          }
        };

        return (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="labeling-assistant-modal">
            <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col md:flex-row max-h-[90vh]">
              
              {/* Left Side: Invoice Preview Card */}
              <div className="bg-slate-950 p-6 flex flex-col justify-between items-center md:w-[45%] border-r border-slate-800 min-h-[300px] relative">
                <div className="absolute top-3 left-3 flex items-center gap-1 bg-slate-800 text-slate-300 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded tracking-wide">
                  <span>Doc {labelingModalIndex + 1} of {customInvoices.length}</span>
                </div>
                
                <button 
                  onClick={() => setLabelingModalIndex(null)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex-1 w-full flex items-center justify-center p-2 mb-4 mt-6 overflow-hidden max-h-[380px]">
                  <img 
                    src={inv.customImageUrl} 
                    alt="Receipt Preview" 
                    className="max-h-full max-w-full rounded shadow-md object-contain border border-slate-850"
                  />
                </div>

                <div className="w-full text-center">
                  <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                    Interactive Image Zoom
                  </p>
                </div>
              </div>

              {/* Right Side: Data Labeler Fields */}
              <div className="p-6 md:w-[55%] flex flex-col justify-between bg-white overflow-y-auto">
                <div className="space-y-5">
                  <div>
                    <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest block mb-1">
                      🏷️ Batch Code Reviewer
                    </span>
                    <h3 className="text-lg font-bold text-slate-800 font-sans tracking-tight leading-none">
                      Verify & Set Codes
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Review the receipt photo. Type the 13-digit Qualified Tax registration number (登録番号) starting with <strong>&quot;T&quot;</strong>.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                        Expected Tax Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          placeholder="e.g. T1234567890123"
                          maxLength={14}
                          value={inv.expectedNumber}
                          autoFocus
                          onChange={(e) => updateCustomInvoiceCode(inv.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleNextLabel();
                            }
                          }}
                          className="w-full p-2.5 bg-slate-50 border border-slate-205 text-sm text-slate-855 font-mono font-bold rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 tracking-wide text-indigo-705"
                        />
                        {inv.expectedNumber.length === 14 ? (
                          <Check className="w-4 h-4 text-emerald-600 absolute right-3" />
                        ) : (
                          <span className="text-[9px] font-mono text-slate-400 absolute right-3">
                            {inv.expectedNumber.length}/14
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-normal font-sans">
                        Press <strong className="text-slate-655 font-bold">Enter</strong> to save and go to next image automatically.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                        Invoice Issuer/Business Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Aeon Co., Ltd."
                        maxLength={36}
                        value={inv.companyName}
                        onChange={(e) => updateCustomInvoiceCompany(inv.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleNextLabel();
                          }
                        }}
                        className="w-full p-2.5 bg-slate-50 border border-slate-205 text-xs text-slate-800 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 mt-6 flex justify-between items-center gap-3">
                  <button
                    onClick={handlePrevLabel}
                    disabled={labelingModalIndex === 0}
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold font-sans flex items-center justify-center transition uppercase tracking-wider ${
                      labelingModalIndex === 0
                        ? 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed'
                        : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> Prev
                  </button>

                  <span className="text-[9px] text-slate-400 font-mono tracking-wider uppercase font-semibold">
                    Doc {labelingModalIndex + 1} of {customInvoices.length}
                  </span>

                  <button
                    onClick={handleNextLabel}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold font-sans rounded-lg transition flex items-center justify-center uppercase tracking-wider cursor-pointer shadow-sm"
                  >
                    {labelingModalIndex === customInvoices.length - 1 ? 'Close Reviewer' : 'Next'} <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
