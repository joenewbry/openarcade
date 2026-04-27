# Tank Royale (Prototype)

Main Menu scene flow prototype with **Start**, **Settings**, and **Level Select** flows.

## Implemented scene flow

- **Main Menu**
  - `START`
  - `SETTINGS`
  - `LEVEL SELECT`
- **Settings**
  - Master / Music / SFX sliders
  - Reduced Motion toggle
  - Camera Shake toggle
  - Apply / Reset / Back actions
- **Level Select**
  - Card list with locked/unlocked states
  - Details panel (objective, recommended loadout, reward)
  - `START MATCH` from selected level

## Visual assets

- Uses default Tank image asset as menu hero + level preview:
  - `tank-royale/assets/maps/default-map-preview.webp`
- Source copied from existing project asset: `tanks/preview.webp`

## Gameplay integration

- Start from Main Menu or Level Select launches the selected level.
- Win when level kill target is met and active enemies are eliminated.
- Lose when player HP reaches 0.
- End state supports restart (`Enter` / `R`) or return to menu (`Esc` / `M`).

## Persistence

Settings and selected level persist via `localStorage`:

- `tankRoyale.settings.v1`
- `tankRoyale.selectedLevel.v1`

## Local run

From repository root:

```bash
python3 -m http.server 8123
```

Open:

- `http://127.0.0.1:8123/tank-royale/`

## Validation

```bash
node --check tank-royale/game.js
```
