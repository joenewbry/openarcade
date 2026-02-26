# Nidhogg-like Audit

## A) Works? PASS
- Engine integration correct: `new Game('game')`, callbacks, `start()`.
- Canvas 600x300 matches v2.html. Overlay properly sized.
- DOM elements `#p1Score`, `#p2Score`, `#screenPos`, `#overlay`, `#overlayTitle`, `#overlayText` present.
- Fighter class with full combat system: attacks (3 stances), blocking, sword throwing, disarming.
- AI opponent with reactive behavior: blocks incoming attacks, picks up swords, varies tactics by distance.
- Camera smoothly follows midpoint of both fighters.
- World spans 9 screens with goal zones at each end.
- Respawn system places dead fighter ahead of killer's advance.

## B) Playable? PASS
- Arrow keys for movement and jumping. Z/X/C for high/mid/low attacks. S for block. D for throw.
- Click or any key starts from waiting state.
- Three attack stances create rock-paper-scissors blocking dynamic.
- Sword throwing adds ranged option. Disarmed fighters use fists (shorter range).
- Dropped swords can be picked up by walking over them.
- Kill advances killer toward their goal; dead fighter respawns ahead.
- Win by reaching your goal zone on the far side.
- P1 pushes right, AI pushes left. Progress bar shows positions.

## C) Fun? PASS
- Nidhogg's core loop is brilliantly captured: kill, advance, repeat.
- Three-stance combat creates genuine tactical depth.
- Sword throwing adds dramatic moments.
- AI is competent: blocks, dodges, throws, varies approach distance.
- "EN GARDE!" text on respawn builds tension.
- Kill flash effect and particle explosions feel impactful.
- Progress bar at bottom provides strategic awareness.
- Stick-figure style with rotation on death is stylish.
- Controls section both in overlay and below canvas for reference.

## Issues
- **Minor**: `frameCount` in `drawThrownSword` uses `(frameCount / 60) * Math.PI * 2` for rotation, which means the sword makes one full rotation per second. At 60fps, the spin is smooth.
- **Minor**: Push-apart logic (`dist < 18`) prevents fighters from overlapping. This could feel slightly janky in close combat but prevents visual glitches.
- **Minor**: Score only tracks P1 kills (`score = kills1`). The game is more about reaching the goal than kills, so this is a reasonable simplification for the scoring system.
- **Minor**: Canvas click handler on `game.canvas` -- this relies on the engine exposing the canvas element, which is standard.

## Verdict: PASS
