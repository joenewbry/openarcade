# Creep TD Versus — Visual & Sound Design Plan

## Current Aesthetic

The game has an 800x500 canvas with two 12x14 tower defense fields side by side (CELL=26). Player field uses `#0c1420` background with `#00ff88` (green) accent. AI field uses `#140c1c` background with `#bb44ff` (purple) accent. Tower shapes: basic=square, sniper=triangle, splash=circle, slow=diamond. Tower colors: basic=`#00ff88`, sniper=`#44aaff`, splash=`#ff8800`, slow=`#aa44ff`. Creep colors: basic=`#ee5555`, fast=`#ffff00`, swarm=`#ff44ff`, tank=`#ff8800`. Path shown as thick translucent line. Projectile beams drawn. Center panel has VS, timer, wave countdown. The aesthetic is coherent — green vs purple dual-field — but flat. Towers are flat colored geometric shapes, paths are bland, and the "versus" drama of two simultaneous tower defense games competing is understated.

## Aesthetic Assessment: 3 / 5

The dual-field color theming is the strongest visual element — green player vs purple AI is clear and effective. Tower shapes per type are a good readable system. But there is no depth, no sci-fi command-center atmosphere, no holographic grid feel. Projectile beams should be dramatic. Paths should feel like circuit board traces. Explosions should feel satisfying.

---

## Visual Redesign Plan

### Background & Environment

- **Player field background**: deep dark blue-green `#060c12` with a subtle **circuit board trace pattern**:
  - Very faint grid lines in `#0a1820` at every CELL boundary.
  - A few diagonal "trace" lines connecting grid intersections in `#0e2030` at 0.3 alpha — like PCB traces.
  - Faint green ambient glow across the whole field: `rgba(0,255,136,0.02)` overlay.
- **AI field background**: deep dark purple `#0e0618` with similar circuit traces in `#1a0e28` and faint purple glow `rgba(187,68,255,0.02)`.
- **Path tiles**: redesign the creep path from a thick translucent line to a visible **glowing corridor**:
  - Path fill: `#0c1c10` (player) / `#160c1e` (AI) — slightly lighter than background.
  - Path border: 1px `#00ff88` at 0.2 alpha (player) / `#bb44ff` at 0.2 alpha (AI).
  - Arrow markers: small directional chevrons (V shapes, 6px) every 3 cells along path, in field accent color at 0.3 alpha.
- **Entry/exit points**: start is marked with a glowing inward-pointing triangle (field accent color), exit with a glowing portal circle.
- **Center divider panel**: the space between fields becomes a **command center display**:
  - Dark `#0a0a12` background.
  - Central "VS" in large `#cc4488` with `setGlow('#ff0080', 20)`.
  - Wave counter display above VS: "WAVE 5/20" with a wave progress bar.
  - Timer below VS.
  - Score/lives comparison: player (left) vs AI (right) showing lives remaining as heart icons.
  - Resource display: gold/income for each side.
- **Scanlines**: `rgba(0,0,0,0.05)` alternating rows for terminal display aesthetic.

### Color Palette

