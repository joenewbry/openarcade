# Glass Cannon Phase-2 Architecture (Issue #57)

Status: proposed architecture for implementation in `ricochet-v1`.

This document defines a **non-breaking, network-aware** phase-2 expansion for Glass Cannon gameplay with five scope items:

1. Crouch + camera/movement state model
2. Walk cadence + weapon/camera bob guardrails
3. Keybinding persistence
4. Smoke grenade simulation + rendering
5. Replay/share clips flow

It is designed to layer on top of existing one-shot flow from Issue #53 without changing the core kill contract.

---

## 1) Crouch and camera/movement state model

## 1.1 Goals
- Add crouch as a tactical readability + cover interaction mechanic.
- Keep local controls responsive while preserving server authority.
- Avoid camera snapping and collider tunneling during height transitions.

## 1.2 Player locomotion state machine
Use a small, explicit locomotion FSM per player:

- `standing`
- `entering_crouch`
- `crouched`
- `exiting_crouch`
- `airborne` (overlay state, not mutually exclusive with crouch intent)

Recommended transition timings:
- enter crouch blend: `110ms`
- exit crouch blend: `130ms`

Rules:
- Crouch request can be hold or toggle (input layer policy).
- `standing -> entering_crouch` immediately on valid crouch intent.
- `crouched -> exiting_crouch` requires stand clearance check (headroom ray/capsule).
- If stand clearance fails, remain `crouched`.
- On death/respawn, reset to `standing`.

## 1.3 Authoritative movement parameters
Define posture-specific motion values (server authority, client prediction mirrors):

- `standing`:
  - eye height: `1.60`
  - move speed scalar: `1.00`
  - collider half-height baseline
- `crouched`:
  - eye height: `1.18` (or tuned equivalent)
  - move speed scalar: `0.62`
  - collider half-height reduced

Guardrails:
- Never modify horizontal capsule radius due to crouch.
- Smoothly lerp camera Y to target eye height; collider can update at state boundary or stepped blend (no one-frame pop).
- Do not allow crouch to bypass collision by shrinking and instantly expanding under geometry.

## 1.4 Networking contract
For remote representation, add posture to player-state payloads as an additive field:

```ts
posture?: 0 | 1; // 0=standing, 1=crouched
```

Compatibility rules:
- Missing `posture` => assume standing.
- Existing clients continue to function with no protocol break.
- Server treats posture as intent + validates transitions (especially uncrouch clearance).

## 1.5 Integration points
- `input-manager`: add crouch action source.
- `player-controller`: add posture state + eye-height/collider blend.
- `network-types` + server relay: optional posture propagation.
- `health-system` / `respawn-system`: hard reset to standing.

---

## 2) Cadence/walk-bob model + anti-motion-sickness guardrails

## 2.1 Goals
- Add motion feel while preserving aiming clarity.
- Avoid discomfort, especially in first-person at high turn rates.

## 2.2 Bob signal model
Drive bob by **horizontal locomotion speed** and grounded state:

- cadence frequency `f = baseFreq * speedNormalized`
- phase accumulator: `phase += dt * f * TAU`
- offsets:
  - vertical bob: `sin(phase) * ampY`
  - lateral sway: `sin(phase * 0.5) * ampX`

Suggested baselines:
- standing: `ampY 0.018`, `ampX 0.008`, `baseFreq 1.8`
- crouched: `ampY 0.010`, `ampX 0.005`, `baseFreq 1.4`

## 2.3 Application layers
- Camera receives low-amplitude bob (position only by default).
- Weapon model may receive a slightly amplified but clamped bob for feel.
- Do not apply bob to world transform replicated over network.

## 2.4 Anti-motion-sickness guardrails
Hard constraints:
- Disable bob while airborne.
- Fade bob in/out over `80-140ms` when starting/stopping movement.
- Clamp camera bob amplitude to strict max values.
- No high-frequency rotational roll by default.
- Add accessibility toggle:
  - `cameraMotionReduced: boolean`
  - if enabled: reduce amplitudes to `30%` and disable lateral sway.

Optional:
- expose scalar slider `0.0 - 1.0` for personal comfort.

## 2.5 Telemetry targets
- camera bob application under `0.05ms/frame`.
- no sustained visual oscillation when idle.
- zero net drift from accumulated bob transforms.

---

