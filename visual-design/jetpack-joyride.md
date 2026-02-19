# Jetpack Joyride — Visual & Sound Design

## Current Aesthetic

Horizontal endless runner where a teal-colored player (`#4ce`) with a jetpack and helmet flies through a scrolling facility. Floor and ceiling are dark blue `#0f3460` with glowing teal edges. Background scrolls a grid on `#16213e`. Zappers are red lines with yellow orbs and electricity zigzags. Missiles are red triangles with orange exhaust. Lasers are full-width red beams. Coins are gold `#fd0` circles with spin animation. Thrust particles are orange/yellow. Death particles are teal and red. The aesthetic is committed to a clean neon-cyber style with good color contrast.

## Aesthetic Assessment

**Score: 3.5/5**

Strong foundation — the teal player against the dark blue facility reads well, coins are visible and satisfying, and the zapper electricity effect is a good start. The scrolling grid background is appropriate for the lab-corridor feel. However the background feels static (grid doesn't animate convincingly), the missiles lack drama, laser beams could be more intense, and the overall environment needs depth layers to feel like a real facility rather than a 2D silhouette.

## Visual Redesign Plan

### Background & Environment

Build a three-layer parallax corridor:

- **Far background:** `#0a0a18` with faint horizontal scan lines `rgba(30,60,100,0.06)` — the deep void of the facility's infrastructure
- **Mid layer:** Dark wall panels drawn as rectangular segments in `#0f1a35`, separated by thin bright joints `#1a3060`. These scroll at 40% speed. Each panel has subtle surface variation — a slight diagonal noise texture `rgba(20,40,80,0.04)`
- **Near layer:** Foreground floor/ceiling structure at full scroll speed — the teal-glowing floor/ceiling edge

The scrolling grid background: instead of a flat rectangular grid, make the lines glow. Horizontal lines `rgba(40,120,200,0.08)`, vertical lines `rgba(40,120,200,0.04)` — slightly brighter horizontal lines because they're "floor level marks". The grid scrolls leftward.

Add corner vent details at random intervals: small dark rectangles `#0a1428` with thin bright slot lines `#1a4070`, suggesting air ducts. Pure decoration, no gameplay effect.

**Floor/Ceiling:** `#0f3460` fill with bright teal top-edge line `#44ccee` at 2px, 6px glow bloom. The edge should pulse very faintly (±15% brightness, 0.8Hz) as if electrical current runs through it.

### Color Palette

- Primary (player): `#44ccee`
- Primary bright: `#88eeff`
- Background deep: `#0a0a18`
- Background mid: `#0f1a35`
- Grid lines: `rgba(40,120,200,0.08)`
- Floor/ceiling fill: `#0f3460`
- Floor edge glow: `#44ccee`
- Coin gold: `#ffdd00`
- Coin inner: `#ffaa00`
- Zapper red: `#ff3333`
- Zapper orb: `#ffff44`
- Electricity: `#ffffff`
- Missile body: `#cc2211`
- Missile exhaust: `#ff7722`
- Laser beam: `#ff2222`
- Laser core: `#ffaaaa`
- Thrust fire: `#ff8800`
- Thrust hot: `#ffff00`

### Entity Redesigns

**Player (Barry):**
- Helmet: rounded rectangle `#2a5a7a` (dark blue), visor `#88ddff` (bright cyan), visor shine dot `#ffffff`
- Body: jumpsuit `#44ccee` torso (slightly darker `#2a9aaa` arms), belt `#1a4a5a`
- Legs: darker `#2a8898`, with small boot shapes `#1a3a4a`
- Jetpack: mounted on back — `#226688` body, nozzle `#1a4a5a`, fuel gauge (tiny) on side
- On thrust: nozzle emits orange-yellow flame + glow `rgba(255,150,50,0.4)`
- On landing (floor): small dust puffs from feet
- On ceiling: "thud" effect if touching ceiling (brief white flash on contact point)

**Coins:**
- Gold circle `#ffdd00` with bright inner `#ffee88` center (specular)
- Dark rim `#cc8800` outer border 1px
- Spin animation: horizontal compression cycles 1.0 → 0.3 → 1.0 (coin turning edge-on)
- On collect: 4 small gold sparks radiate outward, "+" text floats up and fades
- Coin lines (rows): coins aligned draw a visible magnetic attraction effect — slight glow trail connecting them

**Zappers:**
- Main bar: `#ff3333` with 6px red glow
- End orbs: `#ffff44` with 4px yellow glow, slightly larger than current
- Electricity zigzag: between orbs, draw 3 overlapping zigzag paths in `#ffffff` (bright) and `rgba(255,255,180,0.6)` (softer), positions shift slightly each frame for flicker
- Rotation: zappers that rotate should cast a sweeping red glow trail

**Missiles:**
- Body: elongated triangle `#cc2211`, slightly tapered
- Warhead tip: bright `#ff4422`
- Fins: small delta shapes `#882200`
- Exhaust trail: 5 particles per frame in `#ff7722` → `#ffbb44` → transparent, life 0.3s
- Warning indicator: dashed red arrow `#ff3333` on right edge of screen before missile enters, pulsing
- On lock-on: red flashing circle around player position, "INCOMING" text flickers

**Laser:**
- Pre-fire warning: full-width semi-transparent red band `rgba(255,30,30,0.2)` appears 0.8s before laser fires, slowly brightening
- Active beam: bright core `#ffaaaa` 2px center, outer glow `#ff2222` 8px wide, total visual width ~16px with falloff
- Scanning effect: beam moves slowly up or down during sweep
- Beam endpoint hits ceiling/floor with a bright flare circle

**Thrust particles:**
- 8 particles per frame from jetpack nozzle
- Colors cycle: `#ffff00` → `#ff8800` → `#ff4400` → transparent
- Sizes: 4px → 1px over life
- Slight random spread ±15 degrees from straight up

### Particle & Effect System

- **Coin collect:** 4 gold sparks + floating "+1" text, life 0.4s
- **Coin magnet (upgrades):** coins arc toward player with trailing gold streaks
- **Thrust flame:** 8 particles/frame, orange-yellow gradient, upward + spread
- **Landing dust:** 4 grey-white puffs `rgba(200,220,240,0.4)` on floor contact
- **Zapper death:** 16 teal-blue electric arc particles + screen flash + camera shake 4px
- **Missile death:** Large explosion — 12 orange shards + 8 smoke particles `rgba(80,80,80,0.6)` + screen flash
- **Laser death:** Full-screen red flash `rgba(255,0,0,0.4)` fading over 0.5s + burn particles
- **Near-miss coin:** Coin glow brightens when player passes close but misses
- **Distance milestone:** White text flash center-screen "500m!" etc., in teal with glow

### UI Polish

- Distance counter: Top-left, large teal numerals `#44ccee` with glow, "m" suffix in smaller `#226688`
- Coin counter: Top-right, gold `#ffdd00` with coin icon, count rolls up on collection
- Speed indicator: Subtle horizontal bar below distance counter
- Game over: Dark overlay, "BUSTED" or "FRIED" or "OBLITERATED" depending on death type (zapper/missile/laser), in appropriate hazard color, with large glow
- Achievement pop: Small toast notification bottom-right, slides in, player color accent

## Sound Design Plan

*(Web Audio API only)*

### Sound Events & Synthesis

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Jetpack thrust | White noise, bandpass | center 1200Hz, Q 2, gain 0.2 | Looped while thrusting | Whooshing jets |
| Jetpack off | Noise fade | Same, gain 0.2 → 0 over 0.3s | 0.3s | Engine wind-down |
| Coin collect | Triangle ping | 880Hz, gain 0.35 | 0.08s | Satisfying ding |
| Coin collect (streak) | Pitch increment | Start 880Hz, +50Hz each coin in row, max 1600Hz | 0.08s each | Ascending streak |
| Zapper electricity | White noise + resonant | center 3000Hz, Q 5, gain 0.3 | Looped near zapper | Crackling buzz |
| Missile warning | Repeating blip | 880Hz square, 4 blips at 0.15s intervals, gain 0.5 | 0.6s | Urgent alarm |
| Missile launch | Whoosh | White noise, lowpass sweep 200→3000Hz, gain 0.6 | 0.5s | Rocket sound |
| Laser warning | Rising whine | 200Hz → 1200Hz sine, gain 0.4 | 0.8s | Pre-fire charge |
| Laser active | Sustained buzz | 1500Hz sawtooth, gain 0.3 | While laser active | Beam hum |
| Zapper death | Electric crack | White noise burst 0.3s + 440Hz spike | 0.5s | Electrocution |
| Missile death | Explosion | White noise, lowpass 500Hz, gain 0.9 | 0.7s | Boom |
| Laser death | Sizzle | White noise, lowpass 200Hz decay, gain 0.8 | 0.6s | Fry sound |
| Distance milestone | Chime | 660Hz triangle, gain 0.4 | 0.2s | Achievement ping |
| Game start | Power up | 100Hz → 400Hz sine over 0.5s, gain 0.4 | 0.5s | Startup sting |

### Music/Ambience

Driving synth-rock inspired loop matching the endless runner energy:
- Drum pattern: kick (white noise lowpass 150Hz, gain 0.5) on beats 1 and 3; snare (white noise bandpass 400Hz, gain 0.4) on beats 2 and 4; hi-hat (white noise highpass 6000Hz, gain 0.12) every 1/8 note — tempo 140BPM
- Bass: Sawtooth 110Hz (A2), playing quarter note groove, gain 0.2, slight detune (110Hz + 111Hz for thickness)
- Lead synth: Sawtooth 440Hz with fast attack, short decay (0.2s), 4-bar melody loop, gain 0.12
- Pad: Triangle wave cluster for sustained chords underneath, very low gain 0.05
- As distance increases (past 1000m), add a second lead harmony at 3rd above (+major 3rd)
- Past 3000m: bass gain rises to 0.3, drum gain rises, creating escalating intensity

## Implementation Priority

- High: Jetpack flame particles, coin spin + collect sparks, missile warning + explosion, zapper electricity flicker, laser pre-fire warning bar + beam glow, all core sounds
- Medium: Three-layer parallax background, coin magnetic arc effect, mid-layer wall panel scrolling, zapper rotation glow trail, drum+bass ambient loop
- Low: Vent detail decorations, ceiling thud effect, distance milestone text flash, laser death full-screen flash, coin streak pitch-increment sound
