# PM4-DEV1 — Progression Data Shell (Unreal)

**Project:** MobClash Unreal  
**Path:** `/Users/joe/dev/openarcade/mobclash-ue`  
**Date:** 2026-03-03 (PST)

## Scope Completed

Implemented progression data shell for Unreal DataTables in JSON format:

1. **Rank thresholds schema + data**
   - Added schema: `Content/DataTables/Progression/Schema_RankThresholdRow.json`
   - Added table data: `Content/DataTables/Progression/DT_RankThresholds.json`
   - Includes **10 sample ranks** with cumulative XP thresholds and per-rank rewards.

2. **Creature unlock schema + data**
   - Added schema: `Content/DataTables/Progression/Schema_CreatureUnlockRow.json`
   - Added table data: `Content/DataTables/Progression/DT_CreatureUnlocks.json`
   - Includes **6 sample creature unlocks** keyed by unlock rank.

3. **UE integration notes**
   - Added: `Content/DataTables/Progression/README.md`
   - Contains suggested `FTableRowBase` struct definitions and import notes.

## Sample Design Values

- **Rank cap:** Rank 10 (`XPToNextRank = 0`)
- **Unlock cadence samples:** Rank 1, 2, 3, 4, 6, 8
- **Unlock types currently used:** `Starter`, `RankReward`

## Validation Notes

- JSON files are shaped for UE DataTable JSON import with row key field `Name`.
- External schema files are included for CI/tooling validation.

## Blockers

- None for data shell.
- Creature IDs are placeholders and should be mapped to final assets from **RPG Monster Wave Bundle PBR (Fab)** during content integration.
