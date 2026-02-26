# Restaurant Tycoon Audit

## A) Works? NEEDS_FIX
- Properly imports `Game`, exports `createGame()`, calls `game.start()`.
- DOM refs: `#score`, `#best` present in v2.html.
- Canvas `#game` at 600x500 matches W/H constants.
- Overlay markup correct with all required IDs.
- `game.setScoreFn()` called.
- **Issue**: The `onInit` callback adds click and mousemove event listeners to the canvas every time it is called. If the game is restarted (game over -> reinit), duplicate event listeners accumulate. This could cause double-firing of button actions on subsequent playthroughs.
- **Issue**: The overlay click listener (line 628-636) accesses `game.overlay` which may not be the standard engine property. If the engine exposes the overlay element differently, this could silently fail.

## B) Playable? PASS
- Mouse/click-driven management game: set prices, hire/fire staff, buy upgrades.
- Four-phase rounds: Menu -> Staff -> Upgrades -> Results.
- Price adjustment with +/- buttons and add/remove menu items.
- Staff management: hire/fire chefs, waiters, cleaners affecting quality/speed/hygiene.
- 4 upgrade purchases available per restaurant.
- Results phase shows customer distribution, revenue, costs, profit.
- AI opponents with reasonable decision-making.
- 15 rounds with final ranking.

## C) Fun? PASS
- Competitive restaurant management against 3 AI opponents.
- Visual street scene with buildings, customers, and star ratings.
- Random events (food critic, health check, festival) add unpredictability.
- Clear cause-and-effect: quality affects reviews, speed affects serve rate.
- Customer distribution based on appeal creates competitive dynamics.
- Standings table lets you track progress against rivals.
- Good phase progression keeps each round structured.

## Issues
- **Bug**: Event listeners accumulate on reinit -- clicking buttons may fire multiple times after restart. The `canvas.addEventListener('click', ...)` in `onInit` should be moved outside or guarded against re-registration.
- **Bug**: Button `action` properties are stored as functions (closures) rather than string identifiers. This means the `buttons` array holds live closures that reference stale state if the array isn't rebuilt. It IS rebuilt each draw frame (`buttons = []` in `onDraw`), so this works, but it's fragile.
- Minor: `drawButton` function parameter naming shadows outer `drawPanel` via same `renderer`/`text_` params -- no actual conflict but could confuse.
- The `game.overlay.style.display = 'none'` direct DOM manipulation (line 605) may conflict with the engine's own overlay management.

## Verdict: NEEDS_FIX
The duplicate event listener issue on reinit is a real bug that will cause erratic behavior after the first game over.
