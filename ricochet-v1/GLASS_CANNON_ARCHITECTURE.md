# GLASS CANNON ARCHITECTURE (Issue #53)

## Status
- **Owner:** Tech Architecture
- **Scope:** `ricochet-v1` gameplay pass
- **Issue:** #53
- **Decision update:** Replace prior 3-hit health loop with **ONE-SHOT elimination** model.

---

## 1) Gameplay Contract Summary
Issue #53 Glass Cannon mode is intentionally lethal and readable:

1. Single heavy projectile model (no multi-weapon matrix).
2. Surface-aligned paint splats that remain stable over time/camera movement.
3. **One-hit elimination** (authoritative networking).
4. Single playable character profile for the mode.
5. Static dummy targets for target-practice loop.
6. Lightweight soundtrack + minimal SFX layer.
7. Strict perf budgets + deterministic fallback behavior.

---

## 2) Projectile Model (Single Heavier Projectile)

### Design intent
- Every trigger pull is high-commitment.
- Projectile is visible, weighty, and easy to spectate.
- Reduced weapon complexity for reliable netcode and balance tuning.

### Canonical projectile spec
- **Type:** `heavy_paint_round`
- **Spawn:** camera/world muzzle transform + forward offset
- **Initial speed:** `28 m/s`
- **Gravity:** `10.5 m/s²`
- **Radius:** `0.09 m`
- **Mass scalar (simulation-only):** `1.8`
- **Bounce damping:** `0.78`
- **Max ricochets:** `2`
- **Lifetime cap:** `2200 ms`
- **Max live projectiles (local cap):** `20`

### Update loop
- Fixed-step projectile update (`dt` clamped, e.g. <= 33ms) to reduce tunneling drift.
- Sweep test from previous position -> next position each frame.
- First valid collision resolves impact, splat projection, and elimination checks.

### Non-goals for #53
- No projectile modifiers, perks, alternate ammo, or charge states.

---

## 3) Surface-Normal Splat Projection Rules (Stability First)

### Projection rules
On impact, compute:
1. `impactPoint` in world space.
2. `impactNormal` from collision face normal transformed by world normal matrix.
3. `decalPosition = impactPoint + impactNormal * normalOffset` (default `0.010 - 0.018`).
4. Orientation basis using stable tangent frame:
   - choose fallback up axis not parallel to normal,
   - `tangent = normalize(cross(fallbackUp, normal))`,
   - `bitangent = cross(normal, tangent)`.
5. Apply random spin around normal (`0..2π`) for variation only.

### Stability constraints
- Use normal-offset + polygonOffset to avoid z-fighting.
- Clamp decal size range to avoid huge overdraw spikes.
- Merge/skip near-duplicate splats (`distance < 0.04m` and `normalDelta < 8°`).
- FIFO eviction on cap breach (oldest splats removed first).
- Splat transforms remain in world space; never parent to animated weapon rig.

### Surface eligibility
- Accept only arena/static collision layers (`isArenaObject|isWall|isGround`).
- Reject first-person meshes (`fp-*`) and transient FX geometry.

---

## 4) One-Hit Elimination State Machine

> This supersedes the previous 3-hit/3-life loop for Issue #53 mode.

### Player states
`Alive -> HitConfirmed -> Eliminated -> Respawning -> Alive`

### Transition semantics
- **Alive -> HitConfirmed:** authoritative hit accepted by server.
- **HitConfirmed -> Eliminated:** immediate gameplay elimination (same server tick). A short visual bridge is allowed client-side.
- **Eliminated -> Respawning:** respawn timer starts (e.g. 2.5s).
- **Respawning -> Alive:** server respawn packet applies transform + control unlock.

### Rules
- Effective HP model for mode: `maxHp = 1`, `damagePerValidHit >= 1`.
- No armor, no mitigation, no limb multipliers in this pass.
- Duplicate hit packets with same `shotId` are ignored (idempotency).

---

## 5) Crack/Shatter Visual Path on First Hit

Even though elimination is one-shot, readability improves with a very short two-stage visual path:

1. **Crack flash (0-70ms):**
   - screen/character crack decal at impact side,
   - quick chromatic stress + glass ping.
2. **Shatter burst (70-260ms):**
   - shard burst particle event,
   - dissolve/fade of victim avatar or hard hide depending on quality tier.

### Gameplay authority rule
- Elimination is immediate for rules/input/score.
- Crack->shatter is purely presentation and must not delay death registration.

### Fallback
- Low tier: skip crack overlay; play single shatter sprite burst only.

---

## 6) Networking: Authoritative Hit => Immediate Elimination

### Authority model
- Server performs definitive hit validation (rewind window + collision check).
- On valid hit, server emits elimination in the same resolution path.

