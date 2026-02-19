# Zombie Siege — Visual & Sound Design

## Current Aesthetic

A top-down co-op zombie defense game. Background: near-black (`#111118`) with a subtle green grid (`#44aa4407`). The base is a circle with a cross symbol and HP bar. Zombies are colored circles with red dot eyes. Player/ally are filled circles with gun line and class icon. Barricades are rotated rectangles. Turrets are small circles with gun barrel. Scrap drops are diamond shapes. Particles are circles. The overall look is clean but extremely bare — pure circles on a black field.

## Aesthetic Assessment
**Score: 1/5**

This is the most minimal visual treatment in the set. Everything is a circle or a rectangle on black. The green-on-black grid is practically invisible. The base looks like a health kit. Zombie types are only distinguished by color and size. The game has tremendous potential but is screaming for visual character.

## Visual Redesign Plan

### Background & Environment

**The siege setting:** The game takes place in a **post-apocalyptic town square**, seen from directly above. The background needs to suggest ruined urban environment without adding game-interfering detail.

**Ground layer:** Replace the pure black with dark cracked pavement: `#111118` base, but add a pavement tile grid — thin lines (`#1c1c24` at 0.4 alpha) forming large 60x60 tile squares. Crack lines within tiles: random-seeded thin dark lines slightly lighter than the tile, a few per tile. This creates texture without clutter.

**Street markings:** Draw faded street markings as very low-alpha rectangles (`#2a2a2a`): a central intersection cross pattern at the base, suggesting the base is set at a town crossroads. Yellowed lane dividers faintly visible radiating outward.

**Environmental decoration (outer ring):** Around the edges of the canvas (30px inset from borders), draw silhouetted destroyed building outlines — simple L-shaped and rectangular dark shapes slightly darker than the background, suggesting ruined walls. These are purely cosmetic clip zones.

**Blood stains:** After zombies die, leave a permanent dark red splatter mark at the death location — a polygon approximation of an irregular splat shape (8-point slightly irregular polygon) in `#330000` at 0.4 alpha. These accumulate over the game and visually show the history of combat. Limit to 40 max to avoid performance issues.

**Base glow:** The existing radial rings around the base are a good start. Extend them further and make the color more distinctive — shift from `#44aa44` to `#44ffaa` (brighter cyan-green) with the rings extending to BASE_RADIUS * 4. Also draw a slowly rotating hexagonal "force field" shape around the base — 6-sided polygon stroke at very low alpha, rotating ~0.5 degrees/frame.

### Color Palette
- Primary (player): `#4488ff` (electric blue)
- Primary (ally): `#ff8833` (warm orange)
- Base: `#44ffaa` (vivid mint-green)
- Background: `#0d0d14`, `#111118`
- Grid: `#1a1a22`
- Zombie normal: `#33aa33` (mid green)
- Zombie fast: `#88ff66` (bright lime)
- Zombie tank: `#116622` (dark forest)
- Zombie boss: `#cc2200` (crimson)
- Glow/bloom player: `#66aaff`
- Glow/bloom zombie: `#44ff44`, `#ff4422`
- Scrap: `#d4a020` (gold)
- Barricade: `#6a4020` (wood brown)

### Entity Redesigns

**Base:** The base deserves to be the visual anchor. Replace the simple circle+cross with a **fortified bunker** design:
- Outer ring: octagonal wall outline (8-sided polygon stroke, `#44ffaa`)
- Inner structure: the cross remains, but becomes more architectural — a thicker cross with beveled ends
- Corner fortifications: 4 small filled circles at the octagon's cardinal points, suggesting gun emplacements
- Roof detail: concentric hexagonal inset lines on the interior suggesting a fortified roof
- Damage states: at 75% HP, add a crack line across one side; at 50%, two cracks; at 25%, the entire structure darkens and embers particles (tiny orange dots rising) indicate structural fire

**Zombies — normal:** Move beyond "green circle with red dots." Give each zombie a **top-down undead silhouette:**
- Main body: an irregular octagon (not a perfect circle) suggesting a slouching undead form — slightly asymmetric polygon
- Arms: two short lines extending from the body sides at angles, suggesting outstretched grabbing hands
- Head: a circle at the "front" of the body (whichever direction faces the target) with red dot eyes
- Blood wound marks: 1–2 tiny dark red spots on the body
- Shamble animation: the body polygon rotates very slightly (±3 degrees) as the zombie walks, simulating a lurching gait

**Zombie fast:** Much smaller, distinctly different. Hunched low — elongated oval body. Both arms stretch forward as if sprinting. Brighter lime color `#88ff66`. Leaves brief motion blur trail: faint ghost outlines at previous positions.

