# Audit: Swarm Control

## A) Works?
**PASS**

- Imports `Game` from engine, creates instance, implements `onInit`, `onUpdate(dt)`, `onDraw(r, t)`, `start()`.
- State machine: `waiting` -> click -> `playing` -> time/hive destroyed -> `over` -> click -> restart.
- `showOverlay`/`hideOverlay` used correctly. `setScoreFn` wired.
- Mouse events via direct canvas listeners for click (move swarm), drag (split swarm), and wheel (zoom).
- DOM refs (`playerUnits`, `aiUnits`, `score`, `aiScore`, `timer`, `playerNodes`, `aiNodes`, `status`) accessed directly -- v2.html provides all.
- v2.html: canvas 600x400, overlay with background, controls documented.
- `_game` stored in module scope for `endGame` callback.

## B) Playable?
**PASS**

- Controls: Click to move entire swarm, Drag to split swarm (half goes to drag endpoint), Scroll to zoom.
- Boids-based unit movement with separation, alignment, cohesion, and target seeking.
- 9 resource nodes for area control -- capture by having more units nearby.
- Captured nodes spawn reinforcements.
- Hives spawn units periodically.
- Win conditions: destroy enemy hive, eliminate enemy swarm, or have more kills at 3-minute timer end.
- Camera auto-follows player swarm center with smooth interpolation.

## C) Fun?
**PASS**

- Satisfying swarm dynamics from boids algorithm.
- Strategic depth: control nodes for reinforcements vs. rush enemy hive vs. intercept enemy swarm.
- AI makes smart decisions (defend hive when threatened, attack nodes, split forces).
- Zoom in/out provides both tactical and strategic views.
- Drag-to-split mechanic is intuitive and enables multi-front warfare.
- 3-minute timer prevents stalemates.
- Minimap provides good situational awareness.

## Issues
- `timerEl.style.color` on line 785 directly modifies DOM element style. This works but could flash if timer is null. The element exists in v2.html so this is fine.
- Grid-based spatial hashing for boids is well-optimized, but with MAX_UNITS=150 per side (300 total), the `updateUnits` function processes many distance checks. Performance should be acceptable for most machines.
- `performance.now()` used for time tracking (line 717) means the 3-minute timer counts real time, not game-loop time. This is correct for a wall-clock timer.
- The `hideOverlay()` is called explicitly on line 857, which is proper.

## Verdict: PASS
Impressive RTS-lite with satisfying swarm mechanics, strategic depth, and polished UI.
