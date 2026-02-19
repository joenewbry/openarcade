# OutRun — Visual & Sound Design

## Current Aesthetic

500x400 canvas with a full pseudo-3D road renderer (6000 segments). Pre-computed sky gradient bands descending from dark purple (`#0a0020`) through warm tones to orange at the horizon. A large red sun (`#ff4060`) with horizontal dark stripe cutouts. Road with alternating green/dark-green grass strips and gray/dark-gray road segments. Scenery objects: palm trees, bushes, signs, rocks placed at varying distances. Traffic cars in bright colors. Player car rendered as a filled trapezoid polygon in pink-white (`#f4e`) with red rear lights and a pink glow. Speed/timer HUD at top. Checkpoint flash in pink/magenta. Strong arcade aesthetic with genuine visual appeal.

## Aesthetic Assessment

**Score: 3.5/5**

The OutRun visual foundation is genuinely strong — the sun, sky gradient, and pseudo-3D perspective give immediate visual identity. The pre-computed gradient bands for the sky are clever. The player car trapezoid with glow reads well at speed. However the scenery objects are minimal (no trunks on palms, signs are blank rectangles), the road surface lacks any texture or detail, the traffic cars are very simple colored rectangles, and the UI is thin. The game deserves to feel as iconic as the arcade original.

## Visual Redesign Plan

### Background & Environment

Push the aesthetic toward a cinematic Mediterranean summer drive — late afternoon golden hour, vivid colors, dreamlike scenery. Lean harder into the OutRun mythology of style, speed, and the open road.

**Sky redesign:** The pre-computed gradient bands stay but refine the palette. The sky spans from deep warm indigo at the very top (`#150020`) to rich violet-purple mid-sky (`#3a0050`) to dusty rose (`#8a2060`) near the horizon, finally bleeding into warm amber-orange at the horizon line (`#dd8840`). This is a more saturated, confident palette than the current muted version.

**Sun redesign:** The sun gets a dramatic upgrade:
- Primary sun disc: large perfect circle (`#ff8c00`) — warm amber rather than the current pink-red. Radius ~35px.
- Inner bright core: `#ffdd88`, radius ~22px, centered
- Horizontal stripe cutouts remain (these are iconic) but use the sky gradient color behind them — `#6a1a50` in upper sun, `#aa4428` in lower sun — giving the stripes proper depth
- Sun glow: `setGlow('#ff8c00', 1.0)` with a very wide spread — a halo effect. Draw 3 concentric translucent circles around the sun (radius 50, 70, 90 at 0.08, 0.05, 0.02 opacity) in warm amber
- Lens flare: a small diamond shape (`#ffffff`, 4px, fillPoly 4-point star) and two tiny horizontal line glints crossing the sun — suggests optical magic

**Ocean/water (new scenery element):** On straight road sections where horizon is fully visible, draw a thin ocean strip at the horizon line — a narrow band (8px) in deep blue-teal (`#1a6a8a`) with white sparkle dots (3-4 tiny white pixels that twinkle). This grounds the Mediterranean setting.

**Road surface:** Major upgrade. The current gray/dark-gray alternation stays for the distance-marker effect, but add within each road segment:
- A center dividing line: white dashes (`#ffffff`, 4px wide, perspective-scaled) running down the road center
- Shoulder lines: white solid edge lines (2px) along both road edges
- Road surface texture: very subtle noise — 5-6 nearly-invisible tiny speckles (`#1a1a1a`, 1px) per segment in random positions, suggesting tarmac grain
- Road shine: in the near-player segments, a very faint highlight strip (2px, `#ffffff08`) runs horizontally — wet road sheen

**Grass strips:** The alternating green/dark-green becomes more vivid. Bright summer grass: `#44cc22` (primary) and `#338811` (secondary). Add occasional wildflower dots: tiny 2px circles in `#ffdd44` (yellow) and `#ff4488` (pink) scattered across the grass strips — summer roadside flowers.

**Scenery objects redesign:**

*Palm trees:* Complete redesign. Currently just a colored blob.
- Trunk: A tapered vertical rectangle (wider at base, narrower at top) in sandy brown (`#a06020`). Draw using fillPoly with 4 points.
- Crown: 4-6 palm frond shapes — thin curved lines (drawn as very thin fillPoly triangles) radiating from the trunk top in lush dark green (`#226611`), bright green (`#44aa22`), with slight variation per frond
- Coconuts: 2-3 tiny circles (`#553322`) clustered at the frond base
- Trunk shadow: a thin dark angled shape on the ground beneath

*Billboards:* Instead of blank colored rectangles, draw proper vintage billboard graphics:
- Frame: thick outer border in aged white/cream (`#ddcc99`)
- Sign face: colored background with simple pixel-art style text or pattern (approximate with small rect clusters spelling "OUTRUN" or showing a checkered flag motif)
- Post structure: two vertical rectangles below the sign face

