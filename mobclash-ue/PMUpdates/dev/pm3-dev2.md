# pm3-dev2 — Roster Unlock DataTable Binding (MobClash Unreal)

Date: 2026-03-04 01:30 PST
Owner: PM3-DEV2

## PR
- https://github.com/joenewbry/openarcade/pull/89

## Scope Completed

Implemented roster unlock binding so UI can read unlock table rows and render locked/unlocked roster entries.

### Added
- `Source/MobClash/Public/Data/MCCreatureUnlockRow.h`
  - `EMCUnlockType`
  - `FMCCreatureUnlockRow` (DataTable row schema for `DT_CreatureUnlocks`)
- `Source/MobClash/Public/UI/MCRosterUnlockBridge.h`
- `Source/MobClash/Private/UI/MCRosterUnlockBridge.cpp`
  - `BuildRosterEntriesFromUnlockTable(...)`
  - `IsUnlockRowUnlocked(...)`

### Behavior
- Reads all rows from unlock DataTable (`FMCCreatureUnlockRow`)
- Resolves each row's unlocked state using `CurrentRank >= UnlockRank`
- Keeps unlocked rows visible
- Keeps locked rows visible only when `bPreviewInRosterBeforeUnlock=true`
- Sorts output deterministically by `UnlockRank`, then row id
- Returns UI-ready array (`FMCRosterUnlockEntry`) with:
  - `UnlockRowId`
  - `CreatureId`
  - `UnlockRank`
  - `UnlockType`
  - `bUnlocked`
  - `bVisibleInRoster`

## Validation Steps

1. In Unreal Editor, create/import DataTable asset `DT_CreatureUnlocks` using row struct `FMCCreatureUnlockRow`.
2. In `WBP_Roster` graph, call `BuildRosterEntriesFromUnlockTable`.
   - `UnlockDataTable` -> `DT_CreatureUnlocks`
   - `CurrentRank` -> test value (e.g., 1, 3, 8)
3. Bind returned `FMCRosterUnlockEntry[]` to roster list/cards.
4. Verify lock-state expectations:
   - At rank 1, only rank-1 row is unlocked.
   - At rank 3, rank <= 3 rows are unlocked.
   - At rank 8, all sample rows in `DT_CreatureUnlocks.json` are unlocked.
5. Verify preview behavior:
   - If a row has `bPreviewInRosterBeforeUnlock=false` and is still locked, it should be omitted from output.
6. Verify stable ordering:
   - Entries are sorted by unlock rank ascending, then row id.

## Notes
- Updated docs for handoff:
  - `Docs/MENU_UMG_SHELL.md`
  - `Content/DataTables/Progression/README.md`
- This pass is UI/data-binding only (no persistence or reward-grant logic changes).
