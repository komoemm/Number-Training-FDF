/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrainingCategory } from '../types';

export interface SLALevelConfig {
  level: 'A' | 'B' | 'C' | 'D';
  title: string;
  rangeShort: string;    // e.g. "< 3.0s"
  rangeDetail: string;   // e.g. "Under 3.00 seconds"
  description: string;   // e.g. "Elite Expert", "Proficient Specialist"
  maxMs: number;         // Threshold ceiling in milliseconds
  badgeClass: string;
  colorClass: string;
  progressColor: string;
}

export interface CategorySLAMatrix {
  category: TrainingCategory;
  categoryLabel: string;
  categoryCode: string; // Rg, Ph, DATE
  slaLimit: string;     // e.g. "< 6.00s", "< 3.50s", "< 4.50s"
  slaLimitSec: number;  // e.g. 6.0, 3.5, 4.5
  slaLimitMs: number;   // e.g. 6000, 3500, 4500
  levels: {
    A: SLALevelConfig;
    B: SLALevelConfig;
    C: SLALevelConfig;
    D: SLALevelConfig;
  };
}

/**
 * Category-Tailored SLA Matrix
 * - Register Number (Rg):
 *   Level A: < 3.0s ("Under 3.00 seconds")
 *   Level B: 3.1 ~ 3.3s ("3.1 ~ 3.3 seconds")
 *   Level C: 3.4 ~ 3.7s ("3.4 ~ 3.7 seconds")
 *   Level D: 3.8 ~ 4.0s+ ("3.8 ~ 4.0+ seconds")
 *   SLA: < 6.00s
 *
 * - Date Number (DATE):
 *   Level A: < 1.8s ("Under 1.80 seconds")
 *   Level B: 1.9 ~ 2.2s ("1.9 ~ 2.2 seconds")
 *   Level C: 2.3 ~ 2.6s ("2.3 ~ 2.6 seconds")
 *   Level D: 2.7s+ ("2.7+ seconds")
 *   SLA: < 3.50s
 *
 * - Phone Number (Ph):
 *   Level A: < 2.4s ("Under 2.40 seconds")
 *   Level B: 2.5 ~ 2.8s ("2.5 ~ 2.8 seconds")
 *   Level C: 2.9 ~ 3.3s ("2.9 ~ 3.3 seconds")
 *   Level D: 3.4s+ ("3.4+ seconds")
 *   SLA: < 4.50s
 */
export const CATEGORY_SLA_CONFIG: Record<TrainingCategory, CategorySLAMatrix> = {
  tax_number: {
    category: 'tax_number',
    categoryLabel: 'Register Number (QIN)',
    categoryCode: 'Rg',
    slaLimit: '6.00s',
    slaLimitSec: 6.0,
    slaLimitMs: 6000,
    levels: {
      A: {
        level: 'A',
        title: 'Level A (Elite Expert)',
        rangeShort: '< 3.0s',
        rangeDetail: 'Under 3.00 seconds',
        description: 'Elite Expert',
        maxMs: 3000,
        badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        colorClass: 'text-emerald-600',
        progressColor: 'bg-emerald-500'
      },
      B: {
        level: 'B',
        title: 'Level B (Specialist)',
        rangeShort: '3.1~3.3s',
        rangeDetail: '3.1 ~ 3.3 seconds',
        description: 'Proficient Specialist',
        maxMs: 3300,
        badgeClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        colorClass: 'text-indigo-600',
        progressColor: 'bg-indigo-500'
      },
      C: {
        level: 'C',
        title: 'Level C (Qualified)',
        rangeShort: '3.4~3.7s',
        rangeDetail: '3.4 ~ 3.7 seconds',
        description: 'Qualified Operator',
        maxMs: 3700,
        badgeClass: 'text-amber-700 bg-amber-50 border-amber-200',
        colorClass: 'text-amber-600',
        progressColor: 'bg-amber-500'
      },
      D: {
        level: 'D',
        title: 'Level D (Practitioner)',
        rangeShort: '3.8~4.0s+',
        rangeDetail: '3.8 ~ 4.0+ seconds',
        description: 'Practitioner',
        maxMs: Infinity,
        badgeClass: 'text-rose-700 bg-rose-50 border-rose-200',
        colorClass: 'text-rose-600',
        progressColor: 'bg-rose-500'
      }
    }
  },
  date_number: {
    category: 'date_number',
    categoryLabel: 'Date Number',
    categoryCode: 'DATE',
    slaLimit: '3.50s',
    slaLimitSec: 3.5,
    slaLimitMs: 3500,
    levels: {
      A: {
        level: 'A',
        title: 'Level A (Elite Expert)',
        rangeShort: '< 1.8s',
        rangeDetail: 'Under 1.80 seconds',
        description: 'Elite Expert',
        maxMs: 1800,
        badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        colorClass: 'text-emerald-600',
        progressColor: 'bg-emerald-500'
      },
      B: {
        level: 'B',
        title: 'Level B (Specialist)',
        rangeShort: '1.9~2.2s',
        rangeDetail: '1.9 ~ 2.2 seconds',
        description: 'Proficient Specialist',
        maxMs: 2200,
        badgeClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        colorClass: 'text-indigo-600',
        progressColor: 'bg-indigo-500'
      },
      C: {
        level: 'C',
        title: 'Level C (Qualified)',
        rangeShort: '2.3~2.6s',
        rangeDetail: '2.3 ~ 2.6 seconds',
        description: 'Qualified Operator',
        maxMs: 2600,
        badgeClass: 'text-amber-700 bg-amber-50 border-amber-200',
        colorClass: 'text-amber-600',
        progressColor: 'bg-amber-500'
      },
      D: {
        level: 'D',
        title: 'Level D (Practitioner)',
        rangeShort: '2.7s+',
        rangeDetail: '2.7+ seconds',
        description: 'Practitioner',
        maxMs: Infinity,
        badgeClass: 'text-rose-700 bg-rose-50 border-rose-200',
        colorClass: 'text-rose-600',
        progressColor: 'bg-rose-500'
      }
    }
  },
  phone_number: {
    category: 'phone_number',
    categoryLabel: 'Phone Number',
    categoryCode: 'Ph',
    slaLimit: '4.50s',
    slaLimitSec: 4.5,
    slaLimitMs: 4500,
    levels: {
      A: {
        level: 'A',
        title: 'Level A (Elite Expert)',
        rangeShort: '< 2.4s',
        rangeDetail: 'Under 2.40 seconds',
        description: 'Elite Expert',
        maxMs: 2400,
        badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        colorClass: 'text-emerald-600',
        progressColor: 'bg-emerald-500'
      },
      B: {
        level: 'B',
        title: 'Level B (Specialist)',
        rangeShort: '2.5~2.8s',
        rangeDetail: '2.5 ~ 2.8 seconds',
        description: 'Proficient Specialist',
        maxMs: 2800,
        badgeClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        colorClass: 'text-indigo-600',
        progressColor: 'bg-indigo-500'
      },
      C: {
        level: 'C',
        title: 'Level C (Qualified)',
        rangeShort: '2.9~3.3s',
        rangeDetail: '2.9 ~ 3.3 seconds',
        description: 'Qualified Operator',
        maxMs: 3300,
        badgeClass: 'text-amber-700 bg-amber-50 border-amber-200',
        colorClass: 'text-amber-600',
        progressColor: 'bg-amber-500'
      },
      D: {
        level: 'D',
        title: 'Level D (Practitioner)',
        rangeShort: '3.4s+',
        rangeDetail: '3.4+ seconds',
        description: 'Practitioner',
        maxMs: Infinity,
        badgeClass: 'text-rose-700 bg-rose-50 border-rose-200',
        colorClass: 'text-rose-600',
        progressColor: 'bg-rose-500'
      }
    }
  }
};