**Zombie tank:** Large and imposing. Body size radius 10 → 14. Add shoulder "plates" — two semicircle shapes flanking the body. A visible wound/mouth: a ragged dark ellipse on the front face. Moves slowly with visible weight.

**Zombie boss:** The most threatening visually. Body radius 14. A pulsing dark aura — the glow is significant (0.8 already, increase range). Add 4 smaller "mini-zombie" satellites orbiting the boss at a set radius, trailing in small circles — creates a commanding presence. Boss should have a distinct shape: add a crown of thorns — 6 short spikes radiating upward from the head.

**Player:** Redesign from circle to a proper top-down soldier:
- Body: elongated oval suggesting body armor
- Class-specific details:
  - Soldier: body plate with angular shoulder pads; gun is longer
  - Medic: white cross on back armor; gun is shorter; healing aura faint green
  - Engineer: tool belt detail (small horizontal lines across mid-body); deployable turret has distinctive color

**Ally:** Same redesign principle, with orange color scheme. Distinguish ally clearly with an "ALLY" indicator arc (semi-circle stroke above).

**Barricades:** From plain rects to stacked sandbag visuals:
- The rotated rect stays as the base shape
- Overlay 3 rows of smaller ellipses (sandbag shapes) stacked inside the barricade rect
- Color: earthy brown-tan `#7a5a30` for sandbags, darker `#4a3018` for shadows between rows
- Damage states: at 50% HP cracks appear (drawLine cracks through the sandbags); at 25% HP the bags look torn (irregular dark patches)

**Turrets:** From "grey circle with gun line" to proper automated turret:
- Base: dark hexagonal plate (`#2a2a3a`)
- Rotating turret head: a rectangle (not a circle) in grey-blue `#4a4a66` that rotates
- Gun barrel: doubled — two parallel lines projecting forward
- Muzzle flash: brief bright circle when firing
- HP ring: the existing rect HP bar becomes a circular arc (already hinted in arcPoints helper)

**Scrap drops:** From diamond to a more visible collectible — a golden gear shape (8-point star approximation) with a bright core. Larger than current 4px. Blink animation on expiry is kept.

### Particle & Effect System

**Gunfire muzzle flash:** Already one particle per shot. Expand: on player fire, draw a 6-point burst (short line segments from barrel tip) that lasts 2 frames. Very bright, instant.

**Zombie death:** Currently 4 particles. Expand to:
1. 8 dark green/grey particles scatter outward (body chunks)
2. A blood splat polygon added permanently to the ground (as described above)
3. Boss death: 20 particles in crimson/dark-red, plus a shockwave ring (expanding circle stroke)

**Grenade explosion:** Currently 12 particles. Visualize arc:
- The grenade itself shows a visible arc path as it travels — draw a faint dotted line from throw origin to current position (the previous N positions drawn as small dots fading out)
- On explosion: bright white flash (filled circle, 3 frames) + 16 particles + expanding ring stroke + ground scorch (permanent dark ellipse)

**Heal effect:** Currently "cross lines + expanding arc." Make it more magical:
- A rising column of + symbols (small crosses at staggered heights) ascend from the healed entity
- The expanding arc becomes a hexagonal pulse (6-sided expanding polygon stroke)
- Green particles drift upward for 0.4s

**Bullet trails:** Extend current bullet design — add motion blur: draw the bullet at its previous 2 positions at decreasing alpha (0.3, 0.1).

**Between-wave countdown:** "WAVE X INCOMING" text already exists. Add: a countdown ring that fills around the center base. Each second a segment of a circle arc fills in, completing a full ring just as the wave launches.

### UI Polish

**HUD panel (DOM elements):** The HP/ammo/wave readouts should feel tactical. Style with:
- Monospace-font aesthetic
- Color-coded by urgency: HP > 60% = `#44ff88`, 30–60% = `#ffcc44`, < 30% = `#ff4433`
- Wave number: bold, larger, in mint green

**Class icons (DOM):** Small SVG or unicode icon set for each class:
- Soldier: ✦ (4-pointed star)
- Medic: ✚ (heavy cross)
- Engineer: ⚙ (gear)

**Canvas crosshair:** Replace current thin 4-line crosshair with a more tactical scope sight — a circle (already implied in some renderers) with 4-gap crosshairs and a small center dot. Color: bright green `#44ff88` at 0.7 alpha.

**Wave announcement:** When a new wave launches, the text "WAVE X" drops from above the base, stays for 1.5 seconds, then dissolves upward (y-position animates).

