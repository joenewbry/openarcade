# Micro Machines — Visual & Sound Design

## Current Aesthetic

A 600x500 canvas with top-down racing across 3 household tracks: Kitchen Table (`#8B6F47` - wood surface), Study Desk (`#5a4a3a` - darker wood), Bathroom Counter (`#607080` - grey tile). Cars are colored rectangles: Red=`#ff3333`, Blue=`#33ccff`, Green=`#33ff33`, Yellow=`#ffff33`. Items: boost=`#00ff00`, oil=`#884400`, missile=`#ff0000`, shield=`#0088ff`. Obstacles (books, cups, pens, erasers) are drawn with some detail. 3 laps to win, 4 AI opponents, minimap. Tire smoke particles exist. The aesthetic captures the playful household scale but the cars are plain colored rectangles with no real car character. The tracks lack the charm and visual richness they deserve.

## Aesthetic Assessment

**Score: 3/5**

The household-surface tracks are a genuinely clever concept and the basic visual language (surface color, obstacles) works. The main weaknesses are car designs (featureless rectangles), track detail (surface textures are flat single colors), and item effects (no visual feedback that communicates the game-feel). The small scale of these household racers should be celebrated with extreme attention to detail.

## Visual Redesign Plan

### Background & Environment

Each track surface should be rich with detail that makes it feel like you're truly racing on that household surface:

**Kitchen Table**: Wood grain — draw horizontal grain lines across the surface at `#7a5a38` (slightly darker than base `#8B6F47`), spacing 3–6px apart, gently curved. Table has an edge lip visible at the track boundary: slightly raised border `#6a5030`. Coffee ring stain marks (faint circle outlines `#6a4a28`) placed randomly at track edges.

**Study Desk**: Darker wood with visible pencil scratch marks (faint diagonal lines `#4a3a2a`) and eraser rubber smears (slightly lighter `#6a5a4a` irregular patches). A ruler visible along one edge.

**Bathroom Counter**: Tile grid! Draw a 16x16 pixel tile grid with grout lines (1px `#505a68` on base `#607080`). Wet puddle effects in some areas (circular patches slightly darker and shinier `#557090`). Soap dish in corner.

Each track should have off-track areas visible at edges: kitchen tablecloth (diagonal stripe pattern `#cc3333`/`#ffffff`), desk's floor visible below (dark `#303030`), bathroom's sink edge visible.

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Car 1 (player) | Racing red | `#ff2222` |
| Car 1 body detail | Red chrome | `#cc0000` |
| Car 2 | Turquoise blue | `#22ccff` |
| Car 3 | Lime sprint | `#22ff44` |
| Car 4 | Solar yellow | `#ffee22` |
| Car 5 (AI) | Purple racer | `#cc44ff` |
| Car windows | Dark tint | `#1a2a3a` |
| Car headlights | Bright white | `#ffffff` |
| Boost pickup | Electric green | `#00ff66` |
| Oil slick | Black puddle | `#110a00` |
| Missile pickup | Hot red | `#ff3300` |
| Shield pickup | Force blue | `#0066ff` |
| Kitchen table | Warm oak | `#8B6F47` |
| Kitchen grain | Dark grain | `#7a5a38` |
| Desk surface | Scholar brown | `#5a4a3a` |
| Bathroom tile | Cool grey | `#607080` |
| Grout line | Dark grout | `#505a68` |
| Tire smoke | White puff | `#e0e0e0` |
| Boost trail | Cyan afterburn | `#00ffcc` |
| Missile smoke | Dark trail | `#443322` |
| Shield glow | Blue aura | `#0066ff` |
| Glow/bloom | Boost green | `#00ff66` |

### Entity Redesigns

