# Obstacle Course Race

## Game Type
Side-scrolling platformer racer / party game (Fall Guys-lite)

## Core Mechanics
- **Goal**: Reach the finish line of each round's obstacle course before the 3 AI competitors, accumulating championship points across 3 rounds.
- **Movement**: Continuous physics-based movement. Arrow Left/Right accelerate (600 px/s²); Arrow Up jumps (-380 vy); Space performs a dash/dive.
- **Key interactions**: Navigate 7 obstacle types (spinners, pendulums, conveyors, slime, bounce pads, moving platforms, walls); dodge or use obstacles to outpace AI; bump into other players using dives (stuns them briefly).

## Controls
- **Arrow Left / Right**: Run left / right
- **Arrow Up**: Jump
- **Space**: Dive/dash (adds 120 vx in facing direction; if airborne, adds 150 vy down)
- **Click**: Start game, advance round, or restart
- **Space / Enter**: Start game from overlay (via engine)

## Difficulty Progression

### Structure
3 rounds of racing with increasing course length. Each round awards points by finish position (1st=10, 2nd=6, 3rd=3, 4th=1). Final winner is determined by total points after round 3. Course is randomly generated each round.

### Key Difficulty Variables
- **Course length**: `2500 + round * 500` px
  - Round 1: 3000px; Round 2: 3500px; Round 3: 4000px
- **Race timeout**: 60 seconds per round (auto-finishes remaining players at 60s)
- **AI target speed**: `140 + Math.random() * 40` px/s — each AI randomized at spawn (140–180 px/s)
- **Player max speed**: 180 px/s (same cap as AI top end)
- **AI skill**: `0.7 + Math.random() * 0.25` per AI (0.70–0.95 reaction quality)
- **AI reaction delay**: `0.1 + Math.random() * 0.15` seconds (0.10–0.25s scan interval)
- **Obstacle density**: `ox` increments by `120 + Math.random() * 150` px between obstacles — roughly 1 obstacle per 185px average, over a 3000px+ course
- **Obstacle types** (7 equally weighted): spinner, pendulum, conveyor, slime, bounce, movingPlatform, wall
- **Ground gaps**: 30% chance of a gap (50–90px wide) after each ground segment, starting at x=300 and ending at x=courseLength-200
- **Player GRAVITY**: 800 px/s²; jump velocity: -380 px/s; max runtime: 60s

### Difficulty Curve Assessment
The randomized courses work well structurally, but the AI randomization creates high variance — sometimes all 3 AIs happen to roll 175–180 px/s target speed and the player can never win. The obstacle density is consistent across all 3 rounds (only course length grows), so round 3 doesn't meaningfully feel harder, just longer. The dive mechanic is powerful but its activation (Space) can conflict with starting the game. The ground gap probability (30%) can produce clusters of gaps that are effectively impassable even with perfect jumping.

## Suggested Improvements
- [ ] Scale AI target speed with round: Round 1 = 120–150 px/s, Round 2 = 135–165 px/s, Round 3 = 150–180 px/s — instead of randomizing the same range all three rounds
- [ ] Enforce a minimum gap between consecutive ground gaps: after placing a gap, advance `gx` by at least 250px before the next gap roll, preventing chain-gaps
- [ ] Reduce spinner obstacle radius from `50 + Math.random() * 20` (50–70px) to `35 + Math.random() * 15` (35–50px) so they can be reliably jumped even at running speed
- [ ] Add a "stagger start" so the human player (index 0) begins at x=40 and AIs begin at x=20, giving the player a slight head start to compensate for reaction time disadvantage
- [ ] Display player current position (1st/2nd/3rd/4th) more prominently — it's in the HUD at top-left but small; make it large and centered for the first 5 seconds of each race
- [ ] Make the slime slow effect duration shorter (0.3s instead of 0.5s `slowTimer`) since the reduced max speed of 80 px/s while AIs continue at full speed creates severe catch-up difficulty
