# Audit: Tactical Card Battler

## A) Works?
**PASS**

- Imports `Game` from engine, creates instance, implements `onInit`, `onUpdate`, `onDraw`, `start()`.
- State machine: `waiting` -> click -> `playing` -> HP <= 0 -> `over` -> click -> `waiting` -> click -> `playing`.
- `showOverlay` used at init and game end. `setScoreFn` wired.
- Mouse events via direct canvas listeners for card drag-and-drop and end turn button.
- Overlay element has `pointerEvents: 'auto'` set in JS for click-through handling.
- DOM refs (`score`, `playerHP`, `playerMana`, `aiHP`, `aiMana`) guarded with null checks.
- `gameInst` stored in module scope for `checkGameOver` and `aiTurn` callbacks.
- v2.html: canvas 600x500, overlay with background, all HUD elements present.

## B) Playable?
**PASS**

- Drag cards from hand to lanes (minions) or enemy lanes (damage spells) or anywhere above hand (heal/buff spells).
- 3 lanes of combat, each lane resolves independently.
- Mana system: starts at 0, increases by 1 each turn (max 10). Mana refills each turn.
- End Turn button triggers combat phase, then AI turn.
- Card types: minions (ATK/HP), damage spells, heal spells, buff spells.
- AI evaluates plays based on value scoring (kill potential, damage efficiency, board state).
- Combat: minions attack opposing minion in same lane, or hit hero directly if lane is empty.

## C) Fun?
**PASS**

- Classic lane-based card battler with satisfying strategic decisions.
- Card variety creates interesting deck-building moments (20 different cards).
- Lane system forces positional thinking (which lane to reinforce/attack).
- Mana curve creates natural game progression from cheap to expensive cards.
- AI is competent -- evaluates minion placement, spell targeting, and heal timing.
- Combat log provides feedback on what's happening.
- Drag-and-drop card play feels natural.

## Issues
- `drawRoundRectBorder` calls `strokePoly` with 4th argument `true` (line 354). The engine API is `strokePoly(points, color, width)` -- the 4th argument is not documented. If the engine ignores extra arguments, this is harmless; if it expects only 3, this could cause issues.
- `drawTurnIndicator` also passes `true` as 4th arg to `strokePoly` on line 544. Same issue.
- Game logic is heavily event-driven via `setTimeout` chains (combat resolution). If multiple rapid clicks happen during animation, the `turnPhase` guard (`'animating'`) should prevent issues, but the timeout chain could theoretically interleave with state changes. In practice, the 400ms delay per lane and 600ms AI think time provide sufficient gaps.
- The `overlay.style.pointerEvents = 'auto'` on line 684 changes the default `pointer-events: none` from CSS, which means the overlay intercepts clicks even when visible. This is intentional for the "click to start" mechanic, but could potentially block canvas clicks if the overlay isn't properly hidden.
- `logTimer` is decremented in `drawCombatLog` (a draw function), making it frame-rate dependent rather than time-based. At 60fps it counts down ~1.5 seconds (90 frames), but at other framerates it would be different.

## Verdict: PASS
Well-designed card game with satisfying mechanics, good AI, and clean drag-and-drop interface. Minor concerns about `strokePoly` extra arguments and frame-rate-dependent log timer.
