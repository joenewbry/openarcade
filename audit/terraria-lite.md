# Audit: Terraria Lite

## A) Works?
YES. Complex but well-structured. Canvas 600x400. Extensive DOM refs for HP, score, day, timeOfDay, tool, allyHp -- all present in v2.html. Uses direct canvas mouse listeners for mining/attacking/placing (bypassing engine input for mouse). Keyboard input via engine for movement (WASD), jump (W/Space), inventory (E), tool swap (Q), hotbar (1-5). World generation with caves, trees, ores. Day/night cycle. AI ally system.

## B) Playable?
YES. Full 2D sandbox: mine blocks with mouse click, place blocks, craft items (E to open inventory, click recipes), fight enemies (slimes, zombies, skeletons), boss fights (Demon Lord on night 2+). WASD movement, W/Space jump. Ally follows/fights/mines automatically. Tool system: pickaxe mines, sword attacks, placeable items. Hotbar with 5 slots. Day/night cycle affects spawning and lighting.

## C) Fun?
YES. Impressive depth for a browser game. Full crafting chain (wood -> pickaxe -> iron pick -> iron/gold sword). AI ally that fights, mines, and shares resources adds companionship. Boss fight with phases and projectiles. Day/night cycle with dynamic lighting creates atmosphere. Mining progress indicator and crack overlays give good feedback. Multiple enemy types with distinct behaviors.

## Issues
- None critical.
- `renderer.strokeLine` called on line 1178 -- this method may not exist in the engine API (should be `renderer.drawLine`). Could cause a silent error for boss HP bar border rendering. Non-blocking since it is purely visual.
- `initGame()` is called both from mouse click handler and keyboard handler, which could theoretically race, but in practice only one fires at a time.
- `lightTimer` starts at 0 and decrements, so first frame recomputes light immediately. Fine.

## Verdict: FIXED
- Line 1178: Changed `renderer.strokeLine(...)` to `renderer.drawLine(...)` for consistency with all other line calls in the file. Both methods exist in the engine, but `drawLine` uses the proper triangle-based renderer while `strokeLine` uses a simpler rect approximation. Fixed for consistency.
