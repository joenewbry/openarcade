# Co-op Dungeon Crawler Audit

## A) Works?
YES, with caveats. Complex dungeon crawler with procedural generation, 3 player classes, AI ally, multiple monster types, loot system, projectile combat, 3 dungeon floors. Custom overlay management (does NOT use engine's `showOverlay`/`hideOverlay` -- manages its own overlay DOM with class selection buttons and restart button). Canvas 600x500. DOM refs for score bar match v2.html.

## B) Playable?
YES. WASD/Arrow keys to move, SPACE to attack (auto-targets nearest monster), E to pick up loot, 1-3 for class abilities. Choose from Warrior (melee tank), Mage (ranged AoE), or Rogue (fast stealth). AI ally picks complementary class. Dungeon has connected rooms with corridors and doors. Monsters spawn in rooms (except starting room). Boss room on each floor. Clearing boss descends to next floor. 3 floors total.

## C) Fun?
YES. Good action RPG loop: explore rooms, fight monsters, collect loot, use abilities, progress through floors. AI ally is competent -- heals when low, attacks enemies, uses abilities. Loot variety (health potions, stat boosts, gold, speed boots) keeps it interesting. Boss fights with increased HP/damage add climactic moments. Class abilities provide tactical depth (Shield Bash stuns, Fireball has AoE splash, Smoke Bomb grants stealth).

## Issues Found
- **Moderate**: The overlay management is completely custom. The game uses `overlayEl.classList.remove('hidden')` / `overlayEl.classList.add('hidden')` instead of engine's `showOverlay`/`hideOverlay`. The engine's overlay (`#overlay` div) is the same element being manipulated directly. This works because the custom code manages visibility itself, but it bypasses the engine's overlay state tracking. The engine's `showOverlay` is never called.
- **Moderate**: `game.setState('over')` is called after `showGameOverlay()`, but the overlay CSS uses `.hidden` class toggle rather than engine overlay. When `setState('over')` is called, the engine might try to show its own overlay (which uses display style), potentially conflicting with the custom `.hidden` class approach.
- **Minor**: `checkRoomClear` calls `setTimeout(() => { ... game.setState('over') }, 500)` for victory and `setTimeout(() => initFloor(...)`, 1000)` for floor transition. These timeouts run outside the game loop and could fire during unexpected states.
- **Minor**: `gameState` is a module-level variable separate from `game.state`. The game checks `gameState !== 'playing'` in `onUpdate` to skip logic, but also uses `game.setState(...)`. These could get out of sync.
- **Minor**: Dead player position is used for camera even after death (camera only follows alive player). When player dies but ally survives, camera stays on death location.
- **Minor**: Monster kill credits always go to `player.killCount++` even when ally kills the monster (in `updateMonsters`).

## Verdict: NEEDS_FIX → FIXED (`fa5b15e`)
Gameplay is excellent but the dual state management (`gameState` vs `game.state`) and custom overlay system that bypasses the engine were fragile. **Fixed**: removed separate `gameState` variable, replaced custom overlay with engine's `showOverlay`/`hideOverlay`, replaced `setTimeout` calls with frame-counter delays, added engine-expected DOM IDs to v2.html.
