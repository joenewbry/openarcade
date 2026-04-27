#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "MCBoardLanePath.generated.h"

/**
 * Lane authoring actor. Designers place this actor in the board level and assign
 * OrderedNodes in traversal order (Start -> End).
 */
UCLASS(BlueprintType)
class MOBCLASH_API AMCBoardLanePath : public AActor
{
	GENERATED_BODY()

public:
	AMCBoardLanePath();

	/** Ordered path nodes used by creatures to move node-to-node across the board. */
	UPROPERTY(EditInstanceOnly, BlueprintReadOnly, Category = "MobClash|Board Path")
	TArray<TObjectPtr<AActor>> OrderedNodes;

	UFUNCTION(BlueprintCallable, Category = "MobClash|Board Path")
	void GetNodeLocations(TArray<FVector>& OutLocations) const;
};