## 3) Keybinding config schema + persistence strategy

## 3.1 Goals
- Decouple gameplay actions from hardcoded key checks.
- Persist bindings across sessions with versioned schema.
- Keep backward compatibility with existing defaults (WASD, Space, R, M, Q).

## 3.2 Action map (phase-2 additions included)
Core action ids:

- `moveForward`, `moveBackward`, `moveLeft`, `moveRight`
- `jump`
- `crouch`
- `firePrimary`, `fireSecondary`
- `reload`
- `openScoreboard`
- `switchArena`
- `quitMatch`
- `throwSmoke`
- `replaySaveClip`
- `replayTogglePlayback`

## 3.3 Storage schema (versioned)

```json
{
  "schemaVersion": 1,
  "updatedAt": 0,
  "bindings": {
    "moveForward": ["KeyW", "ArrowUp"],
    "moveBackward": ["KeyS", "ArrowDown"],
    "moveLeft": ["KeyA", "ArrowLeft"],
    "moveRight": ["KeyD", "ArrowRight"],
    "jump": ["Space"],
    "crouch": ["ControlLeft", "KeyC"],
    "firePrimary": ["Mouse0"],
    "fireSecondary": ["Mouse2"],
    "reload": ["KeyR"],
    "openScoreboard": ["Tab"],
    "switchArena": ["KeyM"],
    "quitMatch": ["KeyQ"],
    "throwSmoke": ["KeyG"],
    "replaySaveClip": ["F8"],
    "replayTogglePlayback": ["F9"]
  },
  "options": {
    "crouchMode": "hold",
    "cameraMotionReduced": false
  }
}
```

## 3.4 Persistence flow
- Load from `localStorage` on boot (e.g., key: `ricochet:keybinds:v1`).
- Validate shape + known action ids.
- If invalid/corrupt, fall back to defaults and rewrite.
- On rebind, update in-memory map first, then debounce-save (`~150ms`).

Conflict policy:
- Allow duplicates temporarily in UI.
- Surface warning when one input maps to many high-priority actions.
- Resolve at dispatch layer by action priority table.

## 3.5 Non-breaking integration
- Existing direct key checks can be shimmed first:
  - keep behavior identical by reading through `isActionDown(actionId)`.
- Gradually migrate all `event.key` literals in `main.ts` and controller systems.

---

## 4) Smoke grenade simulation + rendering/perf constraints

## 4.1 Gameplay goals
- Create temporary line-of-sight denial and reposition opportunities.
- Preserve one-shot lethality model (smoke affects visibility, not damage rules).

## 4.2 Runtime phases
Per grenade instance:

1. `thrown` (projectile motion with bounce)
2. `arming` (short fuse, e.g. `700ms`)
3. `blooming` (density ramp-up, e.g. `350ms`)
4. `active` (full smoke volume, e.g. `6.5s`)
5. `dissipating` (fade-out, e.g. `1.2s`)
6. `expired`

## 4.3 Simulation model (deterministic-lite)
- Authoritative server tracks grenade origin/velocity/bounce.
- On detonation, server sends smoke event with:
  - `smokeId`, `seed`, `origin`, `startTime`, `duration`.
- Clients generate visual particles/cards deterministically from `seed`.

Recommended simplification:
- Gameplay occlusion uses a coarse sphere/capsule volume test.
- Rendering can be richer but should not alter hit authority.

## 4.4 Rendering approach
Preferred V1 hybrid:
- low-count billboard particles near center
- 1-2 soft volume shells for body
- depth-faded alpha and simple noise scrolling

Hard limits:
- max concurrent active smokes: `2` (1v1 target)
- max particles per smoke: `48`
- max total smoke particles: `96`
- single smoke draw-call target: `<= 6` incremental

Fallback ladder:
1. High: hybrid shells + particles
2. Medium: shell-only
3. Low: single impostor cloud with time-varying opacity

## 4.5 Perf and fairness constraints
- Never perform per-frame expensive volumetric ray marching in V1.
- Smoke must not block hit registration server-side unless explicit LOS rule is added.
- If LOS attenuation is introduced later, server and client must share identical obstruction logic.

---

## 5) Replay/share event log format + playback flow

## 5.1 Goals
- Capture short highlight clips (kill/death/exchange moments).
- Share clip payload as compact deterministic event log.
- Keep implementation incremental and net-safe.

