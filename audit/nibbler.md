# Nibbler Audit

## A) Works? PASS
- Engine integration correct: `new Game('game')`, callbacks, `start()`.
- Canvas 500x500 matches v2.html. Overlay properly sized.
- DOM elements `#score`, `#best`, `#overlay`, `#overlayTitle`, `#overlayText` all present.
- 8 unique maze patterns cycling for levels 1-8+.
- Snake movement uses frame-counting for speed control (moveFrames based on level).
- Timer counts down using frame counting (60 frames = 1 second).
- Food placement avoids walls and snake body.
- Self-collision and wall collision detection both implemented.

## B) Playable? PASS
- Arrow keys to start and control direction.
- Snake cannot reverse (180-degree prevention).
- Eating food grows snake and awards level-scaled points.
- Level complete when all food eaten; time bonus awarded.
- Timer running out kills snake (life lost).
- 3 lives with crash recovery: snake respawns at level start position.
- Level progression increases food count, decreases timer and speed interval.
- Game over overlay with restart prompt.

## C) Fun? PASS
- Classic Nibbler/Snake-in-maze gameplay is engaging.
- 8 distinct maze layouts provide variety and increasing challenge.
- Time pressure from countdown timer adds urgency.
- Level-based scoring rewards progression.
- Snake head has eyes that face movement direction -- nice detail.
- Body color gradient from bright to dim gives visual feedback on length.
- Food has pulsing glow effect.
- Wall rendering with 3D-style highlight/shadow edges.

## Issues
- **Minor**: The `getSpeed(level)` function returns milliseconds (160 down to 80) which is then converted to frame counts via `moveFrames()`. At level 1, speed is 160ms = ~10 frames between moves. At level 9+, it's 80ms = ~5 frames. This is reasonable pacing.
- **Minor**: `getStartPos` searches outward from center for a valid 3-cell horizontal opening. If maze is very dense near center, it falls back to (2,2). This could theoretically place the snake in a wall in an extreme edge case, but the provided mazes all have open centers.
- **Minor**: HUD overlay at top (18px strip) could overlap with maze walls in row 0, but border walls are already drawn, and the HUD uses translucent background.

## Verdict: PASS
