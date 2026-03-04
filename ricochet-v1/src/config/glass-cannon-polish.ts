// Additive constants for Issue #68 polish architecture.
// Non-breaking: no existing runtime path is modified unless this file is imported.

export const GLASS_CANNON_POLISH_TUNING = {
  smoke: {
    cooldownMs: 1200,
    radiusM: 3.6,
    lifetimeMs: 9000,
    fadeInMs: 400,
    fadeOutMs: 1700,
    maxActiveSmokes: 2,
    maxParticlesPerSmoke: 48,
    maxTotalParticles: 96,
    minVisibilityMultiplier: 0.2,
    perf: {
      cpuBudgetMs: 0.9,
      gpuBudgetMs: 1.4,
      budgetWindowMs: 2000,
      recoveryWindowMs: 5000,
      colliderCacheMs: 200
    }
  },

  replay: {
    supportedVersion: 1,
    maxImportBytes: 262_144,
    maxEvents: 1500,
    maxStates: 900,
    maxDurationMs: 120_000,
    maxTimestampSkewMs: 250,
    shareLabelDurationsMs: {
      importing: 600,
      imported: 1200,
      rejected: 1800
    }
  },

  keybinds: {
    schemaVersion: 2,
    storageKey: 'ricochet:input-bindings:v2',
    settingsKey: 'ricochet:input-bindings-settings:v2',
    captureTimeoutMs: 6000,
    warningToastMs: 2200,
    hardBlockToastMs: 2400,
    crouchModeDefault: 'hold'
  },

  stability: {
    replayWithSmokeSoakMinutes: 10,
    replayExportIntervalMs: 35_000,
    maxSmokeProjectilesLive: 4,
    expectedNoRegressionSystems: ['one-shot', 'movement', 'lobby', 'scoreboard', 'respawn']
  }
} as const;

export const KEYBIND_CONFLICT_TIERS = {
  moveForward: 'A',
  moveBackward: 'A',
  moveLeft: 'A',
  moveRight: 'A',
  jump: 'A',
  crouch: 'A',
  reload: 'A',
  throwSmoke: 'A',
  toggleScoreboard: 'B',
  switchMap: 'C',
  returnToMenu: 'C'
} as const;

export const KEYBIND_DISPATCH_PRIORITY = ['A', 'B', 'C'] as const;

export const REPLAY_IMPORT_ERROR_CODES = [
  'REPLAY_ERR_PAYLOAD_TOO_LARGE',
  'REPLAY_ERR_JSON_INVALID',
  'REPLAY_ERR_SCHEMA_UNSUPPORTED_VERSION',
  'REPLAY_ERR_SCHEMA_MISSING_FIELD',
  'REPLAY_ERR_SCHEMA_INVALID_TYPE',
  'REPLAY_ERR_DURATION_OUT_OF_RANGE',
  'REPLAY_ERR_EVENT_COUNT_EXCEEDED',
  'REPLAY_ERR_STATE_COUNT_EXCEEDED',
  'REPLAY_ERR_TIMELINE_NON_MONOTONIC',
  'REPLAY_ERR_NUMERIC_NON_FINITE'
] as const;

export const REPLAY_IMPORT_WARNING_CODES = [
  'REPLAY_WARN_UNKNOWN_EVENT_TYPE_DROPPED',
  'REPLAY_WARN_EVENT_ROW_DROPPED'
] as const;

export type ReplayImportErrorCode = typeof REPLAY_IMPORT_ERROR_CODES[number];
export type ReplayImportWarningCode = typeof REPLAY_IMPORT_WARNING_CODES[number];

export type ReplayImportIssueCode = ReplayImportErrorCode | ReplayImportWarningCode;

export type ReplayImportStatus = 'ok' | 'ok_with_warnings' | 'reject';

export interface ReplayImportIssue {
  code: ReplayImportIssueCode;
  message: string;
  path?: string;
}

export interface ReplayImportResult<TPayload> {
  status: ReplayImportStatus;
  payload: TPayload | null;
  errors: ReplayImportIssue[];
  warnings: ReplayImportIssue[];
}
