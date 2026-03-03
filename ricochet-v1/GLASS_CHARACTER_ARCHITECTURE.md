# Glass Bubble Character Architecture (Issue #46)

## Goal
Design a **network-safe, performant** glass bubble character presentation with:
1. Progressive crack states as HP drops.
2. A satisfying shatter event on death.
3. Clean integration with current `health-system`, `respawn-system`, and network flow.

This doc is intentionally implementation-ready while remaining non-breaking to current gameplay systems.

---

## 1) Visual Strategy: Glass Bubble Material

### 1.1 Render model
Use a two-layer visual setup for the player shell:

- **Inner core mesh (existing player body)**
  - Existing mesh/model remains for silhouette + gameplay readability.
- **Outer bubble mesh (new)**
  - Sphere/capsule shell parented to player root.
  - Material style: translucent glass + fresnel rim + subtle env tint.

### 1.2 Material profile (Three.js-first)
Recommended baseline for `MeshPhysicalMaterial`:

- `transparent: true`
- `opacity: 0.22 - 0.35`
- `roughness: 0.04 - 0.12`
- `metalness: 0.0`
- `transmission: 0.9 - 1.0`
- `thickness: 0.25 - 0.5`
- `ior: 1.2 - 1.4`
- Optional `envMapIntensity: 0.4 - 0.8`

Add crack decals/overlays as a separate pass instead of re-authoring multiple meshes.

### 1.3 Crack visuals
Cracks should be represented by either:

- **Preferred:** crack texture atlas blended on the bubble shell with stage-driven intensity.
- **Fallback:** procedural line sprites/segments projected onto the shell.

Visual goals:
- Stage transitions are instantly readable.
- Crack contrast is visible from mid-range.
- Final stage strongly signals “one hit from break.”

---

## 2) Crack Stage State Machine (HP Threshold Driven)

### 2.1 States
Use a deterministic finite state machine tied only to authoritative HP value:

- `Intact`
- `Hairline`
- `Fractured`
- `Critical`
- `Shattered` (terminal, on death)

### 2.2 HP thresholds (percent of max HP)

- `Intact`: `hpPct > 0.75`
- `Hairline`: `0.75 >= hpPct > 0.50`
- `Fractured`: `0.50 >= hpPct > 0.25`
- `Critical`: `0.25 >= hpPct > 0`
- `Shattered`: `hp <= 0`

### 2.3 Transition rules
- Evaluate stage whenever HP changes (`damage`, `heal`, `respawn`).
- Stage is monotonic downward during life unless healing is introduced.
- On respawn: hard reset to `Intact` with fresh material state.

### 2.4 Why threshold FSM
- Simple to reason about.
- Keeps host/client visuals aligned (same HP -> same stage).
- Low memory and CPU overhead.

---

## 3) Shatter Effect Pipeline

## 3.1 Trigger
Shatter triggers exactly once when authoritative death occurs (`death` event/message).

## 3.2 Preferred pipeline: mesh split + impulse
When quality budget allows:
1. Duplicate bubble shell into N shards (offline-authored or runtime Voronoi-lite set).
2. Spawn shard group at player position + orientation.
3. Apply radial impulse + slight upward bias.
4. Animate 300-700ms (gravity + drag), then recycle/dispose.

### 3.3 Fallback pipeline: particles + decal flash
For lower-end devices or high-load scenes:
1. One-frame crack flash (emissive line burst).
2. GPU particles (triangle/sprite shards), 24-64 particles.
3. Optional ring shockwave sprite.
4. Fade out in <=500ms.

### 3.4 Resource strategy
- Prewarm pools for shards and particles at match start.
- No per-death allocation spikes.
- Reuse materials and geometries aggressively.

---

## 4) Event Integration: Health/Death/Respawn + Networking

Current hooks already present in codebase:
- Local events: `playerDied`, `playerRespawned`, `respawnTick`.
- Network messages: `damage`, `death`, `respawn`.

### 4.1 Integration points

