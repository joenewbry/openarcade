# Tank Royale (PM2-DEV1 Gameplay Integration)

Single playable gameplay scene with:

- Grid-based arena with solid block tiles
- Player movement + shooting
- AI tanks (patrol/chase/shoot)
- Win/Lose loop and restart

## Controls

- Move: `WASD` or `Arrow Keys`
- Shoot: `Space`
- Menu during run: `Esc` or `M`
- Restart after game over: `R`, `Enter`, or `Space`
- Mobile: on-screen D-pad + `FIRE`

## Run

From repo root:

```bash
python3 -m http.server 8123
```

Open:

- `http://127.0.0.1:8123/tank-royale/`

Entrypoint: `tank-royale/index.html`
