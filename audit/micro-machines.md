# Micro Machines - Audit

## Files
- `micro-machines/game.js` (~1089 lines)
- `micro-machines/v2.html` (85 lines)

## Overview
Top-down racing game inspired by Micro Machines. 600x500 canvas. 4 cars (1 player, 3 AI) race on 3 different tracks themed as household surfaces (kitchen table, desk, bathtub). Items system (boost, oil slick, missile, shield). Camera follows the leader. Points-based championship across races -- first to 5 points wins.

## Engine API Usage
- **Game instantiation**: `new Game('game')` -- correct
- **Lifecycle**: `onInit`, `onUpdate(dt)`, `onDraw(renderer, text, alpha)` -- correct
- **State management**: `setState('waiting'|'playing'|'over')`, `showOverlay`/`hideOverlay` -- correct
- **Input**: `game.input.isDown('ArrowUp'/'ArrowDown'/'ArrowLeft'/'ArrowRight')` for driving, `game.input.wasPressed('Space')` for items, `game.input.wasPressed('Enter')` to start -- correct engine usage
- **Score**: `setScoreFn()` -- correct
- **DOM refs**: `score`, `best`, `lapDisplay`, `itemDisplay` -- present in v2.html

## v2.html Structure
- Standard-ish layout: header, score bar with lap/item display and points/best
- 600x500 canvas, overlay with h2/p
- Score bar is slightly extended to accommodate racing-specific info (lap count, current item)
- Module script imports `createGame` -- correct

## Notable Patterns
1. **ENTER to start**: Game uses `wasPressed('Enter')` to start from the waiting/over states. This is noted in the overlay text ("Press ENTER to start"). Consistent with genre conventions.
2. **Waypoint-based tracks**: 3 tracks defined as waypoint arrays. AI cars follow waypoints with steering logic. Player has free control.
3. **Camera system**: Camera follows the race leader (or a point between leader and player), creating the classic Micro Machines "push ahead to win" feel.
4. **Items**: Boost (speed burst), Oil (drops slick), Missile (homing projectile), Shield (temporary invulnerability). Collected from item boxes on track.
5. **Championship system**: Points awarded per race finish position. Multiple races until someone reaches 5 points. Adds progression beyond single races.
6. **localStorage**: Stores best championship score.

## A) Works?
**PASS** - Race loop functions correctly: lap counting, position tracking, item pickups and effects, AI waypoint following. Championship point system tallies across races. Camera tracking works. No missing DOM refs.

## B) Playable?
**PASS** - Arrow keys for steering/acceleration, Space for items. ENTER to start is clearly documented. AI opponents provide competition. Lap display and item indicator in HUD. 3 varied tracks prevent repetition.

## C) Fun?
**PASS** - Captures the Micro Machines spirit well: tiny cars on oversized household surfaces, competitive racing, item chaos. Camera-follows-leader creates exciting catch-up dynamics. Championship across multiple tracks/races adds stakes. Items add unpredictability without being overpowering.

## Verdict: PASS
