# PM1-DEV4 — Pause Menu Overlay (Tank Royale)

## Scope
Implement in-game pause overlay with:
- **Resume**
- **Restart**
- **Return to Menu**

And ensure gameplay input is locked while paused.

## What I changed
### `tank-royale/game.js`
- Added a dedicated **paused** flow:
  - `showPauseMenu(game)`
  - `resumeRun(game)`
  - `tryHandlePausedInput(game, input)`
- Updated runtime controls:
  - During gameplay, `Esc` or `P` opens pause menu.
  - In paused state:
    - Resume: `Enter` / `Space` / `Esc` / `P`
    - Restart: `R`
    - Return to Menu: `M`
- Added overlay button support for paused state:
  - `RESUME`
  - `RESTART`
  - `RETURN TO MENU`
- Implemented explicit input/touch clearing to prevent input bleed:
  - `clearTouchState()`
  - `clearInputState(game)`
- Ensured gameplay systems (movement/fire/enemy/bullet updates) do not run while paused.
- Updated in-game HUD helper text from menu hint to pause hint (`PAUSE: ESC / P`).

### `tank-royale/index.html`
- Updated bottom hint text to document pause controls (`Esc / P`).

### `tank-royale/README.md`
- Updated controls section to reflect pause menu behavior and shortcuts.

## Input lock behavior
While state is `paused`, update loop early-returns through paused handler only. No movement, firing, enemy AI, or bullet simulation advances.

Additionally, touch and keyboard states are cleared on pause/resume/menu transitions to avoid accidental actions from held keys/buttons.

## Verification
- Static syntax check:
  - `node --check tank-royale/game.js`
- Manual browser validation:
  - Start run → press `Esc` → pause overlay appears with 3 required actions.
  - Confirmed pause state label shows `PAUSED`.
  - Waited while paused; gameplay state values remained unchanged.
  - Resume via overlay button and keyboard shortcuts works.
  - Restart and Return to Menu actions work from pause overlay.

## Screenshot
- Pause overlay: `tank-royale/updates/dev/assets/pm1-dev4-pause-overlay.png`
