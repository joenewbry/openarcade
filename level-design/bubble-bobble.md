# Bubble Bobble

## Game Type
Arcade action platformer

## Core Mechanics
- **Goal**: Trap all enemies in bubbles and pop them to clear each level
- **Movement**: Run left/right, jump between platforms; horizontal wraparound at edges
- **Key interactions**: Shoot bubbles to trap enemies, then walk into trapped bubbles to pop them and score; collect food items enemies drop for bonus points

## Controls
- Arrow Left / Arrow Right: Move
- Arrow Up: Jump (only from ground)
- Space: Shoot bubble (hold for rapid fire; 15-frame cooldown between shots)

## Difficulty Progression

### Structure
The game has 5 hand-authored level layouts (`LEVEL_DEFS`). After completing all 5, the game loops back to level 1 but with a multiplier applied. Each level transition gives a brief 90-frame pause before enemies spawn. The level number is tracked globally and increments on every completion.

### Key Difficulty Variables
- `ENEMY_SPEED`: base constant of `1.2` px/frame for type-0 enemies; type-1 enemies ("horned" fast enemies) spawn with `ENEMY_SPEED * 1.4 = 1.68` px/frame
- `difficultyMult`: starts at `1.0` for levels 1-5, becomes `1.3` for levels 6-10, `1.6` for 11-15, etc. — applied directly to each enemy's `speed` at level build time via `1 + Math.floor((n - 1) / LEVEL_DEFS.length) * 0.3`
- **Enemy count**: Level 1 has 5 enemies, Level 2 has 7, Level 3 has 8, Level 4 has 10, Level 5 has 13. This jumps sharply.
- `BUBBLE_TRAP_TIME`: 300 frames before an enemy escapes a bubble. After escape, `e.speed *= 1.2`, making escaped enemies permanently 20% faster.
- `player.shootCooldown`: fixed at 15 frames — no progression change
- `player.invincible`: 120 frames of invincibility after death (2 seconds)
- Starting lives: 3

### Difficulty Curve Assessment
Level 1 is reasonable with 5 slow enemies, but the jump to 13 enemies on Level 5 is extreme — and on the second loop, all enemies are 30% faster from frame one. Enemies that escape bubbles compound in speed forever within a session, and the game offers no power-ups to offset this. New players will rarely survive past Level 3.

## Suggested Improvements
- [ ] Reduce Level 5 enemy count from 13 to 8-9 to smooth the spike (currently `enemies` array in `LEVEL_DEFS[4]` has 13 entries)
- [ ] Reduce `difficultyMult` increment from `0.3` to `0.15` per loop cycle so repeated loops feel gradual rather than brutal
- [ ] Add a starting lives option of 5 instead of 3; the current `lives = 3` in `onInit` is too punishing for a game with no checkpoints
- [ ] Reduce the bubble escape speed multiplier from `e.speed *= 1.2` to `e.speed *= 1.1` so escaped enemies don't permanently snowball out of control
- [ ] Increase `BUBBLE_TRAP_TIME` from 300 to 400 frames, giving players more time to reach a trapped enemy before it escapes
- [ ] Give type-1 enemies a starting speed of `ENEMY_SPEED * 1.2` instead of `1.4` — the current gap makes level 3+ very hard since multiple type-1 enemies appear simultaneously
