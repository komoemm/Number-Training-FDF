/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Timestamp } from 'firebase/firestore';

export type TrainingMode = 'easy_20' | 'normal_90' | 'hard_180';

export interface TypingDetail {
  imageId: string;
  expectedNumber: string;
  typedNumber: string;
  timeSpentMs: number;
  isCorrect: boolean;
}

export interface TestSession {
  id?: string;
  userId: string;
  operatorId?: string;
  timestamp: Date | Timestamp | string;
  totalImagesAttempted: number;
  correctEntries: number;
  averageTimeMs: number;
  averageSpeed?: number;
  accuracy?: number;
  level?: string;
  trainingMode?: TrainingMode;
  details: TypingDetail[];
}

export interface LeaderboardEntry {
  userId: string;
  operatorId?: string;
  bestTimeMs: number;
  level: string;
  accuracy: number;
  totalRuns: number;
  timestamp: Date | Timestamp | string;
  trainingMode: TrainingMode;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type InvoiceStyle = 'modern' | 'handwritten' | 'classic' | 'thermal_distorted';

export interface GeneratedInvoiceData {
  id: string;
  expectedNumber: string; // T + 13 digits
  companyName: string;
  invoiceDate: string;
  totalAmount: string;
  difficulty: DifficultyLevel;
  style: InvoiceStyle;
  note?: string;
}

export interface AttemptResult {
  expected: string;
  typed: string;
  timeSpentMs: number;
  isCorrect: boolean;
}
