#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "MCCreatureUnlockRow.generated.h"

/** Types of unlock entries supported by progression tables. */
UENUM(BlueprintType)
enum class EMCUnlockType : uint8
{
	Starter UMETA(DisplayName = "Starter"),
	RankReward UMETA(DisplayName = "Rank Reward"),
	Event UMETA(DisplayName = "Event"),
	Shop UMETA(DisplayName = "Shop")
};

/**
 * DataTable row schema for creature unlock rewards.
 *
 * Expected DataTable asset naming:
 * - DT_CreatureUnlocks
 */
USTRUCT(BlueprintType)
struct MOBCLASH_API FMCCreatureUnlockRow : public FTableRowBase
{
	GENERATED_BODY()

	/** Stable creature id unlocked at UnlockRank. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Progression")
	FName CreatureId = NAME_None;

	/** Minimum rank needed for this unlock. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Progression", meta = (ClampMin = "1"))
	int32 UnlockRank = 1;

	/** Unlock source/category. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Progression")
	EMCUnlockType UnlockType = EMCUnlockType::RankReward;

	/** If true, UI may preview this creature before unlock. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Progression")
	bool bPreviewInRosterBeforeUnlock = true;

	/** Optional design notes for editors/docs. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Progression")
	FString Notes;
};
