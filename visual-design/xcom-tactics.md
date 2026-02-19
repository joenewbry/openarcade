# XCOM Tactics — Visual & Sound Design

## Current Aesthetic

A 12x12 tactical grid on a 600x500 canvas. Grid lines in dark navy (`#16213e`). Full cover is represented by grey brick-textured rectangles (`#3a3a50`). Half cover uses brown crate shapes (`#4a4030`). Player soldiers are small blue rectangles+circle heads with grey guns. Aliens are red rectangles+circle heads with yellow eyes. Shoot animations are colored line traces. Grenade explosions are expanding polygon circles. The bottom panel shows combat log and soldier info.

## Aesthetic Assessment
**Score: 2/5**

Functional but brutally spartan. The grid lines barely distinguish cells. Cover objects look like placeholder geometry. Soldiers are barely legible at 34x34 cell size. The atmosphere is zero — this could be any abstract grid game. XCOM is a mood: dread, darkness, tactical tension. None of that is present.

## Visual Redesign Plan

### Background & Environment

The battlefield should feel like a **damaged urban warzone at night**, seen from above. The base grid background changes from uniform navy to a dark asphalt/rubble texture effect: alternating cells get very subtle brightness variation (a few cells get a barely-visible lighter fill `#0f1525` vs `#0d1220`), breaking up visual monotony.

Draw a **fog-of-war vignette** as a very dark overlay around the grid edges — a semi-transparent border that thickens toward the canvas edge (multiple overlapping dark rects at decreasing sizes). This focuses attention on the action.

Add **environmental details within empty cells:** scattered rubble marks — tiny irregular polygon fragments (2–4 point polygons in grey-brown at low alpha) placed pseudo-randomly in cells that have no cover. About 10% of empty cells get subtle debris markers. These are purely decorative.

**Sky/ambient light:** Draw a very subtle blue-purple directional gradient across the grid — the left side slightly cooler (`#0a0e1a`) vs right side slightly warmer (`#0e0d16`). This creates a moonlight-from-left ambience.

**Destroyed cover:** When a grenade destroys cover, the cell should flash white briefly, then show a debris marker (scattered rubble polygon) instead of being completely empty. This is a draw-side enhancement: track destroyed cover cells and draw rubble.

### Color Palette
- Primary (player blue): `#3388ff`
- Primary (alien red): `#ff3322`
- Grid background: `#0d1220`, `#0f1525`
- Full cover: `#3a3a52`, `#2a2a3e`
- Half cover: `#4a3a20`, `#3c2e16`
- Glow/bloom player: `#4499ff`
- Glow/bloom alien: `#ff4433`
- Shoot tracer: `#ffee22` (hit), `#888888` (miss)
- Explosion: `#ff8800`, `#ffcc00`

### Entity Redesigns

**Player soldiers (per cell, 34x34):** Entirely redesign as top-down tactical figures:
- Body: a proper soldier silhouette — an octagonal "body plate" fill in dark navy-blue `#1a3355`, with a lighter blue circle head. Helmet visor: bright blue slit (`#66aaff`).
- Facing: draw a small arrow/chevron shape pointing in the direction of the nearest enemy (or upward by default). This adds tactical readability.
- Weapon: a small rectangle protruding from one side in grey, suggesting a rifle.
- Selection ring: when selected, an animated pulsing dotted circle (stroke with dash pattern approximated as 12 short arcs) in bright white.
- Status badges: overwatch draws a small eye-icon (oval with dot center) in green at top-right of cell. Hunkered draws a small down-arrow in blue.
- When dimmed (moved+acted): the body fill drops to 40% alpha.

**Alien enemies:** More alien — the oval head grows to 8px radius. Yellow eyes become glowing (setGlow active on eyes). The body rect is elongated vertically to suggest a taller, thinner alien silhouette. Skin color: `#7a1a2a` (deep blood-red). Add 4 "limb dots" — tiny circles at each body corner suggesting appendages. Mutons (if visible) get a larger body + spines (short radiating lines at shoulders).

**Cover objects:**

*Full cover (walls):* Replace plain grey rectangles with war-torn wall sections. A darkish base fill (`#2a2a3a`). Add: bullet impact craters (tiny bright spots at random positions within the wall cell, drawn as small filled circles in `#555565`). Cracked concrete pattern: 2–3 short jagged line segments crossing the wall. A faint rubble shadow below the wall base.

*Half cover (crates):* More detailed crate — outer box with rim highlight (lighter fill on top edge). A stencil marking: "AMMO" or similar rendered as a simple crossed-box icon. Corner reinforcement dots. Dark wood grain lines crossing the crate body.

**Crosshair targeting reticle:** When a target is highlighted, replace the current circle+cross lines with a more military-style reticle: a cross with corner brackets (L-shapes at the four quadrant corners), a center dot, and a small hit-percentage arc drawn around the perimeter of the circle. The arc fill length corresponds to hit chance (already shown as text, complement with visual arc indicator).

### Particle & Effect System

**Shoot tracer — hit:** The current line animates over 20 frames — add a secondary muzzle-flash effect: a 4-point burst (diamond polygon) at the firing soldier's position, lasting 4 frames in the tracer color. At the impact point: a brief white spark (4 tiny particles scatter).

**Shoot tracer — miss:** Tracer line in grey. At the "near miss" endpoint, show a small debris kick: 2 particles of grey-brown drift.

