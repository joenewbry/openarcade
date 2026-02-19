# Super Mario — Level Design Notes

## Game Type
Side-scrolling platformer (single-player, level-based, infinite progression).

## Core Mechanics
- **Goal**: Reach the end of each level (flagpole/exit) while collecting coins and defeating enemies.
- **Movement**: Walk, run (Shift), and jump with variable height (hold jump key for higher jump).
- **Combat**: Jump on enemies to defeat them. Stomped turtles become shells that can be kicked. Fall into pits or take enemy contact = lose a life.
- **Progression**: Each level increases in length, platforms, gaps, pipes, and enemy count/speed.
- **Key interactions**: Coins award points. Power-ups (mushroom/fire flower) not explicitly listed but enemies and gap survival are primary challenge.

## Controls
- **A / Arrow Left**: Move left at `PLAYER_SPEED = 3.5`
- **D / Arrow Right**: Move right at `PLAYER_SPEED = 3.5`
- **Shift + A/D**: Run at `PLAYER_RUN_SPEED = 5`
- **W / Arrow Up / Space**: Jump (`JUMP_FORCE = -11`); hold for up to `JUMP_HOLD_FRAMES = 12` frames of extra lift (`JUMP_HOLD_FORCE = -0.4`)
- **No mouse interaction**: Fully keyboard-controlled

## Difficulty Progression

### Structure
Level-based with explicit scaling. Each level (`lvl` starts at 1) increases layout size and enemy parameters. The player starts with `lives = 3`. There is no world system — levels increment indefinitely.

### Key Difficulty Variables
| Variable | Formula | Level 1 Value | Level 5 Value |
|---|---|---|---|
| `numGaps` | `2 + lvl` | 3 gaps | 7 gaps |
| `numPlatforms` | `8 + lvl * 3` | 11 platforms | 23 platforms |
| `numPipes` | `3 + lvl` | 4 pipes | 8 pipes |
| `numCoins` | `10 + lvl * 5` | 15 coins | 35 coins |
| `numEnemies` | `4 + lvl * 2` | 6 enemies | 14 enemies |
| Enemy `vx` | `1 + lvl * 0.2` | 1.2 | 2.0 |
| Level cols (width) | `(100 + lvl * 20) * 32` | 3840 px | 6400 px |
| Shell chance | `0.3 + lvl * 0.05` | 35% | 55% |
| `PLAYER_SPEED` | Fixed | 3.5 | 3.5 |
| `PLAYER_RUN_SPEED` | Fixed | 5.0 | 5.0 |
| `JUMP_FORCE` | Fixed | −11 | −11 |
| `GRAVITY` | Fixed | 0.6 | 0.6 |
| `MAX_FALL` | Fixed | 10 | 10 |
| Lives | Fixed | 3 | 3 |

### Difficulty Curve Assessment
- **Level 1 starts reasonably but not gently**: 6 enemies at speed 1.2 and 3 gaps on a 3840px level is medium difficulty, not easy. A new player learning the jump physics while simultaneously managing enemies and gaps will die frequently in level 1.
- **Enemy speed scaling is steep**: By level 5, enemies move at `vx = 2.0` (66% faster than level 1). By level 10, `vx = 3.0` — matching player walk speed — making enemies feel like walls that chase. The `+0.2 per level` linear increase becomes punishing quickly.
- **Shell enemies scale too fast**: Shell chance at level 1 is 35%, meaning over a third of enemies need to be kicked rather than stomped. Shells are harder to manage; this should be an advanced mechanic introduced gradually.
- **Level width grows without density control**: By level 5 the level is 6400px wide with 14 enemies — that's one enemy per 457px. At level 1 it's one per 640px. The spacing decrease is noticeable but manageable. By level 10 (7680px, 24 enemies), density reaches one per 320px — very crowded.
- **No lives recovery mechanic**: The player starts with 3 lives and there is no way to earn more. Once lives are exhausted, the game ends without a score save or continue option.

## Suggested Improvements

1. **Soften level 1 starting values** — reduce `numGaps` formula from `2 + lvl` to `lvl` (level 1 has 1 gap instead of 3), and `numEnemies` from `4 + lvl * 2` to `2 + lvl * 2` (level 1 has 4 enemies instead of 6). This creates a genuine introductory level before the difficulty hits.

2. **Reduce enemy speed scaling from 0.2 to 0.12 per level** — change `vx = 1 + lvl * 0.2` to `vx = 1 + lvl * 0.12`. This means level 10 enemies move at `vx = 2.2` instead of `vx = 3.0`, keeping them challenging without reaching player-speed walls. Enemy speed can still be capped at `Math.min(2.5, 1 + lvl * 0.12)`.

3. **Delay shell enemies to level 3** — change shell chance formula from `0.3 + lvl * 0.05` to `Math.max(0, (lvl - 2) * 0.1)`. Level 1: 0% shells, level 2: 0%, level 3: 10%, level 5: 30%. This introduces the shell mechanic as an advanced challenge after the player has mastered basic stomping.

4. **Add a life recovery system** — award 1 extra life at `coins collected = 100` (standard Mario convention). Track `totalCoins` across levels. This gives skilled players a meaningful coin collection incentive and prevents experienced players from feeling punished by level death.

5. **Add a level-complete score summary** — show a brief screen between levels with: coins collected, enemies defeated, time taken, and a "bonus" for no deaths on that level. Currently there is no feedback moment between levels, which removes the sense of accomplishment and masks the progression.

6. **Cap maximum level difficulty** — introduce a ceiling at level 10 (or a configurable max): `effectiveLvl = Math.min(lvl, 10)` in all scaling formulas. Beyond level 10, levels should remain at max-difficulty parameters rather than continuing to scale infinitely. Infinite scaling without a ceiling leads to impossible levels that feel like bugs rather than challenges.
