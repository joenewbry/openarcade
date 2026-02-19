# Galaxian — Visual & Sound Design

## Current Aesthetic
A 480×600 canvas with a black background and scrolling star particles (varying sizes and speeds). Enemies are drawn as filled polygons with distinct shapes: flagships are large 8-pointed star polygons in purple (`#a8f`), commanders are hexagonal in red-orange (`#fa6`), escorts are diamond-shaped in blue-green (`#4cf`), and drones are small triangles in green (`#8f8`). The player ship is a narrow pointed polygon in blue-violet (`#84f`). The formation sways horizontally as a unit. Dive bombers follow a two-phase path (down then arc back). Bullets are small colored rectangles. Only one player bullet is allowed on-screen at a time. The overall look is faithful to the arcade original in structure but entirely flat — no glow, no environmental detail, and no visual differentiation between the gameplay zones.

## Aesthetic Assessment
**Score: 2.5/5**

The polygon enemy shapes show good effort and the multi-tier formation is architecturally correct. However, the flat colors on a plain starfield are visually inert. There is enormous room to add atmospheric depth, enemy glow, a sense of planetary war, and particle life without changing any gameplay.

## Visual Redesign Plan

### Background & Environment
A **deep space planetary assault** theme. The background begins as pure black (`#000006`) at the top, transitioning through a cool dark blue (`#000a1a`) to a warm horizon glow at the very bottom — suggesting the planet surface below being defended. A large softly-glowing planet silhouette occupies the lower-right quadrant (a large partial circle, dark blue-grey `#0a1020` at 40% alpha, with a thin atmosphere rim in pale blue `#3366aa` at 20% alpha). Three layered nebula streaks cross the background diagonally from upper-left to lower-right (thin ellipse fills at 6–8% alpha in teal, indigo, and deep red) suggesting galactic structure.

Stars are restructured into 3 layers: 50 1px white stars (slow, far), 20 1.5px cool-blue stars (medium), and 10 2px warm-white stars with a tiny glow halo (near, fast). All scroll downward continuously.

At the player zone bottom, a faint horizon strip (`#1a0a28` to transparent) grounds the play area.

### Color Palette
- Background top: `#000006`
- Background mid: `#000a1a`
- Planet silhouette: `#0a1020`
- Planet rim: `#3366aa`
- Nebula teal: `#003a3a`
- Nebula indigo: `#08001a`
- Nebula crimson: `#1a0008`
- Star near: `#fffde8`
- Star mid: `#aaccff`
- Star far: `#777788`
- Flagship: `#cc66ff`
- Flagship accent: `#ff44ee`
- Commander: `#ff8833`
- Commander accent: `#ffcc44`
- Escort: `#33ddff`
- Escort accent: `#88ffff`
- Drone: `#66ff88`
- Drone accent: `#aaffcc`
- Player ship: `#8855ff`
- Player engine: `#44aaff`
- Player bullet: `#ffffff`
- Enemy bullet: `#ff5533`
- Explosion: `#ff9922`

### Entity Redesigns

**Player ship** — Sleek interceptor silhouette: a narrow elongated arrowhead with two swept-back delta wings (angled wing polygons extending 20px each side from the midsection). A blue engine cone at the rear emits a steady thrust flame (narrow teardrop, bright cyan-blue `#44aaff`, flickering ±3px each frame via `Math.sin`). A cockpit stripe (2px pale blue rect) runs along the upper center. The overall ship has a `setGlow('#8855ff', 0.4)` soft violet aura. When firing, a brief muzzle-flash quad appears at the nose for 2 frames.

**Drone enemies** — The base unit: a compact arrowhead pointing down (toward the player), in bright green with a slightly darker center stripe. A single red compound-eye circle at the front. Wing edges glow subtly green. When in dive, the arrowhead rotates to point in the direction of movement.

**Escort enemies** — Wider, teal-colored diamond shapes with inset wing-notch details: the main diamond polygon has a smaller concentric inner diamond in lighter cyan drawn as a stroke. Two small antenna dots protrude from the top corners. Eyes are two tiny white dots. Glow: `setGlow('#33ddff', 0.3)`.

**Commander enemies** — Angular hexagonal body in hot orange with a raised dorsal fin polygon on top (suggesting a command module). The front face has two elliptical sensor windows. Wing panels are asymmetric parallelograms extending from mid-body. Glow: `setGlow('#ff8833', 0.5)`.

**Flagship enemies** — The apex unit of the formation: a large multi-segment body (central octagon core plus 4 wing pylons extending diagonally). Two large bright-magenta compound eyes with yellow pupils. A rotating inner disk (small central polygon that rotates 2°/frame) suggests power core activity. When a flagship dives, it emits a contrail of 4 fading ghost copies behind it. Glow: `setGlow('#cc66ff', 0.7)`.

