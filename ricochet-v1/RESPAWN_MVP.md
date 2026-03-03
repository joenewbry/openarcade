# Respawn MVP (RIC-005)

## What was added

### 1) New respawn manager: `src/respawn-system.ts`
- Added a dedicated `RespawnSystem` with:
  - Configurable respawn delay (`default: 5000ms`)
  - Arena-specific spawn point tables for:
    - `warehouse`
    - `container`
  - `startRespawn(playerId)` flow
  - `completeRespawn()` flow
- Added window events:
  - `respawnStarted`
  - `respawnTick`
  - `playerRespawned`

### 2) Main game integration: `src/main.ts`
- Added respawn system wiring to `RicochetGame`:
  - local state lock while dead (`isRespawning` + movement lock)
  - respawn tick HUD timer updates (`#respawn-timer`)
  - full respawn application on completion:
    - `healthSystem.revive()`
    - movement state reset
    - camera/player teleport to spawn point
    - HUD health reset hooks
- Local/offline death handling:
  - listens for local `playerDied` and starts local countdown/respawn
- Weapon/network movement guards during respawn:
  - blocks firing/reload + local transform sync while respawning

### 3) Health system integration
- On respawn completion, dead state is cleared via:
  - `healthSystem.revive()`

### 4) Networking compatibility
- Server-authoritative respawn path:
  - On `death` (local victim): starts countdown with server `respawnMs`, but **does not auto-complete** locally
  - On `respawn` from server: applies server position and completes local respawn flow
- Offline/local path:
  - Local respawn manager drives the countdown and completion

### 5) Small controller support update: `src/player-controller.ts`
- Added lightweight helpers for respawn flow:
  - `lockMovement()`
  - `unlockMovement()`
  - `resetMovementState()`
  - `setPosition(x, y, z)`

## How to test

## Offline/local test
1. Run game normally (`npm run dev`) and start **Quick Play** (offline).
2. In browser console, simulate local death:
   - `window.dispatchEvent(new Event('playerDied'))`
3. Verify:
   - Death screen appears
   - Countdown ticks from 5s
   - Player respawns at arena spawn point
   - Health returns to 100
   - Movement/firing resume after respawn

## Online/server-authoritative test
1. Start WS server: `npm run net:server`
2. Open two clients:
   - Client A: Host Invite
   - Client B: Join via invite
3. Kill one player.
4. Verify on victim client:
   - Death state locks movement/fire
   - Countdown follows server death timing (`respawnMs`)
   - Respawn occurs on server `respawn` event position
   - Health resets to 100 + dead state cleared

## Arena spawn test
1. Start match in warehouse, trigger death, note respawn location.
2. Press `M` to switch to container arena.
3. Trigger death again.
4. Verify respawn positions now come from container spawn table.
