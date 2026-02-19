# Raiden — Visual & Sound Design

## Current Aesthetic

A 480×640 vertical scrolling shooter with the player ship in magenta-pink (`#f28`). Three weapon types: vulcan (`#f44`), laser (`#48f`), missile (`#4f4`). Bombs use a screen-filling orange flash with screen shake. Medals are yellow diamond shapes (`#fd0`). Enemies: basic (`#f80`), fast (`#ff0`), zigzag (`#0ff`), tough (`#c4f`), tank (`#888`), turret (`#696`). A boss with a pulsing red core. Ground objects scroll past. Stars are drawn with deterministic seeding. Score, lives, and weapon level displayed as UI. The core is functional but lacks the explosive visual intensity and military hardware aesthetic of the original Raiden.

## Aesthetic Assessment
**Score: 3/5**

The weapon variety and enemy diversity create good gameplay breadth. The bomb effect has dramatic intent. However, the player ship is a simple polygon with minimal detail. Ground scroll is undetailed. Enemies look like colored shapes. The laser is a plain line. Missing: lightning arcs for the laser, weapon-charge glow, satisfying explosion variety, and a sense of the war-torn Middle-Eastern desert or military base aesthetic.

## Visual Redesign Plan

### Background & Environment

A scrolling warzone landscape. The background sky darkens from deep blue-grey at top (`#0a0a14`) to near-black at the bottom (`#050508`). The ground layer (bottom 15% of the scroll surface) uses a sandy-tan color (`#2a1f0a`) with occasional green terrain patches (`#1a2a0a`). Ground scrolls at 0.8× the play speed.

**Ground detail:** On the ground layer, draw scrolling military infrastructure: runway sections (2px dark grey lines at regular intervals), small building rectangles (`#1a1510` at 80% opacity), roads (thin `#333` lines), craters (dark circles `#0a0a05`, radius 8–12px), trees (tiny dark green blobs). All of this scrolls at ground speed, giving a realistic aerial top-down warzone feel.

**Mid-ground layer (slower scroll):** A second ground layer at 0.4× speed with larger terrain features: river/water sections (`#0a1a2a` patches), agricultural grid lines (`#1a1500` at 30% alpha), larger building complexes. Two speeds of ground create convincing parallax depth.

**Sky background:** Very faint cloud-like wisps (large ellipses, `#1a1a22` at 8% alpha, radius 60–120px) slowly scrolling at 0.1× — barely visible but adding atmospheric depth.

### Color Palette
- Player ship: `#ff2288` (vivid magenta)
- Player glow: `#ff66aa`
- Vulcan shots: `#ff4422`
- Laser beam: `#4488ff` core, `#88ccff` glow
- Missile: `#44ff66`
- Bomb flash: `#ff8800`
- Medal: `#ffdd00`
- Background sky: `#0a0a14`, `#050508`
- Ground: `#2a1f0a`, `#1a2a0a`
- Enemy basic: `#ff8800`
- Enemy fast: `#ffff00`
- Enemy zigzag: `#00ffff`
- Enemy tough: `#cc44ff`
- Enemy tank: `#888888`
- Boss: `#ff2222`

### Entity Redesigns

**Player ship:** The current polygon gets a detailed military aircraft silhouette. Draw the main fuselage as a pointed elongated body (`#dd2288`), two swept-back wings (slightly darker `#aa1166`), twin engine pods on wing undersides (small rounded rect in `#333` with glowing `#ff8800` thruster ports). The cockpit: a small teardrop shape in tinted cyan-glass (`#44eeff` at 60% alpha). Add a continuous dual thruster flame: two thin elongated flame shapes below the engines, flickering in size (length ±3px over 6 frames) and color (cycling `#ff8800` → `#ffff00` → `#ff8800` over 12 frames). A faint red-pink ship glow (`shadowBlur = 12`, `#ff2288` at 50% alpha) constantly radiates from the ship hull.

**Vulcan shots:** Upgrade from plain circles/lines to tracer rounds. Each vulcan bullet: a short elongated ellipse (length 6px, width 2px) in bright `#ff4422`, with a 3-dot trail behind it at 50%, 25% alpha. On wall/enemy impact, a 4-spark burst (size 3px, lifetime 6 frames, orange-white).

**Laser beam:** The laser becomes a proper energy beam. Three rendering layers:
1. Outer glow: beam width ×6, `#4488ff` at 8% alpha.
2. Mid: width ×3, `#88aaff` at 30% alpha.
3. Core: width ×1, `#ffffff` at 90% alpha.
Along the beam length, draw 4 small perpendicular "energy arc" lines (6px long, `#88ccff`, animated rotation at 10°/frame) to simulate electrical discharge. Beam origin: a bright muzzle flash ellipse at the ship's nose, 3 frames on fire.

**Missiles:** Each missile is a small pointed capsule shape (6px × 3px) in `#44ff66` with a tiny orange thruster dot at the rear and a brief smoke trail (4 grey dots, alpha 0.3→0, lifetime 8 frames).

**Bomb explosion:** Major upgrade. Current frame-fill orange gets replaced with a multi-stage sequence:
- Frame 1–3: Pure white screen flash (`rgba(255,255,255,0.7)` → 0.3 → 0.1).
- Frame 4–15: Expanding dark ring (stroke, radius 0 → 150px, black at 0.8 → 0 alpha) — the pressure wave.
- Frame 4–30: 32 particles of mixed color (orange, red, yellow) radiate from screen center, size 6→1px, lifetime 30 frames.
- Frame 8–20: Secondary shockwave ring in orange (`#ff8800`, radius 50 → 220px, stroke width 3 → 1px, alpha 0.6 → 0).
- Screen shake: ±5px for first 12 frames, decaying.

