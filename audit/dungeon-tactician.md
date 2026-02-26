# Dungeon Tactician -- Audit

## Files
- `/Users/joe/dev/openarcade/dungeon-tactician/game.js` (1049 lines)
- `/Users/joe/dev/openarcade/dungeon-tactician/v2.html` (123 lines)

## A) Works?

**PASS**

Engine integration is correct:
- `new Game('game')` with proper `onInit`, `onUpdate`, `onDraw`
- State machine: `'waiting'` -> `'playing'` -> `'transition'` -> `'over'`
- `showOverlay`/`hideOverlay` used correctly
- Custom state `'transition'` used between rounds (handled in click processing)
- `setScoreFn` registered
- `game.start()` called

DOM structure in v2.html:
- `canvas#game` 600x500
- Standard overlay elements present
- Extra elements: `#playerScore`, `#aiScore`, `#roundNum`, `#phaseText`, `#infoText`, `#budgetText`, `#overlaySubText`, `#toolbar`
- Toolbar is populated dynamically via JS (buildToolbar/buildRaidToolbar)

Click events use `pendingClicks` queue pattern, processed in `onUpdate`. All game logic runs inside `onUpdate`, which is correct.

The game uses `setTimeout` in `startAIBuildPhase` (line 270) and `endRaidPhase` (line 475) and `aiRaidStep` (line 542). These timeouts call state-changing functions outside of the game loop, which is technically impure but works because they trigger DOM updates and state transitions that the next `onUpdate` picks up.

## B) Playable?

**PASS**

This is a complex strategy game with alternating roles:
- **Build Phase**: Player places walls, traps, monsters on a 10x10 grid using a budget of 15
- **Raid Phase**: Player controls 3 heroes (Warrior/Mage/Rogue) through the dungeon
- Roles alternate: Player builds -> AI raids, AI builds -> Player raids
- 3 rounds total, then winner declared

Controls:
- Click toolbar buttons to select tools during build phase
- Click grid cells to place/move during both phases
- Click overlay to advance between phases/rounds

The toolbar is rendered via DOM buttons (not canvas), which is a bit unusual for this engine but functional. The `onclick` handlers on buttons call functions directly.

Path validation ensures the entrance-to-treasure path is never fully blocked. AI build logic and AI raid logic both function.

Fog of war works correctly -- raider sees only revealed cells within distance 2 of heroes.

## C) Fun?

**NEEDS_FIX**

The concept is strong (asymmetric build/raid gameplay) but has usability issues:

1. **Information overload**: Sidebar text is very small (8-10px) and cramped at 600x500 resolution. The log is truncated to 20 chars.
2. **AI raid phase is passive**: When AI raids your dungeon, you just watch with `setTimeout` delays. No interaction possible. This is boring.
3. **Hero selection during raid is confusing**: You must click heroes in the toolbar, then click adjacent cells. No visual indicator of which cells are valid moves.
4. **No undo during build**: Erase tool exists but requires selecting it, then clicking. No quick undo.
5. **Round transitions use `setTimeout`** (1500ms) with no visual feedback -- the game just pauses.

The core idea is good but the execution makes it feel like a prototype. The AI provides a competent opponent though.

## Verdict: PASS

The game works and is playable. The strategy concept is interesting with build/raid asymmetry. Some UX polish needed (move indicators, faster transitions, better feedback) but nothing is broken. The `setTimeout` usage for AI phases is a minor code smell but doesn't cause bugs.
