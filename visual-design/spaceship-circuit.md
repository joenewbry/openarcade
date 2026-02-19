# Spaceship Circuit — Visual & Sound Design

## Current Aesthetic

600x500 zero-gravity spaceship racing. Four ships (player `#aa44ff`, AI `#ff4466`/`#44ddff`/`#ffaa22`) race around a wobbly elliptical track (TRACK_RX=220, TRACK_RY=170) marked by a faint semi-transparent purple band and a dashed centerline. Gates are green lines with endpoint dots; the next gate is yellow with glow. Hazards include rotating grey asteroid polygons, pulsing red energy barriers with electric crackle lines, and blue gravity wells with concentric rings. Ships have a 4-vertex arrowhead body with engine flame polygons and trail dots. Shields draw as a circle ring. A minimap in the top-right shows the track outline and ship dots. The background has 120 twinkling white circle stars. Engine exhaust and collision sparks use particle circles. The overall look is functional and readable but anonymous — the ships have no distinct identity beyond their color.

## Aesthetic Assessment
**Score: 3/5**

The track and hazard design is genuinely good — the gravity wells with their pulsing concentric rings look interesting, and the energy barriers with crackle effects have real character. The weakness is the ships: 4-vertex arrow polygons with zero differentiation. At racing speed, ships are nearly indistinguishable except by color. The background is static dots with no sense of a racing venue. The gate system is clear but minimal. The minimap is useful but visually crude. With ship redesigns and a richer environment, this could feel like a real sci-fi racing game.

## Visual Redesign Plan

### Background & Environment

**Starfield:** Upgrade to 3 parallax layers that shift subtly as ships move (using the average ship position as a camera offset):
1. Far layer: 80 very small `0.5px` white points, near-static, 30% opacity
2. Mid layer: current twinkling ~60 stars at 1px with shimmer
3. Near layer: 15 larger `1.5-2px` stars with color tints (cyan-white, amber) at full opacity, slight drift

**Nebula backdrop:** Soft colored clouds at 3-4% opacity — a cold blue-violet cloud formation in the upper portion, a warm orange region lower. These evoke a space racing venue, like a track carved through a nebula.

**Track surface:** The current faint purple band is barely visible. Upgrade to a proper track: the semi-transparent band should have two distinct edge lines (bright purple `#aa44ff` at 60% opacity, 2px wide) forming the track boundaries. Add a faint center line in white at 10% opacity. Between gates, add subtle speed-line markers (short perpendicular tick marks at regular intervals) suggesting track distance.

**Gravity well enhancement:** Add a visible distortion field — draw slightly distorted/offset star positions near gravity wells suggesting space-time curvature. The concentric rings should have a slow inward-flowing animation (shift radii over time) suggesting actual pull.

**Start/finish line:** A checkered pattern across the full track width at the gate 0 position — alternating black/white 6px squares for 2 columns, clearly marking the start/finish.

**Race atmosphere:** A faint "speed haze" — when ships are moving fast (speed > 5), add a very subtle radial blur suggestion via staggered duplicate draws at very low alpha.

### Color Palette
- Player: `#bb55ff`
- AI-1 Red: `#ff5577`
- AI-2 Cyan: `#33eeff`
- AI-3 Gold: `#ffbb33`
- Background deep: `#060610`, `#0a0a18`
- Track edge: `#9933ee`
- Track band: `#660099`
- Gate standard: `#44ff88`
- Gate next: `#ffff55`
- Asteroid: `#887766`, `#998877`
- Barrier: `#ff3355`
- Gravity well: `#3333ff`
- Boost: `#ffbb00`
- Shield: `#44ccff`
- Engine flame: `#ff8800`
- Boost flame: `#ffffff`

### Entity Redesigns

**Ships:** Replace the basic 4-vertex arrow with a proper 7-8 vertex racing fighter silhouette. Each ship gets a distinct form while sharing the same basic swept-wing profile:
- Long pointed nose
- Swept-back delta wings extending rearward
- Small cockpit bubble on the dorsal center (brighter color polygon)
- Twin engine pods at the wingtips (small rectangular extensions at rear)
- A bright engine glow at the rear: two small circles in engine color that flicker with thrust
- When boosting: the entire ship shape gets a white-hot core glow effect; speed lines trail behind

**Engine flame:** The current flame polygon is good — enhance with a white-hot inner triangle and color graduation from white core to color outer to transparent tip. Boost flame is wider (3x normal), brighter, and leaves a distinctive glowing afterburn trail.

**Ship trails:** Current circles are adequate. Upgrade to ellipses aligned to velocity direction, tapering in width and opacity. Boost trail should use golden-white particles that linger longer.

**Asteroids:** Current rotating irregular polygons are good. Add visible crater highlights — 2-3 smaller, lighter polygons inside each asteroid to suggest surface relief. Add a very subtle dark outline for depth.

**Energy barriers:** The pulsing and crackle effects are the game's best visual. Enhance: add a soft red glow behind the barrier line when fully active, and make the crackle lines branch into small Y-shapes at their endpoints (more lightning-like).

**Gravity wells:** Add slow inward-spiraling particle dots (4-6 tiny particles orbiting at different radii and speeds, slowly spiraling inward and despawning at center). These suggest the actual gravitational pull and look dynamic.

**Gates:** Draw the gate posts as proper glowing pillar markers — small hexagonal endpoints instead of plain dots. The next gate's yellow glow should pulse rhythmically.

