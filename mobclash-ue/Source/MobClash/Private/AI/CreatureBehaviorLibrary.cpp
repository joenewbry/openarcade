#include "AI/CreatureBehaviorLibrary.h"

#include "Algo/Sort.h"

namespace MobClashBehavior
{
	static FCreatureTargetPriorityWeights MakeAggressiveWeights()
	{
		FCreatureTargetPriorityWeights Weights;
		Weights.DistanceWeight = 0.30f;
		Weights.LowHealthWeight = 0.45f;
		Weights.ThreatWeight = 0.55f;
		Weights.AttackingAllyWeight = 0.20f;
		Weights.InRangeWeight = 0.25f;
		Weights.FinisherWeight = 0.55f;
		Weights.FrontlineRoleWeight = 0.10f;
		Weights.BacklineRoleWeight = 0.40f;
		Weights.SupportRoleWeight = 0.35f;
		Weights.ObjectiveRoleWeight = 0.05f;
		return Weights;
	}

	static FCreatureTargetPriorityWeights MakeDefensiveWeights()
	{
		FCreatureTargetPriorityWeights Weights;
		Weights.DistanceWeight = 0.55f;
		Weights.LowHealthWeight = 0.20f;
		Weights.ThreatWeight = 0.60f;
		Weights.AttackingAllyWeight = 0.55f;
		Weights.InRangeWeight = 0.30f;
		Weights.FinisherWeight = 0.10f;
		Weights.FrontlineRoleWeight = 0.30f;
		Weights.BacklineRoleWeight = 0.15f;
		Weights.SupportRoleWeight = 0.20f;
		Weights.ObjectiveRoleWeight = 0.20f;
		return Weights;
	}

	static FCreatureTargetPriorityWeights MakeSupportWeights()
	{
		FCreatureTargetPriorityWeights Weights;
		Weights.DistanceWeight = 0.35f;
		Weights.LowHealthWeight = 0.35f;
		Weights.ThreatWeight = 0.40f;
		Weights.AttackingAllyWeight = 0.65f;
		Weights.InRangeWeight = 0.20f;
		Weights.FinisherWeight = 0.20f;
		Weights.FrontlineRoleWeight = 0.25f;
		Weights.BacklineRoleWeight = 0.15f;
		Weights.SupportRoleWeight = 0.45f;
		Weights.ObjectiveRoleWeight = 0.10f;
		return Weights;
	}

	static float GetRoleBonus(const FCreatureTargetPriorityWeights& Weights, ECreatureTargetRole Role)
	{
		switch (Role)
		{
		case ECreatureTargetRole::Frontline:
			return Weights.FrontlineRoleWeight;
		case ECreatureTargetRole::Backline:
			return Weights.BacklineRoleWeight;
		case ECreatureTargetRole::Support:
			return Weights.SupportRoleWeight;
		case ECreatureTargetRole::Objective:
			return Weights.ObjectiveRoleWeight;
		default:
			return 0.0f;
		}
	}

	static const FCreatureTargetPriorityWeights& GetWeightsForState(const FCreatureBehaviorProfile& Profile, ECreatureBehaviorState State)
	{
		switch (State)
		{
		case ECreatureBehaviorState::Aggressive:
			return Profile.AggressiveWeights;
		case ECreatureBehaviorState::Defensive:
			return Profile.DefensiveWeights;
		case ECreatureBehaviorState::Support:
			return Profile.SupportWeights;
		default:
			return Profile.AggressiveWeights;
		}
	}
}

