# Audit: Stratego Digital

## A) Works?
**PASS**

- Imports `Game` from engine, creates via `new Game('game')`, implements `onInit`, `onUpdate`, `onDraw`, `start()`.
- State machine: `waiting` -> click -> `playing` (with setup phase) -> play -> `over` -> `waiting` (via setTimeout).
- `showOverlay`/`hideOverlay` used correctly. `setScoreFn` wired.
- Canvas click and right-click listeners push events to `pendingClicks`/`pendingRightClicks` arrays, consumed in `onUpdate` -- clean separation of input handling.
- DOM refs (`score`, `best`, `infoBar`) guarded with null checks.
- v2.html has correct canvas (500x600), overlay, score bar, and module import.

## B) Playable?
**PASS**

- Setup phase: click to place pieces on rows 7-10, or right-click to auto-place all remaining.
- Play phase: click own piece to select, click valid move destination to move. Green dots for moves, red highlights for attacks.
- AI uses scoring heuristics for attacks (value/momentum estimation, bomb detection, flag priority).
- Battle popup shows combat results with attacker vs defender info.
- Captured pieces panel at bottom shows both sides' captures.
- Game ends when flag is captured or a player has no moves left.

## C) Fun?
**PASS**

- Classic Stratego mechanics faithfully implemented with hidden information.
- AI is reasonably competent -- uses piece estimation, protects high-value pieces, advances strategically.
- Battle popup with results creates tension.
- Setup flexibility (manual or auto-place) is nice.
- Score tracking via captures gives progression feel.

## Issues
- `endGame(result, g)` takes two parameters but is called as `endGame('win')` or `endGame('lose')` from `resolveBattle` (line 229) -- missing the `g` (game) parameter. This means `g.setState('over')` and `g.showOverlay(...)` on lines 262/268 will throw `TypeError: Cannot read properties of undefined`. The game-over flow is **broken**.
- The `aiTakeTurn(g)` function correctly passes `g`, but `resolveBattle` -> `endGame` path does not have access to `g`. This is a **critical bug** -- capturing the enemy flag or losing your flag will crash.
- `hasMovesLeft` check in `aiTakeTurn` calls `endGame('lose', g)` correctly.

## Verdict: NEEDS_FIX
The `endGame` function is called without the required `g` parameter from `resolveBattle`, causing a crash when a flag is captured. Fix: either store `game` reference in module scope, or pass it through the call chain.