**Shield:** Replace the plain circle ring with a hexagonal shield polygon (6 sides) that shimmers with a ripple animation — each edge flickers independently at different phase offsets.

### Particle & Effect System

- **Engine thrust:** 3-4 orange/amber particles per frame from rear nozzle, short life (10 frames), fade to transparent
- **Boost activated:** Burst of 10 golden particles radiating from ship rear, then sustained double-width exhaust
- **Boost flame:** White-hot particles, larger than normal thrust, leave a bright lingering trail
- **Shield deflection (asteroid hit):** Ring of 8 cyan spark particles from impact point; shield hexagon flashes white briefly
- **Ship hit (no shield):** 6-8 ship-colored sparks, ship flashes red for 4 frames, brief screen-edge red pulse
- **Gate passed:** 8 green particles burst from gate endpoints; brief gate line flash white
- **Barrier contact (shielded):** Red crackle particles from contact point + shield ripple
- **Lap completed:** Ring of 12 player-colored particles at the gate 0 position; minimap flashes
- **Race finish (player 1st):** Large confetti burst of player color + white particles cascading across screen
- **Gravity well (ship in range):** 1-2 dark blue particles per second detach from the ship and spiral toward the well center

### UI Polish

- Minimap: Add colored track edge lines to the minimap track rendering; highlight the next gate as a bright yellow dot; make the minimap border a glowing purple ring
- Position display: Large "1ST / 2ND / 3RD / 4TH" text in upper-left using ordinal color coding (gold for 1st, silver for 2nd, bronze for 3rd, red for 4th)
- Lap counter: Prominent with a brief flash animation when the lap number increments
- Boost and shield bars: Gradient fill (full = bright color, depleted = dark red/grey); add pip marks at 25% intervals
- Countdown: Scale animation — the number shrinks toward 1, then "GO!" launches with a full-width flash
- Speed indicator: Small arc gauge beside the ship showing current speed as a colored fill (green→yellow→red)

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Engine thrust | Continuous hum | Sawtooth 80 Hz, low-pass filtered at 200 Hz | Continuous | Volume and pitch scale with speed |
| Boost activate | Rising roar burst | Noise sweep + 60 Hz sine ramp | 300ms | Sharp power surge feel |
| Boost sustained | Higher hum | Sawtooth 120 Hz + white noise mix, filtered | Continuous | Brighter than normal thrust |
| Boost depleted | Low sputter | Noise burst + 40 Hz sine drop | 150ms | Power fading |
| Shield activate | Electric shimmer | Sine 1200 Hz, ring-mod at 8Hz | 150ms | Crackling energy field |
| Shield hit (asteroid) | Metallic clang | 440 Hz sine + noise burst, fast decay | 200ms | Deflected impact |
| Ship hit (unshielded) | Impact crunch | Noise burst + 100 Hz sine punch | 250ms | Hard collision |
| Gate passed | Bright chime | Sine 880 Hz + 1320 Hz, bell envelope | 150ms | Satisfying checkpoint sound |
| Lap completed | Ascending sweep | 440→659→880 Hz sine, fast stagger | 400ms | Milestone fanfare |
| Barrier contact | Electric zap | Square wave 200→400 Hz sweep + crackle noise | 200ms | Barrier discharge |
| Gravity well (nearby) | Low drone pulse | 55 Hz sine, 2Hz amplitude modulation | While in range | Subwoofer gravity feel |
| Race start (GO!) | Air horn blast | Sawtooth 110 Hz, 600ms with fast decay | 600ms | Classic racing start |
| Race finish (1st) | Victory fanfare | 523, 659, 784, 1047 Hz sine, staggered | 800ms | Podium moment |
| Race finish (other) | Neutral end tone | 440 Hz sine, smooth | 400ms | Acknowledged but not celebrated |
| Countdown beep | Short sine blip | 660 Hz sine | 80ms | 3-2-1 beeps |

### Music/Ambience

A driving synthwave racing piece built entirely with oscillators. The music starts during the countdown and evolves through the race:

- **Countdown/pre-race:** A slow rising drone — sawtooth at 55 Hz, slowly sweeping a low-pass filter from 100→400 Hz over 3 seconds, building tension.
- **Race active:** Two-voice structure at 128 BPM. Bass: sawtooth 55 Hz gated in a kick-drum pattern (four-on-the-floor with an 8th-note subdivision on beats 2 and 4). Lead: square wave arpeggiation at 16th notes through A minor pentatonic (220, 261, 330, 392 Hz), shifting octave every 8 bars. A high-frequency pad sustains a minor chord (filtered sawtooth at 880 Hz + 1046 Hz at low volume). As laps complete, the music adds energy — on lap 2, double-time the bass subdivision; on lap 3, add a brief risers between gates.
- **Final lap:** Music pitch-shifts up a semitone and BPM increases to 138, signaling the final push.
- **After finish:** Music fades to a slow resolution chord (440 Hz sine) over 2 seconds.

## Implementation Priority
- High: Ship polygon redesign (7-8 vertices with cockpit/engine pods), boost particle burst and white-hot flame, gate chime sound, engine thrust audio scaling with speed
- Medium: Gravity well spiral particles, hexagonal shield shape, track edge boundary lines, lap fanfare sound
- Low: 3-layer parallax stars, nebula clouds, asteroid crater highlights, start/finish checkered line, speed indicator arc gauge
