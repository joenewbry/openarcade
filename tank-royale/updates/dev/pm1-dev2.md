# PM1-DEV2 Update — Settings Screen

Date: 2026-03-03

## Scope delivered
Implemented Tank Royale settings upgrades for PM1 lane:

1. **Audio sliders**
   - Master
   - Music
   - SFX
2. **Graphics preset selector**
   - Low / Balanced / High
3. **Control sensitivity slider**
   - 0.50x to 1.60x
4. **Keyboard keybinding entry points**
   - Move Up / Down / Left / Right
   - Fire
   - Menu
5. **Persistence**
   - Settings load/save via `localStorage` key `tankRoyale.settings.v1`

## Keyboard + touch compatibility
- Keyboard keybind system now powers gameplay actions.
- Arrow keys remain as movement fallback.
- Touch D-pad + FIRE remains active for coarse pointers.
- Sensitivity multiplier affects player movement in both keyboard and touch input paths.

## Files changed
- `tank-royale/index.html`
- `tank-royale/game.js`
- `tank-royale/README.md`
- `tank-royale/updates/dev/pm1-dev2.md`

## Verification run
- `node --check tank-royale/game.js`
- Manual checks performed:
  1. Open Settings from Main Menu.
  2. Modify audio sliders, Apply, refresh → values persist.
  3. Change graphics preset, start match → visual intensity/grid changes.
  4. Change sensitivity, start match → movement speed changes.
  5. Rebind Fire/Menu and movement keys, Apply → new bindings work.
  6. Confirm touch controls remain usable (D-pad + FIRE).

## Notes
- Updated `index.html` module import path to `./game.js?v=pm1-dev2` to avoid stale module caching during browser validation.
- Backward compatibility included for legacy `reducedMotion` in stored settings (maps to Low graphics preset).