FCreatureBehaviorProfile UCreatureBehaviorLibrary::MakeDefaultProfileForArchetype(FName ArchetypeId)
{
	FCreatureBehaviorProfile Profile;
	Profile.ArchetypeId = ArchetypeId;
	Profile.AggressiveWeights = MobClashBehavior::MakeAggressiveWeights();
	Profile.DefensiveWeights = MobClashBehavior::MakeDefensiveWeights();
	Profile.SupportWeights = MobClashBehavior::MakeSupportWeights();

	if (ArchetypeId == TEXT("Bruiser"))
	{
		Profile.DefaultState = ECreatureBehaviorState::Aggressive;
		Profile.DefensiveHealthThreshold = 0.30f;
		Profile.SupportTriggerHealthThreshold = 0.70f;
		Profile.AggressiveWeights.FrontlineRoleWeight = 0.35f;
		Profile.AggressiveWeights.BacklineRoleWeight = 0.25f;
		Profile.DefensiveWeights.AttackingAllyWeight = 0.70f;
	}
	else if (ArchetypeId == TEXT("Scout"))
	{
		Profile.DefaultState = ECreatureBehaviorState::Aggressive;
		Profile.DefensiveHealthThreshold = 0.25f;
		Profile.SupportTriggerHealthThreshold = 0.60f;
		Profile.AggressiveWeights.DistanceWeight = 0.45f;
		Profile.AggressiveWeights.BacklineRoleWeight = 0.55f;
		Profile.DefensiveWeights.DistanceWeight = 0.70f;
	}
	else if (ArchetypeId == TEXT("Caster"))
	{
		Profile.DefaultState = ECreatureBehaviorState::Support;
		Profile.DefensiveHealthThreshold = 0.40f;
		Profile.SupportTriggerHealthThreshold = 0.45f;
		Profile.SupportWeights.SupportRoleWeight = 0.60f;
		Profile.SupportWeights.AttackingAllyWeight = 0.75f;
		Profile.DefensiveWeights.DistanceWeight = 0.75f;
	}

	return Profile;
}

ECreatureBehaviorState UCreatureBehaviorLibrary::ResolveBehaviorState(const FCreatureBehaviorProfile& Profile, const FCreatureCombatSnapshot& Snapshot)
{
	const float ClampedSelfHealth = FMath::Clamp(Snapshot.SelfHealthPct, 0.0f, 1.0f);

	if (ClampedSelfHealth <= Profile.DefensiveHealthThreshold)
	{
		return ECreatureBehaviorState::Defensive;
	}

	if (Snapshot.LowHealthAllyCount > 0 && ClampedSelfHealth >= Profile.SupportTriggerHealthThreshold)
	{
		return ECreatureBehaviorState::Support;
	}

	if (Snapshot.VisibleEnemyCount >= Snapshot.VisibleAllyCount || Snapshot.bHasRangeAdvantage)
	{
		return ECreatureBehaviorState::Aggressive;
	}

	return Profile.DefaultState;
}

float UCreatureBehaviorLibrary::ScoreTarget(const FCreatureTargetPriorityWeights& Weights, const FCreatureTargetSnapshot& Target)
{
	const float DistanceNorm = FMath::Clamp(Target.DistanceCm / FMath::Max(Weights.MaxDistanceCm, 1.0f), 0.0f, 1.0f);
	const float DistanceScore = 1.0f - DistanceNorm;
	const float LowHealthScore = 1.0f - FMath::Clamp(Target.HealthPct, 0.0f, 1.0f);
	const float ThreatScore = FMath::Clamp(Target.ThreatLevel, 0.0f, 1.0f);

	float Score = 0.0f;
	Score += DistanceScore * Weights.DistanceWeight;
	Score += LowHealthScore * Weights.LowHealthWeight;
	Score += ThreatScore * Weights.ThreatWeight;
	Score += (Target.bIsAttackingAlly ? 1.0f : 0.0f) * Weights.AttackingAllyWeight;
	Score += (Target.bInCurrentAttackRange ? 1.0f : 0.0f) * Weights.InRangeWeight;
	Score += (Target.bIsKillableInOneHit ? 1.0f : 0.0f) * Weights.FinisherWeight;
	Score += MobClashBehavior::GetRoleBonus(Weights, Target.Role);

	return Score;
}

float UCreatureBehaviorLibrary::ScoreTargetForState(const FCreatureBehaviorProfile& Profile, ECreatureBehaviorState State, const FCreatureTargetSnapshot& Target)
{
	const FCreatureTargetPriorityWeights& Weights = MobClashBehavior::GetWeightsForState(Profile, State);
	return ScoreTarget(Weights, Target);
}

void UCreatureBehaviorLibrary::SortTargetsForState(const FCreatureBehaviorProfile& Profile, ECreatureBehaviorState State, TArray<FCreatureTargetSnapshot>& Targets)
{
	const FCreatureTargetPriorityWeights& Weights = MobClashBehavior::GetWeightsForState(Profile, State);

	Algo::Sort(Targets, [&Weights](const FCreatureTargetSnapshot& A, const FCreatureTargetSnapshot& B)
	{
		const float AScore = UCreatureBehaviorLibrary::ScoreTarget(Weights, A);
		const float BScore = UCreatureBehaviorLibrary::ScoreTarget(Weights, B);
		return AScore > BScore;
	});
}
