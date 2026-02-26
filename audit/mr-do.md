# Mr. Do! Audit

## A) Works? PASS
- Engine integration correct: `new Game('game')`, callbacks, `start()`.
- Canvas 480x480 matches v2.html. Overlay properly sized.
- DOM elements `#score`, `#best`, `#lives` all present in v2.html.
- Grid-based movement on a 15x15 grid with 32px cells.
- Tile types: DIRT, EMPTY, CHERRY, APPLE, BONUS. Player digs through dirt.
- Cherry groups placed randomly. Collecting all cherries completes level.
- Killing all monsters also completes level.
- Apple physics: apples fall when tile below is empty, can crush player or monsters.
- Power ball bounces off walls, kills monsters on contact.

## B) Playable? PASS
- Arrow keys to move, Space to throw power ball.
- Grid-based movement with timer-controlled step rate.
- Monsters chase player: type 0 follows paths, type 1 (diggers) can tunnel through dirt.
- Multiple win conditions: collect all cherries OR kill all monsters.
- Lives system (3 lives). Death repositions player with monster stun.
- Level progression increases monster count and speed.
- Score from cherries (50), ball kills (100-800 escalating), apple kills (300), level completion bonus.

## C) Fun? PASS
- Faithful Mr. Do! adaptation with strategic depth.
- Two ways to complete levels (cherries vs combat) adds replayability.
- Apple physics create dynamic traps for both player and monsters.
- Power ball with bouncing and recharge timer is satisfying.
- Monster AI with two types (walker and digger) creates varied challenge.
- Visual style: colorful ghost-like monsters with animated bodies, clown player character with hat, cherry/apple art, bonus diamond animation.

## Issues
- **Minor**: Monster movement frequency uses `Math.max(6, MONSTER_MOVE_INTERVAL - level)` which caps at 6 frames minimum. At high levels, monsters will all move at the same speed, which is fine for balance.
- **Minor**: `window.gameData` is set for ML training, which is not an issue but adds slight overhead.
- **Minor**: Apple falling logic checks `apple.fallSpeed > 2` to determine if apple shatters on landing vs settling. This means apples that just started falling won't always destroy. This is intended Dig Dug-style behavior.

## Verdict: PASS
