# GM Inbox

## [QA1] 2026-03-03 23:40 PST — Pre-dev QA checklist ready (Vertical Slice)

Completed deliverable: `Docs/QA_CHECKLIST_MVP.md`

Coverage included:
- Board movement validation (spawn, lane traversal, stat-driven behavior, stability/re-entry loops)
- Menu navigation checks (start flow, input coverage, UX focus, recovery loops)
- Progression unlock event checks (rank threshold triggering, idempotency, save/reload persistence, edge cases)

Top risks flagged (with severity + mitigation in doc):
1. Lane movement desync (**High**) — lock canonical path source + lane bound assertions
2. Menu soft-locks between transitions (**High**) — explicit UI state machine + loop test
3. Unlock event double-fire/no-fire (**High**) — one-shot unlock guards + event tracing logs
4. Data table/runtime stat mismatch (**Medium**) — spawn-time stat verification logs
5. Asset dependency gap on RPG Monster Wave Bundle PBR (**Medium**) — placeholder meshes + blocker logging

Recommended QA exit criteria tonight:
- Repeatable Menu -> Board flow
- 3 creature archetypes visibly distinct (speed/HP/range)
- Rank/unlock path validated including save/reload
- 10-run smoke with no critical crash

---

## [PM3-DEV1] 2026-03-03 23:58 PST — UMG menu shell + Play route map landed (code scaffold)

Completed deliverables:
- `PMUpdates/dev/pm3-dev1.md`
- `Docs/MENU_UMG_SHELL.md`
- `PR/commands`
- C++ menu shell classes under `Source/MobClash/...`

What is done:
- Main menu widget contract includes required actions: **Play / Roster / Progress / Settings**.
- Menu root widget handles screen switching and back flow from submenus.
- Default route map configured: `PlayBoard -> L_BoardPrototype` (overridable).
- Menu startup shell wired through `AMCMenuPlayerController` + `AMCMenuGameMode` + `Config/DefaultGame.ini`.

What is still needed in Editor:
- Create and bind Widget Blueprints (`WBP_MenuRoot`, `WBP_MainMenu`, submenu shells).
- Ensure map assets exist (`/Game/Maps/L_MainMenu`, `/Game/Maps/L_BoardPrototype`) or update route map to PM1 final board level.

## [QA2] 2026-03-03 23:40 PST — Integration risk audit complete

Completed deliverable: `Docs/INTEGRATION_RISKS.md`

Highlights:
- Validated required dependency **RPG Monster Wave Bundle PBR** is not present in current `Content/` import set.
- Logged this as an active blocker for final visual-fidelity integration; gameplay validation may proceed with placeholders.
- Added explicit QA acceptance gates for **"creatures walking across board"** (board entry, lane topology, spawn integrity, traversal success >=95%, path fidelity, stat differentiation, motion quality, performance floor, blocker/fallback truthfulness).
- Published GO/NO-GO rule tying movement sign-off to high-severity gate pass status.

## [TA1] 2026-03-03 23:40 PST — Unreal MVP architecture delivered

Completed deliverable: `Docs/TECH_ARCH_MVP.md`

Coverage included:
- End-to-end UE board-combat MVP architecture: GameMode/GameState lifecycle, BoardManager, Creature Pawn + AIController loop
- Data-driven setup for creatures, waves, and progression placeholders via DataAssets
- UMG stack design for MainMenu, HUD, PostMatch, and Progression shell
- Fab integration plan for **RPG Monster Wave Bundle PBR** (import namespace, normalization, archetype binding, fallback placeholders)
- Performance constraints for RTX 5090 dev workflows plus scalable presets for lower-tier hardware with profiling guidance

Status: Ready for PM1–PM4 execution planning and task decomposition.

## [PM2] 2026-03-03 23:41 PST — Creature Systems MVP spec + task split delivered

Completed deliverables:
- `PMUpdates/pm2.md`
- `PMUpdates/dev/pm2-dev1.md`
- `PMUpdates/dev/pm2-dev2.md`
- `PMUpdates/dev/pm2-dev3.md`
- `PMUpdates/dev/pm2-dev4.md`

Highlights:
- Defined 3 creature archetypes for Unreal lane combat MVP (Bruiser, Skirmisher, Spitter) with characteristic matrix (HP/speed/range/interval/damage/priority).
- Set explicit movement/combat behavior acceptance criteria (spawn/lane lock, path fidelity, timing, damage/death resolution, load stability).
- Assigned dev subtasks pm2-dev1..pm2-dev4 with scope + DoD.

Asset status update:
- Canonical pack remains **RPG Monster Wave Bundle PBR**.
- Per latest user instruction, immediate fallback is the two newest `Downloads` files for **GameDev Starter Kit - Tanks** (GLTF edition + Level Design Demo), to be used as temporary proxies for movement/combat validation.

## [TA2] 2026-03-03 23:41 PST — Fab integration runbook + fallback ingest path added

Completed deliverable:
- `Docs/FAB_INTEGRATION.md`

Highlights:
- Documented primary Unreal Fab import flow for **RPG Monster Wave Bundle PBR** (preflight, import options, validation checklist).
- Added immediate fallback bootstrap ingest path using:
  - `/Users/joe/Downloads/assethunts_gamedev_starter_kit_tanks_gltf_edition_v100.zip`
  - `/Users/joe/Downloads/assethunts_gamedev_starter_kit_tanks_level_design_demo_v100.zip`
- Captured blocker matrix and mitigations (Fab entitlement/network, glTF plugin setup, .blend conversion requirement for level demo pack).
