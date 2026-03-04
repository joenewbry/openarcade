# Tank Royale (Prototype)

First end-to-end playable loop:

- **Launch/Menu** -> **Gameplay** -> **Win/Lose** -> **Restart/Menu**

## Controls

- Move: `WASD` or `Arrow Keys`
- Shoot: `Space`
- Open menu during run: `Esc` or `M`
- Game-over shortcuts:
  - Restart: `R`, `Enter`, or `Space`
  - Return to menu: `M` or `Esc`
- Mobile: on-screen D-pad + `FIRE`

## Rules in this MVP

- You start with 100 HP.
- Enemy tanks move and shoot back.
- A basic Spawn Director feeds enemy reinforcements using a fixed cadence.
- You win after clearing the full spawn budget.
- If HP reaches 0, you lose.

### Spawn Director tuning (query params)

- `spawnCadenceMs` - milliseconds between spawn attempts (default `2300`)
- `maxConcurrentEnemies` - max enemies alive at once (default `3`)
- `spawnBudget` - total enemies to spawn in a run (default `10`)

Example:

`http://127.0.0.1:8123/tank-royale/?spawnCadenceMs=1400&maxConcurrentEnemies=4&spawnBudget=16`

## Local Run

From repository root:

```bash
python3 -m http.server 8123
```

Open:

- `http://127.0.0.1:8123/tank-royale/`
