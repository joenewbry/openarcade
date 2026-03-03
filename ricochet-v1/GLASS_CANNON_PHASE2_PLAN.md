# Glass Cannon Phase-2 Execution Plan (Issue #57)

Issue reference: [#57](https://github.com/joenewbry/openarcade/issues/57)

## Objective
Ship the Phase-2 gameplay and UX slice for Glass Cannon with a clear execution sequence across five feature tracks: **crouch**, **walk cadence**, **keybinds**, **smoke grenade**, and **replay/share**.

This is a planning-only document. No gameplay code is included in this PR.

## Scope

### In Scope
1. Crouch gameplay state and transition behavior for active matches.
2. Walk cadence tuning for movement readability and game feel.
3. Keybind defaults plus remapping persistence and conflict handling.
4. Smoke grenade gameplay loop with visibility impact and performance guardrails.
5. Replay capture and share flow for match clips and quick post-match distribution.
6. Phase-2 QA signoff and release-readiness checklist.

### Non-Goals
- New map creation or map geometry redesign.
- Weapon class expansion outside smoke grenade feature scope.
- Full spectator mode system.
- Netcode rewrites unrelated to Phase-2 feature sync.
- Platform-level social infrastructure beyond replay export and link copy flow.

## Milestone Breakdown by Feature

### M1 — Crouch
**Goal:** Add crouch as a reliable and readable combat movement state.

- Implement crouch enter hold release transitions.
- Define crouch movement modifiers and firing constraints.
- Ensure crouch state replicates correctly in multiplayer sessions.
- Add HUD indicator for crouch state where needed for clarity.

### M2 — Walk Cadence
**Goal:** Improve movement rhythm and readability without changing core movement identity.

- Tune walk speed acceleration and deceleration cadence.
- Align audio footstep cadence and animation cadence to movement speed bands.
- Validate cadence readability at close mid and long engagement distances.
- Confirm no regressions to hit registration during cadence transitions.

### M3 — Keybinds
**Goal:** Make controls customizable and safe for keyboard layouts.

- Define Phase-2 default bindings including crouch and smoke grenade actions.
- Build keybind remap UI with conflict detection and reset-to-defaults.
- Persist keybind config locally and load safely at startup.
- Add hard fail-safe for unusable key maps and fallback defaults.

### M4 — Smoke Grenade
**Goal:** Add tactical smoke that changes line-of-sight play without performance collapse.

- Implement throw arc fuse timing and smoke volume lifecycle.
- Define smoke opacity and visibility rules for fair play.
- Add cooldown ammo HUD feedback and throw denial messaging.
- Apply VFX pooling caps and frametime guardrails.
- Verify smoke sync consistency in 1v1 sessions.

### M5 — Replay and Share
**Goal:** Let players quickly review and share moments from matches.

- Capture deterministic replay data for key match events.
- Add in-client replay viewer controls for scrub and playback speed.
- Provide quick share outputs: copy link and export short clip.
- Validate replay compatibility for latest match schema.

### M6 — Integration and Release Readiness
**Goal:** Stabilize all Phase-2 features together.

- Run full regression across arenas and network conditions.
- Execute acceptance matrix and collect evidence artifacts.
- Complete rollout checklist and rollback readiness packet.

## Acceptance Criteria (Issue #57)
- Crouch can be entered exited and sustained reliably with no stuck state.
- Walk cadence feels intentional and remains readable under combat pressure.
- Keybind remapping works with conflict prevention persistence and safe fallback defaults.
- Smoke grenade deploys consistently with predictable timing and acceptable frame cost.
- Smoke behavior is synchronized between host and join sessions.
- Replay playback reproduces key events accurately and supports basic sharing actions.
- Phase-2 pass clears QA matrix and release checklist with no P0 or P1 defects.

## Test Matrix

| Area | Scenario | Environment | Owner | Pass Criteria |
|---|---|---|---|---|
| Crouch state | Spam enter hold release crouch while moving shooting and reloading | Local sandbox + 1v1 network | Gameplay Eng + QA | No stuck crouch state and no control lock |
| Crouch sync | Host and join alternate crouch transitions under latency | Network session with packet jitter simulation | Tech Arch + QA | Remote state matches local intent within tolerance |
| Walk cadence | Traverse arena lanes at multiple speeds and direction changes | Warehouse + Containers | Gameplay Eng + QA | Cadence remains readable and responsive |
| Keybind remap | Rebind crouch grenade replay and menu keys with conflicting inputs | Settings panel + restart flow | UI Eng + QA | Conflicts blocked persistence works fallback defaults recover invalid maps |
| Smoke gameplay | Throw smoke near cover choke points and open lanes | Both arenas | Gameplay Eng + QA | Smoke timing and coverage match design intent |
| Smoke perf | Chain throws and overlap smoke fields during active firefights | Low mid high hardware profiles | Tech Arch + QA | Frame budget stays within agreed threshold |
| Smoke net sync | Simultaneous smoke throws from both players | 1v1 hosted and joined sessions | Tech Arch + QA | Position timing and dissipation are consistent |
| Replay fidelity | Record then replay elimination exchanges and smoke events | Local + network recordings | Gameplay Eng + QA | Event order and outcomes reproduce correctly |
| Share flow | Copy replay link and export short clip from post-match screen | Desktop browser flow | UI Eng + QA | Share actions complete and artifacts open correctly |
| Full regression | Run end-to-end match loop with all Phase-2 features enabled | Staging build | QA Lead | No blocker defects and checklist fully signed |

## Rollout Checklist
- [ ] Phase-2 tasks merged and linked to issue #57.
- [ ] QA evidence attached for each acceptance criterion.
- [ ] Performance report attached for smoke stress scenarios.
- [ ] Replay schema version documented and validated.
- [ ] Release notes include new controls and smoke gameplay caveats.
- [ ] Feature flags and fallback defaults documented in deployment notes.

## Rollback Checklist
- [ ] Confirm trigger condition (live regression or perf breach) and timestamp.
- [ ] Disable Phase-2 feature flags in order: replay/share then smoke then keybind remap then cadence/crouch.
- [ ] Revert Phase-2 merge commit(s) if flag disable is insufficient.
- [ ] Redeploy last known-good artifact.
- [ ] Run smoke test for match start movement firing respawn and menu flows.
- [ ] Post rollback summary and follow-up fix tasks in issue #57.

## Task Tracking
Execution tasks are tracked in `RICOCHET_DEMO_TASKS.csv` under issue #57 entries (`RIC-046` through `RIC-057`).
