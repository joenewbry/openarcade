# Audit: Tile Kingdoms

## A) Works?
YES. Complex Carcassonne-style tile placement game. Canvas 600x600. Extensive DOM refs: score, aiScore, playerMeeples, aiMeeples, tilesLeft, turnInfo, statusText, btnRotate, btnSkip -- all present in v2.html. Uses direct canvas mouse events for tile placement and follower placement. Keyboard for rotation (R) and start/restart (Enter/Space). Overlay click handler for start/restart.

## B) Playable?
YES. Draw tile -> rotate with R -> click valid placement -> optionally place follower (meeple) on a feature -> AI takes turn. 14 tile types with city/field/road/monastery features. Edge matching (Carcassonne rules). Feature groups merge when tiles connect. Scoring on feature completion: cities (2pts/tile), roads (1pt/tile), monasteries (surrounding tiles). End-game scoring for incomplete features. AI evaluates moves with heuristic scoring.

## C) Fun?
YES. Deep strategy game. Tile pool with shuffle ensures variety. AI is reasonably smart: evaluates city connections, monastery placement, and uses randomization. Follower placement decisions matter (limited to 7 meeples). Pan/scroll with mouse drag. Visual tile rendering with distinct city/road/field/monastery artwork. Hover preview shows tile before placement. Valid placement highlights guide the player.

## Issues
- The left-drag pan and click-to-place can conflict. The code attempts to handle this with `leftDragStart.moved` flag and `stopImmediatePropagation`, but two separate mousedown listeners on the canvas could cause ordering issues. In practice it seems to work because the second listener (line 840) only sets up drag tracking, not tile placement.
- Two `addEventListener('mousemove')` calls on the canvas (lines 806 and 845) -- both fire on every move. The second one handles drag panning, the first handles hover. This is functional but slightly wasteful.
- No "game over" overlay is shown immediately when tiles run out -- the `endGame()` function sets `gamePhase = 'over'` and the overlay is shown on the next `onUpdate` call when it detects the mismatch. This works but there is a 1-frame delay.

## Verdict: PASS
