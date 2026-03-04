# PM1-DEV2 — Creature Node-to-Node Path Movement (Unreal / MobClash)

Date: 2026-03-03  
Owner: PM1-DEV2

## What was implemented

### 1) Board lane data source actor
- Added `AMCBoardLanePath` (`Source/MobClash/Public/Board/MCBoardLanePath.h`)
- Purpose: author lane nodes in-level as an **ordered actor array** (`OrderedNodes`).
- Exposes `GetNodeLocations()` so spawn/movement logic can request node world positions in traversal order.

### 2) Creature path movement component
- Added `UMCBoardPathMovementComponent` (`Source/MobClash/Public/Movement/MCBoardPathMovementComponent.h`)
- Supports node-to-node movement with:
  - `SetPathFromWorldPoints(...)`
  - `SetPathFromLane(...)`
  - `StartPathMovement()`, `StopPathMovement()`, `ResetPathMovement()`
  - `OnNodeReached` and `OnPathCompleted` Blueprint events
- Movement behavior:
  - Moves owner actor in world-space from node index N to N+1.
  - Handles high speed without overshoot bugs (consumes remaining movement distance in a while loop).
  - Optional rotate-to-travel-direction on yaw.
  - Snap tolerance for arrival (`ArrivalTolerance`) to avoid jitter.

### 3) Speed stat hook
- Hooked movement directly to existing archetype row schema:
  - `FMCCreatureArchetypeRow` (`Source/MobClash/Public/Data/MCCreatureArchetypeRow.h`)
  - Uses `MoveSpeed` from `DT_CreatureArchetypes.csv`
- Movement component hooks:
  - `SetMoveSpeedFromStat(float InMoveSpeed)`
  - `ApplyCreatureArchetypeRow(const FMCCreatureArchetypeRow& InArchetypeRow)`
  - `GetEffectiveMoveSpeed()` (stat speed * scalar, fallback to base speed)
- This allows a spawner/creature BP to pull an archetype DataTable row and apply move speed directly before dispatching unit along lane path.

---

## Blueprint integration plan (fast path)

### A. Lane authoring blueprint (`BP_BoardLanePath`)
1. Create Blueprint class derived from `AMCBoardLanePath`.
2. Place one actor per lane in map (Lane01, Lane02, Lane03).
3. Create path node marker actors (e.g., empty actors with arrow component).
4. Assign markers to `OrderedNodes` in strict traversal order.

### B. Creature blueprint (`BP_CreatureUnit`)
1. Add `MCBoardPathMovementComponent`.
2. Expose a `CreatureStatsRowName` (Name) and `CreatureStatsTable` (DataTable of `FMCCreatureArchetypeRow`).
3. On spawn/BeginPlay:
   - Get DataTable row by name from `DT_CreatureArchetypes`.
   - Call `ApplyCreatureArchetypeRow` on movement component.
4. Bind optional events:
   - `OnNodeReached` for VFX/footstep triggers.
   - `OnPathCompleted` for despawn, damage core, or switch to combat state.

### C. Spawner blueprint (`BP_LaneSpawner`)
1. Hold array of `BP_BoardLanePath` references.
2. Spawn creature actor.
3. Set creature stats row (slow/medium/fast archetypes).
4. Call movement component `SetPathFromLane(LaneRef, true)`.
5. On path complete, either recycle actor or destroy.

---

## Test procedure (PIE)

### Test 1 — Baseline lane traversal
1. Place one lane with at least 5 nodes.
2. Spawn one creature with speed = 300.
3. Expected:
   - Creature reaches final node without stall.
   - `OnNodeReached` fires for each node in order.
   - `OnPathCompleted` fires once at end.

### Test 2 — Speed differentiation
1. Spawn 3 creatures on same lane with speeds 200 / 300 / 450.
2. Expected:
   - Arrival order is 450 -> 300 -> 200.
   - Movement remains smooth (no teleport jitter).

### Test 3 — High-speed overshoot safety
1. Spawn creature with speed 1200 on short node spacing.
2. Expected:
   - Unit can consume multiple nodes in one frame without skipping completion.
   - End event still fires exactly once.

### Test 4 — Orientation behavior
1. Enable `bOrientToTravelDirection`.
2. Use curved lane.
3. Expected:
   - Unit yaw faces movement direction while traversing.

### Test 5 — Failure/edge handling
1. Call `SetPathFromWorldPoints` with empty array.
2. Expected:
   - Unit does not move, no crash.
3. Provide lane with one invalid/null node reference.
4. Expected:
   - Invalid node is ignored by `GetNodeLocations`; movement continues on valid nodes.

---

## Current blocker note (assets)
- RPG Monster Wave Bundle PBR is still not imported in this path.
- Movement pathing validated with placeholder meshes until Fab pack is available.
