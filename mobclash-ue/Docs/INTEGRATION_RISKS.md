# Integration Risk Audit (QA2)

Date: 2026-03-03 23:40 PST  
Project: **MobClash (Unreal)**  
Scope: Cross-system integration readiness for tonight’s playable prototype.

---

## 1) Dependency Validation — RPG Monster Wave Bundle PBR

**Required dependency:** `RPG Monster Wave Bundle PBR (Fab / Unreal)`  
Referenced in:
- `Docs/KICKOFF.md`
- `Docs/NAMESPACE_POLICY.md`

### Validation performed
- Checked project content for imported Fab creature assets.
- Current `Content/` file inventory shows only data/schema files:
  - `Content/Data/Creatures/DT_CreatureArchetypes.csv`
  - `Content/DataTables/Progression/Schema_CreatureUnlockRow.json`
  - `Content/DataTables/Progression/Schema_RankThresholdRow.json`

### Result
- **Status: BLOCKER (missing dependency).**
- The required bundle is **not currently present/imported** in this project.

### Impact
- Final art/animation fidelity validation is blocked.
- Core movement/combat/progression integration can continue with placeholders.

### Mitigation / Next action
- Continue gameplay integration using placeholder meshes.
- Track blocker in PM/GM updates until Fab import is complete.
- Once imported, run a focused art-integration regression pass (mesh assignment, animation bindings, collision fit, performance check).

---

## 2) Top Integration Risks (Current)

| Risk | Severity | Integration Failure Mode | Mitigation / Gate |
|---|---|---|---|
| Lane contract mismatch (PM1 board paths vs PM2 lane-follow logic) | High | Creatures stall, drift, or fail to reach end zone | Lock canonical lane path source + lane ID contract; validate with traversal gate suite |
| Spawn-to-lane assignment instability | High | Units spawn wrong lane or lane-switch unexpectedly | Enforce single-lane assignment per unit; add lane ID debug overlay/logging |
| Runtime stat application drift (DataTable -> pawn/combat) | High | Creature differences (speed/HP/range) not visible despite configured values | Spawn-time stat audit log; compare configured vs runtime values on 3 archetypes |
| Menu->Board handoff instability (PM3 -> PM1/PM2) | Medium | “Play” path fails to start board simulation reliably | Require repeatable Main -> Play -> Board loop with no dead ends/crashes |
| Progression event coupling issues (PM4 results flow) | Medium | Rank/unlock events fail or duplicate after match completion | One-shot unlock guard + save/reload persistence checks |
| Missing RPG Monster Wave Bundle PBR assets | Medium (currently active) | Visual validation blocked; potential late integration churn | Use placeholders now; log blocker; run post-import regression pass |

---

## 3) Acceptance Gates — “Creatures Walking Across Board”

These are **must-pass gates** for QA2 sign-off of the movement objective.

1. **Board Entry Gate**
   - From Main Menu, `Play/Start` reaches board scene without blocking error.

2. **Lane Topology Gate**
   - Minimum **3 lanes** are present.
   - Each lane has valid Start and End transforms.

3. **Spawn Integrity Gate**
   - Spawned creature appears in assigned lane start region (within ±10 uu tolerance).
   - Creature remains assigned to exactly one lane for MVP.

4. **Traversal Success Gate**
   - In a 20-creature mixed-lane run, **>=95%** reach lane end or valid combat-stop state.
   - No creature remains permanently stalled (>3s without state change).

5. **Path Fidelity Gate**
   - Creature stays in lane corridor bounds (target corridor width: 250 uu).
   - No persistent off-board/navmesh-escape behavior in a 5-minute soak.

6. **Distinct Characteristic Gate**
   - At least 3 archetypes exhibit measurable differences in:
     - Move speed (arrival times differ on equal distance)
     - HP durability (time-to-defeat differs)
     - Attack range/engage distance

7. **Motion Quality Gate**
   - Units maintain forward-facing movement and stable animation state transitions (Idle/Move/Attack/Move) without stuck state >0.5s after condition change.

8. **Performance Gate (Prototype Floor)**
   - During movement test wave, maintain playable framerate (target 60 FPS, minimum acceptable 45 FPS on dev machine).

9. **Asset Fallback/Blocker Gate**
   - If RPG Monster Wave Bundle PBR is still missing, placeholders are used and blocker remains explicitly logged.
   - This gate is mandatory for truthful reporting; visual polish is not required for movement pass.

---

## 4) QA2 Go/No-Go Rule

- **GO (movement objective):** Gates 1–9 pass (with placeholder allowance if asset blocker still active).
- **NO-GO:** Any High-severity gate fails (lane topology, spawn integrity, traversal success, path fidelity, or stat differentiation).
- Asset blocker does not prevent movement QA, but blocks visual-fidelity sign-off until Fab import is complete.
