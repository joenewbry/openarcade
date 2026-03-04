#include "Board/MCBoardLanePath.h"

AMCBoardLanePath::AMCBoardLanePath()
{
	PrimaryActorTick.bCanEverTick = false;
}

void AMCBoardLanePath::GetNodeLocations(TArray<FVector>& OutLocations) const
{
	OutLocations.Reset();
	OutLocations.Reserve(OrderedNodes.Num());

	for (const TObjectPtr<AActor>& Node : OrderedNodes)
	{
		if (IsValid(Node))
		{
			OutLocations.Add(Node->GetActorLocation());
		}
	}
}
