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
  levels: {
    A: SLALevelConfig;
    B: SLALevelConfig;
    C: SLALevelConfig;
    D: SLALevelConfig;
  };
}

/**
 * Category-Tailored SLA Matrix
 * - Tax Number (Rg):
 *   Level A: <= 3.0s ("Under 3.00 seconds")
 *   Level B: 3.01s ~ 3.3s ("3.1 ~ 3.3 seconds")
 *   Level C: 3.31s ~ 3.7s ("3.4 ~ 3.7 seconds")
 *   Level D: > 3.7s ("3.8 ~ 4.0+ seconds")
 *
 * - Phone Number (Ph):
 *   Level A: <= 2.5s ("Under 2.50 seconds")
 *   Level B: 2.51s ~ 2.8s ("2.6 ~ 2.8 seconds")
 *   Level C: 2.81s ~ 3.2s ("2.9 ~ 3.2 seconds")
 *   Level D: > 3.2s ("3.3 ~ 3.5+ seconds")
 *
 * - Date Number (DATE):
 *   Level A: <= 1.3s ("Under 1.30 seconds")
 *   Level B: 1.31s ~ 1.6s ("1.4 ~ 1.6 seconds")
 *   Level C: 1.61s ~ 2.0s ("1.7 ~ 2.0 seconds")
 *   Level D: > 2.0s ("2.1 ~ 2.3+ seconds")
 */
export const CATEGORY_SLA_CONFIG: Record<TrainingCategory, CategorySLAMatrix> = {
  tax_number: {
    category: 'tax_number',
    categoryLabel: 'Tax Number (QIN)',
    categoryCode: 'Rg',
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
        rangeShort: '3.8~4.0s',
        rangeDetail: '3.8 ~ 4.0+ seconds',
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
    levels: {
      A: {
        level: 'A',
        title: 'Level A (Elite Expert)',
        rangeShort: '< 2.5s',
        rangeDetail: 'Under 2.50 seconds',
        description: 'Elite Expert',
        maxMs: 2500,
        badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        colorClass: 'text-emerald-600',
        progressColor: 'bg-emerald-500'
      },
      B: {
        level: 'B',
        title: 'Level B (Specialist)',
        rangeShort: '2.6~2.8s',
        rangeDetail: '2.6 ~ 2.8 seconds',
        description: 'Proficient Specialist',
        maxMs: 2800,
        badgeClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        colorClass: 'text-indigo-600',
        progressColor: 'bg-indigo-500'
      },
      C: {
        level: 'C',
        title: 'Level C (Qualified)',
        rangeShort: '2.9~3.2s',
        rangeDetail: '2.9 ~ 3.2 seconds',
        description: 'Qualified Operator',
        maxMs: 3200,
        badgeClass: 'text-amber-700 bg-amber-50 border-amber-200',
        colorClass: 'text-amber-600',
        progressColor: 'bg-amber-500'
      },
      D: {
        level: 'D',
        title: 'Level D (Practitioner)',
        rangeShort: '3.3~3.5s',
        rangeDetail: '3.3 ~ 3.5+ seconds',
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
    levels: {
      A: {
        level: 'A',
        title: 'Level A (Elite Expert)',
        rangeShort: '< 1.3s',
        rangeDetail: 'Under 1.30 seconds',
        description: 'Elite Expert',
        maxMs: 1300,
        badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        colorClass: 'text-emerald-600',
        progressColor: 'bg-emerald-500'
      },
      B: {
        level: 'B',
        title: 'Level B (Specialist)',
        rangeShort: '1.4~1.6s',
        rangeDetail: '1.4 ~ 1.6 seconds',
        description: 'Proficient Specialist',
        maxMs: 1600,
        badgeClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        colorClass: 'text-indigo-600',
        progressColor: 'bg-indigo-500'
      },
      C: {
        level: 'C',
        title: 'Level C (Qualified)',
        rangeShort: '1.7~2.0s',
        rangeDetail: '1.7 ~ 2.0 seconds',
        description: 'Qualified Operator',
        maxMs: 2000,
        badgeClass: 'text-amber-700 bg-amber-50 border-amber-200',
        colorClass: 'text-amber-600',
        progressColor: 'bg-amber-500'
      },
      D: {
        level: 'D',
        title: 'Level D (Practitioner)',
        rangeShort: '2.1~2.3s',
        rangeDetail: '2.1 ~ 2.3+ seconds',
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
 * Resolves the typing assessment grade ('A' | 'B' | 'C' | 'D') dynamically based on
 * the elapsed average time in milliseconds and the category SLA criteria.
 */
export function evaluateCategoryLevel(
  timeMs: number,
  category: TrainingCategory = 'tax_number'
): 'A' | 'B' | 'C' | 'D' {
  const effectiveCategory: TrainingCategory = CATEGORY_SLA_CONFIG[category] ? category : 'tax_number';
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
  category: TrainingCategory = 'tax_number'
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
  const effectiveCategory: TrainingCategory = CATEGORY_SLA_CONFIG[category] ? category : 'tax_number';
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
export function getCategorySlaCards(category: TrainingCategory = 'tax_number'): SLALevelConfig[] {
  const effectiveCategory: TrainingCategory = CATEGORY_SLA_CONFIG[category] ? category : 'tax_number';
  const matrix = CATEGORY_SLA_CONFIG[effectiveCategory];
  return [matrix.levels.A, matrix.levels.B, matrix.levels.C, matrix.levels.D];
}
