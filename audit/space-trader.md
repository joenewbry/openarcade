# Space Trader Audit

## Verdict
NEEDS_FIX

### A) Works?
NEEDS_FIX — Engine API mostly used correctly. DOM refs are extensive (`score`, `shipInfo`, `turnInfo`, `locationInfo`, `cargoInfo`, `repInfo`, `log`, `btnMap`, `btnTrade`, `btnShip`, `btnEnd`, `overlaySub`) and all present in v2.html. However, the `endGame` function (defined around line 401) takes a `game` parameter: `function endGame(game)`. It is called from `endTurn()` at line 383 as `endGame()` without passing the `game` argument. Inside `endGame`, `game.showOverlay(...)` and `game.setState('over')` are called on this parameter. Since `game` parameter is `undefined` (no argument passed), these calls will throw a TypeError when the game reaches turn 30 (or the player manually ends). The `game` variable from the `createGame()` closure IS available, but the function parameter shadows it.

### B) Playable?
NEEDS_FIX — Mouse-driven UI with canvas-rendered buttons for trading, star map navigation, and ship management. HTML buttons for view switching (Map/Trade/Ship/End Turn). 12 star systems with different goods prices. 5 trade goods. Ship upgrades (cargo, shields, weapons, engines). Faction reputation system. AI traders and pirates. The game plays correctly UNTIL turn 30 or manual end — then crashes due to the `endGame` bug.

### C) Fun?
PASS (when working) — Deep trading mechanics with supply/demand across 12 systems. Faction reputation affects prices and hostility. Ship upgrades provide meaningful progression choices. Combat encounters with pirates add risk to trade routes. 30-turn limit creates strategic pressure. Multiple viable strategies (pure trading, combat-focused, faction manipulation).

### Issues
1. **BUG**: `endGame(game)` function parameter shadows the closure variable. Called as `endGame()` from `endTurn()`, so `game` is `undefined` inside the function. `game.showOverlay()` and `game.setState('over')` will throw TypeError at game end.

### Fixes
1. Remove the `game` parameter from `endGame` function definition — change `function endGame(game)` to `function endGame()` so it uses the `game` variable from the `createGame()` closure instead of the shadowed undefined parameter.
