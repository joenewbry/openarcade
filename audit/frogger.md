# Frogger -- Audit

## Files
- `/Users/joe/dev/openarcade/frogger/game.js` (578 lines)
- `/Users/joe/dev/openarcade/frogger/v2.html` (83 lines)

## A) Works?

**PASS**

Engine integration:
- `new Game('game')` with `onInit`, `onUpdate`, `onDraw`
- States: `'waiting'` -> `'playing'` -> `'over'`
- `showOverlay` used correctly
- `setScoreFn` registered
- `game.start()` called

DOM structure:
- `canvas#game` 480x560
- Standard overlay elements with background
- `#score`, `#lives`, `#best` present

Timer uses frame counting (every 6 frames = 0.1 seconds) for the countdown. This is slightly imprecise but functional.

Lane definitions are comprehensive: 5 road lanes and 5 river lanes with different speeds, object types, gaps, and directions. Turtles have dive intervals.

## B) Playable?

**PASS**

Controls:
- **Arrow keys**: Move frog one cell at a time (discrete movement)
- Space/any arrow starts the game

Game mechanics:
- 14-row grid: Start -> Sidewalk -> Road (5 lanes) -> Median -> River (5 lanes) -> Home row
- Road: Avoid cars and trucks
- River: Land on logs and turtles; fall in water = death
- Turtles periodically dive underwater (can't stand on diving turtles after 20 frames)
- 5 home lily pads to fill
- Timer bar at bottom
- Score: 10 points per forward row, 50 per home landing, time bonus when all homes filled
- Level advancement: all 5 homes filled -> faster lanes, shorter timer
- 3 lives

River mechanics are well-implemented:
- Frog moves with the log/turtle (carried by lane speed)
- If frog drifts off-screen, death
- If not on any platform in river, death
- Diving turtles become unsafe after divePhase > 20

Home row landing: must land within 1.2 cells of a home position. Landing on an already-filled home or outside a home position = death. This is faithful to the original.

## C) Fun?

**PASS**

Solid Frogger implementation:
- Distinct visual zones: dark road, blue river, green sidewalks/median
- Animated wave lines in river
- Vehicles with headlights and windshields
- Logs with wood grain texture and bark highlight
- Turtles with shell patterns that fade when diving
- Frog with body, eyes, and pupils
- Death animation (expanding red X that fades)
- Timer bar with color coding (green -> yellow -> red)
- Dashed lane dividers on road
- Level indicator in bottom right

The difficulty curve is good: lane speeds increase by 15% per level, timer decreases by 2 seconds per level (minimum 15s). Multiple vehicle/platform types with varied speeds keep each crossing attempt different.

Discrete movement (one cell per key press) is correct for Frogger. The frog cannot hold a direction to continuously move, which matches the original.

## Verdict: PASS

Faithful and polished Frogger port. All core mechanics work: road crossing, river riding, turtle diving, home landing, level progression. Visual variety with animated waves, detailed vehicles, and diving turtles. Death animation and timer bar add polish. No bugs found.
