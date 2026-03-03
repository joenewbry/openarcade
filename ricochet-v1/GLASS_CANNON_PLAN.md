# Glass Cannon Gameplay Pass Plan (Issue #53)

Issue reference: [#53](https://github.com/joenewbry/openarcade/issues/53)

## Objective
Deliver a gameplay-focused pass that makes Ricochet feel like **Glass Cannon** for live domain testing: visible projectile travel, cleaner paint impact readability, simplified player setup, and a one-shot elimination loop with clear HUD and reliable respawn.

This is a planning-only document.

## Scope

### In Scope
1. Add **Q key quit** flow to cleanly return to menu.
2. Ensure projectiles have visible travel time (remove instant hitscan feel).
3. Left/right fire gameplay polish:
   - Single projectile per shot
   - Bigger or heavier projectile behavior
   - Solid thick paint splats
   - Splat orientation aligned to hit surface normals (ground and boxes reliable)
4. Keep and clean rubber paint ball bounce behavior.
5. Simplify character flow to one shared character for all players (remove selector complexity for now).
6. Replace prior life model with **ONE-SHOT ruleset**:
   - One hit equals elimination
   - HUD clearly indicates one-shot mode
   - Respawn loop remains functional after elimination
7. Add at least one static enemy dummy with visible hit reaction for testing.
8. Build and deploy path validation remains intact for domain testing.
9. Branding pass for "Glass Cannon" naming treatment (Ricochet can remain subtitle).
10. MVP soundtrack and audio pass.

### Non-Goals
- New arena content or map redesign.
- New weapon inventory expansion unrelated to issue #53.
- Netcode architecture rewrites beyond issue-specific sync validation.
- Broad engine or rendering pipeline refactors.

## Milestone Phases

### P1 — Gameplay Critical (must-have)
- One-shot elimination gameplay loop and HUD mode indicator.
- Respawn reliability after one-shot elimination.
- Q-to-menu flow.
- Projectile travel-time behavior and shot readability baseline.
- Single projectile behavior plus heavier feel on fire modes.
- Solid splats with reliable normal-aligned orientation on key surfaces.
- Rubber ball bounce behavior cleanup and retention.
- At least one static enemy dummy with visible hit reaction.
- Build and deploy smoke validation for live domain path.

### P2 — Polish (nice-to-have after P1 stable)
- Branding update to "Glass Cannon" (or Ricochet subtitle treatment).
- Soundtrack and gameplay audio polish pass (MVP acceptable).
- Fine-tuning visuals and readability based on live test feedback.

## Acceptance Criteria (Issue #53)
- Projectiles visibly travel and shot feedback is clear.
- Splats are solid-color and correctly oriented on surfaces.
- **One hit equals elimination.**
- **HUD clearly indicates one-shot mode.**
- **Respawn flow still works after elimination.**
- Q returns to menu cleanly.
- At least one static enemy dummy is present and visibly reacts to hits.
- Build and deploy path remains intact for domain testing.

## Test Matrix

| Area | Scenario | Environment | Owner | Pass Criteria |
|---|---|---|---|---|
| One-shot rules | Single hit on player at close and mid range | Local 1v1 + live domain smoke | Gameplay Eng + QA | Every valid hit eliminates target in one hit |
| HUD mode state | Pre-match in-match and post-respawn HUD checks | Warehouse + Containers | UI Eng + QA | HUD explicitly displays one-shot mode and elimination feedback |
| Respawn loop | Repeated eliminate-respawn cycles (10+) | Local + networked 1v1 | Gameplay Eng + QA | Respawn always restores controllable state without soft-lock |
| Q quit flow | Press Q during active match and post-elimination | Local build + deploy build | UI Eng + QA | Clean return to menu with no stuck input state |
| Projectile travel | Observe bullet travel at short and long range | Both arenas | Gameplay Eng + QA | Projectile travel is visually apparent and not hitscan-feeling |
| Splat orientation | Hits on ground walls and box faces at varied angles | Both arenas | Gameplay Eng + VFX + QA | Splats remain thick solid and align to surface normals |
| Rubber ball bounce | 20+ bounce chains and edge-angle impacts | Both arenas | Gameplay Eng + QA | Bounce behavior remains consistent and readable with paint marks |
| Shared character flow | Host/join flow with selector removed or bypassed | Multiplayer lobby and match start | Gameplay Eng + QA | All players spawn with shared character and no selector blockers |
| Dummy targets | Hit static dummy with both fire modes | Arena practice pass | Gameplay Eng + QA | Dummy present and visibly reacts to impacts |
| Build/deploy | Build publish and domain smoke test | CI/local publish path | Tech Arch + QA | Deployment pipeline stays intact and playable |

## Rollback Plan

### Rollback Triggers
- One-shot elimination causes match flow breakage or unplayable pacing.
- HUD mode indicator is missing or misleading in live test builds.
- Respawn fails after elimination or causes control lock.
- Projectile/splat changes regress core readability or stability.

### Rollback Levels
1. **Soft rollback (preferred):** Disable issue #53 feature flags or tuning overrides for one-shot mode and projectile/splat changes while keeping stable baseline.
2. **Branch rollback:** Revert issue #53 merge commit(s) from `main` if gameplay-critical regressions persist.
3. **Deploy rollback:** Redeploy last known-good artifact validated before issue #53 rollout.

### Rollback Verification
- Confirm match start, elimination, respawn, and menu return all function.
- Verify build/deploy path serves previous stable gameplay.
- Log rollback reason and follow-up fix tasks in issue #53.

## Task Tracking
Execution tasks are tracked in `RICOCHET_DEMO_TASKS.csv` under issue #53 entries (`RIC-032` through `RIC-045`).
