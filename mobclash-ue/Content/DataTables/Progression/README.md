# MobClash Progression Data Shell (UE DataTables)

This folder contains JSON-first shells for Unreal DataTable import.

## Tables

- `DT_RankThresholds.json` — 10-rank progression ladder.
- `DT_CreatureUnlocks.json` — creature unlock gates (6 sample unlocks).

## Row Schema Files

- `Schema_RankThresholdRow.json`
- `Schema_CreatureUnlockRow.json`

These JSON schema files are for validation in tooling/CI and mirror expected UE row structs.

## Suggested UE Structs

For creature unlock rows, use the concrete in-project schema:

- `Source/MobClash/Public/Data/MCCreatureUnlockRow.h`
  - `EMCUnlockType`
  - `FMCCreatureUnlockRow`

Reference example for rank table struct shape:

```cpp
USTRUCT(BlueprintType)
struct FRankThresholdRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 Rank = 1;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FName RankId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FText DisplayName;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 TotalXPRequired = 0;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 XPToNextRank = 0;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 SoftCurrencyReward = 0;
};
```

## Import Notes

1. Create DataTable assets in Unreal using the corresponding row struct.
2. Import each JSON file into the matching DataTable.
3. Ensure first unlock row (`Rank 1`) is available for new profiles.
4. Rank 10 is current cap (`XPToNextRank = 0`).
