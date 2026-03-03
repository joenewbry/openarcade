export const GLASS_CRACK_THRESHOLDS = {
  hairline: 0.75,
  fractured: 0.5,
  critical: 0.25
} as const;

export const GLASS_SHATTER_LIMITS = {
  maxConcurrentShardEffects: 2,
  maxShardCountHighQuality: 24,
  maxParticleCountFallback: 64,
  maxBurstDurationMs: 700
} as const;

export const GLASS_RENDER_TUNING = {
  minOpacity: 0.22,
  maxOpacity: 0.35,
  minRoughness: 0.04,
  maxRoughness: 0.12,
  minTransmission: 0.9,
  maxTransmission: 1.0
} as const;

export type GlassCrackStage = 'intact' | 'hairline' | 'fractured' | 'critical' | 'shattered';

export function crackStageFromHp(hp: number, maxHp: number): GlassCrackStage {
  const safeMax = Math.max(1, Math.floor(maxHp));
  const safeHp = Math.max(0, Math.min(safeMax, Math.floor(hp)));

  if (safeHp <= 0) return 'shattered';

  const hpPct = safeHp / safeMax;

  if (hpPct > GLASS_CRACK_THRESHOLDS.hairline) return 'intact';
  if (hpPct > GLASS_CRACK_THRESHOLDS.fractured) return 'hairline';
  if (hpPct > GLASS_CRACK_THRESHOLDS.critical) return 'fractured';
  return 'critical';
}
