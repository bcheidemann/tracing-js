export interface Levels {
  DISABLED: 0;
  TRACE: 1;
  DEBUG: 2;
  INFO: 3;
  WARN: 4;
  ERROR: 5;
  CRITICAL: 6;
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
