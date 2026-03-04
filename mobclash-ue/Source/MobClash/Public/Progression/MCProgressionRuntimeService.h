#pragma once

#include "CoreMinimal.h"
#include "Data/MCCreatureUnlockRow.h"
#include "Data/MCRankThresholdRow.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "MCProgressionRuntimeService.generated.h"

class UDataTable;

USTRUCT(BlueprintType)
struct MOBCLASH_API FMCGrantedUnlockReward
{
	GENERATED_BODY()

	/** Canonical unlock id (DataTable row name). */
	UPROPERTY(BlueprintReadOnly, Category = "Progression")
	FName UnlockId = NAME_None;

	/** Creature id granted by this unlock. */
	UPROPERTY(BlueprintReadOnly, Category = "Progression")
	FName CreatureId = NAME_None;

	/** Rank that gates this unlock. */
	UPROPERTY(BlueprintReadOnly, Category = "Progression")
	int32 UnlockRank = 1;
};

USTRUCT(BlueprintType)
struct MOBCLASH_API FMCPlayerProgressState
{
	GENERATED_BODY()

	/** Lifetime cumulative XP for this profile. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression", meta = (ClampMin = "0"))
	int32 TotalXP = 0;

	/** Last resolved rank for this profile (kept in sync by GrantXP). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression", meta = (ClampMin = "1"))
	int32 CurrentRank = 1;

	/** Unlock ids already granted to this profile. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression")
	TSet<FName> GrantedUnlockIds;
};

USTRUCT(BlueprintType)
struct MOBCLASH_API FMCXPGrantResult
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Progression")
	int32 PreviousXP = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Progression")
	int32 NewXP = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Progression")
	int32 GrantedXP = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Progression")
	int32 PreviousRank = 1;

	UPROPERTY(BlueprintReadOnly, Category = "Progression")
	int32 NewRank = 1;

	UPROPERTY(BlueprintReadOnly, Category = "Progression")
	bool bRankChanged = false;

	/** Convenience list for PM4 UI flow: unlock ids newly granted by this XP grant. */
	UPROPERTY(BlueprintReadOnly, Category = "Progression")
	TArray<FName> NewlyUnlockedIds;

	UPROPERTY(BlueprintReadOnly, Category = "Progression")
	TArray<FMCGrantedUnlockReward> NewlyUnlockedRewards;
};

/**
 * Runtime progression service for post-match XP grants.
 *
 * Responsibilities:
 * - Load rank thresholds from DT_RankThresholds
 * - Resolve rank transitions from pre-XP to post-XP
 * - Return newly granted unlock ids for crossed ranks
 */
UCLASS(BlueprintType, Config = Game, DefaultConfig)
class MOBCLASH_API UMCProgressionRuntimeService : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;

	/** Reloads cached rank + unlock rows from configured DataTables. */
	UFUNCTION(BlueprintCallable, Category = "MobClash|Progression")
	bool ReloadProgressionData();

	UFUNCTION(BlueprintPure, Category = "MobClash|Progression")
	bool HasLoadedData() const;

	/** Resolves rank from cumulative XP using DT_RankThresholds. */
	UFUNCTION(BlueprintPure, Category = "MobClash|Progression")
	int32 ResolveRankForTotalXP(int32 TotalXP) const;

	/** Applies XP to player state and returns rank + unlock transition details. */
	UFUNCTION(BlueprintCallable, Category = "MobClash|Progression")
	FMCXPGrantResult GrantXP(UPARAM(ref) FMCPlayerProgressState& ProgressState, int32 XPToGrant);

	/** Optional helper for MVP award policy from PM4 (win/loss/first-session bonus). */
	UFUNCTION(BlueprintPure, Category = "MobClash|Progression")
	int32 CalculateMatchXP(bool bWonMatch, bool bFirstMatchOfSession) const;

private:
	/** DataTable containing FMCRankThresholdRow entries (DT_RankThresholds). */
	UPROPERTY(Config, EditAnywhere, Category = "Progression|Data")
	TSoftObjectPtr<UDataTable> RankThresholdTable;

	/** DataTable containing FMCCreatureUnlockRow entries (DT_CreatureUnlocks). */
	UPROPERTY(Config, EditAnywhere, Category = "Progression|Data")
	TSoftObjectPtr<UDataTable> CreatureUnlockTable;

	UPROPERTY(Config, EditAnywhere, Category = "Progression|XP", meta = (ClampMin = "0"))
	int32 MatchWinXP = 100;

	UPROPERTY(Config, EditAnywhere, Category = "Progression|XP", meta = (ClampMin = "0"))
	int32 MatchLossXP = 60;

	UPROPERTY(Config, EditAnywhere, Category = "Progression|XP", meta = (ClampMin = "0"))
	int32 FirstMatchBonusXP = 40;

	struct FUnlockCacheEntry
	{
		FName UnlockId = NAME_None;
		FMCCreatureUnlockRow Row;
	};

	TArray<FMCRankThresholdRow> CachedRankThresholds;
	TArray<FUnlockCacheEntry> CachedUnlockRows;
};
