# Pocket Generals -- Audit

## A) Works?
YES. Correct engine integration. Uses `new Game('game')`, implements all callbacks, calls `game.start()`. Mouse events are handled via direct canvas listeners with `pendingClicks` and `pendingMoves` arrays consumed in `onUpdate`.

One concern: Mouse coordinates are NOT scaled by canvas resolution ratio. Lines 828-829 use raw `e.clientX - rect.left` without multiplying by `(W / rect.width)`. If the CSS display size differs from the canvas pixel size (600x500), click positions will be wrong. However, since both the canvas width/height attributes (600x500) and no CSS scaling is applied, this should work at 1:1 but could break if the browser scales the canvas.

DOM refs `scoreEl`, `aiScoreEl`, `turnIndicatorEl` are properly null-checked.

## B) Playable?
YES. Turn-based tactical game with:
- 3 unit types (Infantry, Tank, Artillery) with different stats
- Movement range + attack range mechanics
- Terrain effects (Mountain = impassable, Forest = +1 DEF)
- Base capture win condition
- End Turn button at the bottom
- Click unit -> see move/attack options -> click to execute

AI uses minimax with alpha-beta pruning (depth 1), with move ordering heuristics. The AI processes all its units sequentially with animated delays.

The game properly handles the select -> move -> attack phase flow with deselection and reselection logic.

## C) Fun?
YES. Solid tactical gameplay:
- Meaningful unit differentiation (Artillery has 2-3 range but dies to adjacent enemies)
- Terrain adds strategic depth
- AI is competent -- evaluates board position, protects artillery, advances toward base
- Clear visual feedback: blue/red highlights for move/attack, hover tooltips, terrain info
- Score system tracks kills for both sides
- Turn counter and status messages

## Verdict: NEEDS_FIX

The mouse coordinate issue is a potential problem. While it works when canvas display size matches pixel size exactly, it's fragile. The fix is simple: multiply by `(W / rect.width)` and `(H / rect.height)` in both the mousemove and click handlers (lines 828-837). Every other game in this batch does this correctly.
