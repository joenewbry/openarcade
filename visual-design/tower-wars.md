# Tower Wars — Visual & Sound Design

## Current Aesthetic

Two mirrored 13x16 grids side by side (player vs AI), each on a `#12122a` background with dim `#222244` gridlines. Towers are flat colored rectangles with a letter initial. Creeps are glowing colored circles with HP bars. Projectiles are tiny dots. Particles are square pixel fragments. Path hint drawn as a faint green polyline. Entry/exit cells marked with simple colored rectangles. The middle column shows game stats as plain text. Very functional, no atmosphere.

## Aesthetic Assessment
**Score: 1.5/5**

The dual-grid layout is clever, but visually it reads as a debug interface. Color-coded towers help readability but there is no sense of place, danger, or drama. Particles exist but feel tacked-on.

## Visual Redesign Plan

### Background & Environment

Each grid becomes a stone-and-dirt battlefield. Draw a subtle diagonal hatching pattern in the grid background using near-black lines — suggesting worn flagstones. The path hint becomes a pulsing amber "dirt road" — a thick semi-transparent polyline that breathes with a slow sine oscillation in opacity. Entry cell glows emerald with a beacon pulse; exit cell pulses deep crimson. A thin vertical "DMZ" strip in the center column has a slow animated scanline.

### Color Palette
- Primary (player): `#22dd88`
- Primary (AI): `#ff5544`
- Background tile: `#0e0e1c`, `#12122a`
- Grid line: `#1a1a3a`
- Gold/resource: `#ffcc44`
- Glow/bloom (player): `#00ffaa`
- Glow/bloom (AI): `#ff4422`

### Entity Redesigns

**Towers** — Replace flat rectangles with layered symbolic icons drawn from polygons:
- Arrow Tower: a tall thin diamond `#22cc66` with a pointed top spike polygon. Subtle rotation pulse on idle.
- Cannon Tower: a squat octagon `#ff8844` with a short barrel rect extending outward toward the path.
- Ice Tower: a six-pointed star `#88eeff` with crystalline thin outlines. Slow spinning outer ring of tiny dots.
- Zap Tower: a jagged lightning-bolt polygon `#ffff00` with a constant arcing glow. Emits a small electric particle on idle every 2s.

Show tower range ring on hover — filled with the tower's color at 8% opacity, stroked with the color at 30% opacity.

**Creeps** — Upgrade circles to thematic shapes:
- Scout: a small pointed teardrop polygon (fast, frail `#ff6688`). Slight motion blur trail.
- Soldier: a hexagonal body `#ffaa00` with a tiny shield rect on the leading edge.
- Tank: a wide rounded-rectangle `#cc44ff` with a turret bump on top.
- Speed: a thin elongated rhombus `#00ffff` with a four-segment trail behind it.

HP bars become thin arcs above each creep rather than flat rects, curving from empty to full.

**Projectiles** — Each tower type fires a distinct projectile:
- Arrow: a thin 4px elongated rect oriented toward the target, trailing a faint green line.
- Cannon: an orange sphere with inner yellow core, 4px radius.
- Ice: a 3px white-blue circle that leaves a short icy trail of fading dots.
- Zap: no projectile — draw an instantaneous lightning arc (jagged polyline) directly tower-to-target, 1 frame duration, bright yellow.

### Particle & Effect System

On creep death: 8–12 particles radiate outward matching the creep's color, each with a slight upward gravity bias, 400ms life, sized 3–5px, fade via alpha.

On cannon splash: a shockwave ring — strokePoly of a circle that expands from 0 to splashRadius over 200ms while fading.

On ice slow: a blue snowflake icon appears over the creep for 600ms, slow bob animation.

On zap chain: each chain link draws a brief spark arc between two creeps (2 frames, `#ffff44`).

On life lost (creep reaches exit): red flash fills the entire grid for 80ms, shakeAmount set to 5.

On tower placement: a brief white ring expands outward from the cell center over 300ms.

### UI Polish

The center DMZ strip gets a stylized "TOWER WARS" logo in all-caps, using stacked fills to simulate depth — shadow offset 2px `#000`, then the main text `#334455`. Beneath it, a slow animated vertical gradient "energy bar" fills from bottom to top representing game time, capped at 90s.

Gold counter for both sides displayed as a coin icon (small yellow circle + text) rather than plain text.

Tower selection buttons in the controls area: color-matched, show a small icon silhouette of the tower type, and pulse on hover.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Tower place | Short ascending chord: osc type=sine, 440→660Hz sweep | 440→660Hz, gain 0.3→0 | 180ms | Soft pluck feel |
| Arrow fire | Oscillator type=sawtooth, hard highpass filter 2kHz | 800Hz, gain 0.15→0 | 80ms | Whisp of air |
| Cannon fire | Noise burst through lowpass 200Hz + short boom sine 60Hz | 60Hz + noise, gain 0.5→0 | 250ms | Deep thud |
| Ice fire | Sine osc 1200Hz + 1800Hz, vibrato 8Hz depth 30Hz | 1200/1800Hz, gain 0.2→0 | 200ms | Crystalline tinkle |
| Zap fire | Noise burst through bandpass 3kHz Q=2, hard decay | 3kHz, gain 0.4→0 | 60ms | Electric snap |
| Creep death | Descending sine 400→100Hz | 400→100Hz, gain 0.25→0 | 200ms | Little defeat sting |
| Life lost | Low boom: sine 80Hz + sine 40Hz, slow decay | 80+40Hz, gain 0.6→0 | 500ms | Ominous thud |
| Gold tick (every 2s) | Short bright sine 1760Hz, very low gain | 1760Hz, gain 0.05→0 | 60ms | Subtle coin chime |
| Tower sell | Descending arpeggio: 660→440→330Hz, 3 pulses | 60ms each pulse | 180ms total | Value returning |
| AI sends creep | Low growl: sawtooth 80Hz through lowpass 300Hz | 80Hz, gain 0.2→0 | 300ms | AI threat signal |
| Victory | Major chord swell: 261+329+392Hz sines | All three, gain 0→0.5→0 | 1200ms | Triumphant |
| Defeat | Minor chord drop: 246+293+369Hz sines, slow fade | All three, gain 0→0.4→0 | 1500ms | Somber |

### Music/Ambience

A looping 8-bar ambient drone: two oscillators at 55Hz and 110Hz (type=triangle) with very low gain (0.04 combined), plus a slow LFO at 0.1Hz modulating the 110Hz osc's frequency ±3Hz. This creates a faint tension hum beneath gameplay. On low player lives (≤5), slowly raise the drone's gain to 0.08 and add a 220Hz osc for urgency.

## Implementation Priority
- High: Creep shape overhaul, tower polygon icons, zap arc effect, cannon shockwave ring
- Medium: Path pulsing animation, HP arc bars, death particles tuned per type, all sound events
- Low: Idle tower animations, center DMZ gradient bar, ambient drone music, tower placement ring
