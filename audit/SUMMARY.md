# OpenArcade Game Audit Summary

**Date**: 2026-02-22
**Total Games Audited**: 185

## Verdict Breakdown (Pre-Fix)

| Verdict | Count | % |
|---------|-------|---|
| PASS | 165 | 89.2% |
| NEEDS_FIX | 20 | 10.8% |
| BROKEN | 0 | 0% |

## Fix Status

**18 of 20 issues fixed** and merged to main. 2 remaining are low priority (false positive, cosmetic).

| # | Game | Fix Commit | Status |
|---|------|-----------|--------|
| 1 | space-trader | `f50cdc9` Fix endGame crash — remove shadowed parameter | FIXED |
| 2 | donkey-kong | `7098129` Fix polygon rendering — use {x,y} format | FIXED |
| 3 | warzone-diplomacy | `6f994a6` Fix territory colors — proper hex alpha | FIXED |
| 4 | paintball-skirmish | `e73aacb` Fix overlay — add missing overlayText | FIXED |
| 5 | restaurant-tycoon | `64901f4` Fix event listener leak on restart | FIXED |
| 6 | cookie-clicker | `bf97912` Fix cookie rendering — use {x,y} for strokePoly | FIXED |
| 7 | wizard-duels | `59297a4` Fix state management — use proper engine API | FIXED |
| 8 | terraria-lite | `dca47a5` Fix boss HP bar — use drawLine | FIXED |
| 9 | speed-typing-racer | `1bdd3da` Fix — use public input API | FIXED |
| 10 | naval-commander | `e2431f5` Fix — add keyboard start, fix async AI | FIXED |
| 11 | pirate-conquest | `d38c350` Fix — replace setTimeout with frame-based delays | FIXED |
| 12 | rocket-league-2d | `4c4b273` Fix state transitions and score display | FIXED |
| 13 | drag-race-showdown | `dfd79c1` Fix — use engine overlay API for game over | FIXED |
| 14 | top-down-shooter | `d6eb5d9` Fix — add missing overlay elements | FIXED |
| 15 | pocket-generals | `8324e62` Fix — scale mouse coordinates | FIXED |
| 16 | browser-mmo-rpg | `bc929c3` Fix — remove redundant begin(), cache DOM refs | FIXED |
| 17 | base-builder-blitz | — | NOT FIXED (dt/1000 is correct; converts ms to seconds) |
| 18 | coop-dungeon-crawler | `fa5b15e` Fix — use engine overlay API, remove setTimeout | FIXED |
| 19 | stick-fight-online | — | NOT FIXED (difficulty unused; cosmetic only) |
| 20 | flapomino | `8a4be6b` Fix — add overlay background, click-to-flap | FIXED |

## Games Needing Fixes (20)

| Game | Category | Issue Description |
|------|----------|-------------------|
| base-builder-blitz | Timing | `dt / 1000` assumes ms but engine passes ~16.667ms — all game timing may be 1000x too slow |
| browser-mmo-rpg | Rendering | Redundant `renderer.begin()` call in `onDraw` — engine already calls it; also getElementById every frame |
| cookie-clicker | API Mismatch | `strokePoly` called with `[[x,y]]` arrays instead of `[{x,y}]` objects for cookie edge decoration |
| coop-dungeon-crawler | State Mgmt | Custom overlay bypasses engine's `showOverlay`/`hideOverlay`; `setTimeout` used outside game loop; dual state tracking |
| donkey-kong | API Mismatch | `fillPoly` called with array-of-arrays instead of `[{x,y}]` objects — platforms and princess won't render |
| flapomino | Overlay/Controls | Missing overlay background (text unreadable); no click-to-flap for Flappy Bird derivative |
| drag-race-showdown | Overlay | `endRace()` manipulates overlay DOM with `setTimeout`/`innerHTML` instead of `game.showOverlay()` |
| naval-commander | Start Flow | Custom `#start-btn` button instead of engine overlay; no keyboard start; `setTimeout` for AI turns |
| paintball-skirmish | Missing DOM | No `#overlayText` element in HTML — `showOverlay()` fails silently on game over |
| pirate-conquest | Async | `setTimeout` for AI turns runs outside game loop; can fire during wrong state |
| pocket-generals | Mouse Coords | Mouse coordinates not scaled by canvas size ratio — breaks if display size != pixel size |
| restaurant-tycoon | Event Leak | Click/mousemove listeners added on every `onInit` call — duplicates accumulate on restart |
| rocket-league-2d | State | Complex state transitions with custom `inGoalScored` flag; `bestEl` repurposed as AI score display |
| space-trader | Crash | `endGame(game)` parameter shadows closure — called as `endGame()` so `game` is undefined; crashes at turn 30 |
| speed-typing-racer | Private API | Accesses `input._pressed` (engine private field) instead of public API; fragile |
| stick-fight-online | Difficulty | `game.difficulty` never used — difficulty selector on game-over has no effect |
| terraria-lite | API | `renderer.strokeLine` may not exist (should be `drawLine`); boss HP bar border won't render |
| top-down-shooter | Overlay | Custom DOM button/overlay instead of engine pattern; `showOverlay()` targets missing elements |
| warzone-diplomacy | Color Bug | 8-char hex color parsing for territory fills produces wrong colors for most players (renders white) |
| wizard-duels | State Mgmt | Directly sets `game._state = 'roundEnd'` instead of `game.setState()` — bypasses recorder/overlay |

