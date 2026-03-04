#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "MCBoardLaneRow.generated.h"

/**
 * DataTable row schema for board lane contract (PM1 -> PM2 integration).
 *
 * Expected DataTable asset naming:
 * - DT_BoardLaneLayout (imported from DT_BoardLaneLayout.csv)
 */
USTRUCT(BlueprintType)
struct FMCBoardLaneRow : public FTableRowBase
{
	GENERATED_BODY()

	/** Stable integer lane id (0-based). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lane")
	int32 LaneId = 0;

	/** Designer-facing lane label. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lane")
	FString LaneName;

	/** Spawn anchor for units assigned to this lane. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lane")
	FVector Spawn = FVector::ZeroVector;

	/** Goal anchor (units move from Spawn toward Goal). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lane")
	FVector Goal = FVector::ZeroVector;

	/** Allowed lane corridor half-width for drift checks (uu). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lane", meta = (ClampMin = "0.0"))
	float CorridorWidth = 250.0f;

	/** Cached lane distance in uu for quick validation/debug. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Lane", meta = (ClampMin = "0.0"))
	float LaneLength = 0.0f;
};
