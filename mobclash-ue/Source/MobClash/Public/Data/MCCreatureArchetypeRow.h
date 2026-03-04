#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "MCCreatureArchetypeRow.generated.h"

/**
 * DataTable row schema for MobClash creature archetypes.
 *
 * Expected DataTable asset naming:
 * - DT_CreatureArchetypes (imported from DT_CreatureArchetypes.csv)
 */
USTRUCT(BlueprintType)
struct FMCCreatureArchetypeRow : public FTableRowBase
{
	GENERATED_BODY()

	/** Stable id for code and save-data references (e.g., Bruiser/Scout/Caster). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Archetype")
	FName ArchetypeId = NAME_None;

	/** Player-facing name used in UI. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Archetype")
	FString DisplayName;

	/** Max hit points at spawn. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Stats", meta = (ClampMin = "1.0"))
	float MaxHP = 100.0f;

	/** Ground movement speed in Unreal units/second. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Stats", meta = (ClampMin = "0.0"))
	float MoveSpeed = 400.0f;

	/** Attack reach in Unreal units. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Stats", meta = (ClampMin = "0.0"))
	float AttackRange = 150.0f;

	/** Attacks per second. Higher values attack faster. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Stats", meta = (ClampMin = "0.0"))
	float AttackRate = 1.0f;

	/** Initial behavior state name (Aggressive / Defensive / Support). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Behavior")
	FName DefaultBehavior = TEXT("Aggressive");

	/** Switch to Defensive when current HP percent drops to this threshold. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Behavior", meta = (ClampMin = "0.0", ClampMax = "1.0"))
	float DefensiveHealthThreshold = 0.35f;

	/** May switch to Support above this self HP threshold when allies are low. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Behavior", meta = (ClampMin = "0.0", ClampMax = "1.0"))
	float SupportTriggerHealthThreshold = 0.55f;

	/** Preferred target role when selecting among equally scored targets. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Behavior")
	FName PrimaryTargetRole = TEXT("Frontline");
};
