# PM2-DEV1 Update — Creature Archetype Data Assets

## Scope completed
Implemented initial Unreal-friendly creature archetype data for **Bruiser / Scout / Caster** with required stat fields:
- HP
- Speed
- Range
- AttackRate

## Deliverables

1. **Data values (CSV)**
   - `Content/Data/Creatures/DT_CreatureArchetypes.csv`
   - Rows:
     - Bruiser: HP 220, Speed 340, Range 125, AttackRate 0.8
     - Scout: HP 110, Speed 520, Range 160, AttackRate 1.4
     - Caster: HP 90, Speed 360, Range 650, AttackRate 1.0

2. **Unreal DataTable schema**
   - C++ row struct: `Source/MobClash/Public/Data/MCCreatureArchetypeRow.h`
   - Validation/config mirror: `Content/Data/Creatures/Schema_CreatureArchetypeRow.json`
   - `USTRUCT(BlueprintType) FMCCreatureArchetypeRow : FTableRowBase`
   - Fields: `ArchetypeId`, `DisplayName`, `MaxHP`, `MoveSpeed`, `AttackRange`, `AttackRate`

3. **Integration notes**
   - `Docs/CREATURE_ARCHETYPES.md`
   - Covers DataTable import flow + gameplay integration points (Spawner, Character init, Combat, UI/debug).

## Integration handoff

- Import CSV into DataTable asset named `DT_CreatureArchetypes` using `FMCCreatureArchetypeRow`.
- Wire DataTable read in spawn path (wave manager / lane spawner).
- On spawn, apply row stats to health, movement speed, and attack timings.

## Blockers

- None for stat/data implementation.
- Visual asset hookup still depends on canonical pack: **RPG Monster Wave Bundle PBR (Fab / Unreal)**.

## PR / command steps

```bash
cd /Users/joe/dev/openarcade

git checkout -b mobclash-ue/pm2-dev1-creature-archetypes

git add \
  mobclash-ue/Content/Data/Creatures/DT_CreatureArchetypes.csv \
  mobclash-ue/Content/Data/Creatures/Schema_CreatureArchetypeRow.json \
  mobclash-ue/Source/MobClash/Public/Data/MCCreatureArchetypeRow.h \
  mobclash-ue/Docs/CREATURE_ARCHETYPES.md \
  mobclash-ue/PMUpdates/dev/pm2-dev1.md

git commit -m "MobClash UE: add Bruiser/Scout/Caster archetype data table schema and integration notes"

git push -u origin mobclash-ue/pm2-dev1-creature-archetypes

# then open PR
# gh pr create --fill --base <target-branch> --head mobclash-ue/pm2-dev1-creature-archetypes
```
