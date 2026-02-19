# Mr. Do! — Visual & Sound Design

## Current Aesthetic

Earthy brown dirt (#4a3728) with texture dots, near-black tunnels (#0d0d1a). Cherries as red double-circles with green stems, apples as large green circles, bonus as a pulsing yellow diamond. Player "Mr. Do" has a distinctive design: blue body circle, white face, red nose, red pointy hat, direction indicator dot. Monsters are ghost-like shapes with wavy bottoms, looking toward the player, with crown arc for digger type. Power ball is white with orange glow. Level complete flashes orange. Overall has charm — Mr. Do's clown design is recognizable.

## Aesthetic Assessment
**Score: 3/5**

The clown player character has personality and the monster ghost shapes are decent. But the dirt texture is repetitive and boring, the apple/cherry art is basic filled circles, and the level flash is crude. The dirt tunneling gameplay deserves more visual drama — the act of carving through dirt should feel satisfying. Background has no depth.

## Visual Redesign Plan

### Background & Environment

The dirt world gets a complete overhaul. Dirt tiles shift from flat brown to rich layered earth: the base fill is dark brown (`#3d2516`), then a slightly lighter layer is drawn at 60% coverage via a large number of small (2-4px) randomly-colored rects using per-cell seeded noise (deterministic per grid position). Colors cycle through three earth tones: `#4a3020`, `#5a3a28`, `#3a2418`. Add small "pebble" dots (2px circles in `#6a4a36`) and occasional root fragments (1px lines in `#2a1a10`, 4-8px long, horizontal or diagonal, 1-2 per cell).

Tunnels (empty cells) have a subtle texture: very faint horizontal scan lines every 3px in `#0f0f20` on the near-black background. At tunnel edges (where dirt meets empty), a thin brighter line suggests freshly carved earth.

A subtle depth gradient: cells in rows 0-4 are slightly lighter dirt (nearer to "surface"), rows 10-14 are darker (deeper underground). Approximated by adding a row-based brightness offset to the base dirt color.

### Color Palette
- Primary: `#ff4488` (cherry pink — Mr. Do's theme color for UI/accents)
- Secondary: `#44ff88` (apple green — collectible and score color)
- Background tunnel: `#080810`
- Dirt base: `#3d2516`
- Dirt highlight: `#5a3a28`
- Cherry: `#ff2244` with `#ff6688` highlight
- Apple: `#22dd66` with `#44ff88` highlight
- Bonus diamond: `#ffdd00`
- Glow/bloom: `#ff4488`, `#ffdd00`, `#44ff88`

### Entity Redesigns

**Mr. Do (player):** Keep the clown silhouette but add detail. Hat gets a brim (thin horizontal ellipse at base of the triangle). Face gets two rosy cheek circles (small pink circles, `#ff8888`, radius 3). The body is a proper circle split into two tones (front half brighter blue `#5566ff`, back half darker `#2233cc`). A spinning bow-tie at the neck (two small triangles). Walking animation: the hat bobs slightly (±2px vertical offset using `sin(frameCount * 0.2)`). When throwing the power ball, a brief "effort" expression (eyebrows arch — two short angled lines above the eyes).

**Monsters:** Push the ghost design further. Body gets a distinct colorful gradient top-to-bottom (lighter at dome, darker at fringe). Eyes are larger with proper sclera (white circle) and detailed iris (colored ring + dark pupil). The wavy bottom fringe animates more dramatically — three distinct "tentacles" that oscillate out of phase. Digger-type monsters get a distinct pickaxe symbol drawn small on their body. When stunned, monsters wobble (body shakes horizontally ±2px) and show stars orbiting their head (3 small circles rotating).

**Cherries:** Make them lush and 3D. Two spheres (one left, one right, slightly overlapping) with:
  - Dark base circle (#cc1133)
  - Bright highlight spot (4px white circle at 25% opacity, top-left of each sphere)
  - A leaf added at stem junction (small green ellipse)
  - Glow ring (`#ff4466` at 0.3 intensity)

**Apples:** Redesign as clearly recognizable falling apples. Round body (`#22cc55`) with a leaf (small green fillPoly at top), stem, and an indentation at top (small dark circle). When falling, add a motion blur suggestion — a vertical smear of increasingly transparent copies of the apple drawn 2-4px above.

**Power ball:** Replace solid white with a glowing orb: inner bright white, mid layer in gold (#ffaa00), outer glow ring (#ff6600). Spinning trail: 5 previous positions of the ball drawn at decreasing opacity and size.

**Bonus item:** Keep the diamond shape but make it feel precious: faceted (draw as two triangles sharing center with slightly different colors), rainbow shimmer (color cycles through hue over 60 frames), glow pulses at twice current rate.

### Particle & Effect System

**Tunnel carving:** When Mr. Do moves through dirt, 4-6 dirt particles (brown/tan colors, 1-2px) spray from the dig direction. These arc away and settle on the floor below the cell being dug (gravity, bouncing once).

**Cherry collected:** 8 bright pink sparkles burst outward. Score "+50" floats up in pink and fades.

**Apple hit (monster/player):** Large impact burst — 12 green particles for normal settle, 20 red particles mixed with green for a crush kill. Screen flashes briefly.

**Monster killed by ball:** Purple particles (ball color) radiate from impact + monster's own color particles. A "x100/200/400/800" score text rotates as it floats up.

**Level complete flash:** Replace the flat orange rect with a radial burst effect: bright rays emanate from Mr. Do's position to the screen edges, then collapse back inward. Duration 40 frames.

**Bonus collected:** Gold explosion of 15 particles + triumphant jingle.

### UI Polish

- Lives display (external): render as small clown hats instead of numbers.
- Level indicator: "Lv.N" styled with a bouncing animation when level changes.
- Cherries remaining counter: shown as a row of miniature cherry icons depleting from right.
- Ball recharge arc (already exists): make it thicker (3px) and give it a color that progresses cyan → yellow → white as it fills.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Dig through dirt | Short noise burst | White noise, bandpass 400-800Hz | 60ms | Earthy scrape per step. |
| Cherry collected | Quick ascending sine | 880→1320Hz | 100ms | Bright pop. |
| Power ball throw | Sine + vibrato | 660Hz ±30Hz at 8Hz | 200ms | Wobbly ball-toss sound. |
| Power ball bounce | Short sine click | 440Hz, 30ms | 30ms | Per wall bounce. |
| Monster killed (ball) | Descending noise | Lowpass filtered, 500→100Hz | 300ms | Ghost-zap sound. |
| Apple fall | Rhythmic ticking | 200Hz square wave, one tick per cell fallen | 50ms each | Gravity click. |
| Apple smash (ground) | Heavy noise thud | Lowpass 200Hz noise | 400ms | Satisfying crunch. |
| Apple kills monster | Loud thud + jingle | Noise thud + 3-note arpeggio | 500ms | Victory combo sound. |
| Player dies | Sad descending arpeggio | C4-A3-F3-C3 | 600ms | Classic death tune style. |
| Level complete | Bright fanfare | G4-C5-E5-G5 | 500ms | Ascending joy. |
| Bonus collected | Extended jingle | Full 5-note melody | 800ms | Most satisfying sound. |
| Ball return (recharge) | Brief ping | 1200Hz sine, 50ms | 50ms | Ready indicator. |

### Music/Ambience

A circus-influenced ambient loop: a very subtle "calliope" texture — a major chord arpeggio (C-E-G, 261-329-392Hz) played softly on sine waves at 0.03 volume, cycling slowly at 0.5Hz per note. This gives a barely-there carnival atmosphere without being distracting. When Mr. Do is being chased closely by a monster, add a rapid tremolo effect to the ambient (amplitude modulation at 8Hz for urgency). Level complete fanfare briefly overrides the ambient with full volume.

## Implementation Priority
- High: Dirt particle spray when digging, cherry collected sparkle burst, apple motion blur when falling, Mr. Do hat-bob animation
- Medium: Monster tentacle fringe animation, monster stun wobble + stars, cherry 3D highlight sphere design, power ball trail
- Low: Apple falling ticking sound, level-complete ray burst effect, bonus item rainbow shimmer, Mr. Do bow-tie detail
