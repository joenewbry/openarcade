# PM2-DEV2 Update — Spawn Director Minimal

## Completed
- Implemented a basic **Spawn Director** in `tank-royale/game.js`.
- Added configurable runtime knobs (via URL query params):
  - `spawnCadenceMs`
  - `maxConcurrentEnemies`
  - `spawnBudget`
- Hooked Spawn Director into the gameplay loop:
  - primes initial wave on round reset,
  - spawns reinforcements on cadence while below max concurrent,
  - stops spawning at budget cap.
- Updated win logic to end only when:
  - all spawned enemies are eliminated, and
  - total spawned reaches budget.
- Updated HUD enemies value to show `live/left`.
- Updated menu overlay copy + README to document Spawn Director behavior and tuning params.

## Files Changed
- `tank-royale/game.js`
- `tank-royale/index.html`
- `tank-royale/README.md`
- `tank-royale/updates/dev/pm2-dev2.md`

## Quick Validation
- `node --check tank-royale/game.js` ✅
- Manual run URL examples:
  - default: `http://127.0.0.1:8123/tank-royale/`
  - tuned: `http://127.0.0.1:8123/tank-royale/?spawnCadenceMs=1400&maxConcurrentEnemies=4&spawnBudget=16`

## PR
- Opened PR: https://github.com/joenewbry/openarcade/pull/77
