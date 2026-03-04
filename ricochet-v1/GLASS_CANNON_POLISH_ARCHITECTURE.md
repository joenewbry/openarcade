# Glass Cannon Polish Architecture (Issue #68)

## Status
- **Owner:** Tech Architecture
- **Scope:** `ricochet-v1` polish pass (autonomous)
- **Issue:** #68
- **Reference mode:** One-shot Glass Cannon (`#53`) + Phase-2 systems (`#57`)

---

## 1) Problem framing

Issue #68 requests a coordinated polish pass across four areas:

1. **Smoke grenade feel/clarity tuning**
2. **Replay/share UX reliability** (including malformed payload handling)
3. **Keybind UX robustness** (conflict handling, clearer defaults, crouch toggle clarity)
4. **Integrated stability/perf checks** when one-shot + smoke + replay all run together

This architecture is intentionally **non-breaking and additive**:
- No changes to one-shot authoritative elimination contract.
- No protocol-breaking network changes.
- New limits/validation are opt-in via config and guardrails.

---

## 2) Design principles

1. **Fairness over spectacle**
   - Smoke should obscure enough to be tactical, never fully randomize outcomes.
2. **Fail-soft UX**
   - Invalid replay input or bad keybind edits should produce actionable feedback, not silent failure.
3. **Strict resource budgets**
   - VFX and replay parsing are bounded by hard caps and fallback behavior.
4. **Idempotent controls**
   - Keybind conflict policy and replay import policy must produce deterministic outcomes.
5. **One-shot invariants preserved**
   - Smoke/replay tooling cannot delay or alter authoritative hit -> death flow.

---

## 3) Smoke tuning model + perf guardrails

## 3.1 Tuning model (feel + fairness)

Model smoke with four user-visible axes:

1. **Occlusion strength** (how hard it is to track target through cloud)
2. **Readability** (can player understand cooldown + active state quickly)
3. **Tempo impact** (downtime pressure from cooldown/lifetime)
4. **Performance cost** (CPU/GPU time + overdraw)

Recommended baseline tuning envelope:

- `cooldownMs`: **1100–1300** (target 1200)
- `radiusM`: **3.4–3.9** (target 3.6)
- `lifetimeMs`: **8200–9500** (target 9000)
- `fadeInMs`: **320–500** (target 400)
- `fadeOutMs`: **1400–1900** (target 1700)
- `maxActiveSmokes`: **2** hard cap (1v1)

Rationale:
- Current behavior is useful but can be overly binary at close ranges.
- Slightly shorter active duration + clear fade windows improves fairness while preserving tactical value.

## 3.2 Visibility attenuation contract

Keep gameplay occlusion separate from rendering richness:

- Maintain coarse line/sphere overlap for visibility multiplier.
- Clamp final multiplier to floor (e.g. `0.20`) to avoid total blackout.
- Use eased curve for overlap impact:
  - `attenuation = 1 - pow(overlap, k) * density * strength`
  - with `k ~ 0.85 - 1.1` to avoid harsh threshold behavior.

This keeps smoke strong but avoids “hard wall” perception.

## 3.3 HUD clarity model

Expose smoke as explicit state machine in HUD copy:

- `READY`
- `COOLDOWN (Xs)`
- `ACTIVE (n/2)`
- `BLOCKED (MAX ACTIVE)` when throw intent occurs at cap

Behavioral rules:
- Cooldown label updates at 100ms cadence max (not per-frame text churn).
- Active counter updates only on state transitions.
- Optional throw-denied pulse (<= 450ms) for cap feedback.

## 3.4 Perf guardrails

Hard budgets for smoke subsystem:

- **CPU update cost:** <= **0.9 ms/frame** (60 FPS target hardware)
- **GPU incremental cost:** <= **1.4 ms/frame** at 2 active smokes
- **Overdraw risk cap:** total smoke particles <= **96**
- **Collider refresh cadence:** >= **200ms** cache window

Hard resource limits:
- `maxActiveSmokes = 2`
- `maxParticlesPerSmoke <= 48`
- `maxTotalParticles <= 96`
- `maxSmokeProjectilesLive <= 4`

Fallback ladder (automatic):
1. **High:** shell + puffs
2. **Medium:** shell + reduced puffs (50%)
3. **Low:** shell only
4. **Emergency:** single impostor + reduced opacity animation

Escalation trigger recommendation:
- If frame time > budget for rolling 2s window, step down one tier.
- Recover only after stable 5s below threshold (hysteresis).