**Dive formation** — When enemies dive, they temporarily leave a formation ghost: a faint 20% alpha copy of the enemy remains at its formation position for 10 frames before fading, showing where it was before diving.

**Formation sway** — Enhanced with a subtle wave effect: instead of all enemies moving perfectly in unison, each column has a ±2 frame phase offset on the horizontal sine wave, creating a gentle ripple through the formation.

### Particle & Effect System
- **Enemy explosion**: 8–12 orange-red debris particles scatter from the enemy; each is a 3–5px circle with random radial velocity (4–7 px/frame), gravity 0.1 px/frame², lifetime 20–30 frames; plus 2–3 brief bright spark lines radiating outward (3-frame lifetime).
- **Flagship explosion**: Double the particles (16–20), larger size (6–10px), longer lifetime (40 frames), plus a 12-frame expanding ring `strokeCircle` at the explosion center.
- **Player death**: 14 blue-violet debris shards (thin elongated polygons) scatter outward with high velocity; 6 bright white sparks; screen briefly flashes blue-white at 20% alpha for 3 frames.
- **Engine trail**: 5 small cyan dots trail below the player ship, decreasing alpha from 50% to 5%, each offset 5px.
- **Bullet impact**: 1-frame white pixel flash at impact point.
- **Dive contrail (flagship)**: 4 ghost copies drawn at 20%, 12%, 7%, 3% alpha behind the flagship during dive.
- **Planet atmosphere shimmer**: Every 120 frames, a subtle bright arc sweeps along the planet's rim over 20 frames, suggesting atmospheric reflection.

### UI Polish
- Score displayed with large white digits and a faint blue glow shadow.
- High score line in cyan above current score.
- Lives shown as small player-ship silhouette icons in the HUD.
- Level/wave indicator: "WAVE X" appears centered briefly (40 frames) at wave start with a fade-in/out.
- When all enemies are cleared, a brief "STAGE CLEAR" text with golden glow appears before the next wave loads.
- "1UP" blinking in amber above the score when an extra life is earned.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Player shoot | Sharp laser zap | 1400 Hz square, 5 ms attack, 60 ms decay | 80 ms | Single-shot crispness |
| Enemy bullet | Lower zap | 600 Hz square, 80 ms decay | 90 ms | Distinct from player |
| Drone explosion | Noise crackle | White noise BPF 800 Hz, fast decay | 100 ms | Small pop |
| Escort explosion | Mid crunch | White noise BPF 500 Hz, slight sine 150 Hz | 150 ms | Heavier hit |
| Commander explosion | Heavy crunch | 100 Hz sine + noise burst, 200 ms | 250 ms | Significant kill |
| Flagship explosion | Big boom | 60 Hz sine punch + white noise, long decay | 400 ms | Major kill |
| Player death | Whirling descent | 700→80 Hz sawtooth sweep + noise burst | 600 ms | Ship destroyed |
| Dive warning | Low alarm pulse | 300 Hz square, 2× rapid pulses | 150 ms | Incoming dive |
| Wave clear | Rising arpeggio | C4–E4–G4–C5 triangle, 70 ms each | 350 ms | Stage complete |
| Formation swoop | Descending whoosh | White noise HPF 2000→300 Hz sweep | 250 ms | Dive sound |
| Extra life | Bright chime | 1047 Hz sine + 1319 Hz, 200 ms | 250 ms | 1UP reward |
| Wave start | Low rising tone | 110→440 Hz sine sweep | 400 ms | Tension build |

### Music/Ambience
Tense galactic siege: a looping 8-bar sequence at 120 BPM. A bass oscillator (sawtooth, LPF 300 Hz) plays a driving bass riff alternating between two notes (root and minor 7th). A percussive kick is synthesized as a 60 Hz sine with fast attack and 80 ms decay, triggered every beat. On beats 2 and 4, a snare-like noise burst (white noise, BPF 300 Hz, 40 ms) accents the rhythm. Over this, a sparse melodic phrase on a minor-key square wave plays every 4 bars. When an enemy enters dive mode, the music briefly gains a tremolo LFO (6 Hz, depth 0.4) for 1 second. Overall gain: 0.09.

## Implementation Priority
- High: Enemy explosion particles (per-tier size/count), player engine trail, flagship dive contrail ghost copies, player death particle burst, all sound events
- Medium: Background nebula streaks + planet silhouette, multi-layer star parallax, flagship rotating inner disk, formation sway ripple phase offset, enemy glow tints
- Low: Planet atmosphere shimmer pulse, formation ghost copy on dive-start, dive warning alarm, ambient galactic music, UI ship-icon lives
