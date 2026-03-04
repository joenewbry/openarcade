# MobClash UE — Technical Architecture (MVP)

## 1) Purpose and MVP Scope
This document defines the Unreal architecture for the **board-combat MVP** for MobClash.

MVP outcomes:
1. Main Menu → Start Match flow
2. Board map loads with lane routes
3. Creatures spawn and traverse lanes with distinct stats (HP/speed/range)
4. Basic combat loop (targeting + attack + death)
5. Progression shell (rank + unlock placeholders in data/UI)

Assumption: Unreal Engine 5.x project structure under:
`/Users/joe/dev/openarcade/mobclash-ue`

---

## 2) High-Level System Layout
Use a **hybrid C++ + Blueprint** approach:
- C++ for deterministic gameplay core and data plumbing
- Blueprints for rapid iteration of content, FX, and UI binding

### Core runtime systems
- **GameMode**: match bootstrap, wave progression control, win/loss conditions
- **GameState**: replicated/shared match state (phase, wave index, timers)
- **PlayerController**: menu/pause/input mode and UI orchestration
- **BoardManager Actor**: board lanes, spawn points, path references, board rules
- **Creature Pawn + AIController**: movement/combat behaviors
- **DataAssets**: creature archetypes, wave definitions, unlock/rank placeholders
- **UMG**: HUD + menu + progression shell

### Recommended folder organization
```
Content/MobClash/
  Blueprints/
    Core/           (BP_MC_GameMode, BP_MC_GameState, BP_MC_PlayerController)
    Board/          (BP_MC_BoardManager, lane spline actors)
    Creatures/      (BP_MC_CreaturePawn, BP_MC_CreatureAIController)
    UI/             (WBP_MainMenu, WBP_HUD, WBP_PostMatch, WBP_Progression)
  Data/
    Creatures/      (DA_Creature_*.uasset)
    Waves/          (DA_WaveSet_*.uasset)
    Progression/    (DA_UnlockTable_*.uasset)
  Art/
    Monsters_RPGWave/ (Fab import target)
  Maps/
    L_MainMenu
    L_Board_MVP
```

---

## 3) Game Flow and Class Responsibilities

## 3.1 Match lifecycle
1. `L_MainMenu` loads, `WBP_MainMenu` shown
2. Start pressed → open `L_Board_MVP`
3. `AMCGameMode` initializes board + wave set
4. Spawn cycle begins, creatures move and fight
5. End condition triggers (all waves cleared = win, objective destroyed = loss)
6. `WBP_PostMatch` + progression shell update

## 3.2 GameMode (`AMCGameMode` / `BP_MC_GameMode`)
Responsibilities:
- Select active `UDataAsset` wave set
- Own match phase state machine:
  - `PreMatch`
  - `Spawning`
  - `InWave`
  - `Intermission`
  - `MatchEnd`
- Trigger creature spawns via `BoardManager`
- Evaluate end conditions
- Push phase/wave updates to GameState for UI

Suggested interfaces:
- `StartMatchFromMenu()`
- `BeginWave(int32 WaveIndex)`
- `HandleCreatureReachedGoal(AMCCreaturePawn* Pawn)`
- `HandleCreatureKilled(AMCCreaturePawn* Pawn)`
- `TryAdvanceWaveOrEndMatch()`

## 3.3 GameState (`AMCGameState`)
Tracks shared state:
- Current phase
- Current wave index
- Active enemy count
- Time to next wave / wave elapsed
- Objective HP (or equivalent board life)

UMG reads from GameState (or ViewModel wrapper) for stable UI updates.

## 3.4 BoardManager (`AMCBoardManager`)
Single authority for board topology:
- Lane definitions (spline/path references)
- Spawn transforms per lane
- Goal transforms per lane
- Optional tile occupancy metadata (future tactics expansion)

Key functions:
- `GetLanePath(int32 LaneId)`
- `GetSpawnPoint(int32 LaneId)`
- `GetGoalPoint(int32 LaneId)`
- `SpawnCreatureForWaveEntry(const FWaveSpawnEntry& Entry)`

---

## 4) Creature Architecture (Pawn + AIController)

## 4.1 Creature Pawn (`AMCCreaturePawn` / `BP_MC_CreaturePawn`)
Components:
- `UCapsuleComponent` (collision)
- `USkeletalMeshComponent` (visual)
- `UFloatingPawnMovement` or `UCharacterMovementComponent` (if Character-based)
- `UWidgetComponent` (health bar, optional)
- Combat component (`UMCCombatComponent`) and stats component (`UMCStatsComponent`)

