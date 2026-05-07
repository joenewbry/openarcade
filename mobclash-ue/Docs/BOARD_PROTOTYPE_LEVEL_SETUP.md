# PM1-DEV1 — Board Prototype Level Setup (MobClash UE)

Date: 2026-03-03 23:40 PST  
Owner: PM1-DEV1  
Path: `/Users/joe/dev/openarcade/mobclash-ue`

## Guard Checks
- ✅ Path is in `mobclash-ue`
- ✅ Unreal + MobClash scope
- ⚠️ **RPG Monster Wave Bundle PBR** is not present in `Content/` yet (see blocker note). Prototype uses placeholder geometry.

---

## 1) Prototype Level Contract

Target map asset (to be created in editor):
- `/Game/Maps/L_BoardPrototype`

Board rules for MVP:
- 3 fixed lanes (no lane switching)
- Left-to-right traversal
- Lane corridor width target: **250 uu**
- Board tile size: **300 uu**
- Grid footprint: **12 columns x 7 rows**

Coordinate frame:
- `+X`: toward lane goal
- `+Y`: upward lanes
- `Z=0`: board floor plane

---

## 2) Lane Layout Plan (Authoritative for PM1↔PM2)

### Lane world-space anchors

| LaneId | LaneName | Spawn (X,Y,Z) | Goal (X,Y,Z) | CorridorWidth | Notes |
|---:|---|---|---|---:|---|
| 0 | SouthLane | (-1800,-600,0) | (1800,-600,0) | 250 | Low lane |
| 1 | MidLane | (-1800,0,0) | (1800,0,0) | 250 | Center lane |
| 2 | NorthLane | (-1800,600,0) | (1800,600,0) | 250 | High lane |

Lane spacing:
- `600 uu` between lane centerlines.

Suggested spline setup:
- `BP_LanePath_00_South`
- `BP_LanePath_01_Mid`
- `BP_LanePath_02_North`

Each spline should include at least 3 points:
1. Spawn anchor
2. Mid anchor `(0, laneY, 0)`
3. Goal anchor

---

## 3) Grid/Board Blockout Plan

Grid extents (12x7 @ 300 uu):
- X range: `[-1650 .. 1650]`
- Y range: `[-900 .. 900]`

Recommended blockout layers:
1. **BoardFloor**
   - Placeholder: `SM_Cube` scaled to tile strips per lane
2. **LaneGuides**
   - Colored material strips: South (blue), Mid (green), North (red)
3. **Spawn/Goal Markers**
   - Placeholder cylinders or cubes at lane anchors
4. **NavMeshBoundsVolume**
   - Covers full board extents + 200 uu margin

---

## 4) Unreal Setup Steps (Editor)

1. Create map `/Game/Maps/L_BoardPrototype`.
2. Add floor geometry using placeholder static meshes.
3. Add three lane spline actors with LaneId metadata `0..2`.
4. Add six marker actors:
   - `BP_LaneSpawnMarker_L0..L2`
   - `BP_LaneGoalMarker_L0..L2`
5. Add `NavMeshBoundsVolume` covering board.
6. Save map and validate lane traversal with placeholder creatures.

---

## 5) Placeholder Geometry Policy (until Fab pack import)

Use placeholders for all visual board/creature setup until dependency is imported:
- `SM_Cube` / `SM_Cylinder` for board markers and lane indicators
- Temporary mannequin/primitive mesh bindings for creature pawn visuals

Do **not** block lane/path integration on art import.

---

## 6) Dependency Blocker

Missing required pack:
- **RPG Monster Wave Bundle PBR (Fab / Unreal)**

Status:
- Blocks visual fidelity sign-off only.
- Does **not** block board traversal prototype.

Action when available:
1. Import to `Content/MobClash/Art/Monsters_RPGWave/`
2. Replace placeholder creature meshes
3. Re-run lane traversal + collision verification
