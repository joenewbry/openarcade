# Tank Royale (Prototype)

First end-to-end playable loop:

- **Launch/Menu** -> **Gameplay** -> **Win/Lose** -> **Restart/Menu**

## Controls

- Move: `WASD` or `Arrow Keys`
- Shoot: `Space`
- Pause during run: `Esc` or `P`
- Pause menu shortcuts:
  - Resume: `Enter`, `Space`, `Esc`, or `P`
  - Restart: `R`
  - Return to menu: `M`
- Game-over shortcuts:
  - Restart: `R`, `Enter`, or `Space`
  - Return to menu: `M` or `Esc`
- Mobile: on-screen D-pad + `FIRE`

## Rules in this MVP

- You start with 100 HP.
- Enemy tanks move and shoot back.
- Destroy all enemies to win.
- If HP reaches 0, you lose.

## Local Run

From repository root:

```bash
python3 -m http.server 8123
```

Open:

- `http://127.0.0.1:8123/tank-royale/`
