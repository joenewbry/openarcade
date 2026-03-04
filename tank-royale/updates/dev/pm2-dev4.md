# PM2-DEV4 Update — AI Chase/LOS Upgrade

## Scope
Upgraded `EnemyTankAI` from random grid patrol only to a lightweight **patrol + chase** behavior with LOS-gated detection and disengage logic.

## What changed
- Added explicit AI state machine:
  - `Patrol`
  - `Chase`
- Added LOS-based perception (throttled checks):
  - `detectionRange` for chase acquisition
  - `loseSightRange` + `losCheckIntervalSeconds`
  - LOS uses `Physics.RaycastNonAlloc` and nearest-hit filtering (ignores self)
- Added chase memory/disengage rules:
  - Tracks `lastKnownPlayerCell` and `lastSeenPlayerAt`
  - Disengages when:
    - player has not been seen for `disengageAfterLostSeconds`, or
    - LOS is lost and tank exceeds `maxChaseDistanceFromOrigin`
- Added chase navigation behavior:
  - Moves toward last known player cell
  - Stops push inside `chaseStopDistance`
  - Slight speed lift during chase (`chaseSpeedMultiplier`)
  - Rotates toward player when available
- Added blocked-path fallback while chasing:
  - Samples nearby cells around last known player cell to avoid obstacle jitter
- Kept patrol behavior intact:
  - random grid waypoint selection around spawn origin
  - dwell pauses at reached patrol cells

## Performance notes (lightweight)
- Replaced alloc-heavy probes with non-alloc variants for hot paths:
  - `Physics.RaycastNonAlloc` for LOS
  - `Physics.SphereCastNonAlloc` for path blocking
  - `Physics.OverlapSphereNonAlloc` for cell walkability
- Throttled expensive LOS checks via `losCheckIntervalSeconds`.
- Throttled player lookups via `PlayerLookupIntervalSeconds`.

## Files changed
- `Assets/Scripts/AI/EnemyTankAI.cs`
- `tank-royale/updates/dev/pm2-dev4.md`

## PR
- Opened PR: _pending creation in this session_
