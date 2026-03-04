# Tank Royale (Prototype)

Playable loop + data-driven challenge framework.

## Challenge Modes (Tier 1-3)

Modes are defined in `challenge-modes.json` (no hardcoded per-mode constants in runtime logic):

1. **No Walls (Open Arena)**
2. **Blitz Clock (Time Attack)**
3. **Fast Spawn**

Each mode defines:
- `enemyCount`
- `spawnCadenceSeconds`
- `mapSize` (`width`, `height`)
- `specialRule`

Optional rule data is also JSON-driven (e.g., Blitz timer and kill bonus).

## Controls

- Move: `WASD` or `Arrow Keys`
- Shoot: `Space`
- Open menu during run: `Esc` or `M`
- Game-over shortcuts:
  - Restart: `R`, `Enter`, or `Space`
  - Return to menu: `M` or `Esc`
- Mobile: on-screen D-pad + `FIRE`

## Level Select / Launch

Use the challenge cards above the game canvas:

- Challenge 1 starts unlocked by default.
- Challenge 2 unlocks after clearing Challenge 1.
- Challenge 3 unlocks after clearing Challenge 2.
- Select any card to preview details; locked cards show unlock requirements.
- Click **LAUNCH CHALLENGE** (or press **PLAY** in menu) to start the selected unlocked challenge.

Progress is stored in `localStorage` under `tankRoyaleChallengeProgressV1`.

## Local Run

From repository root:

```bash
python3 -m http.server 8123
```

Open:

- `http://127.0.0.1:8123/tank-royale/`

## Quick Validation

1. Launch **No Walls** and confirm interior obstacles are removed.
2. Launch **Blitz Clock** and confirm countdown starts at 90s and increases on kills.
3. Launch **Fast Spawn** and confirm enemy reinforcement cadence is visibly faster.
4. Confirm player movement/shooting and enemy chase/fire behavior remain unchanged.
