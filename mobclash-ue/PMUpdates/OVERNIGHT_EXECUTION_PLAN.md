# MobClash UE — Overnight Execution Plan (2026-03-04)

## Objective by Morning
Deliver a playable prototype loop:
1) Main Menu -> Play
2) Board lanes load
3) Units traverse lanes with distinct archetype stats
4) Basic combat resolves (targeting + damage + death)
5) Match outcome event fires
6) XP/rank/unlock pipeline executes with persistence stubs

## Active Implementation Streams
- PM1-DEV3: BoardManager lane registry + spawnpoint service
- PM1-DEV4: Traversal validation harness (20-unit test)
- PM2-DEV3: Encounter runtime (target + attack tick)
- PM2-DEV4: Health/death + win condition
- PM3-DEV2: Roster unlock binding
- PM3-DEV3: Settings save/load
- PM4-DEV2: XP + rank runtime service
- PM4-DEV4: Unlock persistence + duplicate guard

## Merge Order (when PRs land)
1. Board foundation: PM1-DEV3
2. Movement validation: PM1-DEV4
3. Combat core: PM2-DEV3
4. Health/death outcome: PM2-DEV4
5. Progression runtime: PM4-DEV2
6. Unlock persistence: PM4-DEV4
7. UI data wiring: PM3-DEV2
8. Settings persistence: PM3-DEV3

## Blocking Dependencies
- Preferred asset pack `RPG Monster Wave Bundle PBR` still absent.
- Fallback in use: GameDev Starter Kit Tanks files from Downloads.

## Morning Handoff Checklist
- [ ] PR links consolidated in `PMUpdates/gm-inbox.md`
- [ ] At least one integrated branch with board+combat+progression merged
- [ ] Run steps documented for opening playable prototype
- [ ] Known blockers clearly listed
