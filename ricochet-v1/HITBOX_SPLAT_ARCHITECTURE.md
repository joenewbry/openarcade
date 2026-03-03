# HITBOX + PAINT SPLAT ARCHITECTURE (Issue #45)

Status: proposed architecture for implementation in `ricochet-v1`.

This document defines a practical, deterministic hit-validation and paint-feedback architecture for a fast 1v1 shooter. It is optimized for gameplay fairness first, then visual readability, then performance stability.

---

## 1) Hurtbox strategy (center-mass + head bias)

### Goals
- Keep hit registration fair under latency and animation jitter.
- Reward precision (headshots) without making body shots feel inconsistent.
- Avoid per-frame skinned-mesh collider costs in the critical path.

### Proposed model
Use **2 logical hurt volumes** per player in server simulation space:

1. **Center-mass capsule (primary)**
   - Represents torso + upper legs.
   - Large and stable for reliable base hit rate.
2. **Head sphere/capsule (secondary, bias zone)**
   - Small target around head anchor.
   - Checked first (or weighted) for precision reward.

### Suggested dimensions (world units)
- Player height reference: `1.80`
- Body capsule:
  - radius: `0.28`
  - half-height: `0.55` (capsule segment + hemispheres)
  - center offset from feet origin: `+0.95y`
- Head sphere:
  - radius: `0.16`
  - center offset from feet origin: `+1.62y`

> The exact numeric values should be tuned with playtests, but server and client must share the same defaults.

### Head bias rule
When both zones are eligible, apply a head bias by either:
- **Priority check**: test head first, then body, OR
- **Weighted resolution**: if both intersect within epsilon at same rewind tick, resolve to head.

Suggested damage policy:
- `headMultiplier = 1.35`
- `bodyMultiplier = 1.00`

### Design constraints
- No limb-level hurtboxes in V1 (complexity and net jitter risks are not worth it yet).
- Hurtbox anchors should be attached to a stable proxy transform (not per-bone physics).
- Use a tiny expansion epsilon for fairness at high speed:
  - `hurtboxEpsilon = 0.02`

---

## 2) Client/server consistency for hit validation

### Authority model
- **Client**: predicts and renders immediate fire feedback.
- **Server**: authoritative hit validation and damage application.
- **Client receives**: confirmed hit result with target id, zone, and final damage.

### Single source of truth
Both client and server should consume identical ballistic/hit constants from a shared tuning module (see `src/config/tuning.ts`):
- maximum trace distance
- hitzone dimensions
- head multiplier
- lag compensation limits

### Deterministic shot payload
On `weaponFired` emit/send:
- `shotId` (uuid/monotonic)
- `shooterId`
- `fireTimeClientMs`
- `origin` (x,y,z)
- `direction` normalized
- `weaponId`
- optional `spreadSeed`

Server computes final ray from canonical weapon rules; client payload is intent, not authority.

### Lag compensation window
Server rewinds target transforms to historical snapshot nearest `fireTimeClientMs` bounded by:
- `maxRewindMs = 150`
- hard reject if older than window

Snapshot cadence target:
- `20 Hz` minimum for rewind buffers

### Reconciliation behavior
- If client predicted a hit but server rejects: show subtle correction (no damage marker).
- If server confirms different zone than client prediction: use server zone for damage + UI marker.
- Never trust client-declared hit target/zone.

### Precision guardrails
- Normalize direction vectors on both sides.
- Enforce fixed max range before hit test.
- Quantize network floats to stable precision where possible (e.g., 1e-3).

---

## 3) Paint splat projection rules + performance caps

### Visual intent
Paint splats communicate impact location and fight flow. They must not degrade frame time during extended firefights.

### Projection rules
1. Spawn splat **only on confirmed impact surface** (world geometry or player material mask, if enabled).
2. Use impact `normal` to orient decal plane.
3. Offset decal origin by small normal bias to prevent z-fighting:
   - `normalOffset = 0.01`