Core runtime data:
- Current HP / Max HP
- MoveSpeed
- AttackRange
- AttackRate
- Damage
- Faction/team
- Lane assignment
- Archetype ID (from DataAsset)

Events:
- `OnReachedGoal`
- `OnDamaged`
- `OnDeath`

## 4.2 AIController (`AMCCreatureAIController` / `BP_MC_CreatureAIController`)
Behavior model (MVP-simple):
- Move along assigned lane path
- Acquire nearest valid target in range
- Stop and attack while target valid/in range
- Resume lane movement when target lost/dead

Implementation options:
- **Option A (recommended MVP):** Lightweight state machine in controller/component
- **Option B:** Behavior Tree + Blackboard (better long-term scale)

MVP states:
- `Advance`
- `AcquireTarget`
- `Attack`
- `Dead`

## 4.3 Targeting/combat rules (MVP)
- Prioritize closest enemy in lane overlap/radius
- Attack cooldown timer per creature
- Damage is direct hit (no projectile required for MVP; projectiles can be cosmetic)
- Death triggers cleanup + reward/event callback to GameMode

---

## 5) Data-Driven Setup (DataAssets)
Use DataAssets to avoid hardcoding and to support PM/design tuning without code changes.

## 5.1 Creature Archetype DataAsset
`UMCDA_CreatureArchetype : UPrimaryDataAsset`

Fields:
- `FName CreatureId`
- `FText DisplayName`
- `TSubclassOf<AMCCreaturePawn> PawnClass`
- `float MaxHP`
- `float MoveSpeed`
- `float AttackRange`
- `float AttackRate`
- `float AttackDamage`
- `int32 Cost` (future)
- `FGameplayTagContainer Tags` (e.g., Role.Melee, Type.Monster)
- Visual refs (mesh/anim/material overrides if needed)

## 5.2 Wave Set DataAsset
`UMCDA_WaveSet : UPrimaryDataAsset`

Types:
- `FWaveSpawnEntry { CreatureId, LaneId, Count, SpawnInterval, StartDelay }`
- `FWaveDefinition { TArray<FWaveSpawnEntry> Entries, float IntermissionAfterWave }`

Fields:
- `TArray<FWaveDefinition> Waves`
- `int32 StartingBoardHP`
- Optional rewards per wave

## 5.3 Progression/Unlock placeholder DataAsset
`UMCDA_UnlockTable : UPrimaryDataAsset`

Fields:
- Rank thresholds (XP → Rank)
- Unlock rows (placeholder IDs + required rank)
- Text/icon references for UMG preview

This supports MVP shell now and full meta progression later.

---

## 6) UMG/UI Architecture

## 6.1 Widgets
- `WBP_MainMenu`
  - Start button
  - Optional settings shortcut
- `WBP_HUD`
  - Wave index / phase label
  - Objective HP
  - Alive enemy count
  - Speed controls (optional MVP+)
- `WBP_PostMatch`
  - Win/Loss
  - Summary stats
  - Continue button
- `WBP_Progression`
  - Rank readout
  - Unlock table placeholder panel

## 6.2 Data flow
- UI reads match values from `AMCGameState`
- UI reads static progression from `UMCDA_UnlockTable`
- PlayerController manages widget stack and input modes:
  - MainMenu: UI-only
  - Match: Game+UI
  - PostMatch: UI-only

Keep UMG logic thin; avoid putting gameplay state mutations inside widgets.

---

## 7) Integrating “RPG Monster Wave Bundle PBR” from Fab

## 7.1 Import pipeline
1. Open Fab in UE and add **RPG Monster Wave Bundle PBR** to project.
2. Import assets into a dedicated namespace:
   - `Content/MobClash/Art/Monsters_RPGWave/`
3. Do not scatter imported assets in root `Content/`.

## 7.2 Normalization pass (required)
For each selected monster used in MVP:
- Verify scale matches board tile/lane metrics
- Verify skeleton/animation assets and animation blueprint compatibility
- Ensure collision capsules are gameplay-safe (no oversized bounds)
- Create **MobClash material instances** for palette consistency
- Set LOD policy (aggressive for distant lane actors)