#### Damage flow
- Existing `applyAuthoritativeDamage(amount, hp)` is the primary update point.
- Add `GlassCharacterController.setHealth(hp, maxHp)` call here.
- Controller maps HP -> crack stage and updates material/overlay.

#### Death flow
- On local `death` (or local `playerDied` in offline):
  - Trigger one-shot shatter effect.
  - Hide/disable intact bubble shell mesh.

#### Respawn flow
- On `playerRespawned` / network `respawn`:
  - Reset shell visibility.
  - Reset crack state to `Intact`.
  - Cancel any leftover shard/particle instances tied to prior life.

### 4.2 Networking consistency model
Keep networking authoritative and lightweight:

- Do **not** transmit crack stage directly by default.
- Compute stage from authoritative HP already synced in `damage/death/respawn` messages.
- Ensure all clients use identical threshold constants.

Optional future-proof field (if visual desync observed):
- Add `crackStage?: number` to damage/death payloads as debug or explicit override.

### 4.3 Determinism notes
- Use shared constants module for thresholds.
- Use integer HP where possible to avoid float boundary mismatch.
- Clamp HP before stage mapping.

---

## 5) Performance Budget and Fallback Path

### 5.1 Target budget (per active player)
- Crack stage update logic: ~0.02 ms/frame (event-driven preferred, not per-frame heavy).
- Material param updates: <= 1 update per HP change.
- Shatter burst CPU: <= 1.0 ms on trigger frame.
- Shatter burst GPU: <= 0.5 ms average over 0.7s burst window.

### 5.2 Hard caps
- Max concurrent shard effects: 2 players (local + remote) before degrading to particles.
- Max shard count high quality: 24.
- Max particle count fallback: 64.

### 5.3 Dynamic fallback ladder
At runtime based on FPS / device tier:
1. **Tier A:** mesh shards + particles + crack overlay.
2. **Tier B:** particles + crack overlay.
3. **Tier C:** crack overlay only + single flash sprite (no burst physics).

### 5.4 Safety constraints
- Never affect hitboxes/collision using visual shards.
- No gameplay logic on effect completion.
- Effects auto-cleanup on scene switch, respawn, or match end.

---

## 6) Proposed File/Module Plan

- `src/glass-character-controller.ts` (new)
  - Owns shell mesh refs, crack stage state, and shatter orchestration.
- `src/config/glass-character.ts` (optional constants; included in this proposal)
  - Shared thresholds, effect caps, and quality toggles.
- `src/main.ts` (integration only)
  - Wire health/death/respawn/network callbacks into controller.

This is additive and non-breaking: existing health and respawn behavior remains source of truth.

---

## 7) Rollout Plan

1. Implement constants + controller scaffolding.
2. Hook controller into local player pipeline only.
3. Validate offline crack transitions (100 -> 0).
4. Validate network parity (host/client stage match under damage events).
5. Add quality fallback flags and perf checks.
6. Expand to remote-player visual representation if desired.

---

## 8) QA Checklist

- HP thresholds map to expected crack stage boundaries.
- Death triggers one shatter burst only.
- Respawn fully resets to intact bubble.
- No lingering shards after respawn/map switch.
- Host and client show same stage for same HP.
- Stable 60 FPS on target hardware with two active players.

---

## 9) Risks / Mitigations

- **Risk:** transparent material sorting artifacts.
  - **Mitigation:** dedicated render order + depthWrite tuning.
- **Risk:** high shard count drops FPS on integrated GPUs.
  - **Mitigation:** strict cap + automatic Tier B/C fallback.
- **Risk:** network visual mismatch near boundaries.
  - **Mitigation:** shared constants + integer/clamped HP mapping.

---

## 10) Acceptance Criteria (Issue #46)

- Documented strategy for glass material, crack progression, and shatter.
- Explicit state machine tied to HP thresholds.
- Death/respawn/network integration defined with existing events/messages.
- Perf budget + fallback ladder defined.
- Non-breaking implementation path documented.
