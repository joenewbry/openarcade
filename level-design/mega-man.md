# Mega Man

## Game Type
Action platformer — run-and-gun through 3 stages with a boss at the end of each

## Core Mechanics
- **Goal**: Complete all 3 stages by reaching and defeating each boss; player has 3 lives and `MAX_HP = 28`
- **Movement**: `MOVE_SPEED = 3` px/frame horizontal; `JUMP_FORCE = -9.5` px/frame (instant), `GRAVITY = 0.55` px/frame²
- **Key interactions**: Shoot bullets (`BULLET_SPEED = 7`, max 3 on screen simultaneously); defeat enemies (Walker HP:3, Flier HP:2, Turret HP:5); reach boss room and defeat boss to advance stage

## Controls
- Arrow keys / WASD: move and jump
- Z / Space: shoot
- Up arrow: jump (alternative)

## Difficulty Progression

### Structure
3 linear stages, each with 3 rooms (2 normal rooms + 1 boss room). Bosses escalate in HP and aggression across stages.

### Key Difficulty Variables

| Stage | Boss | Boss HP | Boss Speed | Shoot Interval | Pattern |
|---|---|---|---|---|---|
| 1 | FIRE MAN | 40 | 2 px/frame | 50 frames | jumper |
| 2 | ICE MAN | 50 | 3 px/frame | 40 frames | slider |
| 3 | ELEC MAN | 60 | 3.5 px/frame | 35 frames | aggressive |

Damage values (fixed across all stages):
- Player bullet damage to enemies: standard (kills Walker in 1 hit, Flier in 1 hit, Turret in ~3 hits)
- Enemy contact damage to player: 4 HP
- Enemy bullet damage to player: 3 HP
- Boss contact damage: 6 HP
- Spike damage: 8 HP (instant if touched)

Player constants: `MAX_HP = 28`, 3 lives, `BULLET_SPEED = 7`, max 3 bullets on screen.

Enemy fire rates: Turret fires every 70–110 frames, Flier fires every 90 frames.

### Difficulty Curve Assessment
The difficulty curve is reasonable in structure but has several friction points. The 3-bullet cap on screen is the most frustrating — players who fire quickly discover bullets "bounce back" from the cap limit, requiring deliberate pacing that isn't taught. Boss 1 (FIRE MAN) is appropriately tuned: HP 40, speed 2, interval 50 frames. Boss 2 jumps hard: ICE MAN moves at 3 px/frame (50% faster than Fire Man), shoots every 40 frames (25% faster), with 10 more HP. Boss 3 (ELEC MAN) continues the aggressive scaling with 3.5 speed and 35-frame shoot interval — players who got through ICE MAN shouldn't find ELEC MAN dramatically harder, which is appropriate. Spike damage at 8 HP per contact is brutal — 4 spike touches kills a player with 28 HP, and spikes in the later stages appear in jump-challenge rooms. No mid-stage checkpoints means dying to FIRE MAN (boss) after clearing 2 rooms sends the player back to room 1.

## Suggested Improvements
- [ ] Add mid-stage checkpoints at the second room: store `checkpointRoom = currentRoom` when entering room 2, so a death restarts from room 2 rather than room 1 of the stage — dramatically reduces late-stage frustration
- [ ] Increase the on-screen bullet cap from 3 to 5 (`MAX_BULLETS = 5`) to make shooting feel more responsive and reduce the unintuitive "bullet disappears" effect that confuses new players
- [ ] Reduce FIRE MAN's `shootInterval` from 50 to 65 frames on the first attempt at each boss (track with a `bossAttempts` counter), giving players one "learning attempt" with a more forgiving boss before standard difficulty applies
- [ ] Reduce spike damage from 8 to 5 HP per contact: current value means 4 touches = death from full HP, making precision platforming around spikes very punishing; reducing to 5 allows 6 touches and makes spike rooms feel fair rather than lethal
- [ ] Scale enemy HP with stage: Turret HP from fixed 5 to `3 + stage * 1` (stage 1: 4 HP, stage 2: 5 HP, stage 3: 6 HP) so later stages feel progressively tougher rather than identical enemies in new layouts
- [ ] Add a health pickup (restores 8 HP) guaranteed to spawn in room 1 of each stage to give players a buffer going into the stage — currently drops are not guaranteed and a player entering a boss with low HP from a rough room 2 has no recovery option
