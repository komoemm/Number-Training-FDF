/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Timestamp } from 'firebase/firestore';

export interface TypingDetail {
  imageId: string;
  expectedNumber: string;
  typedNumber: string;
  timeSpentMs: number;
  isCorrect: boolean;
}

export interface TestSession {
  userId: string;
  timestamp: Date | Timestamp | string;
  totalImagesAttempted: number;
  correctEntries: number;
  averageTimeMs: number;
  details: TypingDetail[];
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
