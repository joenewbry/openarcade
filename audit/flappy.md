# Flappy Bird -- Audit

## Files
- `/Users/joe/dev/openarcade/flappy/game.js` (186 lines)
- `/Users/joe/dev/openarcade/flappy/v2.html` (82 lines)

## A) Works?

**PASS**

Clean engine integration:
- `new Game('game')` with `onInit`, `onUpdate`, `onDraw`
- States: `'waiting'` -> `'playing'` -> `'over'`
- `showOverlay` used correctly
- `setScoreFn` registered
- `game.start()` called

DOM structure:
- `canvas#game` 400x600
- Standard overlay elements with background
- `#score`, `#best` present

At only 186 lines, this is the most concise game in the batch. Clean, focused implementation.

## B) Playable?

**PASS**

Controls:
- **Space** or **ArrowUp**: Flap (starts game, flaps during play)
- Any arrow key or Space restarts from game over

Game mechanics:
- Classic Flappy Bird: tap to flap, avoid pipes
- Gravity: 0.45, Flap force: -7.5
- Pipe gap starts at 240px and shrinks by 5px per score point, minimum 130px
- Pipe speed: 3, spacing: 200
- Bird has rotation based on velocity (capped at +/- 45 degrees)
- Ceiling bounces bird down (vy = 0), ground = game over

Pipe spawning: new pipe when last pipe is 200px from right edge. Top height is random within safe bounds (80px from top and bottom).

Note: Like Flapomino, there is **no click/touch-to-flap support**. Only keyboard input (Space/ArrowUp). For the archetypal "tap to flap" game, this is a notable omission.

## C) Fun?

**PASS**

Classic Flappy Bird well-executed:
- Bird rendering with body, wing (animated), eye, beak, and rotation
- Pipes with caps and green color scheme
- Gap difficulty increases with score (240px -> 130px minimum)
- Decorative stars in background
- Ground line at bottom
- Best score tracking

The game feel is right: gravity and flap force are well-tuned for the classic Flappy experience. The gradually shrinking gap creates good difficulty progression.

Missing click support is a concern but keyboard controls work perfectly for the core experience.

## Verdict: PASS

Clean, faithful Flappy Bird implementation in just 186 lines. Physics feel right, difficulty scales well, and the bird rendering is charming. The lack of click-to-flap is the only notable gap -- keyboard works fine but click/touch is the expected primary input for this game type. Not broken, just a missing quality-of-life feature.
