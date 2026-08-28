/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { db, auth, isFirebaseActive, handleFirestoreError, OperationType } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, setDoc, getDocs, deleteDoc, serverTimestamp, query, where, orderBy, limit } from 'firebase/firestore';
import { generateDataset, renderReceiptToDataUrl } from './utils/receiptGenerator';
import { generateCertificatePDF } from './utils/pdfGenerator';
import { generateCertificateHTML } from './utils/htmlGenerator';
import { GeneratedInvoiceData, TypingDetail, TestSession, TrainingMode } from './types';
import InvoiceViewer from './components/InvoiceViewer';
import StatsPanel from './components/StatsPanel';
import HistoryLogs from './components/HistoryLogs';
import LoginScreen from './components/LoginScreen';
import { 
  Zap, Keyboard, ShieldAlert, CheckCircle2, ChevronRight, ChevronLeft,
  RotateCcw, LogIn, LogOut, HelpCircle, Trophy, BarChart2, Check, X, Bookmark,
  Clock, Database, Upload, Play, Trash2, Plus, FileImage, Edit, Award, Download, Users
} from 'lucide-react';

const TEST_SIZE = 20;

export default function App() {
  // Authentication & System states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Local Offline User States
  const [currentOfflineUser, setCurrentOfflineUser] = useState<any>(() => {
    try {
      const savedUser = localStorage.getItem('trainer_logged_in_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [localUsers, setLocalUsers] = useState<any[]>(() => {
    try {
      const savedUsers = localStorage.getItem('trainer_sandbox_users');
      if (savedUsers) {
        return JSON.parse(savedUsers);
      }
    } catch {}
    // Initial standard trainer users seed
    return [
      { username: 'admin', passwordText: 'admin', role: 'admin', createdAt: '2026-05-22' },
      { username: 'guest', passwordText: 'guest', role: 'trainee', createdAt: '2026-05-22' }
    ];
  });

  const [newTraineeUsername, setNewTraineeUsername] = useState<string>('');
  const [newTraineePassword, setNewTraineePassword] = useState<string>('');
  const [userCreationError, setUserCreationError] = useState<string | null>(null);
  const [userCreationSuccess, setUserCreationSuccess] = useState<string | null>(null);

  // States for bulk operator creation
  const [operatorInputMode, setOperatorInputMode] = useState<'single' | 'bulk'>('single');
  const [bulkInputText, setBulkInputText] = useState<string>('');
  const [bulkDefaultPass, setBulkDefaultPass] = useState<string>('trainee123');

  // Track trainee user account slated for deletion confirmation
  const [userPendingDelete, setUserPendingDelete] = useState<string | null>(null);

  // Persist local operators directory
  useEffect(() => {
    localStorage.setItem('trainer_sandbox_users', JSON.stringify(localUsers));
  }, [localUsers]);

  const recordLoginHistory = async (username: string, role: string, success: boolean) => {
    const now = new Date();
    const logId = `login_${now.getTime()}_${Math.random().toString(36).slice(2, 6)}`;
    const logEntry = {
      id: logId,
      username,
      role,
      success,
      timestamp: now.toISOString(),
      userAgent: navigator.userAgent || 'unknown_agent'
    };

    // 1. Local Storage
    try {
      const localHistoryData = localStorage.getItem('local_login_history');
      const list = localHistoryData ? JSON.parse(localHistoryData) : [];
      localStorage.setItem('local_login_history', JSON.stringify([logEntry, ...list]));
    } catch (err) {
      console.error('Failed writing login log to local storage:', err);
    }

    // 2. Firestore cloud storage
    if (isFirebaseActive && db) {
      const pathCol = 'login_history';
      try {
        await setDoc(doc(db, pathCol, logId), {
          ...logEntry,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, `${pathCol}/${logId}`);
        } catch (wrappedErr: any) {
          console.error('Failed writing login log to Firestore:', wrappedErr.message);
        }
      }
    }
  };

  const handleOfflineLogin = (uname: string, pword: string) => {
    const trimmed = uname.trim().toLowerCase();
    const match = localUsers.find(
      u => u.username.toLowerCase() === trimmed && u.passwordText === pword
    );
    if (match) {
      setCurrentOfflineUser(match);
      localStorage.setItem('trainer_logged_in_user', JSON.stringify(match));
      setRefreshTrigger(prev => prev + 1);
      recordLoginHistory(match.username, match.role, true);
      return { success: true };
    }
    recordLoginHistory(uname, 'unknown', false);
    return { success: false, error: 'Incorrect Username or Password. Please input valid operator details.' };
  };

  const handleOfflineLogout = () => {
    setCurrentOfflineUser(null);
    localStorage.removeItem('trainer_logged_in_user');
    setIsTestActive(false);
    setTestComplete(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCreateTraineeUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserCreationError(null);
    setUserCreationSuccess(null);
    
    const uname = newTraineeUsername.trim();
    const unameLower = uname.toLowerCase();
    const pword = newTraineePassword.trim();

    if (!uname || !pword) {
      setUserCreationError('Operator Username and Password details cannot be empty.');
      return;
    }
    if (uname.length < 3) {
      setUserCreationError('Username identification must be at least 3 characters long.');
      return;
    }
    if (localUsers.some(u => u.username.toLowerCase() === unameLower)) {
      setUserCreationError('Operator identifier matches an existing account in training database.');
      return;
    }

    const newUser = {
      username: uname,
      passwordText: pword,
      role: 'trainee',
      createdAt: new Date().toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    };

    setLocalUsers(prev => [...prev, newUser]);

    if (isFirebaseActive && db) {
      try {
        await setDoc(doc(db, 'sandbox_users', unameLower), newUser);
      } catch (err) {
        console.error('Failed to sync profile to cloud database:', err);
      }
    }

    setNewTraineeUsername('');
    setNewTraineePassword('');
    setUserCreationSuccess(`Successfully created trainee operator account: "${uname}".`);
  };

  const handleBulkCreateTraineeUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserCreationError(null);
    setUserCreationSuccess(null);

    const lines = bulkInputText.split('\n');
    const createdUsers: any[] = [];
    const skippedUsers: string[] = [];
    const invalidFormatUsers: string[] = [];

    const existingUsernamesLower = new Set(localUsers.map(u => u.username.toLowerCase()));
    
    const today = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    for (let line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      let rawUname = '';
      let rawPword = '';

      // Support comma (,), colon (:), or tab separators
      let separator = '';
      if (trimmedLine.includes(',')) {
        separator = ',';
      } else if (trimmedLine.includes(':')) {
        separator = ':';
      } else if (trimmedLine.includes('\t')) {
        separator = '\t';
      }

      if (separator) {
        const parts = trimmedLine.split(separator);
        rawUname = parts[0].trim();
        rawPword = parts.slice(1).join(separator).trim();
      } else {
        // Just a username, use default password
        rawUname = trimmedLine;
        rawPword = bulkDefaultPass.trim();
      }

      const unameLower = rawUname.toLowerCase();

      if (!rawUname || !rawPword || rawUname.length < 3) {
        invalidFormatUsers.push(trimmedLine);
        continue;
      }

      if (existingUsernamesLower.has(unameLower)) {
        skippedUsers.push(rawUname);
        continue;
      }

      const newUser = {
        username: rawUname,
        passwordText: rawPword,
        role: 'trainee',
        createdAt: today
      };

      createdUsers.push(newUser);
      existingUsernamesLower.add(unameLower);
    }

    if (createdUsers.length === 0) {
      let errText = 'No new valid operator profiles were identified.';
      if (skippedUsers.length > 0) {
        errText += ` Skipped duplicates: ${skippedUsers.join(', ')}.`;
      }
      if (invalidFormatUsers.length > 0) {
        errText += ` Invalid format or too short (<3 chars): ${invalidFormatUsers.join(', ')}.`;
      }
      setUserCreationError(errText);
      return;
    }

    // 1. Sync to memory & Local Storage
    setLocalUsers(prev => [...prev, ...createdUsers]);

    // 2. Sync to Firestore in parallel using Promise.all
    if (isFirebaseActive && db) {
      try {
        const promises = createdUsers.map(async (user) => {
          const uLower = user.username.toLowerCase();
          return setDoc(doc(db, 'sandbox_users', uLower), user);
        });
        await Promise.all(promises);
      } catch (err) {
        console.error('Failed to batch sync profiles to cloud database:', err);
        setUserCreationError('Profiles written locally, but some failed cloud database synchronization.');
      }
    }

    // Done!
    setBulkInputText('');
    
    let successMsg = `Successfully batch-provisioned ${createdUsers.length} trainee operator accounts.`;
    if (skippedUsers.length > 0) {
      successMsg += ` Skipped ${skippedUsers.length} duplicates.`;
    }
    if (invalidFormatUsers.length > 0) {
      successMsg += ` (Failed to import ${invalidFormatUsers.length} rows due to invalid formats).`;
    }
    setUserCreationSuccess(successMsg);
  };

  const handleDeleteTraineeUser = async (uname: string, force?: boolean) => {
    if (uname.toLowerCase() === 'admin') {
      setUserCreationError('The root system admin account is permanent.');
      return;
    }
    
    if (force || userPendingDelete === uname) {
      const unameLower = uname.toLowerCase();
      setLocalUsers(prev => prev.filter(u => u.username.toLowerCase() !== unameLower));
      
      if (isFirebaseActive && db) {
        try {
          await deleteDoc(doc(db, 'sandbox_users', unameLower));
        } catch (err) {
          console.error('Failed to delete profile from cloud database:', err);
        }
      }

      setUserCreationSuccess(`Removed trainee operator: "${uname}".`);
      setUserPendingDelete(null);
    } else {
      setUserPendingDelete(uname);
      // Auto-reset delete assurance check after 5 seconds to prevent stale states
      setTimeout(() => {
        setUserPendingDelete(current => current === uname ? null : current);
      }, 5000);
    }
  };

  // Setup tabs selection
  const [activeSetupTab, setActiveSetupTab] = useState<'standard' | 'custom' | 'users'>('standard');
  
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
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('easy_20');
  const [isConfirmingCancel, setIsConfirmingCancel] = useState<boolean>(false);
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
  const [latestSessionByMe, setLatestSessionByMe] = useState<any>(null);

  useEffect(() => {
    if (!currentOfflineUser) {
      setLatestSessionByMe(null);
      return;
    }
    const loadLatestSession = async () => {
      const activeUserId = currentOfflineUser.username;
      
      // Try local fallback first
      let localLatest: any = null;
      try {
        const localData = localStorage.getItem('local_test_sessions');
        if (localData) {
          const sList = JSON.parse(localData);
          const filtered = sList.filter((s: any) => s.userId === activeUserId);
          if (filtered.length > 0) {
            localLatest = filtered[0];
          }
        }
      } catch (err) {
        console.error('Error loading latest local session:', err);
      }
      
      if (isFirebaseActive && db && activeUserId !== 'sandbox_guest_uid') {
        try {
          const path = 'test_sessions';
          const queryRef = query(
            collection(db, path),
            where('userId', '==', activeUserId),
            orderBy('timestamp', 'desc'),
            limit(1)
          );
          const snapshot = await getDocs(queryRef);
          if (!snapshot.empty) {
            const firstDoc = snapshot.docs[0].data();
            let timestampDate: Date;
            if (firstDoc.timestamp && typeof firstDoc.timestamp.toDate === 'function') {
              timestampDate = firstDoc.timestamp.toDate();
            } else if (firstDoc.timestamp) {
              timestampDate = new Date(firstDoc.timestamp);
            } else {
              timestampDate = new Date();
            }
            // Classify speed level
            const avgSec = firstDoc.averageTimeMs / 1000;
            let computedLvl = 'D';
            if (avgSec <= 3.0) computedLvl = 'A';
            else if (avgSec <= 4.0) computedLvl = 'B';
            else if (avgSec <= 5.0) computedLvl = 'C';

            setLatestSessionByMe({
              ...firstDoc,
              id: snapshot.docs[0].id,
              timestamp: timestampDate,
              level: computedLvl
            });
            return;
          }
        } catch (err) {
          console.error('Failed reading latest session from Firestore:', err);
        }
      }
      
      if (localLatest) {
        const avgSec = localLatest.averageTimeMs / 1500; // default standard adjustment
        const evaluatedAvgSec = localLatest.averageTimeMs / 1000;
        let computedLvl = 'D';
        if (evaluatedAvgSec <= 3.0) computedLvl = 'A';
        else if (evaluatedAvgSec <= 4.0) computedLvl = 'B';
        else if (evaluatedAvgSec <= 5.0) computedLvl = 'C';

        setLatestSessionByMe({
          ...localLatest,
          timestamp: new Date(localLatest.timestamp),
          level: computedLvl
        });
      } else {
        setLatestSessionByMe(null);
      }
    };
    
    loadLatestSession();
  }, [currentOfflineUser, refreshTrigger]);

  const fetchSandboxUsers = async () => {
    if (isFirebaseActive && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'sandbox_users'));
        const users: any[] = [];
        querySnapshot.forEach((doc) => {
          users.push(doc.data());
        });
        
        if (users.length > 0) {
          setLocalUsers(users);
        } else {
          // If no users in Firestore, seed standard admin and guest accounts!
          const defaultUsers = [
            { username: 'admin', passwordText: 'admin', role: 'admin', createdAt: '2026-05-22' },
            { username: 'guest', passwordText: 'guest', role: 'trainee', createdAt: '2026-05-22' }
          ];
          for (const u of defaultUsers) {
            await setDoc(doc(db, 'sandbox_users', u.username), u);
          }
          setLocalUsers(defaultUsers);
        }
      } catch (err) {
        console.error('Failed to load sandbox users from Firestore:', err);
      }
    }
  };

  const fetchCustomInvoices = async () => {
    if (isFirebaseActive && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'custom_invoices'));
        const invoices: any[] = [];
        querySnapshot.forEach((doc) => {
          invoices.push(doc.data());
        });
        if (invoices.length > 0) {
          setCustomInvoices(invoices);
        }
      } catch (err) {
        console.error('Failed to load custom invoices from Firestore:', err);
      }
    }
  };

  // Listen to Firebase Authenticated user states
  useEffect(() => {
    if (isFirebaseActive && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          setCurrentUser(null);
          setAuthLoading(false);
          fetchSandboxUsers();
          fetchCustomInvoices();
        } else {
          setCurrentUser(user);
          setAuthLoading(false);
          fetchSandboxUsers();
          fetchCustomInvoices();
        }
      });
      return unsubscribe;
    } else {
      setAuthLoading(false);
    }
  }, [refreshTrigger]);

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
   * Initializes the benchmark image dataset (20 for easy or custom count) and pre-renders images into Data URLs
   * so that switching images has absolutely zero visual download/loading delay.
   */
  const startTestingSession = (mode: TrainingMode = 'normal_90') => {
    setTrainingMode(mode);
    setCheatTriggerMsg(null);
    setSaveError(null);
    const count = mode === 'hard_180' ? 180 : mode === 'normal_90' ? 90 : TEST_SIZE;
    const freshDataset = generateDataset(count);
    
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
    setIsConfirmingCancel(false);
    setIsTestActive(true);
    
    // Silently preload image tag 1 in background
    if (freshDataset.length > 1) {
      const preloadImg = new Image();
      preloadImg.src = urls[freshDataset[1].id];
    }
  };

  /**
   * Initializes a custom speed testing session using the uploaded invoices library.
   * If fewer than the target count (180, 90, or 20) custom images are uploaded,
   * automatically duplicates and shuffles existing custom images with unique runtime queue indices to form a seamless queue.
   */
  const startCustomTestingSession = (mode: TrainingMode = 'normal_90') => {
    if (customInvoices.length === 0) return;
    setTrainingMode(mode);
    setCheatTriggerMsg(null);
    setSaveError(null);

    const targetCount = mode === 'hard_180' ? 180 : mode === 'easy_20' ? 20 : 90;
    
    let queue: (GeneratedInvoiceData & { customImageUrl: string })[] = [];
    
    if (customInvoices.length >= targetCount) {
      const shuffled = [...customInvoices].sort(() => Math.random() - 0.5);
      queue = shuffled.slice(0, targetCount);
    } else {
      let counter = 0;
      while (queue.length < targetCount) {
        const round = [...customInvoices].sort(() => Math.random() - 0.5);
        for (const item of round) {
          if (queue.length >= targetCount) break;
          counter++;
          queue.push({
            ...item,
            id: `${item.id}_q${counter}_${Math.random().toString(36).substring(2, 6)}`
          });
        }
      }
    }

    // Set custom invoices queue as the active dataset
    setExpectedDataset(queue);
    
    // Map of urls is base64s themselves
    const urls: Record<string, string> = {};
    queue.forEach(item => {
      urls[item.id] = item.customImageUrl || '';
    });
    setImageUrls(urls);
    
    setSessionResults([]);
    setCorrectCount(0);
    setAverageTimeMs(0);
    setCurrentIndex(0);
    setTypedValue('');
    setTestComplete(false);
    setIsConfirmingCancel(false);
    setIsTestActive(true);

    if (queue.length > 1) {
      const preloadImg = new Image();
      preloadImg.src = urls[queue[1].id];
    }
  };

  /**
   * Emergency abort to cancel the active testing session and return to dashboard.
   */
  const handleCancelTestingSession = () => {
    setIsTestActive(false);
    setTestComplete(false);
    setCurrentIndex(0);
    setTypedValue('');
    setSessionResults([]);
    setCorrectCount(0);
    setAverageTimeMs(0);
    setIsConfirmingCancel(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
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
    }

    if (isFirebaseActive && db) {
      try {
        for (const item of newItems) {
          await setDoc(doc(db, 'custom_invoices', item.id), item);
        }
      } catch (err) {
        console.error('Failed to sync uploaded invoices to Firestore database:', err);
      }
    }

    // Reset inputs
    setCustomExpectedCode('');
    setCustomCompanyName('');
  };

  /**
   * Generates a realistic invoice canvas in-memory to let users test custom mode immediately
   */
  const handleAddSampleToCustomList = async () => {
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

    if (isFirebaseActive && db) {
      try {
        await setDoc(doc(db, 'custom_invoices', newCustom.id), newCustom);
      } catch (err) {
        console.error('Failed to sync sample invoice to Firestore database:', err);
      }
    }
  };

  /**
   * Removes an invoice from the custom sandbox list
   */
  const handleDeleteCustomInvoice = async (id: string) => {
    const updated = customInvoices.filter(item => item.id !== id);
    setCustomInvoices(updated);
    localStorage.setItem('custom_uploaded_invoices', JSON.stringify(updated));

    if (isFirebaseActive && db) {
      try {
        await deleteDoc(doc(db, 'custom_invoices', id));
      } catch (err) {
        console.error('Failed to delete custom invoice from cloud Firestore:', err);
      }
    }
  };

  /**
   * Updates expected tax code for a specific custom invoice in real-time
   */
  const updateCustomInvoiceCode = async (id: string, newCode: string) => {
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

    const matched = updated.find(inv => inv.id === id);
    if (isFirebaseActive && db && matched) {
      try {
        await setDoc(doc(db, 'custom_invoices', id), matched);
      } catch (err) {
        console.error('Failed to update expected number in Firestore container:', err);
      }
    }
  };

  /**
   * Updates company name for a specific custom invoice in real-time
   */
  const updateCustomInvoiceCompany = async (id: string, newCompany: string) => {
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

    const matched = updated.find(inv => inv.id === id);
    if (isFirebaseActive && db && matched) {
      try {
        await setDoc(doc(db, 'custom_invoices', id), matched);
      } catch (err) {
        console.error('Failed to update company name details in Firestore tracker:', err);
      }
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

    const getLevelBySpeed = (timeMs: number) => {
      const avgSec = timeMs / 1000;
      if (avgSec <= 3.0) return 'A';
      if (avgSec <= 4.0) return 'B';
      if (avgSec <= 5.0) return 'C';
      return 'D';
    };
    const calculatedLevel = getLevelBySpeed(avgMs);

    setIsSaving(true);
    setSaveError(null);

    const activeUserId = currentOfflineUser ? currentOfflineUser.username : 'guest';
    const accuracyPercent = completedResults.length > 0 ? Math.round((finalCorrect / completedResults.length) * 100) : 100;
    const avgSpeedSec = +(avgMs / 1000).toFixed(2);

    // Construct exactly conformant payload
    const rawPayload = {
      userId: activeUserId,
      operatorId: activeUserId,
      totalImagesAttempted: completedResults.length,
      correctEntries: finalCorrect,
      averageTimeMs: avgMs,
      averageSpeed: avgSpeedSec,
      accuracy: accuracyPercent,
      level: calculatedLevel,
      trainingMode: trainingMode,
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

    // 2. Safely upload to Firestore if Connected & Authenticated in Sandbox
    if (isFirebaseActive && db && currentOfflineUser && activeUserId !== 'sandbox_guest_uid') {
      const pathCollection = 'test_sessions';
      const newSessionDocId = `session_${now.getTime()}`;

      try {
        const cloudPayload = {
          ...rawPayload,
          trainingMode: trainingMode,
          operatorId: activeUserId,
          averageSpeed: avgSpeedSec,
          accuracy: accuracyPercent,
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
    const avgSec = averageTimeMs / 1000;
    if (avgSec <= 3.0) {
      return { name: 'Level A (Elite Expert: 2.5s ~ 3.0s)', color: 'text-emerald-600 bg-emerald-50/80 border-emerald-200 font-extrabold shadow-sm' };
    }
    if (avgSec <= 4.0) {
      return { name: 'Level B (Proficient Specialist: 3.1s ~ 4.0s)', color: 'text-indigo-650 bg-indigo-50/80 border-indigo-200 font-bold' };
    }
    if (avgSec <= 5.0) {
      return { name: 'Level C (Qualified Operator: 4.1s ~ 5.0s)', color: 'text-amber-650 bg-amber-50/80 border-amber-200 font-bold' };
    }
    return { name: 'Level D (Needs Practice: > 5.0s)', color: 'text-rose-600 bg-rose-50/80 border-rose-250 font-bold' };
  };

  const handleDownloadPDF = () => {
    const avgSec = averageTimeMs / 1000;
    let levelCode = 'D';
    if (avgSec <= 3.0) levelCode = 'A';
    else if (avgSec <= 4.0) levelCode = 'B';
    else if (avgSec <= 5.0) levelCode = 'C';

    const testSessionPayload: TestSession = {
      userId: currentOfflineUser ? currentOfflineUser.username : 'guest',
      operatorId: currentOfflineUser ? currentOfflineUser.username : 'guest',
      timestamp: new Date(),
      totalImagesAttempted: expectedDataset.length,
      correctEntries: correctCount,
      averageTimeMs: averageTimeMs,
      averageSpeed: +(averageTimeMs / 1000).toFixed(2),
      accuracy: expectedDataset.length > 0 ? Math.round((correctCount / expectedDataset.length) * 100) : 100,
      level: levelCode,
      trainingMode: trainingMode,
      details: sessionResults
    };

    generateCertificatePDF(testSessionPayload, levelCode, currentRank.name);
  };

  const handleDownloadHTML = () => {
    const avgSec = averageTimeMs / 1000;
    let levelCode = 'D';
    if (avgSec <= 3.0) levelCode = 'A';
    else if (avgSec <= 4.0) levelCode = 'B';
    else if (avgSec <= 5.0) levelCode = 'C';

    const testSessionPayload: TestSession = {
      userId: currentOfflineUser ? currentOfflineUser.username : 'guest',
      operatorId: currentOfflineUser ? currentOfflineUser.username : 'guest',
      timestamp: new Date(),
      totalImagesAttempted: expectedDataset.length,
      correctEntries: correctCount,
      averageTimeMs: averageTimeMs,
      averageSpeed: +(averageTimeMs / 1000).toFixed(2),
      accuracy: expectedDataset.length > 0 ? Math.round((correctCount / expectedDataset.length) * 100) : 100,
      level: levelCode,
      trainingMode: trainingMode,
      details: sessionResults
    };

    generateCertificateHTML(testSessionPayload, levelCode, currentRank.name);
  };

  const currentRank = evaluateRank();

  if (!currentOfflineUser) {
    return (
      <LoginScreen 
        onLogin={handleOfflineLogin}
        localUsers={localUsers}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800 font-sans" id="speedtest-root">
      {/* 1. Global Navigation Bar */}
      <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-6 border-b border-slate-800 sticky top-0 z-30 shrink-0 select-none">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-500 w-8 h-8 rounded flex items-center justify-center font-bold text-sm text-white shadow-lg">DT</div>
          <h1 className="text-xs sm:text-sm font-semibold tracking-wide uppercase">
            Data Entry Speed Assessment <span className="text-slate-400 font-normal ml-2 hidden md:inline">// JP-QIN-13 Workstation</span>
          </h1>
        </div>
        
        {/* Auth status & Connection indicator */}
        <div className="flex items-center gap-6 text-xs" id="authentication-widget">
          {/* Status Label */}
          <div className="flex flex-col items-end leading-none">
            <span className="text-slate-400 uppercase tracking-tighter text-[9px] font-bold">Operator Profile</span>
            <span className="font-bold text-indigo-400 mt-1 flex items-center gap-1.5">
              {currentOfflineUser.username} 
              <span className="text-[8px] font-mono bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded uppercase border border-indigo-500/30">
                {currentOfflineUser.role}
              </span>
            </span>
          </div>

          <div className="w-px h-8 bg-slate-700 hidden sm:block"></div>

          <div className="hidden sm:flex flex-col items-end leading-none">
            <span className="text-slate-400 uppercase tracking-tighter text-[9px] font-bold">System Status</span>
            <span className="font-medium mt-1 flex items-center gap-1 text-emerald-450 text-emerald-400 font-mono">
              ● Online.Secure
            </span>
          </div>

          <div className="w-px h-8 bg-slate-700"></div>

          <button
            onClick={handleOfflineLogout}
            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-550 hover:bg-rose-500 text-white transition text-[11px] font-bold uppercase cursor-pointer shadow-sm flex items-center gap-1"
            title="Log Out Workstation"
            id="logout-button"
          >
            <LogOut className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Logout</span>
          </button>
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
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 font-sans mb-4" role="tablist" aria-label="Workstation setup modes">
                  <button
                    onClick={() => { setActiveSetupTab('standard'); setUploadProgressError(null); }}
                    role="tab"
                    aria-selected={activeSetupTab === 'standard'}
                    aria-label="Standard Assessment"
                    className={`pb-3 px-1 sm:px-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition flex items-center gap-2 shrink-0 ${
                      activeSetupTab === 'standard'
                        ? 'border-indigo-600 text-indigo-600 font-extrabold'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>📋 Standard Assessment</span>
                  </button>
                  <button
                    onClick={() => { setActiveSetupTab('custom'); setUploadProgressError(null); }}
                    role="tab"
                    aria-selected={activeSetupTab === 'custom'}
                    aria-label="Custom Sandbox"
                    className={`pb-3 px-1 sm:px-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition flex items-center gap-2 shrink-0 ${
                      activeSetupTab === 'custom'
                        ? 'border-indigo-600 text-indigo-600 font-extrabold'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>📤 Custom Sandbox</span>
                  </button>
                  {currentOfflineUser?.role === 'admin' && (
                    <button
                      onClick={() => { setActiveSetupTab('users'); setUploadProgressError(null); }}
                      role="tab"
                      aria-selected={activeSetupTab === 'users'}
                      aria-label="Trainee User Accounts"
                      className={`pb-3 px-1 sm:px-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition flex items-center gap-1.5 shrink-0 ${
                        activeSetupTab === 'users'
                          ? 'border-indigo-600 text-indigo-600 font-extrabold'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>👥 Trainee User Accounts</span>
                      <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase">Admin</span>
                    </button>
                  )}
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

                    {/* Unified Interactive Mode Selector Grid (Standard) */}
                    <div className="mt-8 border-t border-slate-150 pt-6">
                      <div className="flex items-center justify-between mb-3.5">
                        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                          <Zap className="w-3.5 h-3.5 text-indigo-600" /> Assessment SLA Launchpad:
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium font-sans">
                          Select evaluation tier to start live benchmark
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="standard-mode-launch-grid">
                        {/* Card 1 (Hard 180): Extreme Endurance */}
                        <div className="bg-slate-50/90 hover:bg-slate-50 border border-purple-200 hover:border-purple-300 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:shadow-purple-500/5 group relative">
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-purple-100 text-purple-700 border border-purple-200">
                                Master Tier SLA
                              </span>
                              <span className="text-[11px] font-mono font-extrabold text-purple-600">180 Invoices</span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                              <Zap className="w-4 h-4 text-purple-600 fill-purple-600 shrink-0" />
                              <span>⚡ Extreme Endurance (180 Invoices)</span>
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed font-sans">
                              Standard System Pool (180 Simulated Thermal &amp; Distorted Invoices)
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-purple-100/80">
                            <button
                              onClick={() => startTestingSession('hard_180')}
                              className="w-full py-2.5 px-3 bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white font-bold rounded-xl transition flex items-center justify-center space-x-1.5 shadow-sm hover:shadow-purple-500/20 text-xs uppercase tracking-wider cursor-pointer font-sans"
                              id="btn-launch-hard-180"
                              aria-label="Launch 180-Invoice Test"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                              <span>Launch 180-Invoice Test</span>
                              <ChevronRight className="w-3.5 h-3.5 text-white ml-0.5" />
                            </button>
                          </div>
                        </div>

                        {/* Card 2 (Normal 90) [Featured / Highlighted]: Official Assessment */}
                        <div className="bg-gradient-to-b from-blue-50/70 via-white to-blue-50/40 border-2 border-blue-500/60 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-blue-500/10 group relative ring-4 ring-blue-500/10">
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm">
                            ★ Standard Qualification
                          </div>
                          <div className="space-y-2.5 mt-1">
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-blue-100 text-blue-700 border border-blue-200">
                                ★ Official SLA Standard
                              </span>
                              <span className="text-[11px] font-mono font-extrabold text-blue-600">90 Invoices</span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                              <Trophy className="w-4 h-4 text-blue-600 fill-blue-600 shrink-0" />
                              <span>★ Official Assessment (90 Invoices)</span>
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed font-sans">
                              Standard System Pool (90 Simulated Invoices)
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-blue-100">
                            <button
                              onClick={() => startTestingSession('normal_90')}
                              className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl transition flex items-center justify-center space-x-1.5 shadow-sm hover:shadow-blue-500/20 text-xs uppercase tracking-wider cursor-pointer font-sans"
                              id="btn-launch-normal-90"
                              aria-label="Launch 90-Invoice Assessment"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                              <span>Launch 90-Invoice Assessment</span>
                              <ChevronRight className="w-3.5 h-3.5 text-white ml-0.5" />
                            </button>
                          </div>
                        </div>

                        {/* Card 3 (Easy 20): Practice Benchmark */}
                        <div className="bg-slate-50/90 hover:bg-slate-50 border border-emerald-200 hover:border-emerald-300 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:shadow-emerald-500/5 group relative">
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                                Warm-up Drill
                              </span>
                              <span className="text-[11px] font-mono font-extrabold text-emerald-600">20 Invoices</span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                              <Play className="w-4 h-4 text-emerald-600 fill-emerald-600 shrink-0" />
                              <span>🎯 Practice Benchmark (20 Invoices)</span>
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed font-sans">
                              Standard System Pool (20 Invoices Quick Benchmark)
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-emerald-100/80">
                            <button
                              onClick={() => startTestingSession('easy_20')}
                              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center space-x-1.5 shadow-sm hover:shadow-emerald-500/20 text-xs uppercase tracking-wider cursor-pointer font-sans"
                              id="btn-launch-easy-20"
                              aria-label="Launch 20-Invoice Benchmark"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                              <span>Launch 20-Invoice Benchmark</span>
                              <ChevronRight className="w-3.5 h-3.5 text-white ml-0.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : activeSetupTab === 'custom' ? (
                  <>
                    <div className="space-y-1 block">
                      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        Custom Document Sandbox
                      </h2>
                      <p className="text-slate-500 text-xs">
                        Upload raw image files of real customer bills or sample invoices with tax registration numbers to practice and run assessments on custom files.
                      </p>
                    </div>

                    {/* Form block */}
                    {currentOfflineUser.role === 'trainee' ? (
                      <div className="bg-gradient-to-tr from-indigo-50/70 to-slate-50 p-5 rounded-2xl border border-indigo-100 flex items-start gap-4 shadow-sm animate-fade-in" id="trainee-prepared-notice">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center shrink-0 text-indigo-600 shadow-inner">
                          <CheckCircle2 className="w-5 h-5 text-indigo-600 animate-none" />
                        </div>
                        <div className="space-y-1 flex-1">
                          <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                            📚 Practice Queue Prepared
                          </h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Your classroom/system administrator has preconfigured specific high-fidelity Japanese Invoice sets for assessment. Type the correct registration codes for each catalog page below. Timing split speed logs will update your operator dashboard stats permanently.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-4 shadow-inner" id="admin-inputs-portal">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-1">
                          Step 1: Input Document Attributes:
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                              className="w-full p-2 bg-white border border-slate-205 text-xs text-slate-805 font-mono rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
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
                              className="w-full p-2 bg-white border border-slate-205 text-xs text-slate-805 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                            />
                          </div>
                        </div>

                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mt-2">
                          Step 2: Upload Document Image Multi-Selection:
                        </span>

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
                            <Upload className="w-5 h-5 text-indigo-600 animate-pulse" />
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
                          <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded px-2.5 py-1.5 mt-2 font-medium font-sans">
                            {uploadProgressError}
                          </div>
                        )}
                      </div>
                    )}

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
                              onClick={async () => {
                                if (confirm('Are you sure you want to completely clear the custom uploaded invoices pool?')) {
                                  setCustomInvoices([]);
                                  localStorage.removeItem('custom_uploaded_invoices');
                                  if (isFirebaseActive && db) {
                                    try {
                                      const snap = await getDocs(collection(db, 'custom_invoices'));
                                      for (const docSnap of snap.docs) {
                                        await deleteDoc(doc(db, 'custom_invoices', docSnap.id));
                                      }
                                    } catch (err) {
                                      console.error('Failed to clear custom invoices from Firestore:', err);
                                    }
                                  }
                                }
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
                                  aria-label={`Open labeling assistant for invoice ${inv.companyName || inv.id}`}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer transition"
                                  title="Open Labeling Assistant"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCustomInvoice(inv.id)}
                                  aria-label={`Remove invoice ${inv.companyName || inv.id} from queue`}
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

                    {/* Unified Interactive Mode Selector Grid (Custom) */}
                    <div className="mt-6 border-t border-slate-150 pt-5 space-y-4">
                      {customInvoices.length === 0 ? (
                        <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-xl flex items-center gap-2.5 text-amber-800 text-xs font-medium font-sans">
                          <span className="text-base shrink-0">⚠️</span>
                          <span>
                            Please upload at least 1 invoice image or click <strong className="text-indigo-700 underline cursor-pointer hover:text-indigo-900" onClick={handleAddSampleToCustomList}>&quot;Populate Sample Image&quot;</strong> to enable Custom assessments.
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                            <Zap className="w-3.5 h-3.5 text-indigo-600" /> Custom Sandbox Assessment Launchpad:
                          </span>
                          <span className="text-[10px] text-indigo-650 font-bold font-sans">
                            {customInvoices.length} active image{customInvoices.length !== 1 ? 's' : ''} in sandbox catalog
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="custom-mode-launch-grid">
                        {/* Card 1 (Hard 180): Extreme Endurance */}
                        <div className={`border rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 group relative ${
                          customInvoices.length > 0
                            ? 'bg-slate-50/90 hover:bg-slate-50 border-purple-200 hover:border-purple-300 hover:shadow-md hover:shadow-purple-500/5'
                            : 'bg-slate-50/40 border-slate-200 opacity-75'
                        }`}>
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border ${
                                customInvoices.length > 0 ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-400 border-slate-200'
                              }`}>
                                Master Tier SLA
                              </span>
                              <span className="text-[11px] font-mono font-extrabold text-purple-600">180 Invoices</span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                              <Zap className={`w-4 h-4 shrink-0 ${customInvoices.length > 0 ? 'text-purple-600 fill-purple-600' : 'text-slate-400'}`} />
                              <span>⚡ Extreme Endurance (180 Invoices)</span>
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed font-sans">
                              Custom Sandbox Pool (Smart 180-Loop Queue from {customInvoices.length} Loaded Images)
                            </p>
                            {customInvoices.length > 0 && (
                              <div className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 font-medium inline-flex items-center gap-1">
                                <span>♻️ Smart Pool Auto-Shuffling Active (Seamless 180 Queue)</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-4 pt-3 border-t border-purple-100/80">
                            <button
                              onClick={() => startCustomTestingSession('hard_180')}
                              disabled={customInvoices.length === 0}
                              className={`w-full py-2.5 px-3 font-bold rounded-xl transition flex items-center justify-center space-x-1.5 text-xs uppercase tracking-wider font-sans ${
                                customInvoices.length > 0
                                  ? 'bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white cursor-pointer shadow-sm hover:shadow-purple-500/20'
                                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200 opacity-70 shadow-none'
                              }`}
                              id="btn-custom-launch-hard-180"
                              aria-label="Launch 180-Invoice Test"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>Launch 180-Invoice Test</span>
                            </button>
                          </div>
                        </div>

                        {/* Card 2 (Normal 90) [Featured / Highlighted]: Official Assessment */}
                        <div className={`border-2 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 group relative ${
                          customInvoices.length > 0
                            ? 'bg-gradient-to-b from-blue-50/70 via-white to-blue-50/40 border-blue-500/60 ring-4 ring-blue-500/10 shadow-sm hover:shadow-lg hover:shadow-blue-500/10'
                            : 'bg-slate-50/40 border-slate-200 opacity-75 ring-0'
                        }`}>
                          {customInvoices.length > 0 && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm">
                              ★ Standard Qualification
                            </div>
                          )}
                          <div className="space-y-2.5 mt-1">
                            <div className="flex items-center justify-between">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border ${
                                customInvoices.length > 0 ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-400 border-slate-200'
                              }`}>
                                ★ Official SLA Standard
                              </span>
                              <span className="text-[11px] font-mono font-extrabold text-blue-600">90 Invoices</span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                              <Trophy className={`w-4 h-4 shrink-0 ${customInvoices.length > 0 ? 'text-blue-600 fill-blue-600' : 'text-slate-400'}`} />
                              <span>★ Official Assessment (90 Invoices)</span>
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed font-sans">
                              Custom Sandbox Pool ({customInvoices.length} Custom Uploads Queue)
                            </p>
                            {customInvoices.length > 0 && customInvoices.length < 90 && (
                              <div className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 font-medium inline-flex items-center gap-1">
                                <span>♻️ Smart Pool Auto-Shuffling Active (Seamless 90 Queue)</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-4 pt-3 border-t border-blue-100">
                            <button
                              onClick={() => startCustomTestingSession('normal_90')}
                              disabled={customInvoices.length === 0}
                              className={`w-full py-2.5 px-3 font-bold rounded-xl transition flex items-center justify-center space-x-1.5 text-xs uppercase tracking-wider font-sans ${
                                customInvoices.length > 0
                                  ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white cursor-pointer shadow-sm hover:shadow-blue-500/20'
                                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200 opacity-70 shadow-none'
                              }`}
                              id="btn-custom-launch-normal-90"
                              aria-label="Launch 90-Invoice Assessment"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Launch 90-Invoice Assessment</span>
                            </button>
                          </div>
                        </div>

                        {/* Card 3 (Easy 20): Practice Benchmark */}
                        <div className={`border rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 group relative ${
                          customInvoices.length > 0
                            ? 'bg-slate-50/90 hover:bg-slate-50 border-emerald-200 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-500/5'
                            : 'bg-slate-50/40 border-slate-200 opacity-75'
                        }`}>
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border ${
                                customInvoices.length > 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'
                              }`}>
                                Warm-up Drill
                              </span>
                              <span className="text-[11px] font-mono font-extrabold text-emerald-600">20 Invoices</span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                              <Play className={`w-4 h-4 shrink-0 ${customInvoices.length > 0 ? 'text-emerald-600 fill-emerald-600' : 'text-slate-400'}`} />
                              <span>🎯 Practice Benchmark (20 Invoices)</span>
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed font-sans">
                              Custom Sandbox Pool (20 Invoices Quick Test)
                            </p>
                            {customInvoices.length > 0 && customInvoices.length < 20 && (
                              <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-medium inline-flex items-center gap-1">
                                <span>♻️ Smart Pool Auto-Shuffling Active (Seamless 20 Queue)</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-4 pt-3 border-t border-emerald-100/80">
                            <button
                              onClick={() => startCustomTestingSession('easy_20')}
                              disabled={customInvoices.length === 0}
                              className={`w-full py-2.5 px-3 font-bold rounded-xl transition flex items-center justify-center space-x-1.5 text-xs uppercase tracking-wider font-sans ${
                                customInvoices.length > 0
                                  ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white cursor-pointer shadow-sm hover:shadow-emerald-500/20'
                                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200 opacity-70 shadow-none'
                              }`}
                              id="btn-custom-launch-easy-20"
                              aria-label="Launch 20-Invoice Benchmark"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Launch 20-Invoice Benchmark</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-6 animate-fade-in" id="admin-user-management-tab">
                      <div className="space-y-1">
                        <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                          👑 Trainee Operator Accounts Manager
                        </h2>
                        <p className="text-slate-500 text-xs">
                          Create and manage trainee profiles, distribute system access credentials, and monitor speed diagnostics.
                        </p>
                      </div>

                      {/* User Account Creation Form */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-3 gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 flex items-center gap-1.5">
                            <Plus className="w-4 h-4 text-indigo-600 font-bold" /> Provision Trainee Operator Profiles
                          </span>
                          
                          {/* Inner Tabs to toggle Single vs Bulk Operator provision */}
                          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-[10px] uppercase font-bold">
                            <button
                              onClick={() => { setOperatorInputMode('single'); setUserCreationError(null); setUserCreationSuccess(null); }}
                              className={`px-3 py-1.5 rounded-md cursor-pointer transition ${operatorInputMode === 'single' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                              Single operator
                            </button>
                            <button
                              onClick={() => { setOperatorInputMode('bulk'); setUserCreationError(null); setUserCreationSuccess(null); }}
                              className={`px-3 py-1.5 rounded-md cursor-pointer transition ${operatorInputMode === 'bulk' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                              Bulk Add Operators (Multi-User)
                            </button>
                          </div>
                        </div>

                        {operatorInputMode === 'single' ? (
                          <form onSubmit={handleCreateTraineeUser} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end animate-fade-in">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                New Operator Name
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. j_smith_99"
                                value={newTraineeUsername}
                                onChange={(e) => setNewTraineeUsername(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-200 text-xs text-slate-805 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                Secure Password
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. smithpass"
                                value={newTraineePassword}
                                onChange={(e) => setNewTraineePassword(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-200 text-xs text-slate-805 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                              />
                            </div>

                            <button
                              type="submit"
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1 w-full"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Create Operator</span>
                            </button>
                          </form>
                        ) : (
                          <form onSubmit={handleBulkCreateTraineeUsers} className="space-y-4 animate-fade-in">
                            <div className="flex flex-col sm:flex-row gap-4">
                              <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                  Operator List Input (One operator username per line)
                                </label>
                                <textarea
                                  placeholder="Type or paste operators list. Formats accepted:&#10;operator_a&#10;operator_b,password123&#10;operator_c:secret_key_4"
                                  rows={5}
                                  value={bulkInputText}
                                  onChange={(e) => setBulkInputText(e.target.value)}
                                  className="w-full p-3 bg-white border border-slate-200 text-xs font-mono text-slate-800 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 placeholder:text-slate-400"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">
                                  Tip: Paste from Excel or Notepad. If password is not provided on that line, the Default Password below is assigned auto-generated.
                                </p>
                              </div>

                              <div className="sm:w-64 space-y-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                    Default Password Fallback
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. trainee123"
                                    value={bulkDefaultPass}
                                    onChange={(e) => setBulkDefaultPass(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-slate-200 text-xs text-slate-805 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                                  />
                                </div>

                                <button
                                  type="submit"
                                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 w-full mt-4"
                                >
                                  <Plus className="w-4 h-4" />
                                  <span>Bulk Import Profiles</span>
                                </button>
                              </div>
                            </div>
                          </form>
                        )}

                        {userCreationError && (
                          <p className="text-[11px] text-rose-600 font-sans">{userCreationError}</p>
                        )}
                        {userCreationSuccess && (
                          <p className="text-[11px] text-emerald-600 font-sans">{userCreationSuccess}</p>
                        )}
                      </div>

                      {/* Active Operator Directory Index Table */}
                      <div className="space-y-3">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
                          Active Sandbox Profiles ({localUsers.length})
                        </span>

                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                          <table className="w-full text-left text-xs border-collapse font-sans">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500 font-mono text-[9px] uppercase tracking-wider border-b border-slate-200">
                                <th className="p-3">Operator Username</th>
                                <th className="p-3">Plaintext Access Key</th>
                                <th className="p-3">Assigned Role</th>
                                <th className="p-3">Created Date</th>
                                <th className="p-3 text-right">Delete profile</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {localUsers.map((user) => (
                                <tr key={user.username} className="hover:bg-slate-50/50 transition">
                                  <td className="p-3 font-bold text-slate-705">{user.username}</td>
                                  <td className="p-3 font-mono text-slate-500 font-bold">{user.passwordText}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans uppercase border ${
                                      user.role === 'admin'
                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}>
                                      {user.role}
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-400 font-mono text-[10px]">{user.createdAt || '2026-05-22'}</td>
                                  <td className="p-3 text-right">
                                    {user.role === 'admin' ? (
                                      <span className="text-[9px] text-slate-400 italic">Core Admin</span>
                                    ) : (
                                      <div className="flex justify-end gap-2 items-center">
                                        {userPendingDelete === user.username ? (
                                          <>
                                            <button
                                              onClick={() => handleDeleteTraineeUser(user.username, true)}
                                              className="text-[10px] bg-rose-600 hover:bg-rose-700 text-white font-extrabold uppercase px-2 py-1 rounded transition cursor-pointer font-sans"
                                            >
                                              Confirm Del?
                                            </button>
                                            <button
                                              onClick={() => setUserPendingDelete(null)}
                                              className="text-[10px] text-slate-400 hover:text-slate-650 font-semibold uppercase font-sans cursor-pointer"
                                            >
                                              Cancel
                                            </button>
                                          </>
                                        ) : (
                                          <button
                                            onClick={() => handleDeleteTraineeUser(user.username)}
                                            className="text-[10px] text-rose-500 hover:text-rose-700 font-bold uppercase transition cursor-pointer font-sans"
                                          >
                                            Delete
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Workplace Context parameters / Guest Fallback help */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm animate-fade-in">
              <div className="space-y-4">
                {/* 1. Trainee Last Result Card (Fulfills Request #1) */}
                <div className="border-b border-slate-150 pb-5 mb-1">
                  <div className="flex items-center space-x-2 text-indigo-650 font-bold text-xs uppercase tracking-widest">
                    <Award className="w-4 h-4 text-indigo-600" />
                    <span>Your Latest Speed Run</span>
                  </div>
                  {latestSessionByMe ? (
                    <div className="mt-3 bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-150 rounded-xl p-4 space-y-3.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                            Average Pace
                          </span>
                          <span className="block text-2xl font-bold text-slate-800 mt-1 font-mono">
                            {(latestSessionByMe.averageTimeMs / 1000).toFixed(2)}s
                          </span>
                        </div>
                        {/* Level badge */}
                        <div className="text-right">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                            Rank Level
                          </span>
                          <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-extrabold uppercase mt-1 ${
                            latestSessionByMe.level === 'A' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            latestSessionByMe.level === 'B' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                            latestSessionByMe.level === 'C' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            Level {latestSessionByMe.level || 'D'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-indigo-100 font-sans">
                        <div>
                          <span className="text-slate-400">Accuracy:</span>{' '}
                          <strong className="text-slate-700 font-mono font-bold">
                            {latestSessionByMe.totalImagesAttempted > 0 
                              ? Math.round((latestSessionByMe.correctEntries / latestSessionByMe.totalImagesAttempted) * 100) 
                              : 100}%
                          </strong>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400">Entries:</span>{' '}
                          <strong className="text-slate-700 font-mono">
                            {latestSessionByMe.correctEntries}/{latestSessionByMe.totalImagesAttempted}
                          </strong>
                        </div>
                      </div>

                      <div className="text-[9px] text-slate-400 font-mono text-center flex items-center justify-center gap-1 leading-none">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Achieved: {new Date(latestSessionByMe.timestamp).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-500 font-medium leading-normal">
                        No assessment scoring found for <strong>{currentOfflineUser.username}</strong> on this workstation yet.
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                        Execute a 20-Invoice typing list below to record your performance.
                      </p>
                    </div>
                  )}
                </div>

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
              trainingMode={trainingMode}
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
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Data Entry Port
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1 uppercase font-mono tracking-wider">
                        Target ID: {expectedDataset[currentIndex].id.toUpperCase()} Scan 
                      </p>
                    </div>
                    {!isConfirmingCancel ? (
                      <button
                        onClick={() => setIsConfirmingCancel(true)}
                        aria-label="Abort testing session"
                        className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded-lg text-xs font-bold tracking-wider uppercase cursor-pointer transition"
                        id="abort-session-btn"
                      >
                        Cancel
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Abort test?</span>
                        <button
                          onClick={handleCancelTestingSession}
                          aria-label="Confirm aborting current typing session"
                          className="px-2.5 py-1 bg-red-600 text-white hover:bg-red-700 rounded text-xs font-bold tracking-wider uppercase cursor-pointer transition shrink-0"
                          id="confirm-abort-btn"
                        >
                          Yes, Abort
                        </button>
                        <button
                          onClick={() => setIsConfirmingCancel(false)}
                          aria-label="Dismiss and continue typing session"
                          className="px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 rounded text-xs font-bold tracking-wider uppercase cursor-pointer transition shrink-0"
                          id="cancel-abort-btn"
                        >
                          No
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Visual stream progress line */}
                  <div className="-mt-2">
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-650 h-1.5 transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / expectedDataset.length) * 100}%` }}
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
              currentIndex={expectedDataset.length}
              totalCount={expectedDataset.length}
              correctCount={correctCount}
              elapsedMs={0}
              averageTimeMs={averageTimeMs}
              isTestActive={false}
              trainingMode={trainingMode}
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
                      <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
                          Assessment Finalized
                        </h2>
                        {trainingMode === 'hard_180' || expectedDataset.length > 90 ? (
                          <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-800 border border-purple-300 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                            ⚡ Hard Mode (180 Invoices)
                          </span>
                        ) : trainingMode === 'normal_90' || expectedDataset.length > 20 ? (
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            Normal Mode (90 Invoices)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                            Easy Mode (20 Invoices)
                          </span>
                        )}
                      </div>
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
                    onClick={handleDownloadPDF}
                    className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer text-sm uppercase tracking-wider shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF Result</span>
                  </button>
                  <button
                    onClick={handleDownloadHTML}
                    className="px-5 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer text-sm uppercase tracking-wider shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download HTML Result</span>
                  </button>
                  <button
                    onClick={() => startTestingSession(trainingMode)}
                    className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer text-sm uppercase tracking-wider"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Run Again</span>
                  </button>
                  <button
                    onClick={() => {
                      setTestComplete(false);
                      setIsTestActive(false);
                    }}
                    className="px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-705 rounded-xl font-bold transition flex items-center justify-center border border-slate-200 gap-1.5 cursor-pointer text-sm font-sans"
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
          userId={currentOfflineUser ? currentOfflineUser.username : 'guest'} 
          refreshTrigger={refreshTrigger}
          isAdmin={currentOfflineUser?.role === 'admin'}
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
                  aria-label="Close labeling assistant dialog"
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
