# Target Priority Logic (UE Stub)

Project: **MobClash Unreal**  
Owner: PM2-DEV2

## Files
- `Source/MobClash/Public/AI/CreatureBehaviorLibrary.h`
- `Source/MobClash/Private/AI/CreatureBehaviorLibrary.cpp`

## Summary
`UCreatureBehaviorLibrary::ScoreTarget(...)` computes a weighted target score for AI decisions.

The same scoring function is reused by all behavior states, with state-specific weight sets:
- `AggressiveWeights`
- `DefensiveWeights`
- `SupportWeights`

`SortTargetsForState(...)` sorts candidate targets descending by score.

---

## Scoring model

Given `FCreatureTargetSnapshot Target` and `FCreatureTargetPriorityWeights Weights`:

```text
DistanceNorm   = clamp(Target.DistanceCm / Weights.MaxDistanceCm, 0..1)
DistanceScore  = 1 - DistanceNorm
LowHealthScore = 1 - clamp(Target.HealthPct, 0..1)
ThreatScore    = clamp(Target.ThreatLevel, 0..1)

Score =
  DistanceScore                * DistanceWeight
+ LowHealthScore               * LowHealthWeight
+ ThreatScore                  * ThreatWeight
+ (bIsAttackingAlly ? 1 : 0)   * AttackingAllyWeight
+ (bInCurrentAttackRange ? 1:0)* InRangeWeight
+ (bIsKillableInOneHit ? 1 : 0)* FinisherWeight
+ RoleBonus(Role)
```

Role bonus is selected from:
- `FrontlineRoleWeight`
- `BacklineRoleWeight`
- `SupportRoleWeight`
- `ObjectiveRoleWeight`

---

## UE usage sketch (AI Controller / BT Service)

```cpp
const FCreatureBehaviorProfile Profile =
    UCreatureBehaviorLibrary::MakeDefaultProfileForArchetype(ArchetypeId);

const ECreatureBehaviorState State =
    UCreatureBehaviorLibrary::ResolveBehaviorState(Profile, CombatSnapshot);

UCreatureBehaviorLibrary::SortTargetsForState(Profile, State, CandidateTargets);

if (CandidateTargets.Num() > 0)
{
    const AActor* HighestPriorityTarget = CandidateTargets[0].TargetActor;
    // Set blackboard key + commit ability selection
}
```

---

## Target snapshot contract (to fill in by gameplay code)

Populate for each candidate:
- `Role` (Frontline/Backline/Support/Objective)
- `DistanceCm`
- `HealthPct`
- `ThreatLevel`
- `bIsAttackingAlly`
- `bInCurrentAttackRange`
- `bIsKillableInOneHit`

Recommended data sources:
- Perception component (visibility + range)
- Damage tracker (threat estimation)
- Ability/weapon model (one-hit kill check)

---

## Known limitations (intentional for prototype)

- Single-pass weighted score; no utility curve blending yet.
- No explicit crowd-control immunity checks.
- No line-of-sight penalty term yet.
- Hardcoded archetype defaults in C++; move to DataAsset after prototype validation.
