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

## Default Asset Map Integration

Map topology is now loaded from `default-map-layout.json`.

- Uses the selected **Cartoon Tank Pack** default arena topology (center choke + mirrored lanes)
- Wires destructible block placement and pickup spawn points into runtime gameplay
- If map textures are missing, gameplay falls back to built-in vector rendering while preserving topology/logic

Expected optional asset paths (auto-loaded when present):

- `./assets/cartoon-tank-pack/maps/default/floor.png`
- `./assets/cartoon-tank-pack/maps/default/wall.png`
- `./assets/cartoon-tank-pack/props/destructible_crate.png`
- `./assets/cartoon-tank-pack/pickups/pickup_crate.png`

## Controls

- Move: `WASD` or `Arrow Keys`
- Shoot: `Space`
- Open menu during run: `Esc` or `M`
- Game-over shortcuts:
  - Restart: `R`, `Enter`, or `Space`
  - Return to menu: `M` or `Esc`
- Mobile: on-screen D-pad + `FIRE`

## Mode Selection / Launch

Use the challenge selector bar above the game canvas:

- Pick a mode from the dropdown
- Click **LAUNCH MODE** (or press **PLAY** in menu)

## Local Run

From repository root:

```bash
python3 -m http.server 8123
```

Open:

- `http://127.0.0.1:8123/tank-royale/`

## Quick Validation

1. Launch **No Walls** and confirm interior obstacles/destructibles are removed.
2. Launch **Blitz Clock** and confirm countdown starts at 90s and increases on kills.
3. Launch **Fast Spawn** and confirm enemy reinforcement cadence is visibly faster.
4. Shoot destructible blocks in non-`no_walls` modes and verify they break after sustained hits.
5. Wait for pickup pads to spawn collectibles and verify health/rapid-fire/score effects trigger on contact.
6. Confirm player movement/shooting and enemy chase/fire behavior remain unchanged.
