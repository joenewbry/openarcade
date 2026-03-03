# PM Plan — Issue #45: RICOCHET Paintball Polish

Issue reference: [#45](https://github.com/joenewbry/openarcade/issues/45)

## Objective
Deliver a focused polish pass for paintball combat feel and visual readability, while preserving current gameplay stability.

## Scope

### In Scope
1. Hurtbox tuning for center-mass consistency (torso/head hit feel).
2. Left-click shot readability improvements (muzzle/tracer/impact clarity).
3. Right-click rubber-ball bounce mark clarity (visible paint on every bounce).
4. Performance stability verification (caps/pooling/frame pacing under stress).
5. Regression validation of previous critical fixes (movement, ground collision, weapon visibility).

### Out of Scope
- New weapons, game modes, or map content expansion.
- Netcode architecture changes.
- Core movement system refactors beyond issue-specific validation.

## Execution Workstreams & Owners

- **WS1: Hit Registration Tuning** — Owner: Gameplay Engineering (`arcade-dev-03`)
- **WS2: Shot Feedback Readability** — Owner: Combat VFX (`arcade-agent-04`)
- **WS3: Bounce Mark Reliability** — Owner: Gameplay Engineering (`arcade-dev-03`)
- **WS4: Perf + Stability Validation** — Owner: Tech Architecture (`tech-architect`)
- **WS5: Regression QA + Release Signoff** — Owner: QA Lead (`arcade-qa-01`), PM (`arcade-pm`)

Task-level entries are tracked in `RICOCHET_DEMO_TASKS.csv` as `RIC-025` through `RIC-030`.

## Acceptance Criteria

Issue #45 is complete only when all criteria below are satisfied:

1. **Hit registration feels consistent on torso/head**
   - During repeated 1v1 duels, torso/head shots are perceived as predictable and fair.
   - No recurring reports of obvious off-center misses at normal combat distances.

2. **Every left click gives immediate visual shot feedback**
   - Each shot presents readable visual sequence: muzzle indication + tracer/impact response.
   - Readability remains adequate in both arenas and at close/mid range.

3. **Every rubber-ball bounce leaves visible paint mark**
   - Every bounce creates a clear, persistent paint mark on valid surfaces.
   - Marks are visible on both Warehouse and Containers maps.

4. **No regressions to movement/ground/weapon visibility**
   - Existing movement and ground-contact behavior remain stable.
   - First-person weapon/body visibility remains intact across match flow.

5. **Performance remains stable during stress use**
   - Stress firing does not degrade to unstable frame pacing.
   - Splat/projectile caps and disposal behavior continue to bound resource usage.

## Test Matrix

| Area | Scenario | Environment | Owner | Pass Criteria |
|---|---|---|---|---|
| Hitboxes | Torso/head duel consistency checks | 1v1 local + live domain | Gameplay Eng + QA | Subjective hit-feel complaints resolved; no repeatable center-mass misses |
| Left-click feedback | Rapid semiauto/hold-fire readability | Warehouse + Containers | Combat VFX + QA | Every shot has immediate visible feedback sequence |
| Bounce marks | 10+ right-click bounce chains per map | Warehouse + Containers | Gameplay Eng + QA | 100% observed bounces create visible marks |
| Regression | Movement, ground lock, weapon/body visibility | Full match lifecycle | QA | No regressions from prior movement/weapon fixes |
| Performance | 5-minute stress pass, high splat/projectile churn | Desktop target build | Tech Arch | Stable playability with capped resource behavior |

## Rollout Checklist

### Pre-merge
- [ ] Subtasks `RIC-025` to `RIC-029` marked complete with evidence notes.
- [ ] Acceptance checklist completed and linked in issue #45.
- [ ] QA regression summary attached (movement/ground/weapon visibility).

### Release prep
- [ ] Build generated from merged `main`.
- [ ] Before/after clips captured for hit feedback and bounce marks.
- [ ] Risk notes documented (known limitations, fallback plan).

### Production rollout
- [ ] Deploy updated build to demo environment.
- [ ] Run quick smoke on live domain (both maps, both fire modes).
- [ ] Monitor for immediate reports on hit feel/readability.

### Post-release
- [ ] Update issue #45 with acceptance evidence and close criteria status.
- [ ] Mark `RIC-030` complete (checklist/comms package).
- [ ] Log follow-up items (if any) as separate scoped issues.

## Risks & Mitigations

- **Risk:** Visual readability gains may increase VFX cost.
  - **Mitigation:** Keep caps/pooling constraints unchanged and validate in stress pass.
- **Risk:** Hurtbox tuning can create perceived balance shift.
  - **Mitigation:** Validate with repeated duel scenarios and fast feedback loop before release.
- **Risk:** Fixes in combat feedback unintentionally impact prior stability work.
  - **Mitigation:** Mandatory regression gate for movement/ground/weapon visibility before rollout.