## 7.3 Gameplay binding
Create per-archetype Blueprint child pawns:
- `BP_MC_Creature_Goblin`, `BP_MC_Creature_Orc`, etc.
- Assign imported skeletal mesh + anim class
- Hook corresponding `DA_Creature_*` entries

Use DataAssets as the single source for stats; visuals should be swappable without changing combat code.

## 7.4 If Fab pack is blocked/missing
Fallback plan:
- Use placeholder mannequin/monster meshes with same class/data wiring
- Log blocker in PM updates
- Continue system development (movement/combat/UI) independently of final art

---

## 8) Performance Plan and Constraints

## 8.1 Why explicit constraints are needed
Dev hardware (RTX 5090) can hide CPU/GPU bottlenecks. MVP must be profiled to **shipping-relevant** targets.

## 8.2 Performance targets
- **Primary target:** 60 FPS at 1080p on mid-tier hardware
- **Stretch target:** 60 FPS at 1440p on upper-mid hardware
- **Dev target (5090):** maintain >120 FPS at 1440p Epic for headroom checks, but validate under constrained profiles

Budget guidance (60 FPS frame = 16.67 ms):
- Game thread: <= 6 ms
- Render thread: <= 6 ms
- GPU: <= 10 ms at target settings

## 8.3 5090 development constraints (anti-overfit)
During day-to-day development, enforce at least one constrained test mode:
- `t.MaxFPS 60`
- `r.ScreenPercentage 100` (avoid hidden supersampling drift)
- `sg.ViewDistanceQuality=2`
- `sg.AntiAliasingQuality=2`
- `sg.ShadowQuality=2`
- `sg.PostProcessQuality=2`
- `sg.TextureQuality=2`
- `sg.EffectsQuality=2`
- `sg.FoliageQuality=1`

Also test with `stat unit`, `stat game`, `stat gpu`, `stat scenerendering` and capture Unreal Insights sessions at wave peaks.

## 8.4 Scalability tiers for lower hardware
Define presets exposed in settings and/or DeviceProfiles:

### Low (entry GPUs / laptops)
- 900p–1080p dynamic resolution
- Shadows Low, Post Low, Effects Low
- Reduced lane VFX density
- Lower crowd cap per lane (or reduced simultaneous active AI)

### Medium (GTX 1660 / RTX 2060 class)
- 1080p native
- Medium shadows/post/effects
- Standard spawn caps

### High (RTX 3060+)
- 1080p–1440p
- High textures/effects
- Higher FX density, improved shadows

### Epic/Dev (RTX 5090)
- 1440p–4K
- Epic settings allowed
- Optional cinematic extras, but never required for gameplay readability

## 8.5 MVP optimization priorities
1. Keep AI decision loop lightweight (timer-driven instead of heavy per-tick scans)
2. Use distance-based update throttling for off-focus actors
3. Pool repeated transient actors where possible (future projectile/VFX scale)
4. Limit expensive translucent overdraw in lane-heavy scenes
5. Ensure texture memory budgets via LOD bias and texture groups

---

## 9) Implementation Sequence (recommended)
1. **Core shell:** GameMode/GameState/PlayerController + map transitions
2. **Board + lanes:** BoardManager + lane path definitions
3. **Creature loop:** Pawn + AIController + health/combat events
4. **Data pass:** Creature and Wave DataAssets wired into spawning
5. **UI pass:** Main menu, HUD, post-match, progression placeholder
6. **Fab integration:** Replace placeholders with RPG Monster Wave assets
7. **Perf pass:** constrained profile validation + scalability tuning

---

## 10) Risks and Mitigations
- **Risk:** Asset import delays from Fab
  - **Mitigation:** placeholder meshes with final class/data pipeline preserved
- **Risk:** 5090-only assumptions produce poor low-end performance
  - **Mitigation:** mandatory constrained preset testing per feature
- **Risk:** Blueprint logic sprawl
  - **Mitigation:** keep gameplay logic in C++/components, BP for composition/tuning

---

## 11) Definition of Done (Architecture)
- Class responsibilities are explicit and implemented in project skeleton
- At least 3 creature archetypes data-driven via DataAssets
- At least 3 waves authored through Wave DataAsset
- Main menu → match → post-match complete loop functional
- Fab monster assets integrated (or blocker documented with placeholder fallback active)
- Performance verified on constrained settings with captured profiling evidence
