# Space Dogfight — Visual & Sound Design

## Current Aesthetic

600x600 four-way space battle with screen-wrap. Background is black with 120 twinkling stars (small colored rectangles). Ships are simple arrow polygons in four team colors (blue, red, green, gold). Thrust produces orange/yellow particle exhaust. Lasers are colored lines with a glowing tip. Missiles are small triangles with trailing particles. Asteroids are irregular grey polygons. Explosions are expanding circles with particle bursts. There is a compact HUD with shield/boost bars and a kill scoreboard. The code is well-structured but visually it is classic "programmer art space game."

## Aesthetic Assessment
**Score: 3/5**

Mechanically excellent — 4-way battles with shields, boosts, missiles, and asteroid hazards. Visually: ships have no identity beyond their color; background is static; explosions are functional but lack drama; laser shots look thin and unconvincing. The wraparound universe deserves a more visually distinctive treatment.

## Visual Redesign Plan

### Background & Environment

**Starfield enhancement:** 3 parallax star layers:
1. Distant layer: 80 tiny 0.5px white dots at ~20% opacity, very slow drift
2. Mid layer: current twinkling stars (~60, 1px, 40-70% opacity with shimmer)
3. Near layer: 10 large stars (2-3px) with color tints (blue-white, orange) at full opacity

**Nebula background:** Large, very soft colored clouds at 3-5% opacity in complementary colors — a teal cloud in one quadrant, a warm amber in another, providing subtle depth and making the black feel less void-like. Use overlapping `fillCircle` calls at near-zero alpha with large radii.

**Wrap-boundary indicator:** A very subtle grid line (0.5px, 2% opacity) at the screen edges helps players sense the wrap topology.

**Planet in background:** A large partially-visible disc (only quadrant visible at one corner, ~200px radius, dark with faint surface detail lines) at 8% opacity — purely decorative.

### Color Palette
- Player ship: `#44aaff` (blue) — more saturated
- AI-Red: `#ff4444`
- AI-Green: `#44ff88`
- AI-Gold: `#ffcc22`
- Background: `#020208`, `#04040e`
- Nebula cold: `#113355`
- Nebula warm: `#331a08`
- Laser (player): `#66ccff`
- Glow/bloom: ship colors, `#ff8800` (engine)

### Entity Redesigns

**Ships:** Give each ship a more detailed polygon. Instead of a simple 4-vertex triangle-ish shape, use a 6-8 vertex form suggesting a proper fighter:
- Swept wings extending backward from the mid-body
- A small cockpit bump at the front (slightly lighter color polygon)
- Nacelle/engine pods at the rear (tiny darker rectangles)
- When shielding: a hexagonal shield overlay instead of a plain circle ring

**Exhaust/thrust:** Instead of simple particles, draw a proper engine plume — a tapered polygon attached to the rear that flickers in length/width each frame. Boost flame is wider and brighter with a white-hot core.

**Lasers:** Each laser bolt should be a capsule shape (not just a line): 2px wide bright color with a 6px length, with a white-hot 1px center. Fade alpha based on remaining life. Add a brief muzzle flash at the firing point.

**Missiles:** Slightly larger triangle; add a bright warm exhaust trail (3-4 particles per frame) and a red indicator ring around them when within lock-on range.

**Asteroids:** Improve texture — add lighter "crater" highlight polygons inside each asteroid, and a subtle dark outline to separate them from space. Slowly rotate all asteroids at different speeds.

**Explosions:** Multi-stage: bright white flash (3 frames) → orange expanding ring → debris particles that follow momentum. Add a brief screen-edge flash on large explosions.

### Particle & Effect System

- **Engine thrust:** 2-3 particles per frame, orange/amber, short life (12 frames), fade to transparent
- **Boost:** Brighter yellow/white particles, larger, more frequent
- **Laser impact (ship):** 6 particles in the laser's color, plus a shield ripple ring if shielding
- **Laser impact (asteroid):** 3 grey rock chips scatter
- **Missile detonation:** Full explosion — white flash, orange ring, 15+ particles, screen shake (brightness pulse)
- **Ship destroyed:** Multi-explosion chain — 3 small pops over 8 frames then one large burst; debris triangles tumble away
- **Respawn:** Incoming warp effect — ship materializes from a pinpoint, expanding outward with a ring

### UI Polish

- Kill scoreboard: styled as a holographic panel with each ship's color and mini-icon
- HUD bars: horizontal bars with color gradient (green→yellow→red for HP/shield)
- Timer: minimal, top-center, large numeral only
- Respawn countdown: large glowing countdown centered on the destroyed ship's last position

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Engine thrust | Continuous filtered noise | Brown noise, 200 Hz low-pass, slight sawtooth mix | Continuous | Volume scales with thrust; higher pitch on boost |
| Boost activate | Rising roar | Noise sweep + 80 Hz sine ramp up | 300ms | |
| Fire laser | Sharp energy blip | Sine 1200→400 Hz sweep, short | 60ms | Fast zip sound |
| Laser impact (miss) | Quiet fizz | White noise, 2kHz bandpass | 40ms | |
| Laser impact (hit) | Crunch + short alarm | Noise burst + 440 Hz square | 120ms | |
| Shield hit | Electric deflect | Sine wobble: 660→1320 Hz, LFO tremolo | 200ms | |
| Missile launch | Low whoosh | Noise + 200 Hz sawtooth, rising | 200ms | |
| Missile tracking | Faint beep | 1000 Hz sine, repeating at 4Hz | Loop while active | Low volume |
| Missile detonation | Heavy explosion | Brown noise burst + 60 Hz sine punch | 500ms | Most dramatic sound |
| Ship destroyed | Sequential mini-pops + boom | 3x small noise + final 60 Hz sine | 800ms | |
| Respawn | Warp hum | 400→800 Hz sine, smooth ramp | 400ms | |
| Asteroid collision | Rock crunch | Brown noise, filtered 300 Hz | 200ms | |

### Music/Ambience

A driving synthwave-adjacent loop built entirely with oscillators. Two main voices:
- Bass: sawtooth at 55 Hz pulsing in a 4/4 kick pattern (gated with fast attack/release)
- Lead: square wave arpeggiation at 8th notes, moving through a minor pentatonic scale around A3

Tempo: 128 BPM. Additional layer: a high-frequency filtered sawtooth pad sustaining a minor chord. The music cuts to a tension sting (single sustained note + reverb) when the player ship is destroyed. Music resumes at full energy on respawn.

## Implementation Priority
- High: Engine plume polygon (instead of particles only), multi-stage ship destruction explosion, laser capsule shape, missile tracking sound
- Medium: Nebula background layers, ship redesign with wings/cockpit, shield hexagon overlay, asteroid crater detail
- Low: Planet background disc, wrap-boundary grid, respawn warp effect, parallax star layers, synthwave ambient loop
