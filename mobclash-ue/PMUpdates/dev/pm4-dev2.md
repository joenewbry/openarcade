# PM4-DEV2 — XP Award + Rank Resolution Runtime Service

**Project:** MobClash Unreal  
**Path:** `/Users/joe/dev/openarcade/mobclash-ue`  
**Branch:** `mobclash-ue/pm4-dev2-xp-runtime`  
**Commit:** `01bcd2c`  
**PR:** https://github.com/joenewbry/openarcade/pull/91

## Scope Completed

Implemented a runtime progression service that:

1. Grants XP to a player progression state.
2. Resolves rank transitions from `DT_RankThresholds` data.
3. Returns newly unlocked IDs for crossed unlock ranks from `DT_CreatureUnlocks`.

## Implementation Details

### Added runtime row schema
- `Source/MobClash/Public/Data/MCRankThresholdRow.h`
  - Defines `FMCRankThresholdRow` (`Rank`, `RankId`, `DisplayName`, `TotalXPRequired`, `XPToNextRank`, `SoftCurrencyReward`).

### Added runtime service
- `Source/MobClash/Public/Progression/MCProgressionRuntimeService.h`
- `Source/MobClash/Private/Progression/MCProgressionRuntimeService.cpp`

Service type:
- `UMCProgressionRuntimeService : UGameInstanceSubsystem`

Key API:
- `ReloadProgressionData()`
- `ResolveRankForTotalXP(int32 TotalXP)`
- `GrantXP(FMCPlayerProgressState& ProgressState, int32 XPToGrant)`
- `CalculateMatchXP(bool bWonMatch, bool bFirstMatchOfSession)`

Grant output:
- Previous/New XP
- Previous/New Rank
- Rank change flag
- `NewlyUnlockedIds` (unlock row IDs)
- `NewlyUnlockedRewards` (unlock ID + creature ID + unlock rank)

### Config wiring
- Updated `Config/DefaultGame.ini`:
  - `RankThresholdTable=/Game/DataTables/Progression/DT_RankThresholds.DT_RankThresholds`
  - `CreatureUnlockTable=/Game/DataTables/Progression/DT_CreatureUnlocks.DT_CreatureUnlocks`
  - XP defaults: win=100, loss=60, first-match bonus=40

## Test Procedure (UE Editor)

1. Import/create DataTable assets in Unreal:
   - `DT_RankThresholds` using `FMCRankThresholdRow`
   - `DT_CreatureUnlocks` using `FMCCreatureUnlockRow`
   - Place at:
     - `/Game/DataTables/Progression/DT_RankThresholds`
     - `/Game/DataTables/Progression/DT_CreatureUnlocks`

2. In a test Blueprint (e.g., GameInstance/Controller), get subsystem:
   - `Get Game Instance Subsystem` -> `MCProgressionRuntimeService`

3. Create `FMCPlayerProgressState` with:
   - `TotalXP = 0`
   - `CurrentRank = 1`
   - empty `GrantedUnlockIds`

4. Call `GrantXP` with a single-threshold crossing (e.g., +130 XP):
   - Expect rank change from 1 to 2 (based on `DT_RankThresholds`)
   - Expect `NewlyUnlockedIds` to include rank-2 unlock row ID(s)

5. Call `GrantXP` with multi-threshold crossing (e.g., +1000 XP from low XP):
   - Expect multiple rank jumps
   - Expect unlock IDs for all ranks crossed (deduped against `GrantedUnlockIds`)

6. Re-call `GrantXP` without crossing new unlock rank:
   - Expect no duplicate unlock IDs returned

7. Verify `CalculateMatchXP` helper:
   - Win + first match => 140
   - Loss + first match => 100
   - Win without bonus => 100

## Notes
- Service logs warnings when DataTables are missing and keeps rank resolution safe (`Rank=1` fallback behavior).
- Unlock IDs returned are DataTable row names to keep them stable for UI/persistence integration.