## 5.2 Recording model
Use a rolling ring buffer of event records over recent timeline:

- default window: `20s`
- sample snapshots at `20Hz` for local + remote transforms
- keep discrete gameplay events exact (fire, damage, death, respawn, smoke)

Event categories:
- `snapshot`
- `fire`
- `hit`
- `damage`
- `death`
- `respawn`
- `smoke_spawn`
- `smoke_phase`
- `input_marker` (optional local-only)

## 5.3 Clip payload schema (transport)

```json
{
  "version": 1,
  "mode": "glass-cannon",
  "createdAt": 0,
  "durationMs": 12000,
  "tickRate": 20,
  "match": {
    "sessionId": "",
    "mapId": "",
    "players": [{ "id": "p1", "name": "Player 1" }]
  },
  "events": [
    { "t": 0, "type": "snapshot", "playerId": "p1", "p": [0,1.6,0], "y": 0, "pi": 0, "posture": 0 },
    { "t": 1550, "type": "fire", "playerId": "p1", "shotId": "s_12", "o": [0,1.5,0], "d": [0,0,-1] },
    { "t": 1612, "type": "damage", "targetId": "p2", "amount": 100, "hp": 0, "shotId": "s_12" }
  ]
}
```

Compression strategy:
- Minified keys (`p`, `y`, `pi`, etc.).
- Optional gzip + base64 for clipboard/share-link payload.
- Hard cap export payload (e.g. `<= 256KB` pre-compress).

## 5.4 Playback flow
1. Parse + validate clip schema/version.
2. Initialize sandbox replay scene/session (non-authoritative).
3. Reconstruct timeline cursor from `t=0` to `durationMs`.
4. Interpolate snapshots; apply discrete events at exact timestamps.
5. Allow controls: play/pause/scrub, 0.5x/1x/2x.
6. End with summary card and optional copy/share.

Rules:
- Replay is visualized offline; no writes to active match state.
- Unknown event types are ignored with warning for forward compatibility.

---

## 6) Networking implications + one-shot compatibility

## 6.1 Additive protocol evolution
All phase-2 network additions should be optional and backward-compatible:

- `player_state.posture?: 0|1`
- new optional client/server messages:
  - `throw_smoke` (intent)
  - `smoke_spawn` / `smoke_update` / `smoke_expire`
- replay export is out-of-band (not required in live protocol)

Compatibility behavior:
- Older clients ignore unknown message types/fields.
- Server feature-gates phase-2 fields by capability bitset if needed.

## 6.2 One-shot mode contract
Preserve Issue #53 core assumptions:
- valid hit still resolves lethal one-shot by default (`damage=100`, `hp->0`).
- crouch only changes posture/collision profile, not invulnerability.
- smoke does not modify terminal damage contract.
- replay is observational; never feeds authoritative state back into match.

## 6.3 Security and trust boundaries
- Client never authoritative for hit, death, or smoke LOS outcomes.
- Client-provided replay files are untrusted input; strict schema validation required.
- Limit smoke spawn rate server-side to prevent spam/perf abuse.

---

## 7) Proposed module/file rollout (incremental)

1. `src/config/glass-cannon-phase2.ts` (additive tuning/constants)
2. `src/keybinds.ts` (schema, defaults, storage, validation)
3. `src/player-controller.ts` updates for posture + bob integration
4. `src/network/network-types.ts` additive posture/smoke payloads
5. `server/network-server.js` smoke authority + posture relay (optional gating)
6. `src/replay/` module (ring buffer, encoder/decoder, player)

Rollout order:
1. keybind abstraction + crouch local only
2. network posture propagation
3. cadence/bob with accessibility toggle
4. smoke authority + rendering
5. replay capture/export/playback

---

## 8) Acceptance checklist (Issue #57)

- [ ] Crouch transitions are smooth, collision-safe, and replicate over network.
- [ ] Walk cadence feels responsive with anti-motion-sickness guardrails.
- [ ] Keybindings persist and survive reload with schema validation.
- [ ] Smoke grenade lifecycle works within defined perf caps.
- [ ] Replay clips export/import/play with deterministic event flow.
- [ ] One-shot mode behavior remains unchanged in authoritative kill logic.

This architecture intentionally prioritizes deterministic gameplay, accessibility, and protocol compatibility while adding tactical depth for phase-2.
