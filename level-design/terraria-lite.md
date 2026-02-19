# Terraria Lite

## Game Type
2D sandbox platformer with survival and combat (Terraria-inspired)

## Core Mechanics
- **Goal**: Survive day/night cycles, mine resources, build a base, defeat enemies, and eventually kill the boss to maximize your score
- **Movement**: Left/right run, jump, gravity-based platforming; break tiles by clicking on them, place tiles with right-click
- **Key interactions**: Mine tiles with left-click, place tiles with right-click; swing sword to damage enemies; ally AI companion fights alongside player

## Controls
- ArrowLeft / A: move left
- ArrowRight / D: move right
- ArrowUp / W / Space: jump
- Left-click: mine tile / attack (if enemy in range)
- Right-click: place selected tile
- Number keys 1–5 (or scroll): select hotbar slot

## Difficulty Progression

### Structure
The game runs as a continuous survival loop with a day/night cycle. `worldTime` increments by 3 per frame; a full day is 24000 ticks (~133 seconds of real time). Night phase spans `worldTime` in `[18000, 24000]` (~33 seconds). Enemy caps and spawn rates differ sharply between day and night. A boss can appear once the player has survived long enough (`dayCount >= 2`) and earned a threshold score (`score >= 100`), with a 0.1% chance per frame during night. There are no explicit levels — the world is static and the difficulty ramp comes from accumulating nights and scaling HP.

### Key Difficulty Variables
- `WORLD_W`: 50 tiles wide; `WORLD_H`: 34 tiles tall; `TILE`: 12px per tile
- `GRAVITY`: 0.4 px/frame²; `JUMP_VEL`: -7 (single jump only)
- Player HP: 100; Ally HP: 80
- Day enemy cap: 4; Night enemy cap: 8
- Day spawn interval: `150 + Math.random() * 200` frames (~4–6 seconds)
- Night spawn interval: `60 + Math.random() * 90` frames (~1–2.5 seconds)
- Enemy stats:
  - Slime: 20 HP, 5 damage, speed 0.8
  - Zombie: 35 HP, 10 damage, speed 0.5
  - Skeleton: 25 HP, 8 damage, speed 1.0
- Boss: spawns on night when `score >= 100` and `dayCount >= 2`, `Math.random() < 0.001` per frame
- Weapon damage: bare hands 3, sword 8, iron sword 15, gold sword 25

### Difficulty Curve Assessment
The night phase is brutally short (~33 seconds) and triples the enemy cap, but new players start with bare hands dealing only 3 damage against enemies that have 20–35 HP — killing even the weakest slime takes 7 hits with no weapon. The boss spawn condition (`score >= 100`) can be met in the first two nights if the player collects enough resources, but there is no warning and no way to prepare mid-night.

## Suggested Improvements
- [ ] Increase bare hand damage from `3` to `6` so players can fight back effectively before finding a sword; the first weapon (sword, 8 dmg) is too close to bare hands to feel meaningful
- [ ] Extend night duration or shorten day: currently `worldTime += 3` means night is only ~33 real seconds — consider `worldTime += 2` to give players more time to prepare defenses before dark
- [ ] Set day enemy cap to `2` for the first full day (add `dayCount < 1` guard) and night cap to `4` for the first night so the opening night is survivable without weapons
- [ ] Add a minimum `dayCount >= 3` check to the boss spawn condition (currently `dayCount >= 2`) so players have at least 3 full days to gear up before a boss can appear
- [ ] Reduce night spawn interval floor: the current `60 + Math.random() * 90` (60–150 frames) can produce back-to-back enemy clusters — raise the floor to `90 + Math.random() * 90` for the first night (`dayCount < 1`)
- [ ] Show a visual warning ("Night approaching!" text overlay) when `worldTime > 16000` so players know to head back to their base, rather than being caught in the open when the enemy cap doubles