*Cacti/rocks:* Rocks get a proper stone silhouette — irregular polygon (5-6 point fillPoly) in dark gray with a lighter upper-left edge. Cacti get a proper saguaro shape: vertical rectangle body with two arm branches (smaller rectangles jutting out then up).

### Color Palette
- Sky top: `#150020`
- Sky mid: `#3a0050`
- Sky rose: `#8a2060`
- Sky horizon: `#dd8840`
- Sun: `#ff8c00` (amber) core `#ffdd88`
- Sun glow: `#ff8c00` at 1.0
- Ocean strip: `#1a6a8a`
- Road primary: `#444444`
- Road alternate: `#333333`
- Road line: `#ffffff`
- Grass primary: `#44cc22`
- Grass alternate: `#338811`
- Wildflower yellow: `#ffdd44`
- Wildflower pink: `#ff4488`
- Palm trunk: `#a06020`
- Palm frond: `#226611`, `#44aa22`
- Player car body: `#ffddee` (warm white-pink)
- Player car trim: `#ff3366` (bright red-pink)
- Traffic car: varied — `#ff4444`, `#4488ff`, `#44ff88`, `#ffdd00`
- Speed gauge safe: `#44ff88`
- Speed gauge danger: `#ff3333`
- Checkpoint flash: `#ff44aa`
- Glow/bloom: `#ff8c00`, `#ff44aa`, `#44ff88`

### Entity Redesigns

**Player car:** Major upgrade from the current trapezoid.
- **Body shape** (still fillPoly perspective trapezoid): split into multiple pieces:
  - Main body: the trapezoid, but in a warm cream-white (`#ffddee`) — Ferrari Testarossa inspired
  - Side-stripe detail: a thin horizontal color stripe (the bright pink `#ff3366`) running along the side of the car body — a second, thinner fillPoly
  - Hood: a slightly smaller trapezoid at the front, subtly darker than the body
  - Windshield: a dark translucent trapezoid at the top-front — `#001a33` at 0.7 opacity
  - Rear spoiler: a small horizontal rectangle at the very back of the car
- **Wheels:** Four small dark circles visible at the car corners, slightly rotating (just spin animation, not accurate physics)
- **Headlights** (front): Two small bright-white ellipses at the front corners of the car
- **Rear lights:** Current two red rects upgrade to proper oval tail-light shapes in bright red (`#ff2200`) with strong glow `#ff0000`
- **Exhaust flame:** At high RPM/acceleration, a brief 3-4 frame orange particle burst from the rear — 2-3 orange/yellow 1px circles jetting backward

**Traffic cars:** Each traffic car now has distinct detail:
- Body rectangle remains but add: a windshield dark strip across the top-front, two tiny round headlights (white circles) at the front, and a color-specific detail stripe
- Car color variety: 5 preset car "designs" using different colors and stripe combinations
- Near-miss flash: when the player passes very close to a traffic car, both cars briefly have white outline flash (1 frame)

**Speed gauge HUD:** Replace the current bar with a proper analog tachometer style:
- Semicircular gauge drawn as 12 filled rect segments arranged in an arc (use fillPoly to approximate)
- Segments fill from left to right: green (slow) → yellow (fast) → red (maximum)
- A speed needle: a thin line from arc center to the appropriate segment, rotating
- MPH/KMH numeric readout below the arc in large amber digits
- A separate gear indicator (1-5) in the top-right of the HUD panel

**Timer HUD:** Styled as a digital readout with countdown urgency:
- Normal: amber digits (`#ffaa44`) in a HUD strip
- Under 15 seconds: digits turn yellow, flash at 1Hz
- Under 5 seconds: digits turn red (`#ff2222`), flash rapidly (4Hz)
- Checkpoint extension: when time is added at a checkpoint, a brief `+Ns` text in bright green floats up from the timer, fading over 30 frames

### Particle & Effect System

**Car exhaust trail:** At all speeds, 2-3 tiny dark smoke particles (`#111111`, 1-2px, 0.3 opacity) spawn from the rear of the car each frame and drift backward (away from the car in perspective), fading over 20 frames. At high speed they're swept away quickly.

**Crash / off-road:** When the player veers onto the grass or hits a car:
- 8-12 orange/white sparks radiate from the contact point
- The car briefly skids — a tire squeal particle effect (4 thin horizontal white lines, `#ffffff40`, appearing at the rear tires and fading)
- Screen shake: the camera jitters ±3px for 8 frames

**Checkpoint crossing:** The current pink flash gets enhanced:
- Pink/magenta screen flash (`#ff44aa20` overlay, 5 frames)
- Checkered flag pattern: a brief pair of waving flag silhouettes on either side of the road at the checkpoint line (simple black/white rectangle checkerboard pattern using small fillRects, drawn for 20 frames then removed)
- Gold particles: 12 gold sparks burst from the checkpoint center

