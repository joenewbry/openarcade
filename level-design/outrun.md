# OutRun

## Game Type
Pseudo-3D driving / checkpoint racer

## Core Mechanics
- **Goal**: Drive as far as possible along a fixed 6000-segment road within the time limit, reaching checkpoints to earn extra time. Score equals distance traveled in segments.
- **Movement**: Up/W accelerates; Down/S brakes; Left/Right or A/D steer. Road curves push the car sideways via centrifugal force. Going off-road (|playerX| > 1.0) rapidly decelerates the car.
- **Key interactions**: Hit checkpoints (every 600 segments) to add 15 seconds; avoid traffic cars (collision slows speed by 60%); stay on road to maintain speed; road loops after 6000 segments.

## Controls
- **Arrow Up / W**: Accelerate
- **Arrow Down / S**: Brake
- **Arrow Left / A**: Steer left
- **Arrow Right / D**: Steer right
- **Space / Arrow Up**: Start game or restart after game over

## Difficulty Progression

### Structure
Single continuous run with a countdown timer starting at 30 seconds. Checkpoints at every 600 road segments add 15 seconds each. The road is pre-built with deterministic curves and hills (no random variation per run). Traffic density is fixed at `TRAFFIC_DENSITY = 0.03` (3% chance per segment to have a car). No lives, no levels — the run ends when time reaches 0.

### Key Difficulty Variables
- **Starting time**: 30 seconds (`timeLeft = 30`)
- **Time per checkpoint**: `TIME_PER_CHECKPOINT` = 15 seconds
- **Checkpoint interval**: `CHECKPOINT_INTERVAL` = 600 segments
- **Max speed**: `MAX_SPEED` = `SEG_LENGTH * 60` = 12,000 units/frame
- `ACCEL` = `MAX_SPEED / 120` ≈ 100 units/frame² (reaches max in ~120 frames = 2 seconds)
- `BRAKE` = `-MAX_SPEED / 60` ≈ -200 units/frame²
- `DECEL` = `-MAX_SPEED / 300` ≈ -40 units/frame² (natural friction)
- `OFF_ROAD_DECEL` = `-MAX_SPEED / 30` ≈ -400 units/frame²
- `OFF_ROAD_LIMIT` = `MAX_SPEED / 4` = 3,000 (speed above which off-road deceleration kicks in)
- **Centrifugal force**: `playerX -= curve * speedPct * CENTRIFUGAL * DT` per frame; `CENTRIFUGAL` = 0.3
- **Traffic collision**: reduces speed by 60% (`speed - MAX_SPEED * 0.6`), pushes player laterally by 0.3
- **Traffic car speeds**: `MAX_SPEED * (0.2 + pseudoRandom * 0.35)` = 20–55% of player max speed (always slower)
- **Off-road limit**: `|playerX| > 1.0` triggers deceleration; clamped at ±2.0
- **Curves range**: -5 to +5 (gentle ±2 to sharp ±5), concentrated in specific segments
- **Segment colors**: alternate dark/light every 3 segments for road stripe visual

### Difficulty Curve Assessment
The 30-second starting timer is genuinely very short for a new player who doesn't know the controls. A player who doesn't hold Up immediately will likely not reach the first checkpoint (at 600 segments) before time expires. Reaching the first checkpoint requires averaging ~20 segments/second, which demands near-max speed for the entire first 30 seconds. The early road curves (segments 50–250) introduce a sharp curve 2 very quickly, before the player has built up feel for the steering. Traffic collision is punishing — losing 60% of speed for bumping a car is effectively a death sentence on a tight timer.

## Suggested Improvements
- [ ] Increase starting time from 30 to 45 seconds so new players can make one steering mistake and still reach checkpoint 1
- [ ] Reduce the first checkpoint from 600 segments to 400 segments (or equivalently, reduce `CHECKPOINT_INTERVAL` from 600 to 450), giving an earlier success moment and reward
- [ ] Delay the first curve from segment 50 to segment 150 to give players a longer straight to accelerate and orient before encountering drift
- [ ] Reduce traffic collision speed penalty from `MAX_SPEED * 0.6` to `MAX_SPEED * 0.35` — a 60% speed loss is too severe; 35% is punishing but survivable on a tight timer
- [ ] Add a brief grace period of 3 seconds at match start where traffic cannot spawn directly ahead, preventing an immediate collision before the player is at speed
- [ ] Show a progress bar to the next checkpoint ("NEXT CP: 247 segments") more prominently in the HUD — the current display is small text in the top-right corner and easy to miss when focusing on the road
