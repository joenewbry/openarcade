# Creature Behavior State Plan (PM2-DEV2)

Project: **MobClash (Unreal)**  
Path: `/Users/joe/dev/openarcade/mobclash-ue`

## Goal
Scaffold per-archetype behavior states for tonight's prototype:

- **Aggressive** (pressure and finish targets)
- **Defensive** (survive, peel, stabilize)
- **Support** (protect allies and control threat)

Implementation stubs are in:
- `Source/MobClash/Public/AI/CreatureBehaviorLibrary.h`
- `Source/MobClash/Private/AI/CreatureBehaviorLibrary.cpp`

---

## State intents

### Aggressive
Use when healthy enough to force trades and remove high-value targets.

Primary focus:
1. Backline/support enemies
2. Killable targets
3. High-threat damage dealers

### Defensive
Use when low health or under pressure.

Primary focus:
1. Nearby threats attacking allies
2. Closest safe target in range
3. Objective blockers

### Support
Use when allies are low and self is stable.

Primary focus:
1. Enemies currently threatening low-health allies
2. Enemy support units
3. Safe suppression targets

---

## Archetype default behavior profiles

### Bruiser
- Default: **Aggressive**
- Defensive threshold: **30% HP**
- Support trigger: **70% HP** (when allies are low)
- Behavior shape: frontline pressure + peel on swap

### Scout
- Default: **Aggressive**
- Defensive threshold: **25% HP**
- Support trigger: **60% HP** (when allies are low)
- Behavior shape: opportunistic backline picks, disengage quickly when threatened

### Caster
- Default: **Support**
- Defensive threshold: **40% HP**
- Support trigger: **45% HP**
- Behavior shape: protect allies, punish exposed threats from range

---

## Transition rules (stub logic)

`ResolveBehaviorState(Profile, Snapshot)` currently applies this order:

1. If `SelfHealthPct <= DefensiveHealthThreshold` -> **Defensive**
2. Else if `LowHealthAllyCount > 0` and `SelfHealthPct >= SupportTriggerHealthThreshold` -> **Support**
3. Else if `VisibleEnemyCount >= VisibleAllyCount` OR `bHasRangeAdvantage` -> **Aggressive**
4. Else -> `DefaultState`

This is intentionally lightweight so designers can tune thresholds quickly.

---

## Data + Blueprint integration notes

- `MakeDefaultProfileForArchetype(FName ArchetypeId)` returns a behavior profile for `Bruiser`, `Scout`, `Caster`.
- Profiles can later be moved to DataAssets/DataTables for designer-driven tuning.
- Current structs are `BlueprintType`, so AI Controller/Behavior Tree services can call these functions directly.

Recommended next step for PM2:
1. Feed `FCreatureCombatSnapshot` from perception + combat telemetry.
2. Run `ResolveBehaviorState` every behavior tick (or on significant combat events).
3. Use the resolved state to pick target sort weights and ability policy.
