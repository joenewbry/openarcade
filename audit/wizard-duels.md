# Audit: wizard-duels

## Verdict: NEEDS_FIX

## A) Will it work?
YES, with caveats. Properly imports `Game` from engine and exports `createGame()`. However, it directly accesses `game._state` (a private property) to set custom states like `'roundEnd'` at line 852 and reads `game._state` in the draw function at line 882. While this works because `_state` is just a JavaScript property (no true private fields), it bypasses `setState()` which means the recorder's `startSession`/`endSession` and overlay show/hide logic are not triggered for custom state transitions. The game manages its own state machine on top of the engine's, which creates potential confusion.

## B) Is it playable?
YES. Real-time spell combat with combo system. Player uses 1-4 for spells (fire, ice, lightning, earth), S for shield, Space for meditate (mana regen). Spells have elemental interactions -- combining elements creates combo spells (e.g., fire+ice = steam burst). CPU opponent has AI that adapts to player patterns. Best-of-5 rounds with HP/mana management.

## C) Will it be fun?
YES. The combo spell system adds depth and discovery. Shield timing and mana management create strategic decisions. AI opponent provides decent challenge. Visual effects for spells and combos are well-done with glow effects.

## Issues Found
1. **Medium**: Directly sets `game._state = 'roundEnd'` instead of using `game.setState('roundEnd')`. This skips recorder session management and overlay logic in the engine. The game works but recording/replay integration may be broken for state transitions.
2. **Minor**: Reads `game._state` directly instead of `game.state` (the getter). While functionally equivalent, it's poor practice.

## Recommended Fixes
1. Replace `game._state = 'roundEnd'` with `game.setState('roundEnd')` or manage custom sub-states separately from the engine's state (e.g., use a module-level `roundState` variable).
2. Replace `game._state` reads with `game.state`.
