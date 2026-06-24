/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

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
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
    auth = getAuth(app);
    
    // Enable multi-tab or single-tab offline persistence for seamless local operation
    enableIndexedDbPersistence(db).catch((err) => {
      console.warn('Firestore offline persistence warning/fallback:', err.code);
    });
  } catch (error) {
    console.error('Failed to initialize Firebase SDK:', error);
  }
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

  console.error('Firestore standard telemetry exception: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { db, auth, isFirebaseActive };
export default app;
