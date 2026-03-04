# pm2-dev3 — Data Layer + Archetype Authoring

## Scope
- Data-driven creature archetype configuration for MobClash Unreal.
- Author initial 3-archetype matrix values.
- Spawn-time stat application by archetype id.

## Tasks
1. Create archetype schema (HP, speed, range, interval, damage, priority).
2. Author Bruiser/Skirmisher/Spitter baseline entries from PM2 matrix.
3. Implement spawn binding: archetype id -> data lookup -> runtime stat init.
4. Validate live tuning path (editor value change reflected without code change).

## Acceptance Targets
- Data layer supports all matrix attributes in `PMUpdates/pm2.md`.
- Designers can tune values without touching C++/BP logic graphs.

## Deliverables
- Data Asset/DataTable definitions and three authored records.
- Short validation note proving data-driven retune flow.