---

## 4) Replay payload validation + error model

## 4.1 Validation goals

Replay import must be:
- Safe against malformed JSON and resource abuse
- Forward-compatible for unknown event types
- Understandable to users when rejected or partially accepted

## 4.2 Payload trust boundary

Treat all imported replay payloads as untrusted input.

Validation pipeline (ordered):

1. **Transport checks**
   - max payload bytes (pre-parse)
   - UTF-8/text sanity
2. **Syntax checks**
   - JSON parse success
3. **Envelope checks**
   - required root keys (`version`, `meta`, `events`, `states`, `durationMs`)
4. **Schema checks**
   - primitive/object/array type checks
   - known enum checks for constrained fields
5. **Semantic checks**
   - monotonic timestamps (`t` / `at` non-decreasing)
   - duration bounds
   - event/state count caps
   - finite numeric vectors/angles
6. **Normalization + quarantine**
   - unknown event types: keep for compatibility but ignore at playback
   - invalid event rows: drop row + emit warning code
7. **Result classification**
   - `ok`, `ok_with_warnings`, or `reject`

## 4.3 Hard caps (recommended)

- `maxImportBytes`: **262_144** (256 KB)
- `maxEvents`: **1500**
- `maxStates`: **900**
- `maxDurationMs`: **120_000**
- `maxTimestampSkewMs`: **250** tolerance for rounding adjustments only

If any hard cap is exceeded, reject with explicit error code.

## 4.4 Error taxonomy

Use stable machine-readable codes + user-safe messages.

Suggested error classes:

- **Parse/transport**
  - `REPLAY_ERR_PAYLOAD_TOO_LARGE`
  - `REPLAY_ERR_JSON_INVALID`
- **Envelope/schema**
  - `REPLAY_ERR_SCHEMA_UNSUPPORTED_VERSION`
  - `REPLAY_ERR_SCHEMA_MISSING_FIELD`
  - `REPLAY_ERR_SCHEMA_INVALID_TYPE`
- **Semantic/runtime safety**
  - `REPLAY_ERR_DURATION_OUT_OF_RANGE`
  - `REPLAY_ERR_EVENT_COUNT_EXCEEDED`
  - `REPLAY_ERR_STATE_COUNT_EXCEEDED`
  - `REPLAY_ERR_TIMELINE_NON_MONOTONIC`
  - `REPLAY_ERR_NUMERIC_NON_FINITE`
- **Partial accept warnings**
  - `REPLAY_WARN_UNKNOWN_EVENT_TYPE_DROPPED`
  - `REPLAY_WARN_EVENT_ROW_DROPPED`

## 4.5 UX output model

Replay import returns a typed result:

```ts
{
  status: 'ok' | 'ok_with_warnings' | 'reject';
  payload: ReplayPayload | null;
  errors: ReplayImportIssue[];
  warnings: ReplayImportIssue[];
}
```

UX rules:
- `reject`: show concise reason + one-line remediation.
- `ok_with_warnings`: allow playback and show compact warning summary.
- Unknown event types never crash playback.

---

## 5) Keybind conflict resolution design

## 5.1 Current UX gaps addressed

Issue #68 specifically asks for robust remapping behavior:
- Prevent/handle dangerous conflicts
- Clarify defaults/reset behavior
- Clarify crouch hold vs toggle semantics

## 5.2 Action priority tiers

Define three conflict tiers:

1. **Tier A (exclusive gameplay movement/combat)**
   - `moveForward`, `moveBackward`, `moveLeft`, `moveRight`, `jump`, `crouch`, `reload`, `throwSmoke`
2. **Tier B (high-frequency utility)**
   - `toggleScoreboard`
3. **Tier C (low-frequency meta/navigation)**
   - `switchMap`, `returnToMenu`

Conflict policy:
- **A↔A duplicate key:** hard-block save (must resolve)
- **A↔B duplicate key:** save with warning + deterministic dispatch
- **A↔C or B↔C duplicate:** allow with warning

## 5.3 Deterministic dispatch model

Dispatch precedence for same key press:
1. modal/UI capture context
2. Tier A actions
3. Tier B actions
4. Tier C actions

Additional rule:
- If two actions in same tier share a key and conflict is allowed (non-A tier), last-edited action wins and older binding is auto-unbound with notification.

This ensures no ambiguous runtime behavior.

## 5.4 Rebind workflow

