# PM2 Update — Creature Systems (MobClash Unreal)

Date: 2026-03-03 (PST)

## 1) Creature Archetypes (MVP set)

We will ship 3 gameplay-distinct archetypes for lane combat validation:

1. **Bruiser (Frontliner)**
   - Slow, high HP, short range
   - Purpose: absorb damage and hold lane space
2. **Skirmisher (Assassin/Runner)**
   - Fast, low HP, melee range, high DPS burst
   - Purpose: quickly reach backline targets and pressure timing windows
3. **Spitter (Ranged Caster)**
   - Medium speed, medium HP, long range
   - Purpose: sustain ranged pressure behind frontline

### Characteristic Matrix (tunable MVP baselines)

| Archetype | Role | Max HP | Move Speed (uu/s) | Attack Range (uu) | Attack Interval (s) | Damage/Hit | Target Priority | Countered By |
|---|---|---:|---:|---:|---:|---:|---|---|
| Bruiser | Tank / lane anchor | 220 | 260 | 120 | 1.20 | 24 | Nearest enemy in lane | Kiting + ranged focus |
| Skirmisher | Flanker / finisher | 110 | 420 | 100 | 0.55 | 18 | Lowest HP in range | Frontline body-block + burst |
| Spitter | Backline DPS | 140 | 300 | 520 | 1.00 | 20 | Highest HP in range | Gap close / dive |

**Notes:**
- Values are intentionally compressed for first playable balance pass.
- All values data-driven via Data Assets/Data Table so designers can tune without code changes.

---

## 2) Behavior Acceptance Criteria (Movement + Combat MVP)

### Movement MVP Acceptance Criteria

1. **Spawn & Lane Assignment**
   - Given a unit spawn event, unit appears at lane spawn transform within ±10 uu position error.
   - Unit is assigned to exactly one lane and never switches lanes in MVP.

2. **Forward Progress**
   - Unit moves continuously toward lane goal at archetype speed ±5% while not in combat.
   - Over 10-second sample window with no combat, traveled distance is within ±8% of expected speed model.

3. **Path Fidelity**
   - Unit stays within lane corridor bounds (configurable width, default 250 uu).
   - No off-board movement or navmesh escape during 5-minute soak test with 50 total spawns.

4. **Collision/Spacing Stability**
   - Friendly units maintain minimum separation (default 60 uu) to reduce overlap jitter.
   - No persistent interpenetration >1.0s between alive units.

5. **Animation State Switching**
   - Idle -> Move -> Attack -> Move transitions occur with no stuck state longer than 0.5s after condition changes.

### Combat MVP Acceptance Criteria

1. **Target Acquisition**
   - Unit acquires valid enemy in same lane when enemy enters attack range.
   - Initial target lock occurs within 0.2s of enemy entering range.

2. **Attack Timing**
   - Damage events occur at configured attack interval ±0.1s over 20 attacks.
   - No double-hit on a single interval tick.

3. **Damage & Death Resolution**
   - Incoming damage reduces HP deterministically; HP cannot drop below 0.
   - On HP <= 0, death event fires once, unit disables collision/combat, and despawns (or ragdoll) within 2.0s.

4. **Range/LOS Rules (MVP Simplified)**
   - Melee units attack only within melee range threshold.
   - Ranged units can attack without advanced LOS checks in MVP (lane unobstructed assumption).

5. **Combat Exit & Resume Movement**
   - If target dies or exits range, unit reacquires target or resumes lane movement within 0.3s.

6. **Determinism Under Load (Prototype Scope)**
   - In PIE test with 30 concurrent units, no combat logic stall >200 ms and no crash/assert from creature systems.

---

## 3) Dev Subtask Assignments (pm2-dev1..pm2-dev4)

### pm2-dev1 — Movement Core + Lane Following
- Implement base creature pawn/character blueprint + movement component wiring.
- Implement lane-follow logic (spline or waypoint chain) and speed-by-archetype config.
- Add debug visualization: lane id, desired velocity, current speed.
- **DoD:** Meets movement criteria #1-#3 in automated/recorded test map.

### pm2-dev2 — Combat Core + Targeting
- Implement target detection (sphere overlap/range checks) constrained to lane.
- Implement attack loop timers, hit application, and per-archetype attack profiles.
- Implement target priority modes (Nearest / Lowest HP / Highest HP).
- **DoD:** Meets combat criteria #1-#3 and #5 in test harness.

### pm2-dev3 — Data Layer + Archetype Authoring
- Create data definitions for archetype stats (HP/speed/range/interval/damage/priority).
- Author Bruiser, Skirmisher, Spitter entries in data assets/table.
- Wire spawn system to instantiate by archetype id and apply stat profile on spawn.
- **DoD:** Design can retune all matrix values without code edits; hot reload verified.

### pm2-dev4 — Animation/State + QA Harness
- Implement state machine glue (Idle/Move/Attack/Death) and event transitions.
- Add lightweight test level + scripted wave spawner for acceptance checks.
- Build perf/soak script: 30-unit stress run and 5-minute lane stability run.
- **DoD:** Meets movement criterion #5 and combat criterion #6; produces pass/fail report.

## Dependency / Risk Notes
- Canonical target asset pack remains **RPG Monster Wave Bundle PBR** (Fab / Unreal).
- **Immediate fallback source (per latest user update):** use the two newest `Downloads` files for **GameDev Starter Kit - Tanks** (GLTF edition + Level Design Demo) as temporary creature/mesh proxies for movement/combat validation.
- If neither source is available, proceed with placeholder skeletal/static meshes and log blocker; behavior validation remains unblocked.
- PM1 lane data contract required early (lane transforms / path source) for stable integration.
