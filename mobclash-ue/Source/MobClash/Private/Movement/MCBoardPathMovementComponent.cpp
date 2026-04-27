#include "Movement/MCBoardPathMovementComponent.h"

#include "Board/MCBoardLanePath.h"
#include "GameFramework/Actor.h"

UMCBoardPathMovementComponent::UMCBoardPathMovementComponent()
{
	PrimaryComponentTick.bCanEverTick = true;
}

void UMCBoardPathMovementComponent::BeginPlay()
{
	Super::BeginPlay();
}

void UMCBoardPathMovementComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

	if (!bPathMovementActive)
	{
		return;
	}

	AdvanceAlongPath(DeltaTime);
}

void UMCBoardPathMovementComponent::SetPathFromWorldPoints(const TArray<FVector>& InWorldPoints, bool bStartImmediately)
{
	PathWorldPoints = InWorldPoints;
	CurrentNodeIndex = 0;
	bPathMovementActive = false;

	if ((bStartImmediately || bAutoStartWhenPathSet) && PathWorldPoints.Num() > 0)
	{
		StartPathMovement();
	}
}

void UMCBoardPathMovementComponent::SetPathFromLane(AMCBoardLanePath* LanePath, bool bStartImmediately)
{
	TArray<FVector> LanePoints;
	if (IsValid(LanePath))
	{
		LanePath->GetNodeLocations(LanePoints);
	}

	SetPathFromWorldPoints(LanePoints, bStartImmediately);
}

void UMCBoardPathMovementComponent::StartPathMovement()
{
	bPathMovementActive = PathWorldPoints.IsValidIndex(CurrentNodeIndex);
}

void UMCBoardPathMovementComponent::StopPathMovement()
{
	bPathMovementActive = false;
}

void UMCBoardPathMovementComponent::ResetPathMovement()
{
	PathWorldPoints.Reset();
	CurrentNodeIndex = 0;
	bPathMovementActive = false;
}

void UMCBoardPathMovementComponent::SetMoveSpeedFromStat(float InMoveSpeed)
{
	MoveSpeedStat = FMath::Max(1.0f, InMoveSpeed);
}

void UMCBoardPathMovementComponent::ApplyCreatureArchetypeRow(const FMCCreatureArchetypeRow& InArchetypeRow)
{
	SetMoveSpeedFromStat(InArchetypeRow.MoveSpeed);
}

float UMCBoardPathMovementComponent::GetEffectiveMoveSpeed() const
{
	if (bUseStatSpeed)
	{
		return FMath::Max(1.0f, MoveSpeedStat * SpeedStatScalar);
	}

	return FMath::Max(1.0f, BaseMoveSpeed);
}

void UMCBoardPathMovementComponent::AdvanceAlongPath(float DeltaTime)
{
	AActor* OwnerActor = GetOwner();
	if (!IsValid(OwnerActor))
	{
		bPathMovementActive = false;
		return;
	}

	float RemainingDistance = GetEffectiveMoveSpeed() * DeltaTime;
	FVector CurrentLocation = OwnerActor->GetActorLocation();

	while (RemainingDistance > KINDA_SMALL_NUMBER && bPathMovementActive)
	{
		if (!PathWorldPoints.IsValidIndex(CurrentNodeIndex))
		{
			CompletePath();
			return;
		}

		const FVector TargetLocation = PathWorldPoints[CurrentNodeIndex];
		const FVector ToTarget = TargetLocation - CurrentLocation;
		const float DistanceToTarget = ToTarget.Size();

		if (DistanceToTarget <= ArrivalTolerance)
		{
			CurrentLocation = TargetLocation;
			OwnerActor->SetActorLocation(CurrentLocation, false);

			OnNodeReached.Broadcast(CurrentNodeIndex);
			++CurrentNodeIndex;

			if (!PathWorldPoints.IsValidIndex(CurrentNodeIndex))
			{
				CompletePath();
			}

			continue;
		}

		if (RemainingDistance >= DistanceToTarget)
		{
			const FVector MoveDir = ToTarget.GetSafeNormal();
			OrientOwnerToDirection(MoveDir);

			CurrentLocation = TargetLocation;
			OwnerActor->SetActorLocation(CurrentLocation, false);
			RemainingDistance -= DistanceToTarget;

			OnNodeReached.Broadcast(CurrentNodeIndex);
			++CurrentNodeIndex;

			if (!PathWorldPoints.IsValidIndex(CurrentNodeIndex))
			{
				CompletePath();
			}

			continue;
		}

		const FVector MoveDirection = ToTarget / DistanceToTarget;
		CurrentLocation += MoveDirection * RemainingDistance;
		OwnerActor->SetActorLocation(CurrentLocation, false);
		OrientOwnerToDirection(MoveDirection);
		RemainingDistance = 0.0f;
	}
}

void UMCBoardPathMovementComponent::CompletePath()
{
	bPathMovementActive = false;
	OnPathCompleted.Broadcast();
}

void UMCBoardPathMovementComponent::OrientOwnerToDirection(const FVector& Direction) const
{
	if (!bOrientToTravelDirection)
	{
		return;
	}

	AActor* OwnerActor = GetOwner();
	if (!IsValid(OwnerActor) || Direction.IsNearlyZero())
	{
		return;
	}

	FRotator MoveRotation = Direction.Rotation();
	MoveRotation.Pitch = 0.0f;
	MoveRotation.Roll = 0.0f;
	OwnerActor->SetActorRotation(MoveRotation);
}
