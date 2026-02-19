# Sandbox Physics

## Game Type
Physics puzzle / construction challenge

## Core Mechanics
- **Goal**: Complete 5 engineering challenges by placing objects so a ball (or target object) reaches a goal position, scored against an AI solution
- **Movement**: No character movement; the player places static and dynamic objects on a canvas using mouse clicks
- **Key interactions**: Select an object type from the toolbar, click to place it on the build area, then hit "Test" to simulate physics; the simulation runs for `maxTestFrames = 300` frames (~5 seconds at 60 fps) to judge success

## Controls
- Mouse click on toolbar — select object type (plank, ball, ramp, spring, etc.)
- Mouse click on canvas — place selected object
- Mouse drag — reposition placed objects before testing
- Click "Test" button — run the physics simulation
- Click "Reset" button — clear placed objects and retry

## Difficulty Progression

### Structure
5 fixed, hand-authored challenges presented in sequence. There is no random generation or escalating parameter scaling — each challenge has a fixed layout, a fixed goal, and a fixed AI solution to compare against. The `buildTimer = 30` seconds counts down during the placement phase. Object placement is limited to `p1Objects` cap of 20 items. Challenges do not change between runs.

### Key Difficulty Variables
- `buildTimer`: `30` seconds — same for all 5 challenges
- `maxTestFrames`: `300` frames (~5 seconds) — simulation window, same for all challenges
- `p1Objects` limit: `20` objects maximum placed by the player
- Challenge count: `5` total, fixed order
- AI difficulty: fixed per challenge (AI uses an optimal pre-authored solution)
- No per-challenge timer reduction, object limit change, or physics parameter variation

### Difficulty Curve Assessment
Because all 5 challenges use the same 30-second build timer and 20-object cap, difficulty is entirely determined by the complexity of the puzzle itself — there is no mechanical ramp. A new player in challenge 1 has the same constraints as challenge 5, which is fine for a puzzle game but means there is no gentle introduction to the toolset before complex structures are required.

## Suggested Improvements
- [ ] Give challenge 1 a longer build timer (45–60 seconds) and reduce it to 25 seconds by challenge 5, easing players into the time-pressure aspect rather than applying uniform 30-second pressure from the start
- [ ] Increase the object limit for challenge 1 to 30 and reduce it to 15 by challenge 5 — currently the 20-object cap can block creative solutions in early puzzles without teaching constraint management
- [ ] Add a short hint or objective description per challenge displayed at the start of the build phase; currently the goal is inferred from the layout alone, which causes beginners to lose most of their 30 seconds just understanding the task
- [ ] Extend `maxTestFrames` from 300 to 450 (~7.5 seconds) for the first two challenges so slower, creative Rube-Goldberg solutions have time to resolve rather than timing out just before success
- [ ] Show the AI's solution replay after the player's attempt (win or lose) so there is a concrete learning moment — right now players cannot tell why the AI succeeded if their approach failed
- [ ] Add a free-play mode with no timer and no AI comparison so players can experiment with the physics engine before tackling scored challenges
