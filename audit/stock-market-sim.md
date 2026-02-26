# Audit: Stock Market Sim

## A) Works?
**PASS**

- Correctly imports `Game` from engine, calls `new Game('game')`, implements `onInit`, `onUpdate(dt)`, `onDraw(r, t)`, and `start()`.
- Uses `setState('waiting')` / `setState('playing')` / `setState('over')` correctly.
- `showOverlay` called with title and text at init and game end.
- `hideOverlay()` is not explicitly called -- relies on engine's `setState('playing')` to hide overlay, which is the standard pattern.
- Canvas click listener properly converts mouse coords to canvas-space using `getBoundingClientRect`.
- DOM refs (`cash`, `round`, `score`) are guarded with null checks (`if (scoreEl)`), so no crash if elements are missing.
- `setScoreFn(() => score)` correctly wired.
- `v2.html` has correct canvas dimensions (600x500), overlay div with proper IDs, and module import.

## B) Playable?
**PASS**

- Mouse-only interaction: click to start, click stock tabs to select, click qty buttons, click BUY/SELL/SHORT/COVER, click END TURN.
- 20 rounds of trading against 3 AI opponents with different strategies (value, momentum, contrarian).
- Market events and insider tips add variety each round.
- Price chart, leaderboard, trading desk, news feed, order book, and news ticker all render.
- End-of-game shows final ranking and portfolio value.

## C) Fun?
**PASS**

- Competitive element against 3 AI traders is engaging.
- Market events (FDA approvals, data breaches, rate changes) create meaningful strategic decisions.
- Short selling and charge mechanics add depth.
- Clean financial dashboard aesthetic with animated price chart.
- 20 rounds is a good session length -- not too long, not too short.

## Issues
- `fillPoly` with hex color `s.color + '15'` (line 327) -- appending `'15'` to a hex color like `'#4af'` produces `'#4af15'` which is only 5 chars after `#`, not a valid hex. Should be 2 hex digits for alpha appended to a 6-digit hex color. The 3-digit hex colors used here (`#4af`) would produce `#4af15` which is ambiguous. This may render as transparent or black depending on the engine's color parser.
- Minor: the `input.isDown` / `wasPressed` API from the engine is not used at all -- this game is entirely mouse-driven, which is fine but means keyboard users cannot play.

## Verdict: PASS
Functionally complete, playable, and fun. The hex alpha color issue on the chart fill is cosmetic only.