On key capture:
1. Normalize key
2. Simulate assignment
3. Run conflict analyzer
4. If hard conflict: show blocking message + keep previous binding
5. If warning conflict: commit + show warning toast
6. Persist snapshot atomically

Recommended conflict feedback strings:
- Hard: `"W already bound to Move Forward. Choose a different key."`
- Warning: `"Tab is shared with Scoreboard and Switch Map. Scoreboard will fire first."`

## 5.5 Defaults + reset behavior

Reset strategy:
- **Single-action reset**: reset one action to default
- **Reset-all**: restore canonical defaults and crouch mode (`hold`)
- **Post-reset verification**: run conflict analyzer to guarantee clean state

Storage integrity:
- schema versioned payload with checksum-friendly shape
- on corrupt payload: auto-restore defaults + mark one-time banner

## 5.6 Crouch toggle clarity

Expose crouch option as explicit mode text:
- `Crouch Mode: Hold`
- `Crouch Mode: Toggle`

Add behavior hint in panel:
- Hold = crouch while key down
- Toggle = press once crouch, press again stand

---

## 6) Integrated stability checks (one-shot + smoke + replay)

## 6.1 Cross-system invariants

Must hold under all polish changes:

1. **One-shot invariant**
   - authoritative valid hit still eliminates immediately.
2. **No smoke-authority leak**
   - smoke cannot mutate server hit/damage authority.
3. **Replay isolation invariant**
   - replay playback never writes into live match state.
4. **Input safety invariant**
   - keybind conflict state cannot trap user in unusable controls.
5. **Bounded memory invariant**
   - smoke + replay buffers cannot grow unbounded.

## 6.2 Stability test matrix

### A) Functional integration
- Fire -> kill inside active smoke volume
- Simultaneous smoke throw + elimination + respawn transition
- Replay export during active smoke and scoreboard updates
- Replay import/playback while match idle/in-lobby

### B) Edge-case robustness
- Rapid smoke throw attempts at cooldown boundary
- Import malformed replay (invalid JSON, huge payload, bad timestamps)
- Key rebinding spam while opening/closing panel
- Crouch toggle mode switch mid-respawn and mid-replay playback

### C) Non-regression checks
- One-shot kill/respawn loop
- Movement + crouch transitions
- Lobby open/start/return flows
- Scoreboard visibility and update correctness

### D) Perf soak checks (10-minute run)
- 2 active smokes cycling continuously
- replay recorder active throughout
- repeated export/import every 30–45s
- target: no sustained FPS collapse, no unbounded heap growth

## 6.3 Telemetry hooks (lightweight)

Add optional counters/timers for validation:
- `smoke.activeCount`
- `smoke.tierLevel`
- `smoke.cpuMs`
- `replay.importRejectCount`
- `replay.warningCount`
- `keybind.conflictWarnings`
- `keybind.hardConflictBlocks`

Use these for manual QA and quick regressions in demo prep.

---

## 7) Rollout plan (non-breaking)

1. **Config + validator scaffolding**
   - Add constants/error codes and replay validation helpers.
2. **Smoke tuning pass**
   - Apply envelope values + HUD state clarity + perf fallback hysteresis.
3. **Keybind conflict engine**
   - Add analyzer + deterministic dispatch + clearer reset flows.
4. **Replay UX hardening**
   - Import result model, warning surfaces, playback labels.
5. **Integrated QA sweep**
   - Run matrix above, capture regressions, tune thresholds.

All steps are incremental and can be landed behind existing feature paths.

---

## 8) Acceptance checklist (Issue #68)

- [ ] Smoke visibility tuning feels strong but fair, with explicit HUD state feedback.
- [ ] Smoke perf remains within caps; fallback tiers trigger/recover deterministically.
- [ ] Replay import supports strict validation and machine-readable error codes.
- [ ] Malformed replay payloads fail safely with clear user-facing messages.
- [ ] Keybind remapping prevents dangerous conflicts and resolves allowed conflicts deterministically.
- [ ] Defaults/reset and crouch toggle mode are explicit and user-safe.
- [ ] Integrated one-shot + smoke + replay runs without regressions to movement/lobby/scoreboard/respawn.

---

## 9) Notes for implementation handoff

Primary touchpoints:
- `src/smoke-grenade-system.ts`
- `src/replay-system.ts`
- `src/input-bindings.ts`
- `src/keybinds-panel.ts`
- `src/main.ts` (labels/integration wiring)

Optional additive constants and enums are provided under `src/config/` for implementation safety and shared tuning.