**Cars** — Transform from colored rectangles to recognizable toy cars. Render each car as:
1. Body: rounded rectangle (the car body) in team color — fill with small 1px lighter highlight strip along the top of the roof (the car's painted roof)
2. Windscreen: dark tinted rectangle `#1a2a3a` across the front 1/3 of the car (roof-line perspective)
3. Rear window: smaller dark rect at the back
4. Wheels: 4 small dark circle `#222222` at the corners, each with a 1px lighter hub `#888888` center
5. Headlights: 2 tiny white `#ffffff` pixel dots at front
6. Taillights: 2 tiny red `#ff2222` pixel dots at rear

The car rotates based on direction — use `strokePoly` with the car's shape polygon. The minicar scale means all detail is at 1–2 pixel level but it reads immediately.

**Boost Pickup** — Glowing lightning bolt shape (chevron polygon) in `#00ff66` with `setGlow('#00ff66', 1.5)`. Animates with a rotation or pulse.

**Oil Slick** — Dark glossy oval `#110a00` with a rainbow sheen drawn as 3 thin curved strips of `#ff0000`→`#00ff00`→`#0000ff` at 20% alpha across the oval. Iridescent oil look.

**Missile** — Projectile: small red arrowhead. Trail: 4 fading smoke dots `#443322`. On target: collision flash.

**Shield** — Circular blue aura around the car `#0066ff` at 40% alpha, pulsing slowly. `setGlow('#0066ff', 0.8)`.

**Obstacles**:
- Books: neat rectangle stacks with colored spines (2–3 colored strips representing different books)
- Cups: filled circle (liquid inside) with cup rim ellipse on top, handle indicated by a small curved line
- Pencils: long thin hexagon (yellow body, pink eraser end, dark point)
- Erasers: pink rounded rectangle

### Particle & Effect System

- **Tire smoke**: When drifting/turning hard, 3–4 light grey puffs `#d0d0d0` per frame from rear wheels. Puffs grow in radius and fade over 0.6s. When spinning out on oil, heavy white smoke.
- **Boost activation**: Bright cyan afterburn trail from exhaust — 6 elongated sparks `#00ffcc` per frame pointing backward, fading over 0.3s. Brief glow flash around car.
- **Oil slick slide**: Car leaves faint tire tracks on the oil slick surface. Smoke changes to grey-green `#888870`.
- **Missile hit**: 10 orange/red particles `#ff4400`, `#ff8800` radiate from impact. Victim car flashes white 3 frames.
- **Lap complete**: 5 star particles `#ffee22` from car position.
- **Race won**: Checkered flag confetti (8 small square particles alternating black/white) fall from top.
- **Pickup collect**: Item's glow color flashes around car briefly + 4 particle sparks in item color.
- **Car vs car collision**: Slight screen shake 1px, 2 frames. Both cars emit 2 spark particles `#ffcc44`.
- **Skid marks**: Thin dark lines `#443322` left on the surface where hard braking occurs. Persist for 5s, fade.

### UI Polish

Race HUD styled as a race game dashboard:
- **Position indicator**: Top left, large bold "P1" / "P3" text in player's car color. Font: tall and narrow (racing style).
- **Lap counter**: "LAP 2/3" top center. Track progress bar below it (thin horizontal bar with car-icon markers showing all racers' positions).
- **Speed indicator**: Analog-style speedometer gauge. Small arc, needle rotating, fill color shifts from green→yellow→red with speed.
- **Item slot**: shows current item icon in a styled box.
- **Minimap**: clean overhead view, all car dots with their team colors. Current lap segment highlighted.

Between race screen: large "RACE START" with 3-2-1 countdown rendered as large styled digits that zoom in and fade.

## Sound Design Plan

*(Web Audio API only)*

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Engine idle | Low hum | Sine 80 Hz with slight tremolo | loop | Idle engine drone |
| Engine revving | Rising hum | Sine 80→300 Hz with speed | loop | Pitch scales with speed |
| Tire squeal (turning) | Screech | Sine 800→600 Hz, filtered | 0.3s | When drifting |
- Tire on oil squeal | Longer screech | Sine 600 Hz sustained | 0.8s | Sliding out of control |
| Boost activate | Whoosh + engine rev | Noise HPF + engine pitch spike | 0.4s | Speed burst sensation |
| Oil slick hit | Slippery swoosh | Noise LPF 400 Hz, smooth | 0.5s | Liquid skid |
| Missile fire | Whoosh | Noise HPF 600 Hz | 0.2s | Small missile sound |
| Missile explosion | Small boom | Sine 150 Hz + noise | 0.4s | Toy-scale explosion |
| Shield activate | Electric hum | Sine 440 Hz + harmonics | 0.3s | Force field up |
| Shield hit | Zap | Sine 800 Hz glitch burst | 0.15s | Deflection sound |
| Car collision | Crunch | White noise + low sine 100 Hz | 0.2s | Toy car crash |
| Pickup collect | Chime | Sine 880 Hz, short | 0.15s | Quick reward |
| Lap complete | Bell | Sine 523+659+784 Hz | 0.4s | C-E-G chord |
| Race win | Fanfare | 6-note ascending | 0.8s | Victory jingle |
| Countdown 3-2-1 | Deep beeps | Sine 440 Hz (x3) + 880 Hz (GO) | 0.3s each | Race start sequence |
| Off-track | Rumble | Low noise 50–150 Hz | loop | Off-surface roughness |

### Music/Ambience

An energetic, fun racing theme appropriate for toy cars. Generate using Web Audio:
- Rhythm: fast 4/4 at 175 BPM using square wave percussion (kick=short sine 60 Hz, hi-hat=short noise 4000 Hz)
- Bass: sawtooth at 55 Hz following a simple walking bass pattern
- Lead melody: square oscillator with slight vibrato, playing an upbeat major-key melody (think classic racing game arcade music — bright, cheerful, fast)
- Counter-melody: triangle oscillator, harmonizing a third above on alternate bars

The energy should feel like a miniature Grand Prix — exciting and fun, not aggressive. Between laps, the music does not stop. After winning, a brief 4-bar victory fanfare plays over the fading track music.

## Implementation Priority

**High**
- Car detail render (windscreen, wheels, headlights, taillights)
- Wood grain lines on kitchen/desk tracks
- Tile grid on bathroom track
- Engine pitch-scales-with-speed audio loop
- Tire squeal on hard turning
- Tire smoke particles (scale with drift amount)
- Boost afterburn trail + activate whoosh

**Medium**
- Oil slick rainbow iridescence (colored strips at low alpha)
- Skid mark persistence on track surface
- Pickup visual redesign (lightning bolt, oil puddle, etc.)
- Car collision crunch sound + spark particles
- Shield aura glow around car
- Lap complete bell chord
- Race start 3-2-1 countdown sound + visual

**Low**
- Obstacle detail improvements (books with colored spines, pencil hex shape)
- Off-track border details (tablecloth pattern, floor visible)
- Checkered flag confetti on race win
- Race position speedometer gauge in HUD
- Full energetic chip-tune music loop
- Rainwater/coffee ring cosmetic surface details
