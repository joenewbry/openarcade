# Trading Card MMO - Audit

## A) Works?
**PASS**

The game initializes correctly using the engine API: `new Game('game')`, `onInit`, `onUpdate(dt)`, `onDraw(renderer, text)`, `start()`, `setState()`, `showOverlay()`. The v2.html has all required DOM elements (`canvas#game`, `#overlay`, `#overlayTitle`, `#overlayText`). State transitions: `waiting -> playing -> over`. The game uses a custom view system (`menu`, `battle`, `collection`, `deckbuilder`, `packopen`, `tournament`, `trade`) within the `playing` state. All views render and handle clicks correctly.

DOM elements (`#score`, `#goldDisplay`, `#cardCount`) are looked up at module scope but the HTML defines them before the script tag, so this works.

## B) Playable?
**PASS**

Mouse-only controls (click + scroll wheel). The game presents a full card game loop:
- Main menu with 6 options (battle, tournament, buy pack, collection, deck builder, trade)
- Card battle system with mana, creatures, spells, equipment
- Deck building with add/remove
- Pack opening with card reveal animation
- Tournament mode with 4 rounds
- Trading system with AI counter-offers

Click targets are well-defined. The battle UI lets you play cards from hand, select creatures to attack, and choose targets. The "END TURN" button advances to AI turn. Scroll wheel works in collection and deck builder views.

## C) Fun?
**PASS**

Surprisingly deep for a canvas-rendered card game. The card variety (23 creatures, 10 spells, 8 equipment across 4 rarities) creates real deck-building decisions. The battle system has meaningful choices: mana management, attack ordering, spell targeting. The meta-loop of battle -> earn gold -> buy packs -> improve deck -> battle harder opponents is compelling. Tournament mode provides escalating challenge.

## Issues Found

1. **AI think timer uses frame count, not dt** (line 1048-1049): `battleState.aiThinkTimer--` decrements by 1 per frame instead of using `dt`. At 60fps this is about 0.58s, but the timer is not framerate-independent. At higher/lower framerates the AI think time changes. Minor issue since it's just a cosmetic delay.

2. **Trade generates AI offer during draw** (line 943): `generateAITradeOffer()` is called inside `drawTrade()` when `tradeOfferPlayer.length > 0 && tradeOfferAI.length === 0`. Since `onDraw` runs every frame, this could regenerate offers repeatedly if the function produces an empty array. In practice, it should always produce at least one card, but calling side-effecting logic in draw is architecturally unclean.

3. **Starter deck references are shared** (line 974): `playerDeck = playerCollection.slice(0, 20)` creates new array entries but the card objects are shared references with `playerCollection`. This means mutations to cards in deck also affect the collection view. In practice this works because cards are only mutated during battle (where copies are made via spread), but it is fragile.

4. **No `game.state === 'over'` transition**: The game never calls `game.setState('over')`. When a battle ends, `finishBattle()` routes to `packopen` or `menu` view. The `over` handler in the click listener calls `game.onInit()` to restart. The game effectively stays in `playing` state forever after the first click, with an internal `view` system managing screens. This works but means the engine's overlay system for game-over is unused.

5. **Canvas height 500 vs standard 400**: The canvas is 600x500 instead of the typical 600x400. This is intentional given the UI complexity but worth noting as it differs from other games.

## Verdict: PASS

The game works, is playable, and is genuinely fun. The card game mechanics are well-implemented with a satisfying meta-progression loop. Issues are minor (cosmetic AI delay timing, architectural nitpick about draw-side-effects). The game is one of the more ambitious and polished entries.
