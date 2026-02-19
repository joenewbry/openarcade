# Slither

## Game Type
Snake.io-style arena survival / score attack

## Core Mechanics
- **Goal**: Grow the longest snake possible by eating food pellets and absorbing the remains of eliminated AI snakes; survive as long as possible without hitting another snake's body or the arena boundary
- **Movement**: Snake moves continuously forward at a fixed speed; the player steers direction; boosting speeds up the snake but shrinks it
- **Key interactions**: Collect food pellets to grow; boost to outmaneuver opponents at the cost of length; eliminate AI snakes by making them crash into your body; your snake dies instantly on contact with any other snake's body or the arena wall

## Controls
- Arrow Up / Down / Left / Right — steer in that direction
- Space — boost (increases speed from `BASE_SPEED = 2` to `BOOST_SPEED = 4.5`, but continuously reduces snake length down to `MIN_LENGTH = 8`)

## Difficulty Progression

### Structure
Single-session survival with no levels or waves. The arena is fixed at `ARENA = 3000` radius. Up to `MAX_AI = 8` AI snakes populate the world; when one is eliminated it respawns. Food pellets refill up to `MAX_FOOD = 200`. There is no parameter escalation — the AI behavior is the same at score 10 as at score 200. Score equals current snake length.

### Key Difficulty Variables
- `BASE_SPEED`: `2` units/frame — base snake movement speed (constant)
- `BOOST_SPEED`: `4.5` units/frame — speed while boosting
- `TURN_RATE`: `0.06` radians/frame — how quickly the snake changes direction
- `INITIAL_LENGTH`: `15` segments — starting length
- `MIN_LENGTH`: `8` segments — minimum length after boosting
- `SEG_RADIUS`: `6` pixels — collision radius of each segment
- `SEG_SPACING`: `10` pixels — distance between consecutive segments
- `MAX_AI`: `8` snakes — number of AI opponents
- `MAX_FOOD`: `200` pellets — food cap in the arena
- `ARENA`: `3000` radius — playfield size (constant)

### Difficulty Curve Assessment
The early game is the most dangerous period — the player snake starts at length 15 and must navigate near 8 AI snakes who are all larger, meaning any early miscalculation is immediately fatal. Once the player snake grows large enough to use its own body as a wall, the game becomes considerably easier, creating an inverted difficulty curve where surviving the first two minutes is harder than the late game.

## Suggested Improvements
- [ ] Reduce `MAX_AI` from 8 to 5 at the start of a session and gradually increase the count as the player's snake exceeds length thresholds (e.g. add one AI per 50 length), easing the initial population pressure without reducing late-game challenge
- [ ] Increase `INITIAL_LENGTH` from 15 to 25 segments so the player snake has more body to work with from the start and is less fragile during the high-risk early phase
- [ ] Reduce `TURN_RATE` from 0.06 to 0.05 for AI snakes only — not the player — so AI snakes are slightly less precise at cutting off the player's path, making narrow escapes feel more achievable
- [ ] Add a safe spawn zone: the player always spawns at the center of the arena with a small radius of 200 units temporarily clear of AI snakes, preventing immediate death on re-entry
- [ ] Show the player's current length and the length of the longest AI snake in the HUD so the player has a concrete goal to chase rather than a purely abstract "survive longer"
- [ ] Add a brief boost cooldown indicator or drain bar so the player can manage boost usage strategically; currently new players often hold Space continuously, shrink to `MIN_LENGTH = 8`, and die before understanding why
