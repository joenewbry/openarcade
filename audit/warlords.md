# Audit: Warlords

## Files
- `/Users/joe/dev/openarcade/warlords/game.js` (509 lines)
- `/Users/joe/dev/openarcade/warlords/v2.html` (81 lines)

---

## A) Works? PASS

The game initializes correctly against the engine API. All engine methods used exist and are called with correct signatures:

- `new Game('game')` -- correct.
- `game.onInit`, `game.onUpdate`, `game.onDraw(renderer, text)` -- correct callbacks.
- `game.start()`, `game.setState()`, `game.state`, `game.showOverlay()` -- all present in engine.
- `game.input.isDown()`, `game.input.wasPressed()` -- correct input API.
- `game.setScoreFn(() => score)` -- correct.
- Renderer: `fillRect`, `fillCircle`, `drawLine`, `setGlow`, `strokePoly` -- all exist.
- TextRenderer: `drawText(text, x, y, fontSize, color, align)` -- correct signature.

DOM elements `#score`, `#best`, `#overlay`, `#overlayTitle`, `#overlayText`, `canvas#game` are all present in v2.html. The `scoreEl` and `bestEl` are grabbed at module top-level (lines 32-33), but the `<script type="module">` is at the bottom of the body after all DOM elements, so they resolve correctly.

All color values use 3-char hex (`#f44`, `#ff0`, etc.) or 6-char hex (`#16213e`, `#0f1a2e`). The engine's `parseColor` handles both formats. No 8-char alpha hex is constructed, so no color parsing issues.

No runtime errors expected.

---

## B) Playable? PASS

**Controls**: Arrow keys move the player's shield along the bottom-left castle wall. Left/Up moves one direction, Right/Down moves the other. Space or any arrow key starts the game and restarts after game over. Controls are intuitive for the genre.

**Game loop**: Player is castle 2 (bottom-left, purple). Three AI opponents occupy the other corners. Fireballs bounce around the arena, and shields deflect them. Bricks break on contact. When all bricks are destroyed, a castle is eliminated.

**AI behavior**: Each AI tracks the nearest fireball and moves its shield toward the optimal intercept position (sampled over 20 positions). AI speed has slight randomness (`0.012 + random * 0.005`), making them beatable but not trivial. AI does not cheat.

**Win/lose conditions**: Player eliminated = game over. Last castle standing = victory (+200 bonus). Destroying an enemy castle = +100 points. Both conditions are checked every frame.

**Difficulty progression**: Ball speed increases over time (`BALL_SPEED_BASE + min(frameCount/1800, 3)`). Additional fireballs spawn at frame 600 (2nd ball) and frame 1500 (3rd ball). This creates natural escalation.

**State machine**: waiting -> playing -> over, with proper restart via `game.onInit()`. Overlay text displays correctly.

---

## C) Fun? PASS

This is a faithful adaptation of the classic Atari Warlords concept. Key fun factors:

1. **Tension escalates**: Starting with one slow fireball and building to three faster ones keeps engagement high.
2. **Meaningful agency**: Shield positioning matters -- covering the right arm of the L-shaped wall at the right time is a real skill.
3. **Emergent chaos**: Multiple fireballs bouncing unpredictably create exciting moments, especially when one slips past an AI shield.
4. **Scoring incentive**: +100 per AI kill and +200 victory bonus encourages aggressive play and surviving to the end.
5. **Quick sessions**: Games are short enough to encourage "one more round" behavior.

The visual presentation is clean: glowing fireballs with a bright core, colored castle bricks, labeled corners (YOU/AI), and health bars at center give good situational awareness.

**Minor polish notes** (not blocking):
- The "best" score resets on page reload since it is stored only in a local variable (not localStorage).
- Shield movement is frame-rate coupled (not multiplied by dt), so it runs at the fixed 60Hz tick rate -- this is fine given the engine's fixed timestep.

---

## Verdict

| Check     | Verdict |
|-----------|---------|
| A) Works  | PASS    |
| B) Playable | PASS |
| C) Fun    | PASS    |
