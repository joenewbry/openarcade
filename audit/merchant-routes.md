# Merchant Routes - Audit

## Files
- `merchant-routes/game.js` (~829 lines)
- `merchant-routes/v2.html` (100 lines)

## Overview
Trading/economy strategy game. 600x500 canvas. 10 cities connected by a road network, 8 tradeable goods with supply/demand pricing. Player travels between cities buying low and selling high. AI merchants compete. Random events affect prices. 25-turn limit with gold-based scoring.

## Engine API Usage
- **Game instantiation**: `new Game('game')` -- correct
- **Lifecycle**: `onInit`, `onUpdate(dt)`, `onDraw(renderer, text, alpha)` -- correct
- **State management**: `setState('waiting'|'playing'|'over')`, `showOverlay`/`hideOverlay` -- correct
- **Input**: Mouse-based via canvas event listeners. Click on city to travel, click-based trade panel for buy/sell. Does not use `game.input` -- custom click handling.
- **Score**: `setScoreFn()` -- correct
- **DOM refs**: `score`, `aiScore`, `turnInfo`, `inventoryInfo`, `cityInfo`, `eventInfo` -- present in v2.html

## v2.html Structure
- Extended layout: header, score bar (your gold / AI gold), 600x500 canvas, overlay
- **Extra info panel** below canvas with `turnInfo`, `inventoryInfo`, `cityInfo`, `eventInfo` divs
- Overlay with h2/p -- correct pattern
- Module script imports `createGame` -- correct
- Non-standard: additional info-panel section below canvas (100 lines vs typical 83)

## Notable Patterns
1. **Turn-based with setTimeout**: AI merchants process their turns via setTimeout chains (~lines 283, 306). Each AI merchant moves and trades sequentially with brief delays. State checks prevent stale processing.
2. **Custom trade UI**: Buy/sell buttons rendered on canvas or via DOM interaction. Click-based economy management.
3. **Event system**: Random events (drought, gold rush, plague, trade festival, etc.) affect city prices, creating market volatility.
4. **Road network**: Cities connected by weighted edges. Travel costs turns based on distance. Pathfinding for route selection.
5. **AI merchants**: Computer traders with simple buy-low-sell-high logic, competing for the same markets.

## A) Works?
**PASS** - Economy simulation runs correctly: prices respond to supply/demand, events modify markets, AI merchants trade alongside player. Turn counter and gold scoring work. setTimeout chains for AI are guarded by state checks. All DOM refs present in HTML.

## B) Playable?
**PASS** - Click city to travel, click goods to buy/sell. Info panels show inventory, city goods, and events. Turn limit creates urgency. AI competition prevents trivial strategies. Clear gold-based scoring.

## C) Fun?
**PASS** - Compelling trade loop: identify price disparities, plan efficient routes, adapt to random events. AI merchants add competitive pressure. 25-turn limit forces strategic thinking about route efficiency. Event system keeps markets dynamic. Good depth for a browser game.

## Notes
- The extra info-panel below the canvas is non-standard for v2.html but necessary for the game's information density.
- setTimeout for AI turns is acceptable -- turn-based game doesn't need frame-perfect timing.

## Verdict: PASS