**Grenade explosion:** Already has expanding circles — enhance with:
1. Initial bright white flash: solid circle that appears for 2 frames then transitions to orange
2. Concentric ring sequence: 3 rings each at staggered delays, expanding and fading (inner fast, outer slow)
3. Debris ejecta: 10 particles in grey/brown scatter from explosion center
4. Scorch mark: after explosion fades, draw a permanent dark ellipse at the explosion cell, plus darken that cell's fill slightly

**Overwatch trigger:** When a soldier fires on overwatch, add a dramatic "snap" effect: a quick bright flash at the watcher's position (white circle, 3 frames), then the tracer.

**Floating damage text:** Enhance rise speed and add a brief scale-up on appear: text renders slightly large for the first 5 frames then settles to normal size.

**Death:** When a soldier/alien dies (KIA floats): draw a brief impact star burst — 8 short lines radiating from the unit's position in its team's color, fading over 15 frames.

### UI Polish

**Grid cells:** Give cells a hex-panel feel — draw a subtle inner shadow: a slightly darker inset rect (1px inset on all sides) making each cell appear slightly recessed into the surface.

**Move range highlight:** Current blue fill at low alpha — add an additional border ring on each reachable cell (a slightly brighter blue stroke rect inset by 2px from the move range color fill). This creates a "lit path" appearance.

**Shoot indicators:** Keep current color-coded (green/amber/red) borders + crosshair circle. Add: a small animated target "lock" — the crosshair corner brackets slowly animate inward (converge 2px toward center over 30 frames, then reset) to indicate targeting lock.

**Bottom panel:** Replace the plain flat panel with a tactical HUD aesthetic:
- Panel background: `#0a1220` with a CRT-scanline texture (alternating very faint 1px lines every 2px)
- Left log area: enclose in a border labeled "TACTICAL FEED" in green at top
- Right info area: enclose in a border labeled "UNIT STATUS"
- Log text colors: recent entry in `#44ff88`, older entries fade through `#336644`, `#223322`

**Turn indicator (DOM element):** Make the turn status pulse — when it's "YOUR MOVE", the element background cycles between `#001a00` and `#003300` over 2 seconds. During "ALIEN ACTIVITY...", it cycles between `#1a0000` and `#330000`.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Soldier selected | Short military click: square 800 Hz, 20ms | Gain 0→0.4→0 | 30ms | Tactical select pip |
| Soldier moves | Footstep sequence: 3x filtered noise burst, 200ms apart | Highpass 1500 Hz noise, gain 0.15 each | 600ms | Movement steps |
| Rifle shot (hit) | Sharp crack: sawtooth 400→200 Hz ramp 50ms + sub thud 80 Hz | Simultaneous, gain 0.7 / 0.5 | 200ms | Rifle crack + impact |
| Rifle shot (miss) | Same crack but lower gain, no sub thud | Sawtooth 400→200 Hz, gain 0.4 | 150ms | Softer miss shot |
| Overwatch fire | Same as rifle shot, preceded by 50ms quiet | Brief gap then shot | 250ms total | Reactive fire |
| Grenade throw | Whoosh: white noise through bandpass 400-1200 Hz, gain ramp | 300ms whoosh | 300ms | Arc trajectory |
| Grenade explosion | Sub-bass thud 50 Hz + broadband noise 0-3000 Hz + debris rattle | All simultaneous, gain 1.0 | 600ms | Massive explosion |
| Cover destroyed | Crumbling noise: broadband noise, slow fade | Noise 0→0.6→0 over 300ms | 400ms | Rubble collapse |
| Soldier KIA | Dramatic sting: descending minor 3rd | A4→F4, triangle wave, 200ms | 400ms | Unit lost sound |
| Alien KIA | Victory click + subtle alien death squeal: sine 2000→400 Hz | Brief rise then fall glide | 300ms | Enemy eliminated |
| Player turn start | Alert tone: sawtooth 440 Hz, short | 80ms, gain 0.5 | 100ms | "Your turn" notification |
| Alien turn start | Threatening low tone: sawtooth 110 Hz, longer | 200ms, gain 0.4 | 250ms | Alien activity alert |
| Mission complete | Triumphant fanfare: C-E-G-C arpeggio + final chord | 262→330→392→524 Hz, 80ms each + hold chord | 700ms | Victory |
| Squad wiped | Descending minor chord: Am progression | A3→F3→C3, 100ms each, triangle | 400ms | Defeat |

### Music/Ambience

Tense tactical ambience: a low drone created by two detuned oscillators (110 Hz + 112 Hz sine waves, gain 0.04 each) produce a slow beating (2 Hz beat frequency) — subliminal tension. A third oscillator at 55 Hz (one octave below) at gain 0.02 adds subsonic weight.

Every 30–60 seconds, a distant sound event: filtered noise burst through bandpass 300-600 Hz, very low gain (0.03), 2 seconds duration — suggests distant combat in the city. Random timing keeps it from being predictable.

During alien turn (aiThinking): add a slow, rising tension element — a sine oscillator at 200 Hz with gain LFO that ramps from 0 to 0.03 over 8 seconds then back to 0, suggesting alien threat assessment.

## Implementation Priority
- High: Player/alien soldier visual overhaul (proper silhouettes, facing chevrons, selection ring), cover object redesign (detailed walls/crates), bottom panel HUD aesthetics
- Medium: Battlefield background texture variation, shoot tracer muzzle flash + impact sparks, grenade explosion enhancement (white flash, scorch mark), move range visual upgrade
- Low: Environmental debris in empty cells, fog-of-war vignette, overwatch visual trigger, full audio system, alien turn tension music
