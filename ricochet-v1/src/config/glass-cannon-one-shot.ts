// Additive constants for Issue #53 Glass Cannon architecture.
// Non-breaking: no existing runtime path is modified unless this file is imported.

export const GLASS_CANNON_ONE_SHOT_TUNING = {
  enabled: true,
  modeId: 'glass-cannon-issue-53',

  // One-shot elimination contract
  maxHp: 1,
  damagePerValidHit: 1,
  respawnDelayMs: 2500,

  // Visual sequencing (presentation only)
  crackFlashMs: 70,
  shatterWindowMs: 260,

  // Projectile baseline
  projectileSpeed: 28,
  projectileGravity: 10.5,
  projectileRadius: 0.09,
  projectileMassScalar: 1.8,
  bounceDamping: 0.78,
  maxRicochets: 2,
  projectileLifetimeMs: 2200,
  maxLiveProjectiles: 20,

  // Paint splat stability/perf
  splatNormalOffset: 0.012,
  maxActiveSplats: 220,
  dedupeDistanceM: 0.04,
  dedupeNormalDeltaDeg: 8,

  // Lightweight audio
  bgmLoopAsset: 'bgm_loop_a.ogg',
  maxSfxVoices: 8
} as const;

export const GLASS_CANNON_HUD_LABELS = {
  pristine: 'INTEGRITY: PRISTINE',
  shattered: 'INTEGRITY: SHATTERED',
  reconstitutingPrefix: 'RECONSTITUTING:'
} as const;

export type GlassCannonElimState =
  | 'alive'
  | 'hit_confirmed'
  | 'eliminated'
  | 'respawning';
