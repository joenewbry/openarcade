# Lode Runner — Visual & Sound Design

## Current Aesthetic

A 25x16 tile grid on a 500x400 canvas with 5 hand-crafted levels. Brick tiles are flat `#6b4226` rectangles, solid tiles `#3a3a5a`, ladders `#a87532`, escape ladder `#4f4`, bars (horizontal rods) `#8888cc`. Gold takes a diamond shape in `#ea4`. The player is a small figure in cyan `#4cf`, guards in red `#f44`. The dig-and-refill mechanic shows an outline-only brick during refill countdown. The aesthetic is functional but crude — flat colors with no texture, characters are barely more than colored rectangles, and the underground gold-mining spirit isn't visually expressed.

## Aesthetic Assessment

**Score: 2/5**

The tile types are distinguishable and the layout reads well, but everything looks like placeholder art. The character designs are minimal to the point of being nondescript. The color scheme doesn't evoke the classic arcade feel. Gold should gleam. Bricks should have mortar lines. The underground cavern atmosphere is completely absent.

## Visual Redesign Plan

### Background & Environment

Replace the blank black background with a multi-layered underground cavern. Behind all tiles, render: (1) a deep earth gradient `#0a0810` to `#141020` top-to-bottom, (2) background dirt texture — random dark brown speckle pixels `#1a1218` scattered at 15% density, (3) far-background cave features: very faint stalactites/rock formations in `#120e18` (barely visible).

Each level should feel like a different depth underground — level 1 is shallow (slight warm tone), later levels go colder/deeper. The solid floor tiles should have a subtle stone texture using a 2-color alternating pattern.

Add a subtle ambient drip of light from above — a faint gradient at the very top of the play area slightly lighter `#0d0c14`.

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Primary (player) | Electric cyan | `#00e5ff` |
| Brick tile base | Russet red-brown | `#7a3e20` |
| Brick mortar | Dark crack | `#3a1e0e` |
| Solid tile | Deep stone | `#2e2848` |
| Solid tile highlight | Stone face | `#3e3860` |
| Ladder | Warm gold-brass | `#c8923a` |
| Escape ladder | Bright lime | `#44ff66` |
| Bar (horizontal rod) | Cool steel | `#7a88cc` |
| Bar highlight | Steel sheen | `#aabbee` |
| Gold (collectible) | Gleaming gold | `#ffcc00` |
| Gold glow | Gold bloom | `#ffaa00` |
| Guard | Hot orange-red | `#ff5533` |
| Background earth | Cave void | `#0a0810` |
| Glow/bloom | Cyan aura | `#00e5ff` |

### Entity Redesigns

**Brick Tiles** — Draw each brick tile with visible mortar lines: fill the tile in `#7a3e20`, then draw 2px horizontal mortar line at 55% height in `#3a1e0e` and 2px vertical center divider in `#3a1e0e` (offset alternating rows for a stagger pattern). Add 1px top-left highlight `#9a5e40` for 3D depth. Dig holes: render as dark void `#050408` with crumbled brick dust particles at edges.

**Solid Tiles** — Stone/bedrock look. Fill `#2e2848`, add subtle 2px top highlight `#3e3860`, 1px right/bottom shadow `#1e1830`. These feel like immovable rock.

**Ladders** — Two vertical rails in `#c8923a` with horizontal rungs every 8px. Add a 1px highlight stripe on the left rail (`#e8b25a`) for metallic sheen.

**Bars (horizontal rods)** — Render as a horizontal cylinder: thin highlight stripe along the top `#aabbee`, main color `#7a88cc`, bottom shadow `#4a5899`. Players/guards hanging from bars should show arms up.

**Gold** — Make it shine. Render as a spinning diamond shape (rotate slightly each frame). Use layered fills: outer `#ffcc00`, inner highlight point `#ffffff`, outer glow via `setGlow('#ffaa00', 1.2)`. Subtle rotation animation (3 degrees/frame, ~20 frames per revolution).

**Player** — Distinct character at tile scale (~16px). Render: round head (skin `#ffd5a8`), torso in blue vest `#1a6699`, arms extending when on bars (horizontal), legs alternating when walking. Expression: determined dot-eyes, tiny smile. On a bar: body hangs down, arms up at bar height.

**Guards** — Orange-uniformed hazard. Similar body shape to player but with a red helmet `#cc3300` top and orange tunic `#ff5533`. When carrying gold, render a tiny yellow diamond on their back. When falling into a dug hole, render them stuck (arms at sides, head just visible at brick level).

### Particle & Effect System