/**
 * Normalizes any category string (including legacy variants like 'TAX', 'TAX NUMBER',
 * 'tax_number', 'register_number', 'Rg', etc.) to a valid TrainingCategory.
 * Ensures complete backward compatibility with existing training logs and Firestore records.
 */
export function normalizeCategory(rawCategory?: string | null): TrainingCategory {
  if (!rawCategory) return 'tax_number';
  const str = String(rawCategory).trim().toLowerCase().replace(/[-_\s]+/g, '');
  if (str.includes('date')) return 'date_number';
  if (str.includes('phone') || str.includes('tel')) return 'phone_number';
  // Treats legacy 'tax', 'taxnumber', 'register', 'registernumber', 'qin', 'rg', or unknown as 'tax_number' (Register Number)
  return 'tax_number';
}

/**
 * Returns user-facing canonical display name for any category value.
 * Treats legacy 'TAX' or 'TAX NUMBER' records as 'Register Number'.
 */
export function getCategoryDisplayName(rawCategory?: string | null): string {
  const norm = normalizeCategory(rawCategory);
  if (norm === 'date_number') return 'Date Number';
  if (norm === 'phone_number') return 'Phone Number';
  return 'Register Number';
}

/**
 * Resolves the typing assessment grade ('A' | 'B' | 'C' | 'D') dynamically based on
 * the elapsed average time in milliseconds and the category SLA criteria.
 */
export function evaluateCategoryLevel(
  timeMs: number,
  category: string = 'tax_number'
): 'A' | 'B' | 'C' | 'D' {
  const effectiveCategory = normalizeCategory(category);
  const config = CATEGORY_SLA_CONFIG[effectiveCategory];
  
  if (timeMs <= config.levels.A.maxMs) return 'A';
  if (timeMs <= config.levels.B.maxMs) return 'B';
  if (timeMs <= config.levels.C.maxMs) return 'C';
  return 'D';
}

/**
 * Returns comprehensive ranking details for UI badges, certificates, and results screens.
 */
export function getCategoryRankDetails(
  timeMs: number,
  category: string = 'tax_number'
): {
  level: 'A' | 'B' | 'C' | 'D';
  name: string;
  rangeShort: string;
  rangeDetail: string;
  description: string;
  color: string;
  badgeClass: string;
  categoryLabel: string;
  categoryCode: string;
} {
  const effectiveCategory = normalizeCategory(category);
  const matrix = CATEGORY_SLA_CONFIG[effectiveCategory];
  const level = evaluateCategoryLevel(timeMs, effectiveCategory);
  const levelConfig = matrix.levels[level];

  return {
    level,
    name: `Level ${level} (${levelConfig.description}: ${levelConfig.rangeShort})`,
    rangeShort: levelConfig.rangeShort,
    rangeDetail: levelConfig.rangeDetail,
    description: levelConfig.description,
    color: levelConfig.badgeClass,
    badgeClass: levelConfig.badgeClass,
    categoryLabel: matrix.categoryLabel,
    categoryCode: matrix.categoryCode
  };
}

/**
 * Returns the 4 SLA level configs for a given category (used by Dashboard cards).
 */
export function getCategorySlaCards(category: string = 'tax_number'): SLALevelConfig[] {
  const effectiveCategory = normalizeCategory(category);
  const matrix = CATEGORY_SLA_CONFIG[effectiveCategory];
  return [matrix.levels.A, matrix.levels.B, matrix.levels.C, matrix.levels.D];
}