4. Clamp random rotation around normal for variety.
5. Reject projection on steep backfaces if camera-facing readability is poor.

### Size and lifetime
- Base radius range: `0.08` to `0.22`
- Lifetime: `12s` default, with soft fade in last `2s`
- Optional growth animation: very subtle (`+8%` max over first `0.2s`)

### Pooling + caps
Use pooled decal instances (no unbounded allocations):

- `maxActiveSplatsGlobal = 220`
- `maxActiveSplatsPerPlayer = 80`
- `maxSpawnPerSecond = 35`

Eviction policy:
1. remove expired,
2. then oldest low-importance splats,
3. then oldest overall.

Importance heuristic (high to low):
1. recent direct hit near player view,
2. recent world impact,
3. oldest off-screen.

### Material budget
- Atlas-based textures preferred (reduce state changes).
- Keep shader simple (alpha + tint + optional roughness tweak).
- Avoid unique materials per splat.

---

## 4) Fire feedback visual budget + constants

### Objective
Shots should feel punchy while staying within a strict real-time budget on mid-tier hardware.

### Feedback stack (per shot)
1. **Muzzle flash** (already present): very short (`~50ms`).
2. **Tracer**: optional every N rounds or for first shot in burst.
3. **Impact spark/puff** on surface hit.
4. **Hit marker** (UI) only on server-confirmed player hit.

### Budget recommendations
Per-frame soft caps:
- `maxMuzzleFlashesVisible = 6`
- `maxTracersVisible = 18`
- `maxImpactFxVisible = 30`
- total transient FX draw-call target: `< 40` incremental

Update budget:
- Keep total fire/impact FX update under `~1.5ms` on target baseline machine.

### Rate limiting
- Throttle repeated impact FX at nearly same position/normal within `80ms`.
- For automatic fire, degrade tracer frequency at high RPM:
  - e.g., render every `2nd` or `3rd` round.

### Core constants (proposed)
- `fireEventDebounceMs = 16`
- `muzzleFlashDurationMs = 50`
- `tracerLifetimeMs = 90`
- `impactFxLifetimeMs = 180`
- `hitMarkerDurationMs = 120`

---

## 5) Validation checklist + success metrics

### Functional checklist
- [ ] Body shots consistently register at close, mid, and max range.
- [ ] Headshots reliably map to bias zone with expected multiplier.
- [ ] Client-predicted hit disagreement does not cause double-feedback.
- [ ] Server rewind rejects stale shots beyond max rewind window.
- [ ] Splat spawning respects pool caps and does not leak allocations.
- [ ] Visual FX limits hold during full-auto stress test.

### Test scenarios
1. **Static target sweep**: verify zone boundaries at multiple distances.
2. **Strafe duel**: high relative lateral velocity and burst fire.
3. **High RTT simulation**: 80ms / 120ms / 180ms with packet jitter.
4. **Soak test**: 5 minutes sustained firing for splat/FX memory stability.
5. **Camera stress**: rapid turns to detect decal popping or overdraw spikes.

### Metrics to record
- hit confirm latency (p50/p95)
- client/server hit disagreement rate (`< 3%` target)
- false-negative hit rate by zone
- average active splats / capped evictions per minute
- render frame time delta with FX enabled (`< +2.0ms` target)
- memory growth over 5-minute soak (`~0` unbounded growth)

### Acceptance thresholds (initial)
- Headshot ratio in controlled aim test should match expected geometric share ±10%.
- No frame drops below 55 FPS on baseline during 60s stress scenario.
- No crash, no escalating allocation trend, no duplicate hit marker events.

---

## Implementation notes (incremental rollout)
1. Add shared tuning constants module.
2. Implement server-side dual-zone hit validation + rewind window.
3. Hook client prediction to authoritative reconciliation messages.
4. Add pooled splat renderer with hard caps.
5. Add FX throttles and metrics instrumentation.
6. Run checklist and tune constants from telemetry, not guesswork.

This architecture intentionally favors deterministic gameplay and predictable performance over maximum visual complexity for V1.
