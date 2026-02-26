# Audit: browser-mmo-rpg

## Verdict: NEEDS_FIX

## A) Will it work?
YES, with caveats. Properly imports `Game` from engine and exports `createGame()`. The game calls `renderer.begin('#111122')` inside `onDraw` (line 1372), but the engine already calls `renderer.begin()` in `_drawFrame()` before calling `onDraw`. This means the background is cleared twice per frame -- redundant but not harmful since `begin()` just sets the clear color and clears. The v2.html uses `onclick="startGame('warrior')"` on buttons, which requires `startGame` to be on `window` -- the game correctly sets `window.startGame` at line 1080. DOM elements are accessed without null-checks at line 1350-1353 but all exist in v2.html.

The bigger concern is the class selection flow: the overlay buttons use inline `onclick` handlers that call a global `startGame()` function, bypassing the engine's input system entirely. This means the class selection click won't be recorded by the engine's recorder. However, gameplay after that point will record correctly.

## B) Is it playable?
YES. Full RPG with 3 classes (Warrior, Mage, Ranger), each with 4 unique abilities. Large procedurally generated world with 4 zones (Town, Forest, Dungeon, PvP Arena). Quest system with 8 quests. Shop/inventory/equipment system. Party member AI companion. Enemy types from slimes to a Shadow Dragon boss. Level-up system with stat growth. WASD movement, click to attack, 1-4 for abilities, I/M/Q for menus, E to interact.

## C) Will it be fun?
YES. Impressive scope for a single-file game. Multiple zones with distinct enemy types provide exploration. Quest system gives objectives. Loot drops and equipment upgrades create progression loop. Party member adds tactical depth. Boss fight provides endgame goal. The various UI panels (inventory, map, quest log, shop) are well-implemented with mouse interaction.

## Issues Found
1. **Medium**: `renderer.begin('#111122')` called redundantly in `onDraw` -- engine already calls `renderer.begin()` before `onDraw`. The custom background color '#111122' overrides the engine's default '#1a1a2e'. While harmless, it's architecturally incorrect. If the engine changes how `begin()` works (e.g., state management), this could break.
2. **Medium**: Class selection uses inline HTML `onclick` handlers calling `window.startGame()`, bypassing the engine's input recording. Replays would not capture the class selection step.
3. **Minor**: DOM HUD updates (lines 1350-1353) use `document.getElementById()` every frame instead of caching references. Minor performance concern but not a bug.
4. **Minor**: Respawn button is injected via `innerHTML` with a `data-action="respawn"` attribute, handled by the overlayBtns click listener. This works but is fragile.

## Recommended Fixes
1. Remove `renderer.begin('#111122')` from `onDraw` -- the engine handles clearing.
2. Consider moving class selection to use the engine's input system (keyboard-driven) instead of inline onclick handlers for replay compatibility.
3. Cache DOM element references at module scope instead of calling `getElementById` every frame.
