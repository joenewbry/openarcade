# pm2-dev4 — Animation/State + QA Harness

## Scope
- Creature state transitions (Idle/Move/Attack/Death).
- Test harness and soak/perf validation for movement+combat MVP.
- Fallback asset integration checks for proxy meshes.

## Tasks
1. Wire animation/state machine transitions from movement/combat events.
2. Add scripted wave test level for acceptance criteria execution.
3. Create 30-unit stress scenario and 5-minute lane soak scenario.
4. Verify fallback asset compatibility using GameDev Starter Kit - Tanks GLTF demo assets (if RPG bundle not present).

## Acceptance Targets
- Satisfy movement criterion #5 and combat criterion #6 from `PMUpdates/pm2.md`.
- Produce pass/fail checklist with timestamps and observed metrics.

## Deliverables
- State machine wiring + QA map assets.
- Test report (movement/combat criteria coverage and failures).
