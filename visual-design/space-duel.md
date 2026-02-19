# Space Duel — Visual & Sound Design

## Current Aesthetic

500x500 two-player gravity duel. A bright yellow central star `#ffd060` with warm glow layers dominates the center. Two ships orbit it — player in cyan `#4cf`, AI in orange-red `#f64` — as simple 4-vertex arrow polygons. Bullets are tiny colored circles. Ships leave colored trail lines. Background has 120 randomly placed grey-white dots as stars. Particles scatter on death. Lives are shown as mini ship polygons in the bottom corners. The gravity mechanic is the heart of the game and the central star looks genuinely good.

## Aesthetic Assessment
**Score: 3.5/5**

This is a clean, focused design. The central star is the visual highlight. The ship trails give a sense of orbital momentum. Key weaknesses: the background is a static dot field with no depth, bullets are forgettable, and there's no impact feedback when ships collide or when bullets hit the star. The lives display is functional but could be more dramatic.

## Visual Redesign Plan

### Background & Environment

**Multi-layer starfield:** Separate the 120 stars into 3 depth layers:
1. Far layer: 60 very small (0.5px) cool-white dots, near-static
2. Mid layer: 40 medium (1px) stars with gentle twinkling
3. Near layer: 20 slightly larger (1.5px) stars with color tints (blue-white, pale amber) — these subtly shift position opposite to camera to suggest depth when ships move fast

**Nebula wisps:** 4-5 very faint elongated cloud shapes (long thin ellipses drawn as overlapping large-radius circles at <5% alpha) in cool purple/blue hues. These are static decorations only.

**Star corona:** Enhance the central star significantly:
- Outer corona: rotating slow "spike" arms (8 thin polygons radiating outward, slowly spinning, very low alpha) suggesting a real stellar corona
- Active solar flares: occasional bright arc that pulses out from the star surface and fades over ~2 seconds
- Gravitational lensing ring: a very subtle distortion circle at ~60px radius — a faint white ring outline that slowly pulsates

**Background grid:** A barely-visible polar coordinate grid centered on the star (concentric circles at orbit radii + 4 axis lines at 15% opacity) helps players feel the gravity topology.

### Color Palette
- Player (cyan): `#22eeff`
- AI (red-orange): `#ff5522`
- Central star core: `#fff5cc`
- Star inner glow: `#ffdd44`
- Star outer glow: `#ff8800`
- Background deep: `#020209`, `#050515`
- Nebula: `#0d0830`, `#1a0820`
- Bullet player: `#22eeff`
- Bullet AI: `#ff5522`
- Glow/bloom: `#ffdd44`, `#22eeff`, `#ff5522`

### Entity Redesigns

**Ships:** More detailed 6-vertex polygon per ship:
- Pointed nose with a slightly narrower tip
- Angled swept-back wings creating a delta silhouette
- A small rectangular cockpit bump on the dorsal side
- A bright center "cockpit glow" — a tiny filled polygon in white/pale color that pulses gently

**Engine flame:** When thrusting, draw a proper engine exhaust:
- A thin triangle polygon from the rear, flickering in length each frame
- Player flame: bright blue-white `#aaddff` core → cyan outer
- AI flame: orange-yellow core → orange outer
- Boost: white-hot core, much larger flame, intense glow

**Bullets:** Instead of plain circles, draw each bullet as a small elongated capsule (3px × 6px) aligned to its velocity direction. Add a brief comet tail (2-3 pixel trail in bullet's color at low alpha). On approaching the star, bullets should visibly curve due to gravity — this natural arc is already computed; just ensure the trail captures it beautifully.

**Ship trail:** Existing trails are good. Enhance: make the trail width taper (wider near the ship, narrowing to a point), and add occasional tiny "thruster dot" particles separate from the trail.

**Lives display:** Instead of small ship outlines in corners, render them as small holographic readouts — each ship polygon surrounded by a thin circle ring, with a small HP arc indicator.

### Particle & Effect System

- **Ship fires bullet:** Brief muzzle flash at nose tip (2-frame white circle at 80% alpha)
- **Bullet hits ship:** 8 particles in bullet's color scatter outward; brief red screen-edge flash
- **Bullet hits star:** Small orange plasma burst at contact point — 4 orange particles that fly outward + a brief star surface brightening
- **Ship destroyed:** 3-stage: small initial flash → ring expanding from ship position → 15+ debris particles with momentum. Remaining trail segments persist briefly and fade.
- **Respawn:** Ship materializes from the edge of the gravitational zone, appearing as a bright point that expands to full ship polygon over 8 frames
- **Near-miss:** When bullet passes within 15px of a ship, a brief yellow "warning arc" on that side of the ship

### UI Polish

- Round number displayed as a large faint "ROUND X" text behind the star
- Score counter animated with a +100 float-up effect on kills
- Gravity zone visualization: a very faint "event horizon" ring at the star's collision radius
- "Orbital speed" mini-indicator on each ship showing current velocity as a colored arc

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Engine thrust | Deep harmonic hum | Sawtooth 80 Hz + 160 Hz, filtered | Continuous | Volume proportional to thrust; varies with ship speed |
| Fire bullet | Sharp ping | Sine 800→2000 Hz sweep, very short | 50ms | Clean energy discharge |
| Bullet whizzing past | Doppler whoosh | Sine 1200→400 Hz | 80ms | Plays when bullet comes close |
| Bullet hits ship | Sharp crack + alarm | Noise burst + 220 Hz square blip | 200ms | |
| Bullet hits star | Solar rumble | Low-frequency noise burst, 100 Hz low-pass | 300ms | Deep, resonant |
| Ship destroyed | Implosion + explosion | Reversed noise burst (implosion) + boom | 600ms | |
| Respawn | Energy materialize | Sine 1200 → 440 Hz, smooth | 400ms | Rising then settling |
| Orbit proximity warning | Low pulse | 60 Hz sine at 3Hz gate rate | While near star | Warning tone when about to crash |
| Round win fanfare | Bright arpeggio | 440, 554, 659 Hz sine, fast | 400ms | |
| Round lost | Minor falling tone | 440, 370, 294 Hz sawtooth | 500ms | |

### Music/Ambience

A slow, tense ambient piece: a single sustained drone at 41.2 Hz (low E) modulated slowly with a ring modulator at 0.1 Hz — this produces a slowly throbbing, deep space tension sound at very low volume. Add a sparse high-frequency shimmer: random sine tones at 2400-4800 Hz appearing every 3-6 seconds at near-zero volume, like light from distant stars. As the round progresses and lives decrease, subtly increase the drone volume and modulation depth, building dread. No melody — pure tension.

## Implementation Priority
- High: Ship thrust flame polygon (replacing simple particles), bullet capsule shape with trail, ship destruction particle burst, star corona rotating spikes
- Medium: Gravity orbit warning tone, near-miss warning arc, bullet-hits-star burst, engine thrust audio
- Low: Nebula background wisps, polar grid overlay, multi-layer parallax stars, respawn animation, lives holographic display
