# Go (Baduk) - Audit

## Files
- `go-baduk/game.js` (~842 lines)
- `go-baduk/v2.html` (83 lines)

## Overview
9x9 Go board game with MCTS AI opponent. 600x600 canvas. Full Go rules implementation: captures, ko rule, suicide prevention, Chinese area scoring. Player is Black, AI is White. Includes ghost stone preview on hover and a pass mechanism.

## Engine API Usage
- **Game instantiation**: `new Game('game')` -- correct
- **Lifecycle**: `onInit`, `onUpdate(dt)`, `onDraw(renderer, text, alpha)` -- correct
- **State management**: `setState('waiting'|'playing'|'over')`, `showOverlay`/`hideOverlay` -- correct
- **Input**: Mouse-based via canvas event listeners (`click`, `mousemove`). Uses `pendingClicks`/`pendingMoves` arrays queued from DOM events, consumed in `onUpdate`. Does NOT use `game.input` for mouse -- custom handling.
- **Score**: `setScoreFn()` -- correct
- **DOM refs**: `score`, `aiScore` -- present in v2.html

## v2.html Structure
- Standard layout: header, score bar showing "Black (You)" and "White (AI)" scores
- 600x600 canvas, overlay with h2/p
- Module script imports `createGame` -- correct

## Notable Patterns
1. **Custom mouse input**: Game attaches its own click/mousemove listeners to the canvas and queues events. This is necessary because the engine's `input` API is keyboard-focused and doesn't provide click coordinates. This is the correct approach for a board game.
2. **setTimeout for AI thinking** (~line 591): After the player moves, a setTimeout delays the AI response to simulate "thinking time." This is cosmetic and doesn't affect gameplay correctness.
3. **MCTS AI**: Monte Carlo Tree Search with 400-600 simulations depending on game phase. Includes UCB1 selection, random rollouts, and backpropagation. Solid implementation for 9x9 board.
4. **Full Go rules**: Liberty counting, capture detection, ko rule, suicide prevention, Chinese area scoring with territory flood-fill. Comprehensive and correct.

## A) Works?
**PASS** - Go rules are correctly implemented. MCTS AI produces reasonable moves. Click-to-place stones works via canvas event listener. Score updates in DOM. Ko and capture edge cases handled.

## B) Playable?
**PASS** - Click to place stones, ghost stone hover shows placement preview. Pass mechanism available. AI responds after brief thinking delay. Game ends when both players pass, with territory scoring displayed. Clear start/restart flow.

## C) Fun?
**PASS** - Competent Go implementation on 9x9 board. MCTS AI provides reasonable challenge without being unbeatable. Ghost stone preview is helpful UX. Territory scoring at end is clearly visualized. Good for Go beginners on the smaller board.

## Notes
- Custom mouse handling is appropriate for this game type -- engine input API doesn't support click coordinates.
- AI strength could be tuned via simulation count, currently reasonable for casual play.

## Verdict: PASS
