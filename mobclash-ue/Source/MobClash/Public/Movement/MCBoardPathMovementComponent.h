#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Data/MCCreatureArchetypeRow.h"
#include "MCBoardPathMovementComponent.generated.h"

class AMCBoardLanePath;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FMCBoardNodeReachedSignature, int32, NodeIndex);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FMCBoardPathCompletedSignature);

/**
 * Lightweight board-path movement component for prototype creatures.
 * Moves owner actor node-to-node at the effective speed.
 */
UCLASS(ClassGroup=(MobClash), BlueprintType, Blueprintable, meta=(BlueprintSpawnableComponent))
class MOBCLASH_API UMCBoardPathMovementComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UMCBoardPathMovementComponent();

	virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;

	/** Sets path nodes in world space and optionally starts movement immediately. */
	UFUNCTION(BlueprintCallable, Category = "MobClash|Movement")
	void SetPathFromWorldPoints(const TArray<FVector>& InWorldPoints, bool bStartImmediately = true);

	/** Pulls node locations from a placed lane actor and optionally starts movement immediately. */
	UFUNCTION(BlueprintCallable, Category = "MobClash|Movement")
	void SetPathFromLane(AMCBoardLanePath* LanePath, bool bStartImmediately = true);

	UFUNCTION(BlueprintCallable, Category = "MobClash|Movement")
	void StartPathMovement();

	UFUNCTION(BlueprintCallable, Category = "MobClash|Movement")
	void StopPathMovement();

	UFUNCTION(BlueprintCallable, Category = "MobClash|Movement")
	void ResetPathMovement();

	UFUNCTION(BlueprintPure, Category = "MobClash|Movement")
	bool IsPathMovementActive() const { return bPathMovementActive; }

	UFUNCTION(BlueprintPure, Category = "MobClash|Movement")
	int32 GetCurrentNodeIndex() const { return CurrentNodeIndex; }

	/** Direct speed hook for runtime tuning or data-table-driven setup. */
	UFUNCTION(BlueprintCallable, Category = "MobClash|Movement|Stats")
	void SetMoveSpeedFromStat(float InMoveSpeed);

	/** Convenience hook to apply archetype row data (MoveSpeed). */
	UFUNCTION(BlueprintCallable, Category = "MobClash|Movement|Stats")
	void ApplyCreatureArchetypeRow(const FMCCreatureArchetypeRow& InArchetypeRow);

	UFUNCTION(BlueprintPure, Category = "MobClash|Movement|Stats")
	float GetEffectiveMoveSpeed() const;

	/** Fired after each node snap/reach, before possible completion broadcast. */
	UPROPERTY(BlueprintAssignable, Category = "MobClash|Movement")
	FMCBoardNodeReachedSignature OnNodeReached;

	UPROPERTY(BlueprintAssignable, Category = "MobClash|Movement")
	FMCBoardPathCompletedSignature OnPathCompleted;

protected:
	virtual void BeginPlay() override;

private:
	void AdvanceAlongPath(float DeltaTime);
	void CompletePath();
	void OrientOwnerToDirection(const FVector& Direction) const;

private:
	UPROPERTY(EditAnywhere, Category = "MobClash|Movement", meta = (ClampMin = "1.0"))
	float BaseMoveSpeed = 300.0f;

	UPROPERTY(EditAnywhere, Category = "MobClash|Movement|Stats", meta = (ClampMin = "1.0", ToolTip = "Value typically supplied by creature stat row."))
	float MoveSpeedStat = 300.0f;

	UPROPERTY(EditAnywhere, Category = "MobClash|Movement|Stats", meta = (ClampMin = "0.1"))
	float SpeedStatScalar = 1.0f;

	UPROPERTY(EditAnywhere, Category = "MobClash|Movement", meta = (ClampMin = "0.0"))
	float ArrivalTolerance = 10.0f;

	UPROPERTY(EditAnywhere, Category = "MobClash|Movement")
	bool bOrientToTravelDirection = true;

	UPROPERTY(EditAnywhere, Category = "MobClash|Movement")
	bool bUseStatSpeed = true;

	UPROPERTY(EditAnywhere, Category = "MobClash|Movement")
	bool bAutoStartWhenPathSet = true;

	UPROPERTY(VisibleInstanceOnly, Category = "MobClash|Movement")
	TArray<FVector> PathWorldPoints;

	UPROPERTY(VisibleInstanceOnly, Category = "MobClash|Movement")
	int32 CurrentNodeIndex = 0;

	UPROPERTY(VisibleInstanceOnly, Category = "MobClash|Movement")
	bool bPathMovementActive = false;
};
