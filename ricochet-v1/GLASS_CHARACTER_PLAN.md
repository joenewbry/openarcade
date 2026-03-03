# Glass Bubble Character Plan (Issue #46)

## Objective
Ship a **glass bubble character behavior package** for Ricochet v1 that adds:
1. Visually readable crack stages as the character takes damage.
2. A satisfying shatter event at break threshold.
3. Safe integration with current health, respawn, and networking flows.

This document is planning-only and defines scope, sequencing, and quality gates for execution.

## Scope

### In Scope
- Glass bubble character visual state model with staged damage readability (e.g., intact → light cracks → heavy cracks → critical).
- Shatter event definition (trigger conditions, VFX/SFX hooks, state transition behavior, and short post-shatter readability window).
- Integration points with existing systems:
  - `health-system`
  - `hud-health`
  - `respawn-system`
  - multiplayer replication/state sync
- QA test matrix and signoff criteria for both arenas.
- Performance and memory guardrails for effects-heavy moments.

### Out of Scope
- New core weapon mechanics.
- Arena redesign or new map assets.
- Broad animation framework rewrites.
- Non-issue-#46 balancing unrelated to crack/shatter readability.

## Milestones

### M1 — Design Spec + Visual Direction
- Lock crack stage count and thresholds.
- Define per-stage visual language (line density, opacity, highlight treatment).
- Define shatter event sequence and fallbacks for low-performance mode.
- Deliverable: approved mini-spec + implementation checklist.

### M2 — Gameplay/System Integration
- Wire crack stage transitions to health events.
- Ensure deterministic threshold handling in 1v1 flow.
- Integrate state reset on respawn.
- Deliverable: feature branch demo with staged cracks and shatter trigger logic.

### M3 — Effects + Feedback Pass
- Add crack overlays/material variants and shatter burst effects.
- Add accompanying audio hook points (if available) with no-block fallback.
- Tune readability under motion and rapid-fire impact.
- Deliverable: polished feedback pass validated in both warehouse/containers arenas.

### M4 — Performance + QA + Release Readiness
- Run stress scenarios (rapid damage, repeated shatter/respawn cycles).
- Validate frame-time and memory constraints.
- Complete regression + acceptance checklist and produce issue closure evidence.
- Deliverable: go/no-go recommendation with release notes.

## Acceptance Criteria
- Damage progression is clearly visible in **at least 4 distinct states** (including intact and critical).
- Crack state transitions are synchronized with authoritative health state and do not desync in 1v1.
- Shatter triggers exactly once at terminal threshold and correctly transitions to death/respawn flow.
- Respawn always restores intact visual state with no residual crack overlays/effects.
- No regressions in movement, weapon visibility, score, or lobby/match state.
- QA signoff includes evidence captures from both supported arenas.

## Risks & Mitigations
- **Risk: Visual clutter in firefights**  
  *Mitigation:* enforce crack line density limits, add contrast-safe styling, and run readability checks during high-motion combat.

- **Risk: Network state desync for crack stages**  
  *Mitigation:* derive crack stage from authoritative replicated health value instead of independent local timers.

- **Risk: Effect spam causing frame drops**  
  *Mitigation:* cap concurrent crack/shatter particles, reuse pooled instances, and provide quality-tier fallback.

- **Risk: Respawn state leakage**  
  *Mitigation:* explicit reset routine for all crack/shatter flags and pooled FX handles during respawn init.

## Performance Guardrails
- Maintain **60 FPS target** on demo hardware with 1v1 active combat.
- Frame budget target: **<= 16.7 ms avg**, with sustained p95 under **20 ms** in stress pass.
- Cap active shatter particle instances per scene and use pooling (no unbounded allocations during combat).
- Avoid per-frame dynamic material creation; pre-bake crack stage assets/material variants.
- Keep added per-player crack/shatter memory overhead minimal and bounded (no growth across respawns).

## Dependencies
- Existing health/damage and respawn systems remain source-of-truth for lifecycle transitions.
- Availability of VFX/SFX hooks from current render/audio pipeline.
- QA bandwidth for targeted regression and multiplayer sync validation.

## Delivery Notes
Execution tasks for this plan are tracked in `RICOCHET_DEMO_TASKS.csv` under Issue #46 entries.