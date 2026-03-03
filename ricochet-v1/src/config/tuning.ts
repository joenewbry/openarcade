// Shared gameplay/FX tuning defaults for Issue #45 architecture.
// Non-breaking: this file is additive and can be imported incrementally.

export const HIT_VALIDATION_TUNING = {
  maxTraceDistance: 120,
  maxRewindMs: 150,
  hurtboxEpsilon: 0.02,

  bodyCapsuleRadius: 0.28,
  bodyCapsuleHalfHeight: 0.55,
  bodyCenterYOffset: 0.95,

  headRadius: 0.16,
  headCenterYOffset: 1.62,

  bodyDamageMultiplier: 1.0,
  headDamageMultiplier: 1.35
} as const;

export const PAINT_SPLAT_TUNING = {
  normalOffset: 0.01,
  minRadius: 0.08,
  maxRadius: 0.22,
  lifetimeMs: 12_000,
  fadeOutMs: 2_000,

  maxActiveSplatsGlobal: 220,
  maxActiveSplatsPerPlayer: 80,
  maxSpawnPerSecond: 35
} as const;

export const FIRE_FEEDBACK_TUNING = {
  fireEventDebounceMs: 16,
  muzzleFlashDurationMs: 50,
  tracerLifetimeMs: 90,
  impactFxLifetimeMs: 180,
  hitMarkerDurationMs: 120,

  maxMuzzleFlashesVisible: 6,
  maxTracersVisible: 18,
  maxImpactFxVisible: 30
} as const;
