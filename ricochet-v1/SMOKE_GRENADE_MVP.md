# Smoke Grenade MVP (Issue #57 Part B)

## Scope delivered
Implemented a compact smoke grenade gameplay pass in `ricochet-v1` with:
1. **Smoke action on `G`** (in-match, pointer lock required).
2. **Thrown grenade projectile** that deploys smoke at first impact.
3. **Fixed smoke radius/lifetime** with **max 2 active** clouds.
4. **Clear visibility reduction**:
   - screen obscuration overlay while inside/looking through smoke,
   - remote player fades when behind smoke volume.
5. **One-shot loop untouched** (no damage/HP/rule changes).

## Code changes
- Added `src/smoke-grenade-system.ts`
  - grenade throw cooldown + projectile arc/impact handling
  - smoke volume lifecycle (spawn/fade/expire)
  - active-smoke cap enforcement (oldest culled at 2)
  - HUD bindings (`#smoke-status`, `#smoke-vision-overlay`)
  - line-of-sight visibility multiplier utility
- Updated `src/main.ts`
  - integrated `SmokeGrenadeSystem`
  - bound `G` throw action
  - cleared smoke on menu/lobby fail/new round/map swap
  - updated arena hint text for smoke control
  - applied smoke LOS fade to remote mesh
  - updated frame loop to tick smoke system

## Tuning (MVP)
- Smoke lifetime: **10s**
- Smoke radius: **3.8 units**
- Cooldown: **0.95s**
- Max active clouds: **2**

## Validation
- `npm run demo:build` succeeds.
- Manual smoke checks:
  - Press `G` to throw/deploy smoke.
  - Smoke expires naturally.
  - Third cloud removes the oldest when 2 are already active.
  - Visibility drops in/through smoke; remote target fades behind smoke.
