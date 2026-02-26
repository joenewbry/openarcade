# Plants vs Zombies -- Audit

## A) Works?
YES. Correct engine integration: imports `Game`, creates with `new Game('game')`, implements `onInit`, `onUpdate`, `onDraw`, calls `game.start()`. Uses `setState('waiting'|'playing'|'over')` properly. Mouse handling is done via direct canvas event listeners with coordinate scaling, which is correct.

DOM refs `scoreEl` and `bestEl` are accessed at module scope. If these elements don't exist, the code will throw at line 263 (`scoreEl.textContent = '0'`) since there's no null check. The v2.html does include both `#score` and `#best` elements, so this is fine for v2.html.

The `expandHex` helper correctly handles 3-char hex to 6-char conversion for alpha appending.

## B) Playable?
YES. Controls: Click to place plants, keyboard 1-4 to select plant type, click suns to collect, SPACE to start/restart. The game has:
- 4 plant types (Peashooter, Sunflower, Wall-nut, Snow Pea)
- 4 zombie types (basic, cone, bucket, flag) with wave-based spawning
- Sun economy (sky suns + sunflower production)
- Grid-based placement with preview hover
- Sidebar plant selection with cost display

Mouse-to-grid conversion properly accounts for the sidebar width (SIDEBAR_W = 60) and top bar (TOP_BAR = 50).

## C) Fun?
YES. Faithful adaptation of the core PvZ loop:
- Strategic plant placement on a 9x5 grid
- Progressive wave difficulty with scaling zombie HP
- Sun management creates meaningful resource decisions
- Snow Pea slow effect adds tactical depth
- Good visual feedback: animated zombies, projectile trails, health bars, death particles
- Wave clear notification between waves
- The sidebar shows plant costs, affordable status, and keyboard shortcuts

## Verdict: PASS

Solid implementation of the Plants vs Zombies formula. All mechanics work correctly, the UI is clear, and the game offers meaningful strategic depth.