**High speed wind effect:** At maximum speed, 4-6 horizontal speed streak lines appear at the sides of the screen (`#ffffff12`, 20-30px long, varying Y positions), blinking rapidly at 3Hz — suggesting the blur of speed.

**Passing scenery blur:** Objects at speed in the near-ground segment (already rendered with perspective) get a very subtle vertical smear when going fast — draw 2 ghost copies of the near scenery objects at 1px offset and 15% opacity. This suggests motion blur on foreground objects.

**Sun lens flare (responsive):** The lens flare elements move slightly as the car steers — at maximum right steering, flare elements shift left, as if the light source is shifting in the windshield view. Subtle but adds to the cinematic feel.

### UI Polish

- **Top HUD bar:** Redesigned as a proper dashboard strip — dark background (`#0a0810`), amber/gold text, clean separation between speed gauge, time, and gear. Score shown as distance traveled in km.
- **Game start title sequence:** "OUTRUN" in large chrome-style text (white with black offset shadow) zooms from large to proper size over 20 frames. A revving engine sound. Then the camera pulls back to reveal the car on the starting line.
- **Stage complete (checkpoint reached):** Large green "EXTEND!" text appears with a burst of green particles. The bonus time added is shown as a large number.
- **Game over:** The car coasts to a stop (speed decreasing animation). "GAME OVER" in red with a fade-in overlay. Final distance shown as the primary metric.
- **Best time indicator:** A small golden crown icon appears next to the timer if the player is beating their best time — simple but motivating.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Engine idle | Low rumble | 60Hz sine + 120Hz harmonic, slight wobble 0.5Hz | Loop | Deep idling sports car. |
| Engine rev up | Rising rumble | 60→220Hz pitch rise with speed | Loop | RPM rises proportionally to speed. |
| Engine redline | High roar | 220Hz + 330Hz saw + 440Hz harmonic | Loop | Full-throttle car roar at max. |
| Gear shift | Click + brief RPM drop | 30ms white noise click + engine pitch dips then rises | 300ms | Manual transmission feel. |
| Tire squeal | High-pitched noise | Highpass noise 1500Hz+ at 0.04 | 400ms | Cornering at speed. |
| Traffic car pass | Whoosh | 600→100Hz sine sweep (Doppler) | 250ms | Opponent car passing. |
| Crash / off-road | Crunch + gravel | Low noise 200Hz + gravel noise burst | 600ms | Impact and gravel scatter. |
| Checkpoint | Bell + fanfare | 880Hz sine 300ms + ascending 3-note jingle | 500ms | Triumphant extension. |
| Time running low | Rapid beeps | 440Hz, 100ms each, every 0.5s | Per beep | Urgency countdown. |
| Game over | Engine stall | 200→40Hz descending, stops abruptly | 1200ms | Car dying sound. |
| Wind at speed | Air roar | Highpass noise 3000Hz+, volume scales with speed | Loop | Speed wind sound. |
| Passing tree (if sfx) | Very subtle whoosh | 200Hz sine, 60ms | 60ms | Environmental detail. Optional. |

### Music/Ambience

The OutRun sound design centers on the engine drone symphony. Three OscillatorNodes create the engine:
1. **Fundamental**: Starts at 55Hz (idle), scales to 220Hz at max speed — the primary engine tone
2. **Second harmonic**: Exactly 2x the fundamental, at 60% volume — smooth even harmonic
3. **Third harmonic (grit)**: Exactly 3x the fundamental, at 25% volume, slight detuning ±2Hz — gives the saw-wave character of a high-performance engine

These three together create a convincing engine sound purely from oscillators, no noise involved. Above this, a wind layer (highpass noise, volume scales with speed squared). A separate BiquadFilterNode (lowpass) on the engine cluster gives the sound the muffled-then-open quality of the wind changing the perceived sound.

For ambience beneath the engine: a very quiet (0.008 volume) pad chord — three detuned OscillatorNodes at 110Hz, 165Hz, 220Hz (A-E-A minor feel) — the dreamy musical undertone of the drive. This is barely audible under the engine but adds emotional warmth during quieter engine moments (coasting downhill). At checkpoints the pad briefly swells (doubles in volume for 2 seconds) as a musical reward. This combination — engine physics sound + dream-pad undertone — captures the original OutRun atmosphere: speed, summer, and wistful longing.

## Implementation Priority
- High: Sun redesign (amber color + horizontal stripes with sky color behind + halo glow), player car multi-part body (body + windshield + stripe + tail lights), road center-line dashes + edge lines, grass wildflower dots
- Medium: Palm tree redesign (trunk + individual fronds), traffic car windshield + headlight detail, crash spark particles + screen shake, checkpoint checkered flag + particle burst
- Low: Billboard text/pattern detail, ocean horizon strip, exhaust flame at acceleration, near-miss white flash, lens flare movement with steering, speed streak lines at max speed
