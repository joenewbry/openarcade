# Trivia Royale - Audit

## A) Works?
**PASS**

The game initializes correctly using the engine API: `new Game('game')`, `onInit`, `onUpdate(dt)`, `onDraw(renderer, text)`, `start()`, `setState()`, `showOverlay()`. The v2.html has all required DOM elements (`canvas#game`, `#overlay`, `#overlayTitle`, `#overlayText`). State transitions: `waiting -> playing -> over`. The game uses an internal `phase` state machine (`idle -> question -> reveal -> gameOver`) within the `playing` engine state. 60 trivia questions across 8 categories are embedded. BFS-style AI opponents with varying accuracies are generated.

Canvas is 600x500 (taller than standard 400) to accommodate the 8-player slot layout plus questions and answers.

## B) Playable?
**PASS**

Mouse-only controls (click to select answer). The game presents 4 answer choices as large clickable boxes with clear hover states. A 15-second countdown timer creates urgency. Player selects an answer by clicking; if time runs out, it counts as wrong. The UI clearly shows:
- 8 player slots (you + 7 AI) with lives (hearts), scores, and unique avatar shapes
- Timer bar with color-coded urgency
- Category and round counter
- Correct/incorrect highlighting during reveal phase
- Elimination banners
- Final standings at game end

Click target areas are generous (500px wide answer boxes). The game auto-advances between rounds via setTimeout.

## C) Fun?
**PASS**

The battle royale format adds real tension to a trivia game. Watching AI opponents get eliminated while trying to survive yourself is engaging. The lives system (3 per player) means a few wrong answers are forgiving but accumulate. Time bonus scoring rewards fast answers. 60 questions across 8 categories provide decent variety (about 2.4 playthroughs before repeats). Visual polish is strong: particle effects for correct/wrong answers, screen shake on wrong answers, red flash overlay, elimination banners, glow effects on avatars, and a satisfying final standings screen.

## Issues Found

1. **Event listeners added inside `onInit`** (lines 650-679): The `mousemove` and `click` listeners are added inside `game.onInit`, which could potentially be called multiple times (e.g., via the `over` state click handler calling `game.onInit()` if the pattern matches trading-card-mmo). However, looking at the click handler (line 667-672), clicking in `over` state calls `game.setState('playing')` then `initGame()`, not `game.onInit()`. So `onInit` is only called once by the engine. This is fine but fragile -- if the engine ever re-calls `onInit`, duplicate listeners would accumulate.

2. **`setTimeout` used instead of engine dt** (lines 435-437): `nextRoundTimeout` uses `setTimeout` for round transitions and game end. This works but is outside the engine's update loop. The `clearTimeout` in `initGame` (line 328) handles cleanup properly.

3. **Timer uses `Date.now()` instead of dt accumulation** (lines 359, 475): The timer uses wall-clock time rather than accumulating `dt`. This means the timer runs in real-time even if the game loop stutters. For a trivia game this is arguably correct behavior (real-time pressure), so not a bug.

4. **All answers have `c: 0`** (lines 11-78): Every question has `c: 0` as the correct answer index, meaning the first listed answer is always correct. The answers are not shuffled per-question. A savvy player could always pick "A" and get 100% accuracy. This significantly undermines the trivia gameplay.

## Verdict: NEEDS_FIX

The game works and is well-polished visually, but issue #4 is a significant gameplay flaw. Since every correct answer is always option A (index 0), a player who notices this pattern can exploit it trivially. The answers should be shuffled when each question is presented, or the correct answer index should vary in the question data.
