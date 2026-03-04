#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "MCRankThresholdRow.generated.h"

/**
 * DataTable row schema for progression rank thresholds.
 *
 * Expected DataTable asset naming:
 * - DT_RankThresholds
 */
USTRUCT(BlueprintType)
struct MOBCLASH_API FMCRankThresholdRow : public FTableRowBase
{
	GENERATED_BODY()

	/** Rank number shown to player (1..N). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Progression")
	int32 Rank = 1;

	/** Stable id for telemetry/save references (e.g. recruit, brawler). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Progression")
	FName RankId = NAME_None;

	/** Localized rank title shown in UI. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Progression")
	FText DisplayName;

	/** Total cumulative XP required to be in this rank. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Progression", meta = (ClampMin = "0"))
	int32 TotalXPRequired = 0;

	/** XP needed from this rank to next rank (0 when rank cap). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Progression", meta = (ClampMin = "0"))
	int32 XPToNextRank = 0;

	/** Optional soft-currency reward for reaching this rank. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Progression", meta = (ClampMin = "0"))
	int32 SoftCurrencyReward = 0;
};
