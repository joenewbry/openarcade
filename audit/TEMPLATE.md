# Game Audit Template

## Verdict: **[PASS | NEEDS_FIX | BROKEN]**

## A. Will It Work? (Initialization & Runtime)
- [ ] Imports engine correctly (`import { Game } from '../engine/core.js'`)
- [ ] Exports `createGame()` function
- [ ] DOM refs in game.js match elements in v2.html (canvas#game, #overlay, #overlayTitle, #overlayText)
- [ ] `onInit`, `onUpdate`, `onDraw` callbacks all defined and assigned to `game`
- [ ] `game.start()` called
- [ ] No calls to undefined functions
- [ ] No infinite loops in game logic
- [ ] Valid Renderer API usage (fillRect, fillCircle, drawLine, strokePoly, fillPoly, dashedLine, setGlow, begin, end, flushBatch)
- [ ] Valid TextRenderer API usage (drawText(text, x, y, fontSize, color, align))

## B. Is It Playable? (Controls & Game Flow)
- [ ] Start trigger exists (key/click transitions from `'waiting'` to `'playing'` via `game.setState('playing')`)
- [ ] Controls mapped (arrows, WASD, space, mouse — whichever apply)
- [ ] Game over condition exists (path to `game.setState('over')`)
- [ ] Restart works from game-over state (pressing key in 'over' state resets and starts new game)
- [ ] No stuck/dead-end states (player can always make progress or die)
- [ ] Mouse-based games have proper click/move handlers

## C. Will It Be Fun? (Game Design)
- [ ] Difficulty progression exists (levels, speed increase, more enemies, etc.)
- [ ] No impossible states (unkillable blockers, unsolvable levels, unreachable targets)
- [ ] Balance: player has a fair chance on early levels
- [ ] Visual feedback on actions (color changes, particles, score updates)
- [ ] Win condition for finite games, or escalating difficulty for infinite games