**Ammo indicator (canvas):** Draw a small horizontal ammo bar below the player — remaining ammo as a row of tiny dots (each dot = 5% of max ammo). Reloading: the dots fill back in progressively.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Pistol fire | Short sharp crack: sawtooth 600→300 Hz, 40ms | Gain 0.3, fast decay | 50ms | Pistol pop |
| Shotgun fire | Wide noise burst + low thud: bandpass noise 300-3000 Hz + sine 70 Hz | Gain 0.7 noise, 0.6 thud | 200ms | Shotgun blast |
| Rifle fire | Crisper crack than pistol: sawtooth 800→400 Hz, 50ms, quieter | Gain 0.25, slightly longer tail | 70ms | Rifle crack |
| Zombie hit | Low grunt: sine 150 Hz, amplitude modulated by noise | 80ms, gain 0.2 | 100ms | Damage registered |
| Zombie death (normal) | Wet crunch: noise burst + very low sine 60 Hz | Noise 100ms + sine 80ms, gain 0.4 | 120ms | Kill confirmation |
| Zombie death (boss) | Massive explosion: broadband noise + sub 40 Hz + debris rattle | All layers, gain 1.0 | 600ms | Boss death |
| Grenade throw | Whoosh: noise through bandpass 400-2000 Hz, 300ms | Gain 0.2, panning suggestion via detune | 350ms | Arc in air |
| Grenade explosion | Sub thud 50 Hz + broadband noise + secondary crackle | Staggered: thud 0ms, noise 30ms, crackle 80ms | 500ms | Grenade boom |
| Heal ability | Rising harmonics: sine chord C4+E4+G4+C5, overlap | 262+330+392+524 Hz, 100ms stagger, gentle | 500ms | Healing warmth |
| Turret fire | Rapid mechanical: square 400 Hz, very short | 30ms, gain 0.15, fast repeat | 35ms | Auto-turret sound |
| Base hit | Alarm: sawtooth 440 Hz, LFO 8 Hz amplitude | 200ms, gain 0.4 | 250ms | Base under attack |
| Wave start | Alert fanfare: ascending 5th + octave | C3→G3→C4 triangle, 100ms each | 300ms | Wave launch |
| Wave complete | Upbeat arpeggio: C4→E4→G4→C5 | Triangle, 60ms each, gain 0.4 | 240ms | Wave cleared |
| Barricade placed | Solid thunk: noise burst + low sine 100 Hz | 100ms each, gain 0.3 | 120ms | Sandbag drop |
| Barricade destroyed | Crumble: noise fade 400ms | Broadband noise, gain 0→0.5→0 | 450ms | Structure collapse |
| Player death | Dramatic sting + heartbeat stop | Low sine 60 Hz fade + high sine 2000 Hz blip | 800ms | You died |
| Scrap pickup | Bright coin: triangle 1200 Hz, fast decay | 40ms, gain 0.3 | 50ms | Resource acquired |
| Reload start | Mechanical click: square 800 Hz, 20ms | Gain 0.2 | 25ms | Magazine out |
| Reload complete | Double-click: two square 1000 Hz pips, 30ms apart | Gain 0.3 each | 60ms total | Locked and loaded |

### Music/Ambience

A tense, driving zombie-apocalypse score using three layers:

**Base tension layer:** Two sine oscillators (110 Hz + 115 Hz) creating a 5 Hz beat — persistent anxious hum, gain 0.05. Run through a lowpass at 600 Hz.

**Pulse layer:** A repeating 4-beat pattern. Each "beat" is a very short noise burst (20ms) through highpass 2000 Hz at gain 0.08 — think distant helicopter, every 500ms. This gives a relentless momentum without being melodic.

**Melodic tension:** An 8-note loop in E minor (E3→G3→A3→B3→D4→E4→D4→B3: 165→196→220→247→294→330→294→247 Hz), each 300ms, triangle oscillator at gain 0.03. Full loop = 2.4 seconds. Quiet and sinister.

**Wave scaling:** As wave number increases, add a fourth "urgency layer" starting at wave 5: a faster pulse (every 350ms) at slightly higher gain (0.10). By wave 10, the base tone drifts up 20 Hz, increasing perceived tension.

**Between waves (calm):** Drop gain on all layers to 50%, add a brief resolution: the melody plays the final note (E3) and holds for 2 seconds, suggesting a breath before the next wave.

## Implementation Priority
- High: Zombie visual overhaul (irregular body shapes, arms, lurching gait), base octagonal fortress design, blood splat ground markers, background pavement texture
- Medium: Zombie fast/tank/boss distinct visuals (elongated fast, plates for tank, orbit satellites for boss), barricade sandbag layers, grenade arc trail, sound effects for all weapons/events
- Low: Building silhouette border decorations, damage state cracks on base and barricades, street markings, turret hex-base redesign, between-wave calm audio transition, boss satellite zombies
