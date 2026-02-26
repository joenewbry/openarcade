# Speed Typing Racer Audit

## Verdict
NEEDS_FIX

### A) Works?
NEEDS_FIX — Engine API mostly used correctly. DOM refs (`score`, `best`) present in v2.html. Canvas has `tabindex="0"` for keyboard focus. Direct `keydown` listener on canvas handles character input for typing. 3 AI racers at different WPM levels. Countdown system before race starts. Uses `localStorage` for persistent best score. However, the code accesses `input._pressed` (a private/internal field of the engine's input system) to check for key states. This creates a fragile dependency on engine internals — if the engine refactors its input handling, this game breaks silently. The field works currently but violates the public API contract.

### B) Playable?
PASS — Type displayed words to advance your racer. Direct keydown listener captures typing input separate from engine's input system (which is correct — typing needs raw character events, not game-button events). AI racers provide competitive pressure at varying skill levels. WPM displayed during race. Countdown gives preparation time. Sentence/word display is clear.

### C) Fun?
PASS — Typing races are inherently engaging. The competitive aspect against 3 AI opponents at different speeds provides targets for all skill levels. WPM feedback encourages self-improvement. Visual racing metaphor makes progress tangible. Best score persistence via localStorage encourages return play.

### Issues
1. **CODE SMELL**: Accesses `input._pressed` (private engine field) instead of using public API methods (`isDown`, `wasPressed`). Works now but fragile.

### Fixes
1. Replace `input._pressed` access with public `game.input.isDown()` or `game.input.wasPressed()` calls, or use the existing direct `keydown` listener exclusively for all input needs and remove the private field access.
