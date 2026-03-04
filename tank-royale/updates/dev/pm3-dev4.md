# PM3-DEV4 Update — Power-up Spawner Rules

## Scope completed
Implemented a timed, weighted power-up spawn system with anti-hoarding gating for the PM3 trio:
- Ricochet
- Armor
- Block-Buster

## What was added

### 1) Timed weighted spawner
- Added `Assets/Scripts/Gameplay/TimedPowerupSpawner.cs`.
- Supports configurable per-type rules:
  - `weight`
  - `maxConcurrent`
  - `perTypeCooldownSeconds`
  - `pickupPrefab`
- Supports global spawn timing controls:
  - initial delay
  - min/max spawn interval
  - retry interval
  - max concurrent pickups
- Supports fixed spawn points and random fallback spawning.

### 2) Shared anti-hoarding / anti-chain logic
- Added `Assets/Scripts/Gameplay/PowerupPickupLockout.cs`.
- Enforces a global pickup lockout window per tank/actor (default 5s in pickup scripts).
- Lockout is checked before granting pickups.

### 3) Spawn eligibility guardrails
- Added `Assets/Scripts/Gameplay/PowerupSpawnEligibility.cs`.
- Spawner suppresses a type when no collector is eligible:
  - Offensive types blocked when tank is already holding an offensive power-up.
  - Armor blocked when shield is already active.
  - Any type blocked while pickup lockout is active.

### 4) Pickup integration updates
- Updated `ArmorBubblePickup` and `BlockBusterPickup` to apply lockout on successful pickup and reject during active lockout.
- Added `RicochetPickup` (`Assets/Scripts/Gameplay/RicochetPickup.cs`) with same anti-chain lockout behavior.

### 5) Config surface
- Extended `Assets/Scripts/Core/MatchConfig.cs` with:
  - `PowerupSpawnConfig`
  - `PowerupWeightConfig`
  - `powerups` config block for timing/weights/limits.
- Added canonical PM3 type enum: `Assets/Scripts/Gameplay/PowerupType.cs`.

### 6) Test coverage (edit mode)
- Added `Assets/Tests/EditMode/PowerupSpawnerRulesTests.cs`:
  - lockout enforcement and expiry
  - offensive anti-hoard eligibility
  - armor anti-hoard eligibility
  - lockout-aware spawn eligibility

## Notes
- This task focuses on spawn rules/fairness gating and pickup throttling.
- Effect semantics for Ricochet/Armor/Block-Buster remain governed by their respective gameplay scripts and can be tuned independently.
