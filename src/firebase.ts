/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  setLogLevel,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Suppress transient backend unreachable probe warnings (e.g., 10-second connection timeout)
try {
  setLogLevel('error');
} catch {}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

let app;
let db: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

// Determine if Firebase is actually configured with credential keys
const isFirebaseActive = Boolean(
  firebaseConfig && 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey.trim() !== '' && 
  firebaseConfig.projectId && 
  firebaseConfig.projectId.trim() !== ''
);

if (isFirebaseActive) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const databaseId = firebaseConfig.firestoreDatabaseId || undefined;

    // Use initializeFirestore with experimentalForceLongPolling to prevent 10s WebChannel timeout
    // and configure modern local cache with graceful memory fallback for restricted iframe contexts
    try {
      db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      }, databaseId);
    } catch (persistentErr) {
      try {
        db = initializeFirestore(app, {
          experimentalForceLongPolling: true,
          localCache: memoryLocalCache()
        }, databaseId);
      } catch {
        db = getFirestore(app, databaseId);
      }
    }

    auth = getAuth(app);
  } catch (error) {
    console.error('Failed to initialize Firebase SDK:', error);
  }
}

/**
 * Checks whether an error is caused by Firestore free daily usage quota exhaustion.
 */
export function isQuotaError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code || '';
  return (
    code === 'resource-exhausted' ||
    msg.toLowerCase().includes('quota limit exceeded') ||
    msg.toLowerCase().includes('quota exceeded') ||
    msg.toLowerCase().includes('free daily read units') ||
    msg.toLowerCase().includes('resource-exhausted') ||
    msg.toLowerCase().includes('resource_exhausted')
  );
}

/**
 * Returns direct Firebase Console upgrade and quota link for this database
 */
export function getFirebaseConsoleUrl(): string {
  const proj = firebaseConfig?.projectId || 'gen-lang-client-0170355455';
  const dbId = firebaseConfig?.firestoreDatabaseId || 'ai-studio-e45718ef-759f-4c84-bd62-e8012bf50357';
  return `https://console.firebase.google.com/project/${proj}/firestore/databases/${dbId}/data?openUpgradeDialog=true`;
}

/**
 * Handles Firestore errors by wrapping them in a standardized, stringified JSON format
 * as mandated by the project security and telemetry instructions.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentUserId = auth?.currentUser?.uid || null;
  const currentUserEmail = auth?.currentUser?.email || null;
  const currentEmailVerified = auth?.currentUser?.emailVerified || null;
  const currentIsAnonymous = auth?.currentUser?.isAnonymous || null;
  const currentTenantId = auth?.currentUser?.tenantId || null;
  const currentProviderInfo = auth?.currentUser?.providerData?.map(provider => ({
    providerId: provider.providerId,
    email: provider.email,
  })) || [];

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUserId,
      email: currentUserEmail,
      emailVerified: currentEmailVerified,
      isAnonymous: currentIsAnonymous,
      tenantId: currentTenantId,
      providerInfo: currentProviderInfo,
    },
    operationType,
    path
  };

  if (isQuotaError(error)) {
    console.warn('Firestore free daily quota threshold reached. Switching to offline storage mode.');
  } else {
    console.error('Firestore standard telemetry exception: ', JSON.stringify(errInfo));
  }
  throw new Error(JSON.stringify(errInfo));
}

export { db, auth, isFirebaseActive };
export default app;
