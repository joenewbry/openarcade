# Obstacle Course Race — Visual & Sound Design

## Current Aesthetic

600x400 canvas. Four blob-shaped players in pink (#ff44aa), blue (#44aaff), green (#44ff88), orange (#ffaa44) racing from left to right through an obstacle course. Background is dark navy with mountainous silhouettes. Seven obstacle types: spinning blades (red), pendulums (orange), conveyors (green/red arrows), slime patches (green), bounce pads (yellow), moving platforms (purple), and brick walls. Minimap bar at the top shows player positions. 3-round structure with countdown and round-end overlays. Functional but visually rough — the blob characters have no animation or personality, obstacles are basic shapes, and the background is generic.

## Aesthetic Assessment

**Score: 2/5**

The core multi-player race concept is solid and the obstacle variety is good. But the presentation is very rough: blob players are static ellipses with no personality, obstacles don't feel dangerous or fun, the background is a plain dark panel with static mountain shapes, and there's no visual impact when a player is hit or eliminated. A party game race course needs energy, chaos, and clear visual language. The current aesthetic reads as a prototype.

## Visual Redesign Plan

### Background & Environment

Transform into a vibrant game-show obstacle course aesthetic — think TV obstacle course shows with bright colors, dramatic lighting, and an energetic crowd atmosphere.

**Sky/backdrop:** Replace the dark navy with a proper multi-layer sky suggesting an outdoor arena. Top portion: deep evening blue (`#0a0a2e`) transitioning to a warmer purple horizon (`#2a1050`). A stadium light effect: 4-6 bright cone shapes (filled triangles, `#ffffff06`) pointing downward from above — suggesting arena floodlights illuminating the course. The cones are wide and very transparent but visible.

**Crowd silhouettes (new):** A thin strip (20px tall) at the very top and bottom of the canvas shows simplified crowd silhouettes — rows of tiny `#2a1a4a` rectangles of varying heights suggesting spectators. Occasional bright colored pixel in the crowd (a waving item). This frames the course as a spectator event.

**Mountain/background layer:** Three layers of silhouette mountains but redesigned:
- Far layer: deep purple-blue (`#1a1030`) smooth hills
- Mid layer: darker purple (`#0f0820`) with slight angular peaks
- Near layer: dark arena walls (`#0a0618`) — flat, vertical, suggesting stadium bleachers

**Course ground:** The platform ground gets a more defined look. Instead of a single flat dark ground line, add: a 6px thick ground edge in dark concrete gray (`#3a3545`), a subtle shadow gradient just below the ground surface (4px of `#00000040`), and for the course floor — a repeating tile pattern: alternating slightly lighter/darker 30px squares in `#1a1428` / `#1e182e`. Makes the ground feel tiled and solid.

**Lane markers:** Faint lane lines (2px, `#2a2040`) run horizontally across the course at each player's lane height — helps readability of the 4-lane structure.

### Color Palette
- Sky: `#0a0a2e`
- Horizon: `#2a1050`
- Mountain far: `#1a1030`
- Mountain near: `#0a0618`
- Ground: `#1a1428`
- Ground edge: `#3a3545`
- Player 1 (pink): `#ff44aa` + glow `#ff88cc`
- Player 2 (blue): `#44aaff` + glow `#88ccff`
- Player 3 (green): `#44ff88` + glow `#88ffaa`
- Player 4 (orange): `#ffaa44` + glow `#ffcc88`
- Obstacle spinner: `#ff2222` + `#ff6666` edge
- Obstacle pendulum: `#ff8800` + `#ffaa44` highlight
- Obstacle conveyor: `#225544` belt, `#44ff88` / `#ff4444` arrow
- Obstacle slime: `#33bb55` pool, `#55ff77` bubble
- Obstacle bounce: `#ffdd00` + `#ffffff` sheen
- Obstacle wall: `#5a4a3a` brick, `#3a2a1a` mortar
- Obstacle platform: `#8844cc` + `#aa66ff` edge
- Glow/bloom: matches player colors, `#ff2222`, `#ffdd00`

### Entity Redesigns

**Players (blob characters):** Major upgrade. Each player blob has:
- **Body:** The ellipse shape remains but gets a proper 2-tone treatment: front half slightly brighter (lighter shade of the player color), back half darker — suggesting a rounded 3D form. A small white specular highlight dot (3px, `#ffffff`, 40% opacity) at the top-left of the blob.
- **Face:** Two white ellipse eyes with black pupils (pupil direction tracks movement direction). A small curve for a mouth (arc, 2px) — neutral normally, becomes an "O" of surprise when hit (two concentric circles for a moment).
- **Body squash/stretch:** When running, the blob alternates between vertically-stretched and horizontally-stretched every 6 frames — classic cartoon animation squash and stretch. When jumping, stretch tall; when landing, squash wide.
- **Running legs:** Two small stub legs (filled rounded rectangles, 4px wide × 6px tall in a darker shade of the player color) alternate positions underneath the blob — left/right stepping animation at the run speed.
- **Knocked-back state:** When hit by an obstacle, the blob briefly flips upside down and rotates (90° over 8 frames) with small stars orbiting its head (3 tiny yellow circles rotating at 4-frame intervals).

**Spinner obstacles:** Instead of plain rotating red rectangles, draw proper buzz-saw blades:
- Hub: small dark circle at center
- 3-4 blade arms: thin wedge shapes (fillPoly triangles) in bright `#ff3333`, tips slightly lighter `#ff6666`
- Outer ring: thin circle stroke in `#ff0000`
- Glow: `setGlow('#ff2222', 0.7)` while spinning
- Motion blur: 2-3 ghost copies of the blade at slightly earlier rotation angles at 30% opacity

**Pendulum obstacles:** The pendulum gets a proper wrecking-ball look:
- Rope: thin zigzag line (several drawLine segments at slight angles) in dark gray, suggesting rope texture
- Ball: Filled circle in dark iron gray (`#5a5a6a`) with a bright highlight spot (white, top-left, small) and a red/orange danger stripe painted around its equator
- Glow: warm orange bloom when at swing extremes (maximum velocity)

**Conveyor belts:** More industrial. The belt is a dark rubber gray (`#2a2a3a`) with moving arrow markers animated along it. Add roller cylinders at both ends: small filled circles (`#3a3a4a`) with a highlight line. Belt ridges (thin horizontal lines every 8px) move in the belt direction.

**Slime patches:** The slime pool gets more organic. Draw 3-4 overlapping ellipses of slightly different green tones (`#33bb55`, `#44cc66`, `#22aa44`) for a layered depth. Bubble animation: every 30 frames, a small circle grows from a random spot in the slime (radius 2→5→disappear over 10 frames). Slime drips hang from the leading edge (small teardrop shapes).

**Bounce pads:** Bright yellow platform with strong personality:
- Body: wide yellow rectangle (`#ffdd00`) with darker yellow stripes (`#cc9900`) across it at 45°
- Coil springs underneath: alternating wider/narrower vertical pairs of short lines suggesting a compressed spring
- On activation (player bounces): the pad compresses (squash animation: half height, double width over 3 frames) then extends back (3 frames) — mechanical spring feedback

**Moving platforms:** Purple platforms get a proper moving-tile look:
- Top surface: bright purple (`#aa66ff`) with a light highlight along the top edge
- Sides: darker purple (`#6633aa`)
- Motion direction arrows: small white chevrons (>>) on the platform sides indicating direction
- Floating particles: 2-3 tiny purple sparkles drift from the platform edges

**Brick walls:** Proper brick texture:
- Background mortar: dark brown (`#3a2a1a`)
- Individual bricks: draw rows of rectangles offset by half-brick each row, in `#5a4a3a` with `#6a5a4a` lighter top-face
- When a player hits a wall, the wall briefly shakes (±3px horizontal) and 3-4 small debris particles (brown/gray, 1-2px) fly from the impact point

### Particle & Effect System

**Player hit:** When any obstacle contacts a player, the player's blob emits 8-12 particles in the player's color, radiating outward in a burst pattern. Each particle is 2px, lasts 20 frames.

**Player eliminated:** Large burst — 20 particles in the player's color + 5 white star shapes (drawn as 4-line cross) radiating from the elimination point. The player blob does a spin-off-screen animation before disappearing.

**Finish line crossing:** The first player to reach the finish triggers a cascade of colored confetti — 30 small rect particles (2px×4px) in all 4 player colors, spawning from the finish line zone and falling with gravity over 60 frames.

**Round start countdown:** The "3... 2... 1... GO!" text appears with increasing scale. Each number slams down (zoom in from 3x to 1x over 8 frames) with a shockwave ring emitting from the number center. "GO!" is gold (`#ffdd44`) with a particle burst.

**Ground landing:** When a player lands after being knocked into the air, 4-6 small dust puffs (`#3a3545`, 2px each) appear at the landing point, drifting outward.

**Speed boost (after bounce pad):** Brief motion lines — 3 horizontal streak lines (`#ffffff20`) on either side of the player, 15px long, fading over 5 frames.

### UI Polish

- **Minimap bar:** Redesigned as a proper race tracker. The horizontal bar shows the full course length. Each player is represented by a small color-coded shield icon (not just a dot). Position numbers (1st/2nd/3rd/4th) are shown to the left in gold/silver/bronze/gray. Leader separation from 2nd place is shown as a small gap indicator.
- **Round indicator:** "Round N / 3" shown in the HUD with pips (filled circles) for rounds completed. Current round pip is bright.
- **Player score tally:** Below the round indicator, small color-coded numbers show each player's win count for the current match — styled as tally marks or flag icons.
- **Round start overlay:** Dramatic darkening of the screen (0.6 opacity overlay), then text revealing the round number in large gold letters: "ROUND N" with a horizontal golden line beneath.
- **Winner announcement:** At round end, a spotlight effect (radial gradient, dark outside, lighter inside) focuses on the winning player. A large banner appears: "PLAYER N WINS!" in the player's color with a glow.
- **Countdown to race start:** Progress bar along the top fills as countdown progresses, replacing the minimap briefly.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Player running footstep | Light tap | 120Hz sine, 20ms per step | Per step | Staggered per player — each has slight pitch variation. |
| Player jump | Spring boing | 200→600Hz ascending sine, 100ms | 100ms | Elastic jump sound. |
| Player land | Thud + bounce | 150Hz noise burst + 300Hz bounce | 150ms | Satisfying landing. |
| Obstacle hit / player bounced | Comic boing | 300→800→400Hz triangle wave | 250ms | Cartoon impact. |
| Player eliminated | Sad descend | 440→220→110Hz sine, 400ms | 400ms | Quick loss sting. |
| Spinning blade near | Whir drone | 400Hz saw wave, increases in volume as player approaches | Loop | Spatial danger sound. |
| Conveyor belt | Mechanical hum | 80Hz + 160Hz sine, low volume | Loop while active | Industrial belt sound. |
| Bounce pad activation | Boing | 600→1200Hz quick sweep | 100ms | Spring release. |
| Slime contact | Splat | Lowpass noise 300Hz cutoff | 150ms | Wet slurp. |
| Wall hit | Crunch | Midrange noise burst 500-1000Hz + brief brick thud | 200ms | Solid impact. |
| Round countdown (3-2-1) | Deep beat | 220Hz sine, 60ms | 60ms | Metronomic hit per count. |
| GO! | Airhorn | 220Hz + 330Hz + 440Hz all at once, sharp attack | 400ms | Race start signal. |
| Player finishes | Fanfare | G4-C5-E5-G5 ascending | 300ms | Per-player finish jingle. |
| Round winner declared | Triumphant brass | C4-E4-G4-C5-G5 | 600ms | Victory call. |
| Crowd cheer | Noise burst | Bandpass noise 300-3000Hz, rapid modulation | 800ms | After finish. |

### Music/Ambience

A high-energy game-show ambient: a driving rhythmic pulse using two noise bursts per measure (8Hz total pulse rate — 120 BPM sixteenth notes) formed from very short lowpass noise hits at 150Hz (0.03 volume, 30ms each) — these act as a drum machine kick pattern: boom-boom, boom-boom. On top, a rapid arpeggio of 4 notes cycling in the player count's key (C4-E4-G4-B4, cycling at 4Hz) played very quietly (0.012 volume) on a detuned saw wave pair for 80s synth character. This creates a TV game-show tension loop. The arpeggio tempo increases during the race itself (4Hz → 6Hz over the course duration), building intensity as players approach the finish. Between rounds, during the overlay screen, the ambient drops to a single held chord (0.015 volume) before ramping back up for the next countdown.

## Implementation Priority
- High: Player blob face (eyes + directional pupils), squash/stretch running animation, spinner motion blur ghost copies, bounce pad compression animation, player hit particle burst
- Medium: Slime pool layered ellipses + bubbles, pendulum wrecking-ball redesign (rope texture + iron ball), brick wall texture detail, confetti at finish line, stadium light cone background
- Low: Player running stub legs, crowd silhouette strip, lane markers, moving platform chevron arrows, spotlight winner effect, minimap shield icons
