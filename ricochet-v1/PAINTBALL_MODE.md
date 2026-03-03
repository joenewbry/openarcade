# PAINTBALL MODE (MVP)

Implemented priority gameplay mode for RICOCHET with colorful paint interactions.

## Controls

- **Left Click** = instant paintball shot (hitscan)
  - Muzzle flash still comes from existing weapon system.
  - Immediate tracer + impact spark + paint splat on hit point.
  - If no surface is hit, a visible end-of-ray impact marker/splat is still spawned.

- **Right Click** = rubber paint ball projectile
  - Fires a visible physical ball.
  - Ball bounces multiple times using collision normals.
  - Every bounce leaves a paint splat + spark.

- **Context menu** is disabled while in active gameplay + pointer lock, so right click is usable for firing.

## Tuning Constants

Defined in `src/bullet-system.ts` under `PAINTBALL_TUNING`:

- `SHOT_MAX_DISTANCE = 90`
- `SHOT_ORIGIN_FORWARD_OFFSET = 0.35`
- `TRACER_LIFETIME_MS = 110`
- `IMPACT_SPARK_LIFETIME_MS = 140`

- `SPLAT_LIFETIME_MS = 120000`
- `MAX_SPLATS = 280`
- `SPLAT_SIZE_MIN = 0.28`
- `SPLAT_SIZE_MAX = 0.62`
- `SPLAT_SURFACE_OFFSET = 0.018`

- `RIGHT_CLICK_COOLDOWN_MS = 120`
- `RUBBER_BALL_SPEED = 34`
- `RUBBER_BALL_GRAVITY = 9`
- `RUBBER_BALL_RADIUS = 0.08`
- `RUBBER_BALL_BOUNCE_DAMPING = 0.84`
- `RUBBER_BALL_MIN_SPEED = 3`
- `RUBBER_BALL_MAX_BOUNCES = 6`
- `RUBBER_BALL_LIFETIME_MS = 3200`
- `MAX_RUBBER_BALLS = 24`

- `COLLIDER_CACHE_MS = 350`

## Performance Safety

- Paint splats are capped (`MAX_SPLATS`) and oldest splats are evicted first.
- Rubber projectiles are capped (`MAX_RUBBER_BALLS`) and oldest are evicted first.
- Impact sparks/tracers are very short-lived and disposed.
- Arena collider list uses short cache (`COLLIDER_CACHE_MS`) to reduce per-frame traversal cost.

## Quick Test Checklist

1. Enter match and lock pointer.
2. **Left-click burst**:
   - ✅ each shot shows immediate tracer
   - ✅ each shot shows impact spark
   - ✅ paint splats appear in varied bright colors and random size/rotation
3. **Right-click shot**:
   - ✅ rubber ball appears and travels physically
   - ✅ bounces off walls/floor with reflected direction
   - ✅ each bounce creates a splat mark
4. Hold right click / rapid clicks:
   - ✅ no browser context menu pops during active gameplay
   - ✅ game stays stable (projectiles/splats remain bounded by caps)
