# Dr. Mario - Audit

## A) Works?
**PASS** - Uses engine API correctly: `new Game('game')`, `onInit`, `onUpdate`, `onDraw(renderer, text)`, `start()`, `setState()`, `showOverlay()`, `hideOverlay()`. DOM elements `#score`, `#best`, `#level`, `#viruses`, `#overlay`, `#overlayTitle`, `#overlayText`, `#nextCanvas` all present. Canvas is 280x544. Side panel with next piece preview uses a separate 2D canvas (`#nextCanvas`). `setScoreFn` is called. The v2.html uses a flexbox game-area layout with side panel for stats.

## B) Playable?
**PASS** - Left/Right arrows move pill horizontally. ArrowUp or Z rotates pill. ArrowDown soft-drops. Space hard-drops. Three pill colors match three virus colors. Match 4+ in a row/column to clear. Viruses cleared = level progress. Chain scoring with 2x multiplier per chain step. Gravity drops unsupported pill pieces after clears. Ghost piece preview shows landing position. Level complete when all viruses cleared, auto-advances to next level.

## C) Fun?
**PASS** - Excellent Dr. Mario implementation. Core match-4 mechanic is satisfying with proper chain reactions. Virus placement uses smart anti-run algorithm (avoids accidental pre-made matches). Drop speed scales with level. Ghost piece is a welcome modern QOL addition. Next piece preview uses a separate small canvas for crisp rendering. Visual polish includes glowing bottle outline with neck detail, virus sprites with eyes/mouths/spiky arms, pill cells with highlights, clear animation with pulsing white flash, and grid lines for alignment.

## Issues
- **Minor**: `best` resets to 0 every game (`onInit` sets `best = 0`). Should preserve across games or use localStorage.
- **Minor**: Rotation uses a wall-kick system (try original position, if blocked try shifted position) which is good, but only one alternative position is tried per orientation.
- **Minor**: The `wouldCreateRun` function prevents accidental virus matches during placement but uses `minLen: 3` -- a run of 3 won't auto-clear (needs 4), so this is slightly conservative but ensures clean boards.

## Verdict: PASS
