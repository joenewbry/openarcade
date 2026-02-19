# Sinistar

## Game Type
Free-roaming space shooter / survival

## Core Mechanics
- **Goal**: Collect 20 crystals from planetoids (by shooting them), craft them into 5 sinibombs (4 crystals each), then destroy Sinistar before it chases you down; then repeat for the next level
- **Movement**: Ship rotates in place and thrusts forward in the facing direction across a large scrolling `WORLD = 3000` space; momentum persists (no friction)
- **Key interactions**: Shoot planetoids to release crystals, fly into crystals to collect them; enemy Workers try to steal crystals and build Sinistar; Warriors shoot at the player; when Sinistar is fully built it chases the player at high speed; throw sinibombs at Sinistar to damage it

## Controls
- Arrow Left / Right — rotate ship
- Arrow Up — thrust
- Space — fire bullet
- Shift — throw sinibomb (requires at least 1 bomb in inventory)

## Difficulty Progression

### Structure
Level-based loop. Each level the player must collect `CRYSTALS_PER_BOMB * 5 = 20` crystals, build 5 sinibombs, and destroy Sinistar (which requires all 5 bombs). After each level, `nextLevel()` is called, which increases enemy counts and Sinistar's chase speed. Player starts with `3` lives; no replenishment.

### Key Difficulty Variables
- `SINISTAR_PIECES`: `20` — number of pieces Workers must build before Sinistar activates
- `CRYSTALS_PER_BOMB`: `4` crystals to craft one sinibomb (`5` bombs needed to destroy Sinistar = `20` crystals total)
- `TURN_SPEED`: `0.065` radians/frame — ship rotation rate (constant)
- `THRUST`: `0.14` — acceleration per frame (constant)
- `MAX_SPEED`: `5` — ship velocity cap (constant)
- `INVINCIBLE_TIME`: `90` frames (~1.5 seconds) — invincibility after being hit
- `NUM_PLANETOIDS`: `18` — planetoids per level (constant)
- `NUM_WORKERS`: `8` starting (increases each level via `nextLevel()`)
- `NUM_WARRIORS`: `5` starting (increases each level)
- `SINISTAR_CHASE_SPEED`: `3.2 + level * 0.15` — grows faster every level
- Warrior `fireCooldown`: `50 + rand * 30` frames between shots (constant range)

### Difficulty Curve Assessment
Level 1 is already demanding — the momentum-based controls take time to learn, and 8 Workers actively competing to steal crystals means the player must divide attention between collecting, defending, and mining simultaneously. Sinistar's level-1 chase speed of 3.2 is close to the player's `MAX_SPEED` of 5, leaving very little escape margin for a new player who has not yet learned to lead with thrust.

## Suggested Improvements
- [ ] Reduce `NUM_WORKERS` from 8 to 5 in level 1 and scale up to 8 by level 3 — having 8 Workers competing for crystals from the start means the player rarely gets to build a comfortable crystal lead before Sinistar is constructed
- [ ] Reduce `SINISTAR_CHASE_SPEED` base from `3.2` to `2.6` in level 1, keeping the `+0.15` per level ramp — this gives new players a larger speed margin to escape before they've learned thrust-and-run momentum management
- [ ] Reduce `CRYSTALS_PER_BOMB` from 4 to 3 (or `SINISTAR_PIECES` requirement from 5 bombs to 4) so the crystal-gathering loop feels less like a grind when Workers are actively countering the player's progress
- [ ] Add a brief on-screen message when Sinistar activates ("SINISTAR IS COMING!") and show a directional arrow pointing toward Sinistar — the current screen is large enough that players can be caught unaware by a Sinistar they cannot see
- [ ] Extend `INVINCIBLE_TIME` from 90 to 120 frames after taking damage — at high speeds, 90 frames (~1.5 seconds) is barely enough to change direction before a second hit lands
- [ ] Show a crystal counter HUD (e.g. "Crystals: 12/20 | Bombs: 3/5") prominently so the player can track progress without interrupting spatial awareness of the combat arena