## Issue Categories

| Category | Count | Games |
|----------|-------|-------|
| API Mismatch (wrong arg format) | 2 | cookie-clicker, donkey-kong |
| State Management | 3 | coop-dungeon-crawler, rocket-league-2d, wizard-duels |
| Overlay/DOM Issues | 4 | drag-race-showdown, naval-commander, paintball-skirmish, top-down-shooter |
| Async/Timing | 3 | base-builder-blitz, pirate-conquest, restaurant-tycoon |
| Crash Bug | 1 | space-trader |
| Rendering | 2 | browser-mmo-rpg, warzone-diplomacy |
| Input/Controls | 2 | pocket-generals, speed-typing-racer |
| Missing Feature | 2 | stick-fight-online, terraria-lite |

## Priority Fixes

### Critical (game crashes or unplayable)
1. **space-trader** — `endGame()` crashes at turn 30 due to undefined `game` parameter
2. **donkey-kong** — platforms don't render (fillPoly arg format), making game visually unplayable

### High (significant gameplay impact)
3. **warzone-diplomacy** — territory colors broken, hard to tell who owns what
4. **paintball-skirmish** — game over overlay fails, can't see results or restart cleanly
5. **restaurant-tycoon** — event listeners stack on restart, causing erratic behavior
6. **base-builder-blitz** — timing may be completely wrong (1000x too slow)
7. **cookie-clicker** — cookie edge decoration won't render (strokePoly arg format)

### Medium (works but fragile)
8. **coop-dungeon-crawler** — custom overlay + setTimeout could cause state conflicts
9. **naval-commander** — non-standard start flow, setTimeout for AI
10. **pirate-conquest** — setTimeout AI turns outside game loop
11. **wizard-duels** — bypasses engine state management
12. **rocket-league-2d** — complex state transitions with edge cases
13. **drag-race-showdown** — overlay manipulation bypasses engine
14. **top-down-shooter** — custom overlay pattern, missing DOM elements

### Low (minor/cosmetic)
15. **speed-typing-racer** — uses private engine API
16. **pocket-generals** — mouse coords fragile at non-1x scale
17. **browser-mmo-rpg** — redundant renderer.begin(), getElementById per frame
18. **stick-fight-online** — difficulty setting has no effect
19. **terraria-lite** — strokeLine (should be drawLine) for boss HP bar border

## Clean Games (165)

1942, 2048, advance-wars-online, agar, air-hockey, amidar, arkanoid, asteroids, auction-house, battle-royale-2d, battleship-evolved, battlezone, bejeweled, bike-trials-mp, blokus, bomberman, boulder-dash, boxing-ring, breakout, brick-breaker, bridge-building-race, bubble-bobble, burger-time, canabalt, capture-the-flag, centipede, civilization-micro, columns, competitive-minesweeper, competitive-tetris, creep-td-versus, crossy-road, curling-simulator, deck-builder-duels, defender, dig-dug, dino, doodle-jump, dr-mario, duck-hunt, dungeon-tactician, dx-ball, elevator-action, factory-chain, factory-coop, flappy, frogger, fruit-ninja, galaga, galaxian, geometry-dash, gladiator-pit, go-baduk, golf-it, gradius, helicopter, hex-empire, ice-climber, idle-clicker-pvp, jetpack-joyride, joust, kaboom, kart-racer, kingdom-clash, klotski, lemmings, lights-out, lode-runner, lunar-lander, mahjong-competitive, mappy, mech-arena-tactics, mech-assault, mega-man, merchant-routes, micro-machines, micro-rts, minesweeper, missile-command, moon-patrol, mr-do, ms-pacman, nibbler, nidhogg-like, night-driver, nonogram, obstacle-course-race, pac-man, paperboy, peggle, phoenix, pinball, pipe-dream, pixel-fighter, plants-vs-zombies, poker-arena, pong, pool-billiards, portal-2d-coop, puyo-puyo, puzzle-bobble, puzzle-race, qbert, r-type, raiden, rally-x, rampart, real-estate-mogul, road-fighter, robotron, rocket-league-2d, sandbox-physics, settlers-online, simcity, simon, sinistar, slither, slot-racer, smash-arena, snake, snake-invaders, sniper-duel, snow-bros, soccer-heads, sokoban, space-dogfight, space-duel, space-invaders, spaceship-circuit, spelunky, splendor-online, spy-hunter, spy-vs-spy, stock-market-sim, sudoku, sumo-push, super-mario, super-sprint, survival-island, swarm-control, tactical-card-battler, tanks, tapper, tempest, temple-run, territory-control-mmo, tetris, tile-kingdoms, tower-defense, tower-of-hanoi, tower-wars, trading-card-mmo, trivia-royale, tron, volleyball-2d, warlords, wesnoth-lite, whack-a-mole, wizard-card-game, worm-pong, wrestling-physics, xcom-tactics, xevious, zombie-siege