- **Brick dig**: When digging, 6–8 small brick-colored chunks (`#7a3e20`, `#9a5e40`) arc downward and fade. Per-dig-frame particles.
- **Brick refill**: As a hole refills, small grey dust motes appear at the hole edges. Final brick snap has a brief flash.
- **Gold collect**: 8 star-shaped spark particles in `#ffcc00` and `#ffffff` burst outward. Ring expansion at `#ffcc00`, lifetime 0.4s.
- **Guard catch player**: Red flash burst from player position — 10 particles `#ff5533` radiating outward. Brief screen shake (2px, 3 frames).
- **Level complete**: Gold shower — 15 golden particles rain down from top, `#ffcc00` with gravity, lifetime 1.5s.
- **Guard trapped in hole**: Dust puff `#7a3e20` particles when guard falls into dug brick.
- **Escape ladder appear**: Green sparkles `#44ff66` shoot up from the ladder as it materializes.
- **Bar traversal**: Very subtle metal-on-metal sparkle (1-2 tiny `#aabbee` sparks) every 20 frames while on bar.

### UI Polish

Score display: large glowing numerals at top center in `#ffcc00` with subtle gold glow. Lives counter: small player silhouettes in `#00e5ff`. Level indicator: `LEVEL 03` in a stone-carved text style (drop shadow `#000000`).

Level transition: brief "wipe" animation — a curtain of brick tiles slides up from the bottom to reveal the new level. Death animation: player dissolves into 8 dust particles and respawns at start.

Bottom status bar: narrow dark strip `#0a0810` showing score, lives, level in compact form. Slightly separated from the play area by a 1px border `#2e2848`.

## Sound Design Plan

*(Web Audio API only)*

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Dig brick (left) | Low thud + crack | Sine 120 Hz + noise 400–800 Hz | 0.15s | Chunky, satisfying crunch |
| Dig brick (right) | Slightly pitched variation | Sine 110 Hz + noise 400–800 Hz | 0.15s | Slight pitch diff L/R alternation |
| Walk step | Soft footfall | Band-pass noise 300–600 Hz | 0.06s | Every 4 frames |
| Ladder climb | Metallic rung | Sine 300 Hz, sharp attack | 0.08s | Every 8 frames climbing |
| Bar traverse | Subtle slide | Triangle 800 Hz, very quiet | 0.04s | Every 12 frames |
| Gold collect | Bright chime | Sine 1047 Hz (C6) + 1318 Hz (E6) | 0.3s | Sparkly double-tone |
| Guard alert (sees player) | Rising squawk | Sawtooth 300→600 Hz | 0.2s | Comical alarm |
| Player caught/death | Descending wah | Sine 440→110 Hz, tremolo | 0.5s | "Wah-wah" failure tone |
| Brick refill (snap) | Click pop | Sine 200 Hz, instant decay | 0.05s | Subtle, brickwork snapping |
| Escape ladder appear | Magic shimmer | Tri-tone chord ascending | 0.4s | E5+G5+B5 sine waves |
| Level complete | Triumphant arpeggio | C-E-G-C ascending, sine | 0.6s | Major chord climb |
| Lives lost (game over) | Sad descending | Sine 523→262→131 Hz | 0.8s | Octave drops, slow |
| Guard falls in hole | Hollow thud | Sine 80 Hz, fast decay | 0.1s | Cartoonish fall impact |

### Music/Ambience

A tense underground chase atmosphere. Generate using Web Audio: a steady low-tempo pulse (square wave at 60 Hz, very quiet, rhythmic gate at 120 BPM) as a heartbeat foundation. Over this, layer a minimal melodic figure — a 4-note loop on a slightly detuned sawtooth (e.g., A3-G3-F3-E3) repeating every 2 bars at 120 BPM, processed through a heavy low-pass filter (800 Hz cutoff). The melody speeds up subtly when guards are nearby (reduce playback interval). Add occasional "blip" accents (triangle wave, 1200 Hz, 0.05s) on beat 3 of every 4 bars for tension.

## Implementation Priority

**High**
- Brick tile mortar lines (horizontal mortar + stagger pattern)
- Gold rotation animation + glow (`setGlow`)
- Gold collect sparkle particles
- Dig crumble particles (brick chunks arcing down)
- Player character detail (head, vest, alternating legs)
- Dig sound (crunch) and gold collect chime
- Walk/ladder footstep sounds

**Medium**
- Background earth texture (speckle pixels)
- Guard visual redesign (helmet + orange tunic)
- Bar metallic render (highlight stripe)
- Brick refill snap flash + sound
- Escape ladder shimmer animation + sound
- Guard-fall thud particle + sound
- Level complete gold shower particles

**Low**
- Cave background stalactite shapes
- Player bar-hanging pose (arms up)
- Screen shake on player catch
- Level transition brick-wipe animation
- Underground ambient audio pulse loop
- Guard speed-up music when nearby
