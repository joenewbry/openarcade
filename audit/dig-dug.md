# Dig Dug - Audit

## A) Works?
**PASS** - Uses engine API correctly: `new Game('game')`, `onInit`, `onUpdate`, `onDraw(renderer, text)`, `start()`, `setState()`, `showOverlay()`. DOM elements `#score`, `#best`, `#level`, `#lives`, `#overlay`, `#overlayTitle`, `#overlayText` all present. Canvas is 480x520. `setScoreFn` is called. Grid-based gameplay with proper cell tracking.

## B) Playable?
**PASS** - Arrow keys move player through dirt (digging tunnels). Space fires the pump weapon in the facing direction. Hold Space to keep inflating enemies (4 levels to pop). Enemies deflate over time if pump is released. Two enemy types: Pookas (round, red) and Fygars (green dragons with fire breath). Rocks fall when dirt below is dug away, crushing enemies for bonus points. Last enemy escapes upward. Level progression on clearing all enemies.

## C) Fun?
**PASS** - Solid Dig Dug implementation. Core pump mechanic works well with timing challenge (hold to inflate, enemies deflate if released). Rock crushing provides satisfying chain kill opportunities with escalating bonus multiplier. Fygars add danger with fire breath when on the same row. Ghost mode lets stuck enemies phase through dirt toward the player. Depth-based scoring rewards digging deeper. Visual polish with 4 dirt color layers, tunnel edge rendering, animated inflate/deflate, fire breath effects, and rock wobble before falling.

## Issues
- **Minor**: `best` score resets to 0 on each `onInit` call (line 932: `best = 0`). This means best score resets every game, which is incorrect -- should preserve across games or use localStorage.
- **Minor**: Enemy movement is grid-based but the move interval (`PLAYER_MOVE_INTERVAL = 5` frames) makes movement feel somewhat choppy rather than smooth. This is authentic to the original game's feel though.
- **Minor**: `hslToHex` function has a slightly incorrect formula (standard HSL conversion uses different offsets) but produces acceptable visual results.

## Verdict: PASS
