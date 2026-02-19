# Air Hockey

## Game Type
1v1 arcade sports (player vs CPU)

## Core Mechanics
- **Goal**: Score 7 goals against the CPU opponent before it scores 7 against you.
- **Movement**: Click and drag (or touch and drag) the mallet anywhere in your half of the table.
- **Key interactions**: Hitting the puck with your mallet to send it toward the opponent's goal, blocking incoming shots, using wall bounces to create angles.

## Controls
- Mouse click + drag: move mallet (restricted to player's half)
- Touch drag: same on mobile

## Difficulty Progression

### Structure
The game is a single match to 7 goals (`WIN_SCORE=7`) with no level progression. Difficulty is static but self-adjusting: the CPU gains a speed bonus the further it is ahead on the scoreboard, making comebacks progressively harder.

### Key Difficulty Variables
- `CPU_SPEED`: base `4.5` pixels/frame. Effective CPU speed = `CPU_SPEED + difficultyBoost` where `difficultyBoost = Math.max(0, cpuScore - score) * 0.3`. At 3 goals behind, the CPU moves at `5.4`; at 5 goals behind, it moves at `6.0`.
- `WIN_SCORE`: `7` goals (fixed).
- `FRICTION`: `0.995` per frame. The puck decelerates very slowly — shots maintain speed across the table.
- `WALL_BOUNCE`: `0.85`. Each wall hit absorbs 15% of puck speed.
- `MAX_PUCK_SPEED`: `14` pixels/frame (cap after mallet collision).
- `MALLET_R`: `22` pixels. `PUCK_R`: `14` pixels. These sizes determine hit arc and miss margin.

### Difficulty Curve Assessment
The CPU starts at a competitive base speed of `4.5` and accelerates as it leads, making it very difficult to mount a comeback. A new player who falls behind 3-0 early faces a CPU moving at `5.4` — 20% faster than normal — while already behind. The game has no difficulty selection and provides no tutorial for puck physics or wall-angle play. The `FRICTION=0.995` value means the puck barely slows down, which surprises new players expecting more deceleration.

## Suggested Improvements
- [ ] Remove or invert the `difficultyBoost` — instead give the trailing human player a slight mallet size increase (`+3px` per 2-goal deficit, capped at `+9px`) rather than making the CPU faster when it leads.
- [ ] Add a brief "ghost trail" on the puck for the first 10 seconds of a match to help new players read puck trajectory and learn to predict bounce angles.
- [ ] Reduce `CPU_SPEED` from `4.5` to `3.8` as a starting baseline to give new players a more forgiving first impression.
- [ ] Add an optional difficulty selector before the match starts: Easy (`CPU_SPEED=3.0`), Medium (`4.5`), Hard (`6.0`) — currently the game drops players directly into a moderately skilled opponent.
- [ ] Increase `WALL_BOUNCE` from `0.85` to `0.90` to make wall-angle shots more rewarding and reduce the frustration of puck dying in the corners.
