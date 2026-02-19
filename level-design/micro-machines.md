# Micro Machines

## Game Type
Top-down racing — race tiny vehicles on household surface tracks, first to 5 race wins

## Core Mechanics
- **Goal**: Win 5 race points before AI opponents; each race awards points by finish position (1st=3, 2nd=2, 3rd=1, 4th=0)
- **Movement**: `MAX_SPEED = 3.8` px/frame, `ACCEL = 0.18` px/frame², `FRICTION = 0.97`, `TURN_SPEED = 0.045` radians/frame; off-track: `vx *= 0.93, vy *= 0.93` per frame (speed penalty)
- **Key interactions**: 3 laps per race; boost pads apply `BOOST_MULT = 1.8` for 45 frames; oil slicks spin car for 30 frames; missiles spin target for 40 frames

## Controls
- Up / W: accelerate
- Down / S: brake (`BRAKE = 0.12`)
- Left / Right: steer
- Space: use collected weapon/item

## Difficulty Progression

### Structure
3 fixed tracks played in sequence (Kitchen Table → Study Desk → Bathroom Counter). Tracks increase in complexity (waypoint count and track width decrease). After track 3, the sequence loops. Points accumulate toward `POINTS_TO_WIN = 5`.

### Key Difficulty Variables

| Track | Name | Waypoints | Track Width | Notes |
|---|---|---|---|---|
| 1 | Kitchen Table | 12 | 60 px | Wide, forgiving |
| 2 | Study Desk | 16 | 52 px | Narrower, more turns |
| 3 | Bathroom Counter | 21 | 48 px | Narrowest, most complex |

AI behavior (fixed across all tracks): waypoint-following with random steering noise `aiSteerNoise = randRange(-0.3, 0.3)`. AI uses same physics constants as player. No AI difficulty scaling between tracks.

Race start: `raceCountdown = 180` frames (3 seconds) before cars can move.

### Difficulty Curve Assessment
Track 1 (Kitchen Table, 12 waypoints, 60px width) is a good starting point — wide enough to tolerate mistakes. The jump to Track 2 (52px, 16 waypoints) is moderate. Track 3 (48px, 21 waypoints) adds both more turns and a narrower corridor, which can feel like two difficulty increases at once. The AI's random steering noise (`±0.3` radians) is fixed and does not scale — on early tracks the AI is competitive; on the narrower Track 3, the AI's noise causes it to go off-track more often, which accidentally makes Track 3 the easiest for the player despite being the most complex. The `FRICTION = 0.97` per frame means the car decelerates slowly — at 60fps, `0.97^60 ≈ 0.16`, so the car retains 97% speed each frame and braking requires deliberate use of S key. New players who don't brake into turns will repeatedly spin out on Track 3.

## Suggested Improvements
- [ ] Reduce AI steering noise on Track 3 from `±0.3` to `±0.15` (or scale it inversely with track complexity: `noise = 0.3 - track * 0.05`) so the AI remains competitive on harder tracks and doesn't accidentally become easier
- [ ] Add a 4th track with `width = 40` px and 26 waypoints for players who master the current 3, and make `POINTS_TO_WIN = 7` to extend the match duration and reduce luck variance from individual race results
- [ ] Slow Track 3 AI max speed by 5% (apply `aiMaxSpeed = MAX_SPEED * 0.95` for track 3 only) as a balancing measure — the narrower track punishes AI noise more than player precision, so a small AI speed nerf restores intended competitiveness
- [ ] Add a `TURN_SPEED` indicator or brake warning icon when the player is going into a turn above 80% max speed (`speed > MAX_SPEED * 0.8`) to teach the braking mechanic before spin-outs become frustrating
- [ ] Increase `BRAKE` from `0.12` to `0.15` to make braking more responsive and reduce the frequency of understeer frustration on tight corners — the current value requires very early braking that isn't intuitive
- [ ] Show a mini-points scoreboard on screen during races (not just post-race) so players can see how close they are to `POINTS_TO_WIN = 5` and know whether taking risks for 1st place (3 pts) vs safe 2nd (2 pts) matters in the current standings
