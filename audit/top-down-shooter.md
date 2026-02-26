# Audit: Top-Down Shooter

## A) Works?
YES. 4-player arena deathmatch (1 human + 3 AI bots). Canvas 600x600. Custom HTML layout with score-bar, HUD overlay, weapon info, timer. Uses DOM button (#start-btn) to start the match. Direct canvas mouse events for aiming and shooting. Engine input for WASD movement and E/R keys. Uses `performance.now()` for fire rate timing and bullet lifetime.

## B) Playable?
YES. Controls: WASD to move, mouse to aim, click to shoot, E to pickup items, R to switch to pistol. 4 weapons: pistol (infinite ammo), SMG (fast fire), shotgun (spread), rocket (explosive splash). Health/weapon/ammo pickups respawn on timers. 3-minute match timer. Kill/death tracking. Respawn system with safest-spawn selection. AI bots have varied aggression/accuracy/reaction time.

## C) Fun?
YES. Excellent arena shooter. AI is sophisticated: line-of-sight checks, flanking movement, health-seeking when low, weapon pickup prioritization, retreat behavior, strafe during combat. Multiple weapon types with distinct feel (fire rate, damage, spread, bullet speed). Rocket launcher has area-of-effect damage. Muzzle flash and bullet trail effects. Wall collision resolution is solid. Pickup respawn keeps the flow going.

## Issues
- The `onUpdate` receives `dt` but the engine API says `onUpdate(dt)` -- this works. However, `dt` is used as milliseconds for timer countdown (`timeLeft -= dt / 1000`) and AI movement, but the engine likely provides `dt` in seconds or milliseconds depending on implementation. If the engine provides frame-based updates (no dt argument or dt=1), the timer and AI timing would be off.
- The game directly manipulates `game.overlay.style.display` and `game.overlay.innerHTML` on match end (lines 544-556), bypassing the engine's `showOverlay`/`hideOverlay` API. This works but couples to internal engine DOM structure.
- Restart button is dynamically created in the overlay on game over, using `addEventListener`. If the game is restarted multiple times, old event listeners on removed buttons are garbage collected, so no memory leak.
- The `#overlay` div in v2.html does not have `#overlayTitle` or `#overlayText` children -- it has custom content. The engine's `showOverlay` is called in `onInit` but the overlay HTML is different from the standard pattern. The `game.showOverlay('TOP-DOWN SHOOTER ARENA', ...)` call may not work correctly if the engine expects `#overlayTitle` and `#overlayText` elements. However, the actual start uses `#start-btn` click, so the overlay text may not matter.

## Verdict: NEEDS_FIX
- The v2.html overlay div does not contain `#overlayTitle` or `#overlayText` elements. The engine's `showOverlay(title, text)` likely sets `document.getElementById('overlayTitle').textContent` and `document.getElementById('overlayText').textContent`, which would fail silently (elements not found). The game works around this by using its own overlay structure and a DOM button, so the game IS functional, but the initial `showOverlay` call in `onInit` would error if the engine tries to access those missing elements. The start flow actually works because the custom overlay is already visible by default, but this is fragile.