**Medals:** Upgrade from plain diamond shapes to glittering gems. Draw each medal as a layered diamond: dark base (`#cc9900`), bright fill (`#ffdd00`), inner facet lines (4 thin lines from center to corners, white at 30% alpha), top specular spot (white dot at 15% alpha). Each medal slowly rotates (3°/frame). On collection, a brief star-burst: 6 particles in gold, lifetime 10 frames.

**Boss:** The boss gains a multi-ring intimidation display. Around its center core, add two concentric rotating rings of dots (8 dots each, `#ff4422` at 60% and 40% alpha, rotating at +1° and -1.5°/frame). The core's pulse animation intensifies when at low health (pulse frequency doubles: 30-frame period becomes 15-frame). Boss segments get visible bolts/rivets (small circles at segment joins, `#444` with a white highlight).

### Particle & Effect System

- **Enemy explosion (small):** 10 particles in enemy color + 2 bright orange shards, lifetime 18 frames.
- **Enemy explosion (large/tank):** 20 particles + 4 orange shards + expanding ring + `rgba(255,150,0,0.06)` screen tint for 8 frames.
- **Vulcan impact:** 4 sparks (bright white/orange) radiating from hit point, lifetime 6 frames.
- **Laser continuous hit:** Each frame the laser hits an enemy, emit 2 small blue-white sparks at the contact point.
- **Ship invincibility (after hit):** Ship blinks in a warm gold color (`#ffaa00` tint) every 8 frames for 120 frames.
- **Weapon pickup:** Ring flash in weapon color (radius 0 → 30px, alpha 0.8 → 0 over 12 frames) plus 8 particles.
- **Score medal collect:** Brief "+300" or "+medal" float text in gold, rising 20px and fading over 30 frames.

### UI Polish

- **Weapon level indicator:** A horizontal row of small pip icons (up to 5) below the weapon icon, glowing in the weapon color. When leveling up, the new pip pulses (scale 0.3 → 1.4 → 1.0 over 12 frames) in a bright flash.
- **Bomb counter:** Small bomb-icon graphics (stylized bomb silhouette) stacked vertically in the corner rather than just numbers. Each bomb icon pulses gently in orange at 0.5 Hz.
- **Lives:** Small player ship silhouette icons. On life loss, the rightmost icon shatters (splits into 3 pieces that fly apart, fade over 20 frames).
- **Boss warning:** Before boss entry, the screen briefly flashes red (`rgba(255,0,0,0.15)` for 8 frames) and a "WARNING" text slides in from the top in bold red, staying for 60 frames then sliding out.
- **Score:** Large digits at top in bright white with a thin dark outline. Score increase animates with a brief upward float of the delta value.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Vulcan fire | OscNode (square) burst + noise | 1200 Hz + white noise 0.25 vol | 40 ms | Machine gun rat-a-tat |
| Laser fire (continuous) | OscNode (sawtooth) + filter | 440 Hz sawtooth through BPF at 2kHz | continuous | Electric hum |
| Missile launch | OscNode (triangle) + noise | 300 Hz + noise 0.4 vol | 80 ms | Whoooosh |
| Bomb drop | OscNode (sine) descend | 880 → 55 Hz, fast | 300 ms | Falling whistle |
| Bomb explosion | Noise burst + low sine | White noise 0.9 vol + 55 Hz sine | 500 ms | Devastating boom |
| Enemy destroyed (small) | OscNode (sine) + noise | 440 Hz + noise 0.3 | 100 ms | Pop |
| Enemy destroyed (large) | OscNode (square) + noise | 220 Hz + noise 0.6 | 250 ms | Boom |
| Boss hit | OscNode (sine) heavy | 180 Hz, strong decay | 150 ms | Tank thud |
| Weapon pickup | OscNode (sine) ascending | 440 → 880 Hz | 200 ms | Power-up chime |
| Medal collect | OscNode (sine) chime | 1318 Hz, light | 100 ms | Bright ding |
| Player hit | OscNode (triangle) alarm | 330 Hz + 350 Hz simultaneously | 300 ms | Alarm buzz |
| Boss appear | OscNode (square) low pulse | 55 Hz repeated 3× | 600 ms | Ominous rumble |

### Music/Ambience

Military action atmosphere without a melody loop. Synthesize a driving 4/4 drum-like pattern at 140 BPM: a deep "kick" (`55 Hz` sine, 150ms including tail, 0.08 vol) on beats 1 and 3, a higher "snare" (filtered white noise, 500Hz bandpass, 80ms, 0.06 vol) on beats 2 and 4, and a continuous hi-hat layer (filtered noise, 6kHz highpass, 20ms on every 8th note, 0.03 vol). No melody — pure percussion drive. On boss entry, add a low rumbling pad (`82.5 Hz` sawtooth through lowpass at 120 Hz, 0.05 vol) for increased tension. On bomb explosion, all ambient sounds briefly duck to 10% volume for 400ms (via `GainNode`) then fade back — the deafening bomb effect.

## Implementation Priority
- High: Three-layer laser beam with energy arcs, multi-stage bomb explosion sequence, player thruster flame flicker
- Medium: Scrolling warzone ground layer with military details, vulcan tracer rounds + impact sparks, medal gem rotation + collect burst
- Low: Mid-ground parallax layer, boss intimidation rings, lives-icon shatter animation, drum-pattern ambience, boss warning banner
