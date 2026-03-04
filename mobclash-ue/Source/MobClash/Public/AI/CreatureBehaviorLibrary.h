#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "CreatureBehaviorLibrary.generated.h"

class AActor;

UENUM(BlueprintType)
enum class ECreatureBehaviorState : uint8
{
	Aggressive UMETA(DisplayName = "Aggressive"),
	Defensive UMETA(DisplayName = "Defensive"),
	Support UMETA(DisplayName = "Support")
};

UENUM(BlueprintType)
enum class ECreatureTargetRole : uint8
{
	Frontline UMETA(DisplayName = "Frontline"),
	Backline UMETA(DisplayName = "Backline"),
	Support UMETA(DisplayName = "Support"),
	Objective UMETA(DisplayName = "Objective")
};

USTRUCT(BlueprintType)
struct MOBCLASH_API FCreatureTargetPriorityWeights
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Priority")
	float DistanceWeight = 0.40f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Priority")
	float LowHealthWeight = 0.30f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Priority")
	float ThreatWeight = 0.50f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Priority")
	float AttackingAllyWeight = 0.35f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Priority")
	float InRangeWeight = 0.20f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Priority")
	float FinisherWeight = 0.45f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Priority")
	float FrontlineRoleWeight = 0.20f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Priority")
	float BacklineRoleWeight = 0.20f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Priority")
	float SupportRoleWeight = 0.20f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Priority")
	float ObjectiveRoleWeight = 0.10f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Priority")
	float MaxDistanceCm = 2000.0f;
};

USTRUCT(BlueprintType)
struct MOBCLASH_API FCreatureBehaviorProfile
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Behavior")
	FName ArchetypeId = NAME_None;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Behavior")
	ECreatureBehaviorState DefaultState = ECreatureBehaviorState::Aggressive;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Behavior", meta = (ClampMin = "0.05", ClampMax = "1.0"))
	float DefensiveHealthThreshold = 0.35f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Behavior", meta = (ClampMin = "0.05", ClampMax = "1.0"))
	float SupportTriggerHealthThreshold = 0.55f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Behavior")
	FCreatureTargetPriorityWeights AggressiveWeights;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Behavior")
	FCreatureTargetPriorityWeights DefensiveWeights;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Behavior")
	FCreatureTargetPriorityWeights SupportWeights;
};

USTRUCT(BlueprintType)
struct MOBCLASH_API FCreatureCombatSnapshot
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Snapshot", meta = (ClampMin = "0.0", ClampMax = "1.0"))
	float SelfHealthPct = 1.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Snapshot")
	int32 VisibleEnemyCount = 0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Snapshot")
	int32 VisibleAllyCount = 0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Snapshot")
	int32 LowHealthAllyCount = 0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Snapshot")
	bool bHasRangeAdvantage = false;
};

USTRUCT(BlueprintType)
struct MOBCLASH_API FCreatureTargetSnapshot
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Snapshot")
	TObjectPtr<AActor> TargetActor = nullptr;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Snapshot")
	ECreatureTargetRole Role = ECreatureTargetRole::Frontline;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Snapshot")
	float DistanceCm = 0.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Snapshot", meta = (ClampMin = "0.0", ClampMax = "1.0"))
	float HealthPct = 1.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Snapshot", meta = (ClampMin = "0.0", ClampMax = "1.0"))
	float ThreatLevel = 0.5f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Snapshot")
	bool bIsAttackingAlly = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Snapshot")
	bool bInCurrentAttackRange = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Snapshot")
	bool bIsKillableInOneHit = false;
};

UCLASS()
class MOBCLASH_API UCreatureBehaviorLibrary : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintPure, Category = "MobClash|Behavior")
	static FCreatureBehaviorProfile MakeDefaultProfileForArchetype(FName ArchetypeId);

	UFUNCTION(BlueprintPure, Category = "MobClash|Behavior")
	static ECreatureBehaviorState ResolveBehaviorState(const FCreatureBehaviorProfile& Profile, const FCreatureCombatSnapshot& Snapshot);

	UFUNCTION(BlueprintPure, Category = "MobClash|Behavior")
	static float ScoreTarget(const FCreatureTargetPriorityWeights& Weights, const FCreatureTargetSnapshot& Target);

	UFUNCTION(BlueprintPure, Category = "MobClash|Behavior")
	static float ScoreTargetForState(const FCreatureBehaviorProfile& Profile, ECreatureBehaviorState State, const FCreatureTargetSnapshot& Target);

	UFUNCTION(BlueprintCallable, Category = "MobClash|Behavior")
	static void SortTargetsForState(const FCreatureBehaviorProfile& Profile, ECreatureBehaviorState State, UPARAM(ref) TArray<FCreatureTargetSnapshot>& Targets);
};
