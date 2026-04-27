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

UENUM(BlueprintType)
enum class EUnlockType : uint8
{
    Starter,
    RankReward,
    Event,
    Shop
};

USTRUCT(BlueprintType)
struct FCreatureUnlockRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) FName CreatureId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 UnlockRank = 1;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) EUnlockType UnlockType = EUnlockType::RankReward;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) bool bPreviewInRosterBeforeUnlock = true;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Notes;
};
```

## Import Notes

1. Create DataTable assets in Unreal using the corresponding row struct.
2. Import each JSON file into the matching DataTable.
3. Ensure first unlock row (`Rank 1`) is available for new profiles.
4. Rank 10 is current cap (`XPToNextRank = 0`).
