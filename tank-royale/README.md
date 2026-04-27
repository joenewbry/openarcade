# Tank Royale (Prototype)

Main Menu flow prototype with gameplay and a fully wired **Settings** screen.

## Settings implemented

### Audio
- Master volume slider
- Music volume slider
- SFX volume slider

### Graphics
- Graphics preset selector:
  - Low (battery saver)
  - Balanced
  - High

### Controls
- Control sensitivity slider (`0.50x` to `1.60x`)
- Keyboard keybinding entry points for:
  - Move Up / Down / Left / Right
  - Fire
  - Menu

## Persistence

Settings persist in `localStorage`:

- `tankRoyale.settings.v1`

Selected level persists in:

- `tankRoyale.selectedLevel.v1`

## Input compatibility

- Keyboard controls are remappable via Settings
- Arrow-key fallback still works for movement
- Touch controls (D-pad + FIRE) remain available for coarse pointers
- Sensitivity affects player movement in both keyboard and touch contexts

## Local run

From repository root:

```bash
python3 -m http.server 8133
```

Open:

- `http://127.0.0.1:8133/tank-royale/`

## Validation

```bash
node --check tank-royale/game.js
```
