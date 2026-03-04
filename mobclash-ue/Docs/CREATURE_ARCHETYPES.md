# MobClash Creature Archetypes (Unreal)

## Implemented archetypes

Data source: `Content/Data/Creatures/DT_CreatureArchetypes.csv`
Primary Unreal schema: `FMCCreatureArchetypeRow` in `Source/MobClash/Public/Data/MCCreatureArchetypeRow.h`
Validation schema mirror: `Content/Data/Creatures/Schema_CreatureArchetypeRow.json`

| Archetype | MaxHP | MoveSpeed (uu/s) | AttackRange (uu) | AttackRate (attacks/s) |
|---|---:|---:|---:|---:|
| Bruiser | 220 | 340 | 125 | 0.8 |
| Scout | 110 | 520 | 160 | 1.4 |
| Caster | 90 | 360 | 650 | 1.0 |

## Unreal DataTable setup

1. In Unreal Editor, create/import DataTable from CSV:
   - **Row Struct:** `FMCCreatureArchetypeRow`
   - **CSV:** `Content/Data/Creatures/DT_CreatureArchetypes.csv`
2. Save DataTable asset as `DT_CreatureArchetypes`.
3. Reference this DataTable in creature spawning/game mode systems.

## Integration points

1. **Spawner / Wave Manager**
   - Pick row by `ArchetypeId` or row name.
   - Pass row stats into spawned creature initialization.

2. **Creature Pawn/Character Initialization**
   - `MaxHP` -> Health component max/current health.
   - `MoveSpeed` -> `CharacterMovement->MaxWalkSpeed` (or custom movement component value).

3. **Combat Component**
   - `AttackRange` -> target validation distance.
   - `AttackRate` -> attack cooldown (`Cooldown = 1.0 / AttackRate`, with zero guard).

4. **UI / Debug**
   - `DisplayName` for unit card/tooltip.
   - Show archetype + core stats in debug overlays to validate balancing.

## Asset dependency note

The gameplay logic here is independent of art mesh choice. While integrating visuals, use the canonical source:
- **RPG Monster Wave Bundle PBR (Fab / Unreal)**

If assets are not imported yet, bind placeholder meshes and continue validating movement/combat with these archetype stats.
