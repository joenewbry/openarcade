# Kart Racer

## Game Type
3-race grand prix kart racer (1 player vs 3 AI opponents)

## Core Mechanics
- **Goal**: Accumulate the most championship points across 3 races by finishing as high as possible
- **Movement**: Accelerate forward, steer left/right, drift around corners for boost, use items against opponents
- **Key interactions**: Drifting for speed boosts, collecting and deploying items, managing off-track penalties, racing 3 laps per track

## Controls
- **Arrow Up**: Accelerate
- **Arrow Down**: Brake / Reverse
- **Arrow Left / Right**: Steer
- **Shift**: Drift (hold while turning)
- **Space**: Use item

## Difficulty Progression

### Structure
The grand prix consists of 3 fixed tracks played in order: Mushroom Circuit, Shell Speedway, Rainbow Road. Points are awarded after each race: `[10, 7, 4, 2]` for 1st through 4th place. Each track is 3 laps. There is no difficulty selector — AI difficulty is fixed. Tracks increase in challenge via narrower track width and more demanding layouts.

### Key Difficulty Variables
- **Track widths**: Mushroom Circuit `trackWidth = 52` px, Shell Speedway `46` px, Rainbow Road `40` px — narrower tracks punish steering errors more severely
- **Player kart stats**: `maxSpeed = 3.8` px/frame, `accel = 0.06` px/frame², `handling = 0.045` rad/frame
- **Off-track penalty**: `maxSpd *= 0.5` — player speed halved when off the track surface
- **Drift boost tiers** (frames held):
  - `> 20` frames: `12` boost units
  - `> 30` frames: `25` boost units
  - `> 60` frames: `45` boost units
- **Items**: Mushroom (speed boost for 30 frames), Red Shell (homing projectile), Banana (placed hazard), Star (temporary invincibility + speed)
- **AI kart speeds**: AI opponents have comparable `maxSpeed` values; AI steers to follow the track spline with slight random variation
- **Championship points**: 1st = `10`, 2nd = `7`, 3rd = `4`, 4th = `2` per race; 3-race total determines champion

### Difficulty Curve Assessment
Rainbow Road (track 3) with `trackWidth = 40` px is significantly harder than the other tracks — it is 23% narrower than Mushroom Circuit — and on a fixed track order it arrives before players have fully learned drift boosting. The drift boost system is powerful but non-obvious: most new players do not know to hold Shift for 60+ frames, and the tier system is invisible in the HUD. Players who don't understand drifting are permanently disadvantaged against AI opponents who follow the ideal line. The off-track speed penalty (`maxSpd *= 0.5`) is also harsh enough that a single corner overshoot on Rainbow Road often costs an entire position, which is discouraging on the hardest track.

## Suggested Improvements
- [ ] Display a drift boost meter on the HUD that fills as the drift duration increases through the three tiers — without this, players have no feedback that holding the drift longer yields a bigger boost, so the mechanic goes unlearned
- [ ] Add a brief tutorial prompt before Race 1 (e.g., "Hold Shift while turning to drift — longer drifts give bigger boosts!") since the drift system is the most impactful mechanic and the most invisible to new players
- [ ] Reduce the off-track speed penalty from `maxSpd *= 0.5` to `maxSpd *= 0.65` on Mushroom Circuit and Shell Speedway — a 50% speed cut is very punishing for new players still learning the track boundaries; Rainbow Road can retain the harsher penalty as it is the advanced track
- [ ] Consider reordering the championship tracks to Mushroom Circuit → Rainbow Road → Shell Speedway, so the hardest track appears in the middle when players have more experience but the final race is the intermediate Shell Speedway, giving players a chance to reclaim points
- [ ] Make the item pool on Race 1 (Mushroom Circuit) favor defensive items (Banana, Mushroom) over offensive items (Shell, Star) for the player's first few item boxes — this lets new players learn what items do before having to react to incoming shells
- [ ] Show live championship standings between races (current pts totals for all 4 racers) so the player can assess how much a strong finish in the next race matters — currently there is no inter-race summary screen
