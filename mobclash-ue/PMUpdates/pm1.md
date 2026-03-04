# PM1 Update — Board/Map (MobClash Unreal)

Date: 2026-03-03 23:40 PST
Scope: Tonight board prototype for creatures walking across board lanes.

## Guard Checks (Namespace Policy)
- ✅ Path: `/Users/joe/dev/openarcade/mobclash-ue`
- ✅ Project/Engine mention: MobClash + Unreal Engine
- ⚠️ Required asset source: **RPG Monster Wave Bundle PBR (Fab / Unreal)** not present in `Content/` yet; proceed with placeholder meshes for movement tests and log as blocker for visual fidelity.

## Tonight Backlog (Board Prototype)
Priority order for a playable map-board movement loop tonight:

1. **Board Map Skeleton (P0)**
   - Create `BP_BoardMap` level layout with lane paths (minimum 3 lanes).
   - Define Start zone and End zone per lane with clear transforms.
   - Add lane spline/path actors (`BP_LanePath_01..03`) for movement driving.

2. **Navigation + Walkability Pass (P0)**
   - Generate NavMesh bounds over board play area.
   - Verify each lane is traversable from Start -> End without nav breaks.
   - Add debug visualization toggle for lane paths + nav.

3. **Creature Spawn/Walk Harness (P0)**
   - Build lane spawn points and timed wave test spawner (`BP_LaneSpawner`).
   - Spawn placeholder creatures if Fab pack not yet imported.
   - Route creatures along lane path/spline and despawn on End zone.

4. **Per-Creature Movement Params (P1)**
   - Data table for speed + HP + range placeholders.
   - Confirm speed differences are visible while traversing same lane.

5. **Board Camera + Readability Pass (P1)**
   - Top-down/isometric board camera framing all lanes.
   - Ensure creatures remain visible and lane occupancy is readable.

6. **Prototype Validation + Capture (P1)**
   - 60–90s capture showing waves crossing board.
   - Log known issues and blockers for GM handoff.

---

## Acceptance Criteria — “Creatures Walking Across Board”
Prototype is accepted only when all criteria pass:

1. **Map Load/Start**
   - From prototype start, board level loads successfully with no blocking errors.

2. **Lane Path Integrity**
   - At least **3 lanes** exist; each lane has valid Start and End nodes.
   - Each lane supports uninterrupted traversal Start -> End.

3. **Creature Traversal Success Rate**
   - In a 20-creature test wave (mixed lanes), **>= 95%** reach End or valid combat stop state.
   - No creature permanently stalls for >3s without state transition.

4. **Movement Fidelity**
   - Creatures face movement direction and advance smoothly (no major jitter/teleport).
   - Off-path drift remains within lane tolerance (visually on-lane).

5. **Speed Differentiation**
   - At least 3 creature archetypes show distinct traversal times on identical lane distance.

6. **Performance Baseline (Prototype)**
   - Maintains playable framerate in PIE with active wave test (target 60 fps dev machine, minimum acceptable 45 fps during test).

7. **Fallback Asset Handling**
   - If RPG Monster Wave Bundle PBR not imported, placeholder meshes are used and blocker is logged.

8. **Debug/Verification Support**
   - Debug overlays/logs can confirm lane assignment and traversal state per creature.

---

## Dev Subtasks (PM1) + Dependencies

### pm1-dev1 — Board/Lane Authoring
- Deliver:
  - Board level blockout and 3 lane paths.
  - Start/End markers and lane IDs.
- Depends on: none (starts immediately).
- Blocks: pm1-dev2, pm1-dev3, pm1-dev4.

### pm1-dev2 — Spawn + Path Movement Integration
- Deliver:
  - Spawner actor and lane assignment logic.
  - Creature movement along lane paths/splines; end-of-lane completion/despawn.
- Depends on: pm1-dev1 lane path actors + IDs.
- Blocks: pm1-dev4 validation run.

### pm1-dev3 — Navigation/Collision/Readability Pass
- Deliver:
  - NavMesh coverage and collision cleanup.
  - Camera framing + lane readability tweaks.
- Depends on: pm1-dev1 base board geometry.
- Parallel with: pm1-dev2 after lane IDs are stable.
- Blocks: pm1-dev4 signoff if traversal fails due to nav/collision.

### pm1-dev4 — Validation, Instrumentation, Handoff
- Deliver:
  - Run acceptance suite, collect metrics (success rate, traversal times, fps).
  - Capture video evidence and issue list.
- Depends on: pm1-dev2 + pm1-dev3 complete.
- Output: final test report + go/no-go for tonight prototype.

### Dependency Chain (condensed)
- `pm1-dev1 -> (pm1-dev2 + pm1-dev3) -> pm1-dev4`

## Risks / Blockers
- **Current blocker:** RPG Monster Wave Bundle PBR assets not yet present in project `Content/`.
- Mitigation: continue with placeholder creatures for movement acceptance; swap meshes once bundle import completes.