### Message flow
1. Client sends `fire(shotId, origin, direction, tClient)`.
2. Server validates shot against rewinded target pose.
3. Server publishes:
   - `hit_confirmed { shotId, attackerId, victimId, impactPoint, impactNormal }`
   - `player_eliminated { victimId, attackerId, tServer, respawnAt }`
4. Clients immediately:
   - lock victim controls,
   - update scoreboard,
   - start local elimination FX.

### Reconciliation
- Shooter may show speculative hit marker; if server rejects, rollback marker only.
- Victim death is never client-authoritative.

---

## 7) HUD Semantics for One-Shot Mode

### Replace HP-bar language
- Remove/disable classic numeric health bar emphasis.
- Primary status chip:
  - `INTEGRITY: PRISTINE` (alive)
  - `INTEGRITY: SHATTERED` (eliminated)
  - `RECONSTITUTING: <n>s` (respawn countdown)

### Event cues
- On hit taken: immediate red-edge pulse + crack glyph + transition to elimination panel.
- On elimination: center text `ELIMINATED` + respawn timer.
- On respawn: quick `READY` banner (<= 700ms).

### Score visibility
- Keep kill/death scoreline persistent during respawn.
- Death panel should not obscure timer-critical information.

---

## 8) One-Character Mode Constraints

For Issue #53, mode runs with one canonical character profile only:

- Lock character selection UI to a single allowed entry (or bypass selection screen).
- Standardized hitbox/hurtbox dimensions for all players.
- Cosmetic variance deferred; no gameplay-affecting character deltas.
- Network payload can treat character id as constant for this playlist.

Rationale: avoids animation/hitbox parity bugs during one-shot tuning.

---

## 9) Static Dummy Target Model + Events

### Dummy entity contract
- Non-moving, no AI, no pathing.
- Uses same hurtbox schema as player (minus locomotion state).
- Optional auto-reset after destruction (`resetDelayMs`, default 1500).

### Events
- `dummy_spawned { dummyId, position }`
- `dummy_hit { dummyId, shotId, impactPoint, impactNormal }`
- `dummy_eliminated { dummyId, attackerId }`
- `dummy_reset { dummyId }`

### Scoring
- Dummies can increment practice counters only (not PvP ladder score) unless explicitly enabled.

---

## 10) Lightweight Audio Loop Design

### Music
- Single looping BGM stem (`bgm_loop_a.ogg`) for mode.
- Optional additive tension layer toggled by state (alive vs eliminated) if budget allows.

### SFX set (minimal)
- `fire_heavy`
- `impact_paint`
- `glass_crack`
- `glass_shatter`
- `respawn_ready`

### Runtime behavior
- Preload tiny set at match start.
- Keep polyphony limits conservative (e.g. 8 simultaneous SFX voices).
- If audio context fails/autoplay blocked, mode remains fully playable silently.

---

## 11) Performance Budgets and Fallback Modes

## Frame budgets (target: 60 FPS)
- Projectile simulation + collision: **<= 1.2 ms/frame**
- Splat + impact FX update: **<= 1.0 ms/frame**
- HUD transitions: **<= 0.3 ms/frame**
- Total gameplay-side overhead for this pass: **<= 3.0 ms/frame**

## Memory/object caps
- Active projectiles: `<= 20`
- Active splats: `<= 220`
- Active shard particles per elimination: capped by quality tier

## Quality tiers
1. **High:** crack overlay + shard burst + full splat pool
2. **Medium:** reduced shard count and shorter lifetimes
3. **Low/Fallback:** no shard sim, sprite burst only, reduced splat cap

## Failure handling
- If frame time > budget for sustained window (e.g. 2s), auto-step down quality tier.
- Never drop authoritative elimination events due to FX pressure.

---

## 12) Implementation Notes (Non-Breaking Integration)

- Keep this mode behind a mode flag/config object.
- Add constants in additive config module; avoid touching legacy mode defaults.
- Integrate HUD behavior via existing event hooks (`playerDied`, `respawnTick`, `playerRespawned`) with one-shot semantics.
- Networking changes should remain backward-compatible with current message envelope shape where possible.

---

## 13) Acceptance Checklist (Issue #53)
- [ ] Heavy projectile is sole fire model in Glass Cannon mode.
- [ ] Splats align to impact normals without visible swimming/z-fight spikes.
- [ ] First valid hit produces immediate elimination (authoritative).
- [ ] Crack -> shatter visual sequence occurs on elimination without delaying gameplay death.
- [ ] HUD communicates one-shot state clearly during alive/dead/respawn.
- [ ] Character selection constrained to one profile in mode.
- [ ] Static dummies emit expected hit/elim/reset events.
- [ ] Audio loop + key SFX run with graceful silent fallback.
- [ ] Perf caps and auto-fallback behavior validated.
