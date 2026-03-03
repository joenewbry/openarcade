// Additive constants for Issue #57 phase-2 architecture.
// Non-breaking: no existing runtime path is modified unless this file is imported.

export const GLASS_CANNON_PHASE2_TUNING = {
  crouch: {
    enterDurationMs: 110,
    exitDurationMs: 130,
    standEyeHeight: 1.6,
    crouchEyeHeight: 1.18,
    crouchMoveScalar: 0.62,
    postureNetStanding: 0,
    postureNetCrouched: 1
  },

  walkBob: {
    standing: {
      amplitudeY: 0.018,
      amplitudeX: 0.008,
      baseFrequencyHz: 1.8
    },
    crouched: {
      amplitudeY: 0.01,
      amplitudeX: 0.005,
      baseFrequencyHz: 1.4
    },
    fadeInMs: 90,
    fadeOutMs: 120,
    reducedMotionScalar: 0.3
  },

  keybinds: {
    schemaVersion: 1,
    storageKey: 'ricochet:keybinds:v1',
    saveDebounceMs: 150
  },

  smoke: {
    throwCooldownMs: 4500,
    fuseMs: 700,
    bloomMs: 350,
    activeMs: 6500,
    dissipateMs: 1200,
    maxActiveSmokes: 2,
    maxParticlesPerSmoke: 48,
    maxTotalParticles: 96,
    gameplayOcclusionRadius: 3.2
  },

  replay: {
    schemaVersion: 1,
    rollingBufferSeconds: 20,
    snapshotHz: 20,
    defaultClipDurationMs: 12000,
    maxExportBytes: 262_144
  }
} as const;

export const GLASS_CANNON_PHASE2_DEFAULT_KEYBINDS = {
  moveForward: ['KeyW', 'ArrowUp'],
  moveBackward: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  crouch: ['ControlLeft', 'KeyC'],
  firePrimary: ['Mouse0'],
  fireSecondary: ['Mouse2'],
  reload: ['KeyR'],
  openScoreboard: ['Tab'],
  switchArena: ['KeyM'],
  quitMatch: ['KeyQ'],
  throwSmoke: ['KeyG'],
  replaySaveClip: ['F8'],
  replayTogglePlayback: ['F9']
} as const;

export type GlassCannonPhase2Action = keyof typeof GLASS_CANNON_PHASE2_DEFAULT_KEYBINDS;

export type GlassCannonPostureNet =
  | typeof GLASS_CANNON_PHASE2_TUNING.crouch.postureNetStanding
  | typeof GLASS_CANNON_PHASE2_TUNING.crouch.postureNetCrouched;

export type CrouchMode = 'hold' | 'toggle';

export interface GlassCannonKeybindConfig {
  schemaVersion: number;
  updatedAt: number;
  bindings: Record<GlassCannonPhase2Action, string[]>;
  options: {
    crouchMode: CrouchMode;
    cameraMotionReduced: boolean;
  };
}
