# Glass Cannon Autonomous Polish Execution Plan (Issue #68)

Issue reference: [#68](https://github.com/joenewbry/openarcade/issues/68)

## Objective
Ship a planning-only polish pass for Glass Cannon focused on four execution tracks:
**smoke reliability**, **replay fidelity**, **keybind trust**, and **stability hardening**.

This document defines scope, milestones, QA gates, and release operations. No gameplay code is included in this PR.

## Scope

### In Scope
1. Smoke polish for readability, consistency, and performance guardrails under repeated use.
2. Replay polish for deterministic playback confidence and better operator-facing failure handling.
3. Keybind polish for defaults, migration safety, conflict protection, and recovery paths.
4. Stability work for long-session reliability, reconnect resilience, and no-crash expectations.
5. Integrated QA matrix and release readiness checklist with explicit rollback procedure.

### Non-Goals
- New weapons, maps, or game mode mechanics.
- Cosmetic-only art overhaul outside smoke/replay/keybind/stability execution needs.
- Netcode architecture rewrite beyond targeted reliability fixes.
- Platform expansion (mobile, console, or account system additions).
- Major UI redesign unrelated to keybind and replay/share polish.

## Milestones

### M1 — Smoke Polish Milestone
**Goal:** Smoke is readable, fair, and performant in active 1v1 play.

- Verify deploy timing and dissipation consistency between host and join.
- Tune smoke visibility/readability at close and mid-range engagement distances.
- Stress repeated smoke usage to confirm pooling behavior and frame budget compliance.
- Define clear go/no-go thresholds for smoke-induced performance regressions.

### M2 — Replay Polish Milestone
**Goal:** Replay playback is trustworthy for review and share workflows.

- Validate event ordering and key elimination moments under normal and jittered sessions.
- Add verification for replay mismatch detection and recoverable error messaging paths.
- Confirm share paths produce usable outputs without corrupted or empty payloads.
- Lock replay acceptance criteria to deterministic checkpoints for QA signoff.

### M3 — Keybind Polish Milestone
**Goal:** Players can rely on control mappings without dead-end states.

- Validate default mapping profile for core Glass Cannon actions.
- Ensure remap conflict blocking and duplicate-assignment prevention work consistently.
- Verify migration behavior for existing local configs after update.
- Confirm fail-safe fallback to defaults when invalid or partial maps are detected.

### M4 — Stability Milestone
**Goal:** Session flow remains stable through long and adverse test runs.

- Run extended soak sessions covering match start, combat loop, respawn, and menu return.
- Validate reconnect and host/join interruption recovery behavior.
- Confirm no P0/P1 crashes, hard locks, or unrecoverable UI/input deadlocks.
- Track high-signal telemetry logs for triage-ready post-run evidence.

### M5 — Release Operations Milestone
**Goal:** Ship with explicit operational safety.

- Execute final integrated matrix across smoke/replay/keybind/stability tracks.
- Attach evidence to issue #68 acceptance checklist.
- Complete rollout and rollback runbook with owner handoffs.

## Acceptance Criteria (Issue #68)
- Smoke usage is consistent across host and join sessions with no major visibility or timing divergence.
- Smoke stress behavior stays within agreed frame budget and does not leak pooled resources.
- Replay playback reproduces critical combat outcomes in expected order for accepted test scenarios.
- Replay share actions complete successfully with valid outputs and clear failure messaging when blocked.
- Keybind remap flow prevents invalid conflicts and always provides a recoverable default path.
- Existing player keybind configs migrate safely or auto-recover without breaking input.
- 30+ minute soak sessions complete with no crash and no unrecoverable control/menu lockups.
- QA matrix passes with no unresolved P0/P1 issues and release recommendation documented.

## Test Matrix

| Area | Scenario | Environment | Owner | Pass Criteria |
|---|---|---|---|---|
| Smoke consistency | Alternate smoke throws in duel lanes under host/join role swap | Local + 1v1 network | Gameplay Eng + Tech Arch + QA | Spawn timing and dissipation remain within agreed tolerance |
| Smoke performance | Chain overlapping smoke throws across full cooldown cycles | Low mid high hardware profiles | Tech Arch + QA | No sustained budget breach and no pooling leak signs |
| Replay fidelity | Record elimination exchanges then replay under jitter replay sources | Local + network captures | Gameplay Eng + QA | Event order and outcomes match source session checkpoints |
| Replay share | Execute copy/export flows for successful and forced-failure cases | Browser client publish flow | UI Eng + QA | Successful outputs open correctly and errors are actionable |
| Keybind defaults | Validate default map for smoke replay menu and movement actions | Fresh install + upgraded profile | UI Eng + QA | Defaults are complete and no missing bindings occur |
| Keybind conflicts | Attempt duplicate/restricted binds and malformed local config loads | Settings UI + config reload | UI Eng + QA | Conflicts blocked and fallback to defaults recovers control |
| Stability soak | Run repeated match loops with smoke replay and remap activity | 30-60 minute sessions | Tech Arch + QA | No crash no hard lock and no unrecoverable disconnect state |
| Integrated regression | Full end-to-end pass across all issue #68 tracks | Staging build | QA Lead | All acceptance criteria met and release recommendation ready |

## Rollout Checklist
- [ ] All issue #68 subtasks in `RICOCHET_DEMO_TASKS.csv` are linked and status-updated.
- [ ] Evidence bundle attached for smoke, replay, keybind, and stability acceptance gates.
- [ ] Known risks and mitigations documented in PR notes.
- [ ] QA final recommendation recorded with blocker status explicitly stated.
- [ ] Deploy order and owner handoff confirmed for release window.

## Rollback Checklist
- [ ] Trigger condition captured (crash, severe perf regression, desync, or input deadlock).
- [ ] Disable recently introduced polish features in safe order: replay share, keybind remap enhancements, smoke polish toggles.
- [ ] Revert offending commits if feature disable is insufficient.
- [ ] Redeploy last known-good artifact.
- [ ] Run post-rollback smoke test: launch, join, fire, smoke, replay open, menu return.
- [ ] Post incident summary and follow-up tasks to issue #68 before re-attempt.

## Task Tracking
Issue #68 execution tasks are tracked in `RICOCHET_DEMO_TASKS.csv` as `RIC-058` through `RIC-066`.
