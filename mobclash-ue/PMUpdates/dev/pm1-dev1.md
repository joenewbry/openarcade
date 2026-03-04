# pm1-dev1 — Board Prototype Level Setup

Date: 2026-03-03 23:40 PST  
Project: MobClash Unreal (`/Users/joe/dev/openarcade/mobclash-ue`)

## Summary
Completed PM1-DEV1 board prototype scaffolding deliverables:
- Authored board/grid lane layout plan and Unreal editor setup contract.
- Added lane/grid data CSVs for PM1↔PM2 integration.
- Added board lane row schema header for Unreal DataTable import contract.
- Added default Unreal config stubs for board prototype startup map.
- Logged missing **RPG Monster Wave Bundle PBR** dependency blocker and confirmed placeholder geometry workflow.

## Branch
- Current workspace branch: `feat/tank-royale-main-menu-flow-pm1-dev1`
- Recommended feature branch for this work: `mobclash-ue/pm1-dev1-board-prototype-level-setup`

## Files Changed
1. `Docs/BOARD_PROTOTYPE_LEVEL_SETUP.md`
2. `Docs/BLOCKERS.md`
3. `Config/DefaultEngine.ini`
4. `Config/DefaultGame.ini`
5. `Content/Data/Board/DT_BoardLaneLayout.csv`
6. `Content/Data/Board/DT_BoardGridConfig.csv`
7. `Content/Maps/L_BoardPrototype_SETUP.txt`
8. `Source/MobClash/Public/Data/MCBoardLaneRow.h`

## Asset Dependency Blocker
- **Missing:** RPG Monster Wave Bundle PBR (Fab / Unreal)
- **Impact:** Visual fidelity pass blocked.
- **Mitigation in place:** Placeholder geometry/meshes approved for lane traversal and board movement validation.

## Next Step (for PM1-dev2)
- Create `/Game/Maps/L_BoardPrototype` in Unreal Editor using the coordinates in `DT_BoardLaneLayout.csv` and `Docs/BOARD_PROTOTYPE_LEVEL_SETUP.md`.
- Hook lane DataTable into BoardManager/spawner path assignment.
- Run first 20-unit mixed-lane traversal test (>=95% completion target).

## PR / Git Commands
PR was **not opened automatically** due shared monorepo branch context containing unrelated in-flight changes. Use the exact commands below to publish only PM1-DEV1 files:

```bash
cd /Users/joe/dev/openarcade

git checkout -b mobclash-ue/pm1-dev1-board-prototype-level-setup

git add \
  mobclash-ue/Docs/BOARD_PROTOTYPE_LEVEL_SETUP.md \
  mobclash-ue/Docs/BLOCKERS.md \
  mobclash-ue/Config/DefaultEngine.ini \
  mobclash-ue/Config/DefaultGame.ini \
  mobclash-ue/Content/Data/Board/DT_BoardLaneLayout.csv \
  mobclash-ue/Content/Data/Board/DT_BoardGridConfig.csv \
  mobclash-ue/Content/Maps/L_BoardPrototype_SETUP.txt \
  mobclash-ue/Source/MobClash/Public/Data/MCBoardLaneRow.h \
  mobclash-ue/PMUpdates/dev/pm1-dev1.md

git commit -m "mobclash-ue(pm1-dev1): scaffold board prototype level setup + lane layout contract"

git push -u origin mobclash-ue/pm1-dev1-board-prototype-level-setup

gh pr create \
  --title "[MobClash UE][PM1-DEV1] Board prototype level setup scaffold" \
  --body "Adds PM1 board/grid layout plan, lane data contract CSV/schema, default map config stubs, blocker log for missing RPG Monster Wave Bundle PBR, and PM update." \
  --base main
```
