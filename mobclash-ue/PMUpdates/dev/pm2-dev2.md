# PM2-DEV2 Update — Creature Trait Behavior Scaffold

**Timestamp:** Tue 2026-03-03 23:40 PST  
**Project:** MobClash Unreal (`/Users/joe/dev/openarcade/mobclash-ue`)  
**Focus:** Behavior states + target priority logic scaffold

## Completed

### 1) Behavior state scaffold implemented (Aggressive / Defensive / Support)
Created UE-ready C++ stubs:
- `Source/MobClash/Public/AI/CreatureBehaviorLibrary.h`
- `Source/MobClash/Private/AI/CreatureBehaviorLibrary.cpp`

Includes:
- `ECreatureBehaviorState` enum (`Aggressive`, `Defensive`, `Support`)
- Archetype behavior profile struct (`FCreatureBehaviorProfile`)
- Combat snapshot input struct (`FCreatureCombatSnapshot`)
- State resolver (`ResolveBehaviorState(...)`)
- Per-state target scoring and sorting APIs

### 2) Archetype defaults scaffolded
`MakeDefaultProfileForArchetype(...)` now returns tuned defaults for:
- **Bruiser** (default Aggressive, lower defensive threshold)
- **Scout** (default Aggressive, high mobility/backline bias)
- **Caster** (default Support, earlier defensive fallback)

### 3) Target priority logic documented + code stubbed
Added doc:
- `Docs/AI/TargetPriorityLogic.md`

Scoring includes weighted terms for:
- Distance
- Target missing HP
- Threat level
- Is target attacking ally
- In-range bonus
- Finisher bonus
- Target role bonus (Frontline/Backline/Support/Objective)

### 4) Behavior plan doc added
- `Docs/AI/CreatureBehaviorStatePlan.md`

Defines:
- State intent per behavior mode
- Transition order/conditions
- Archetype-level behavior expectations
- Recommended BT/AI-controller integration

### 5) Creature archetype data table scaffold extended
Updated:
- `Content/Data/Creatures/DT_CreatureArchetypes.csv`
- `Content/Data/Creatures/Schema_CreatureArchetypeRow.json`
- `Source/MobClash/Public/Data/MCCreatureArchetypeRow.h`

Added behavior fields:
- `DefaultBehavior`
- `DefensiveHealthThreshold`
- `SupportTriggerHealthThreshold`
- `PrimaryTargetRole`

## Notes / Blockers
- No hard blocker from RPG Monster Wave Bundle PBR for this logic pass.
- Visual/animation tuning against imported monsters still pending and should be done after asset import/validation.

## PR / Commands

```bash
# from workspace root
cd /Users/joe/dev/openarcade

git checkout -b mobclash-ue/pm2-dev2-creature-trait-behavior

git add \
  mobclash-ue/Source/MobClash/Public/AI/CreatureBehaviorLibrary.h \
  mobclash-ue/Source/MobClash/Private/AI/CreatureBehaviorLibrary.cpp \
  mobclash-ue/Docs/AI/CreatureBehaviorStatePlan.md \
  mobclash-ue/Docs/AI/TargetPriorityLogic.md \
  mobclash-ue/Content/Data/Creatures/DT_CreatureArchetypes.csv \
  mobclash-ue/Content/Data/Creatures/Schema_CreatureArchetypeRow.json \
  mobclash-ue/Source/MobClash/Public/Data/MCCreatureArchetypeRow.h \
  mobclash-ue/PMUpdates/dev/pm2-dev2.md

git commit -m "mobclash-ue: scaffold creature behavior states and target priority logic"

git push -u origin mobclash-ue/pm2-dev2-creature-trait-behavior

# open PR (if gh installed)
gh pr create \
  --title "[MobClash UE][PM2-DEV2] Creature behavior states + target priority scaffold" \
  --body "Implements Aggressive/Defensive/Support behavior scaffolding, archetype defaults, target priority scoring/sorting stubs, and docs for UE integration."
```