| Role | Old | New |
|---|---|---|
| Player field bg | `#0c1420` | `#060c12` |
| Player accent | `#00ff88` | `#00ff88` (keep, it's perfect) |
| AI field bg | `#140c1c` | `#0e0618` |
| AI accent | `#bb44ff` | `#cc44ff` |
| Player path fill | translucent | `#0c1c10` |
| AI path fill | translucent | `#160c1e` |
| Tower basic (P) | `#00ff88` | `#00ff88` with `setGlow('#00ff88', 8)` |
| Tower sniper (P) | `#44aaff` | `#44aaff` with `setGlow('#44aaff', 8)` |
| Tower splash (P) | `#ff8800` | `#ff8800` with `setGlow('#ff8800', 10)` |
| Tower slow (P) | `#aa44ff` | `#aa44ff` with `setGlow('#aa44ff', 8)` |
| Tower basic (AI) | green → purple | `#bb44ff` tint |
| Tower sniper (AI) | same → purple | `#8844ff` |
| Tower splash (AI) | same → purple | `#ff44bb` |
| Tower slow (AI) | same → purple | `#ff88ff` |
| Creep basic | `#ee5555` | `#ff4444` |
| Creep fast | `#ffff00` | `#ffee00` |
| Creep tank | `#ff8800` | `#ff7700` large |
| Creep swarm | `#ff44ff` | `#ee44ff` small |
| Projectile (player) | line | `#88ffcc` bright green beam |
| Projectile (AI) | line | `#dd88ff` bright purple beam |
| VS text | none | `#cc4488` with `setGlow('#ff0080', 20)` |
| Center panel bg | none | `#0a0a12` |
| Lives (hearts) | none | field accent color hearts |

### Entity Redesigns

**Towers — Player Field (green)**

All towers: base platform (small square `#0c1c10` with `#00ff88` 1px border) plus top structure:

- **Basic Tower**: square body in `#00ff88`. Barrel: thin rectangle extending toward nearest creep on path. Corner notches (chamfered square — remove corners with fillPoly). `setGlow('#00ff88', 8)`.
- **Sniper Tower**: tall triangle pointing upward in `#44aaff`. Narrow barrel (2px rect) extending from apex. Scope detail: small circle around barrel midpoint. `setGlow('#44aaff', 8)`.
- **Splash Tower**: circle in `#ff8800`. Four small spike triangles at cardinal directions (N/S/E/W) — "mine" or "mortar" appearance. `setGlow('#ff8800', 12)`.
- **Slow Tower**: diamond (square rotated 45deg) in `#aa44ff`. Icy crystal details: 4 smaller diamond polygons at each corner. `setGlow('#aa44ff', 10)`.
- **AI versions** of all towers: same shapes but recolored in the AI's purple palette.
- **Firing animation**: tower briefly pulses bright (glow from 8 to 20 for 3 frames) when it fires.
- **Range ring**: when hovering/selecting, dashed circle shows tower range in field accent color at 0.3 alpha.

**Creeps**

- **Basic**: circle `#ff4444`, r=8. Small white dot eye. HP bar above.
- **Fast**: narrow ellipse (wide=12, tall=8) in `#ffee00` pointing in travel direction. Speed lines trail behind (2 streaks at 0.3 alpha). HP bar tiny above.
- **Tank**: large circle `#ff7700`, r=14. Visible armor plates: 3 polygons overlaid (hexagonal segments) in slightly darker `#cc5500`. HP bar thick above.
- **Swarm**: tiny circle `#ee44ff`, r=5. No individual features — relies on quantity. `setGlow('#ee44ff', 4)`.
- **All creeps**: HP bar (3px) above entity, red fill over dark-red empty, scales with health.
- **Death animation**: creep circle shrinks to 0 with 4 outward particle burst in creep color, 200ms.
- **Boss creep**: very large circle with crown polygon above, HP bar much longer, `setGlow` intense.

**Projectiles (Beams)**

- **Basic tower beam**: instead of a static line, a traveling bright dot with 6-pixel trail. Color: `#88ffcc` (player) or `#dd88ff` (AI). r=3 head, trail fades from 1.0 to 0.0 alpha over 6 pixels.
- **Sniper beam**: instant line flash (full distance, 1px, full alpha one frame, then gone). Color bright white-blue. Followed by small impact flash at target.
- **Splash explosion**: on impact, bright circle expands from 0 to splash_radius in 4 frames, fill `rgba(255,136,0,0.3)`, outline `#ff8800`, then fades.
- **Slow beam**: wide short beam (4px, short range) in `#cc88ff`, target freezes briefly with ice particle overlay.

### Particle & Effect System

| Effect | Description |
|---|---|
| Tower fire pulse | Tower glow jumps from 8→20 for 3 frames on firing |
| Basic projectile travel | Bright dot with 6px fade trail, travels to target at 200ms |
| Sniper instant shot | 1-frame flash line, then small impact spark at target (4 star points) |
| Splash explosion | Circle expands to range radius, fill at 0.3 alpha, fade 300ms + 6 particles burst |
| Slow freeze | Ice crystals: 4 tiny diamond shapes on target, stay 2s, pale blue |
| Creep death | Shrink to 0 + 4 radial particles in creep color, 200ms |
| Wave start | Text "WAVE N" slides in from top of each field, pulses, disappears 1s |
| Life lost | Brief red flash overlay on entire affected field (0.2 alpha, 3 frames) |
| Gold earn | "+" small text floats up from dying creep, field accent color, 0.8s |
| Tower place | Building animation: tower scales from 0 to 1.0 over 10 frames with brief glow flash |
| Tower sell | Tower shrinks to 0, gold coins (5 tiny dots) fly upward, 300ms |
| Victory field | Winning field fills with slow rising accent-color particles (20 stars, 2s) |

### UI Polish

- **Field headers**: above each field, "PLAYER" (left) in `#00ff88` and "AI" (right) in `#cc44ff`. Small font, monospace style.
- **Lives display**: row of heart icons (♥ polygon, 4 per initial life) in field accent color. Lost lives are grey.
- **Gold counter**: "G: 450" above field in accent color.
- **Wave timer bar**: horizontal progress bar at top of each field showing time until next wave (depletes left to right). Player field: green fill. AI field: purple fill.
- **Tower placement grid**: when in placement mode, valid cells show green (player) or purple (AI) highlight on hover. Invalid cells show red tint.
- **Center panel stats**:
  - Top: "WAVE 5" large, current wave description below (e.g., "FAST WAVE").
  - Middle: "VS" dramatic.
  - Player stats (left): lives hearts, gold, towers placed.
  - AI stats (right): same, mirrored.
  - Bottom: overall progress bar (total creeps sent, total killed).
- **Creep health bars**: very slim (2px height) directly above each creep. Scales to creep width. Green (full) to red (low).

---

## Sound Design Plan

### Sound Synthesis Table

| Event | Oscillator | Frequency | Envelope | Filter/Effect | Character |
|---|---|---|---|---|---|
| Tower place | sine | 440→660Hz | A:0 D:0.15 | reverb | placement confirm |
| Tower sell | sine | 660→440Hz | A:0 D:0.1 | none | reversal chime |
| Basic tower fire | sine | 880Hz short | A:0 D:0.06 | none | quick energy pulse |
| Sniper fire | noise + sine | — + 660Hz | A:0 D:0.08 | highpass 500Hz | sharp crack |
| Splash explosion | noise | — | A:0 D:0.3 | lowpass 400Hz | thud boom |
| Slow tower fire | triangle | 440Hz warble (LFO 3Hz) | A:0.01 D:0.2 | lowpass 800Hz | freeze hum |
| Creep death (basic) | noise | — | A:0 D:0.08 | bandpass 600Hz | popping |
| Creep death (tank) | noise + sine | — + 120Hz | A:0 D:0.2 | lowpass 400Hz | heavy thud |
| Life lost | sine | 440→220→110Hz | A:0 D:0.5 | lowpass 600Hz | descend alarm |
| Wave complete | sine | C5 E5 G5 | A:0 D:0.1 per | reverb | wave done |
| Wave start | sawtooth | 220Hz rising | A:0.01 D:0.4 | lowpass 800Hz | incoming siren |
| Gold earned | triangle | 660Hz | A:0 D:0.05 | none | coin ting |
| Victory | sine chord | C5 E5 G5 C6 arpeggio | A:0.01 D:0.3 per | long reverb | victory fanfare |
| AI tower fire | sine | 660Hz short | A:0 D:0.06 | none | opposing pulse |

### Music / Ambience

- **Ambient base**: constant electronic hum — two sawtooth oscillators at 55Hz and 110Hz (gain 0.015 each) filtered through lowpass at 300Hz, with a very slow (0.1Hz) LFO on gain. Sounds like military electronics/radar.
- **Game music**: strategic electronic loop at 120 BPM:
  - Kick: noise+60Hz (D:0.12) on beats 1+3.
  - Snare: noise bandpass 1500Hz (D:0.08) on beat 3 only (half-time feel — deliberate, strategic).
  - Hi-hat: noise highpass 4000Hz (D:0.03) on every beat.
  - Bass: sawtooth at 110Hz, playing [A, E, G, F] (2 beats each), lowpass 500Hz.
  - Melody: square oscillator at 4x frequency, sparse — plays 2–3 notes per 4-bar phrase, A minor scale. Gain 0.025.
  - The sparse melody keeps the music "tactical" not "action" — you should feel like a commander, not a soldier.
- **Wave escalation**: each wave adds slightly more hi-hat density. By wave 15, hi-hat plays every 8th note.
- **Life lost event**: music drops to bass-only for 1 bar, then resumes — like a stumble.
- **Final wave**: music adds a driving snare on every beat (all 4 beats) — maximum urgency.
- **Master gain**: 0.35.

---

## Implementation Priority

**High**
- Tower glow fire-pulse animation
- Sniper instant-flash beam
- Splash explosion expanding circle
- Creep death shrink+burst particles
- Path chevron direction markers
- Center panel VS text glow redesign
- Life lost field flash effect

**Medium**
- Tower visual redesigns (chamfered basic, tall sniper, spike splash, crystal slow)
- Circuit board trace background pattern
- Path filled corridor style (border + arrows)
- Creep HP bars (slim, per-creep)
- Tower placement animation (scale from 0)
- Basic projectile traveling dot with trail
- All firing/explosion sounds

**Low**
- Slow freeze crystal particle effect
- Gold coin float text
- Victory rising particle stars
- Field header labels
- Generative strategic electronic music
- Wave escalation music system
- Final-wave drums urgency
