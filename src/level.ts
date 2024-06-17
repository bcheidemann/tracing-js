/**
 * @module
 * This module provides the Level type and enum.
 */

export interface Levels {
  TRACE: 0;
  DEBUG: 1;
  INFO: 2;
  WARN: 3;
  ERROR: 4;
  CRITICAL: 5;
  DISABLED: 6;
}

export type Level = Levels[keyof Levels];

export const Level = {
  DISABLED: 0,
  TRACE: 1,
  DEBUG: 2,
  INFO: 3,
  WARN: 4,
  ERROR: 5,
  CRITICAL: 6,
} as const;
