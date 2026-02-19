# Defender — Visual & Sound Design

## Current Aesthetic
A scrolling shoot-em-up with a wraparound world. The background is deep space — 80 twinkling stars with parallax at 50% scroll speed. The terrain is a dark green polygon (`#0a2818`) with a glowing green outline. The player ship is a neon green polygon (`#4f8`) with an engine flame. Enemies: landers are red UFO shapes with abduction beams, bombers are orange diamonds, baiters are yellow elongated shapes, mutants are pink rotating hexagons. The radar at top shows a minimap. The aesthetic is classic Defender but the green-on-black space palette feels samey and the terrain and enemies could have much more visual differentiation.

## Aesthetic Assessment
**Score: 3/5**

Strong structural fidelity to the arcade original. The enemy variety is good, the parallax stars and terrain glow work. However, the color range is narrow — too many green/teal elements. Enemy shapes are minimal. The humans are simple stick figures. The terrain could be a dramatic alien landscape.

## Visual Redesign Plan

### Background & Environment
Deep space with an alien planet surface below. The background gains multiple parallax layers:

1. **Far stars** (existing, 10% parallax): Pure white dots, some blinking.
2. **Nebula wisps** (30% parallax): Two or three faint elongated polygons in deep purple `#2a0a4a` and `#0a1a3a` float slowly — large smeared shapes.
3. **Distant mountains** (60% parallax): A second silhouette range behind the main terrain, slightly lighter (`#12201a`), jagged peaks.
4. **Main terrain** (100% parallax): Redesigned as a sharp, jagged alien rock surface — pointed spires and deep valleys. Deep teal-black base with a vivid electric-green edge glow (`#00ff88`) along the top profile. Glowing mineral veins inside the terrain body — thin horizontal line segments in bright green at irregular intervals.

The sky transitions from pure black at top to deep blue-violet at the horizon where terrain meets sky.

### Color Palette
- Primary (player ship): `#00ff88`
- Enemy lander: `#ff4444`
- Enemy bomber: `#ff8800`
- Enemy baiter: `#ffff00`
- Enemy mutant: `#ff44ff`
- Human: `#44aaff`
- Terrain body: `#061a10`
- Terrain glow: `#00ff88`
- Space background: `#020210`
- Nebula 1: `#2a0a4a`
- Nebula 2: `#0a1a40`
- Bullet: `#00ff88`
- Smart bomb flash: `#ffffff`

### Entity Redesigns
**Player Ship**: The existing polygon shape is good but needs wing details. Add two small rear-facing triangular exhausts that flare independently when moving horizontally vs vertically. Engine flame becomes a three-segment flickering trail: innermost white, middle neon green, outer fading transparent green. The ship brightens (glow intensity doubles) when at full speed.

**Lander**: More menacing — the UFO body gains a row of blinking porthole lights (3 small circles on the rim that cycle red-orange-red). The abduction beam becomes a proper tractor beam — a trapezoid shape that pulses with a breathing alpha from base to tip, color cycling through yellow-white. When carrying a human, the human sprite is visible inside the beam.

**Bomber**: The diamond shape gains a pulsing core — a small bright yellow circle at center that expands and contracts. Dropped mines get a skull-and-crossbones symbol (approximated with 2 circles and X lines).

**Baiter**: Sleek predator look — the elongated shape gets a pointed nose and swept-back "fins" (two short triangles). A yellow afterburner glow trails behind. Wobble animation intensified.

**Mutant**: The rotating hexagon becomes more organic — vertices shift with a sine noise function making it look like a pulsing creature. Color cycles rapidly through pink-purple-magenta.

**Humans**: Enlarged from stick figures to distinct color-coded silhouettes. Each human has a unique palette (cyan, orange, green) so players can track individuals. When being carried, the human extends their arms upward in distress.

### Particle & Effect System
- **Enemy explosion**: 12 polygon shards in the enemy's color scatter radially, slow, and fade. An expanding ring of white light accompanies it.
- **Smart bomb**: Screen-filling white flash expands from player, then a massive expanding ring of green energy wipes across the viewport destroying everything. Shockwave distortion implied by brief white edge on all surviving enemies.
- **Bullet impact (non-kill)**: Small white spark.
- **Human rescued**: Burst of cyan stars from catch point. If deposited on ground: fountain of gold particles upward.
- **Player destroyed**: Multi-stage — first a blinding white flash, then 20 green fragments spiral outward while a ring expands, then the fragments fade leaving an empty void.
- **Hyperspace entry/exit**: Implosion of player into a bright dot, then explosion at new location.

### UI Polish
- Radar panel redesigned with a darker, thicker border and pulsing scan line sweeping across.
- Lives indicators: mini 3D-perspective ship icons.
- Smart bomb indicators: pentagon icons that crack when used.
- Wave announcement: large text sweeps in from left with trailing light streaks.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Player thrust | Sawtooth oscillator 80–120 Hz, gain ~ speed | Continuous | Engine rumble, rises with speed |
| Bullet fire | Square 1200 Hz, very sharp attack | 60ms | Zap |
| Enemy explosion | White noise burst + sine 200→40 Hz | 300ms | Crunch + thud |
| Smart bomb | Sub-bass thud sine 40 Hz + noise swwell + ring 800 Hz | 800ms | Earth-shattering |
| Human rescued | Ascending arpeggio C6 E6 G6 C7 | 250ms | Joyful |
| Human abducted | Descending drone: sine 600→100 Hz | 500ms | Ominous |
| Lander abduction beam | Continuous tone: triangle 220 Hz with slow vibrato | Looping | Tractor-beam hum |
| Bomber mine drop | Low thud: sine 60 Hz | 100ms | Clunk |
| Mine explosion | Sharp crack: noise 50ms + deep sine 50→20 Hz | 250ms | Boom |
| Player hit | Harsh buzz: square 400 Hz, descending + static | 400ms | Painful |
| Hyperspace | Rising sweep: sine 200→2000 Hz then silence | 300ms | Teleport |
| Wave clear | Full fanfare: sine melody C-E-G-C ascending | 600ms | Victory |

### Music/Ambience
Three-layer ambient composition:
1. **Bass drone**: Sawtooth at 55 Hz (A1), slowly modulated with an LFO at 0.05 Hz. Creates constant tension.
2. **Mid texture**: Two triangle waves detuned by +/- 2 Hz from 220 Hz, creating a beating effect at 4 Hz — alien pulsing feel.
3. **High shimmer**: Short sine note bursts (random pentatonic pitches 800–2000 Hz) at random 2–5 second intervals, 30ms duration. Like distant radio signals.

Wave intensity: as wave number increases, bass drone pitch rises by 2 Hz per wave (barely perceptible but felt). When humans are being abducted, a distressed high-frequency oscillator adds 1600 Hz stabs at 2 Hz interval.

## Implementation Priority
- High: Enemy explosion shard particles, lander tractor beam trapezoid + pulsing, terrain mineral vein lines, player engine trail (3-layer)
- Medium: Nebula wisp background layers, baiter swept-back fin polygons, human individuation colors, smart bomb shockwave ring
- Low: Mutant organic vertex noise, parallax distant mountains, human in-beam visibility, radar scan line sweep
