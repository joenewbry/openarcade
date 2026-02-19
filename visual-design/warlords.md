# Warlords — Visual & Sound Design

## Current Aesthetic

Four castles occupy the corners of a 500×500 arena — red (TL), yellow (TR), purple/player (BL), green (BR). Each castle is built from 12×12 brick rectangles in L-shapes. A shield slides along the inner walls. One to three fireballs bounce around the arena. The background has faint center cross and diagonal lines on a near-black background. The fireballs are orange circles with yellow inner core glow. The overall look is minimal and functional but lacks the medieval siege atmosphere the game's concept deserves.

## Aesthetic Assessment
**Score: 2/5**

The four-castle layout is clear and readable. The fireball glow is visually satisfying. But the bricks look like colored rectangles, the arena is a featureless void, and the shields are boring. This game begs for stone texture, fire, castle drama.

## Visual Redesign Plan

### Background & Environment

The arena background: `#060810` near-black. Add subtle stone-floor texture: draw a 40×40 grid of very faint squares at `#0a0e18` (barely visible) across the full canvas. At every intersection, a faint 1px dot at `#0e1222`. This suggests worn flagstones without explicit drawing.

Four corner vignettes: each corner gets a subtle ambient glow in its castle's color — draw a large semi-transparent circle (radius 120px, the corner as center, at 6% opacity) that fades toward center. This color-zones the arena and makes it feel like four distinct factions claim their corners.

Center arena marker: draw a subtle diamond shape (four-pointed polygon) at the exact center in `#ffffff08` — a neutral zone marker. The diagonal lines from the current implementation become two crossing beams of light, drawn as thin gradient-ish fillRects: a narrow bright center (1px at `#ffffff08`) flanked by wider dark rects.

A distant stone wall texture on each edge: draw 3px fillRects along each canvas edge in `#1a1e2e` forming a subtle border frame. The corners (20×20px) get a slightly darker `#141820` treatment.

### Color Palette
- Background: `#060810`
- Stone floor: `#0a0e18`
- Castle TL (red): `#ff3333`
- Castle TR (yellow): `#ffdd00`
- Castle BL (purple, player): `#aa44ee`
- Castle BR (green): `#00ee44`
- Shield TL: `#ff8888`
- Shield TR: `#ffee88`
- Shield BL: `#cc88ff`
- Shield BR: `#88ff88`
- Fireball outer: `#ff6600`
- Fireball inner: `#ffdd00`
- Fireball core: `#ffffff`
- Glow/bloom: castle color per corner

### Entity Redesigns

**Bricks** — Transform from plain colored rectangles into stone blocks:
- Each brick draws two-layer: a base rectangle in the castle's dimmed color (`castle_color * 0.5` darkness), then an inner highlight on the top-left two edges (1px wide in a lighter tint `castle_color * 1.4`), and a shadow on the bottom-right two edges (1px in `castle_color * 0.3`). This creates a 3D beveled stone look using only fillRect calls.
- Bricks that have been hit but are not yet destroyed show a crack pattern: draw 2–3 short thin diagonal lines across the brick in `#00000088` — pre-rendered as a small set of fixed diagonal line calls offset within the brick dimensions. Trigger after HP drops below 50%.
- Dead bricks show rubble: when a brick is destroyed, replace it with a persistent particle debris — 3 tiny square fragments (3×3px) placed at slight random offsets within the brick area, in a dark version of the brick color. These stay on the ground as visual history.

**Shields** — Give them a proper shield look:
- The horizontal shield variant: a polygon in the shape of a rounded rectangle with a slight trapezoid taper — wider in the middle, narrowing slightly at ends. Filled with the shield color + a central bright stripe (1px bright line down the middle).
- The vertical shield variant: same but rotated.
- Add a subtle "energy" pulse to the player's shield (BL): it breathes in brightness (glow strength 0.5→1.0→0.5 at 1Hz) to distinguish it as player-controlled.
- When the shield deflects a fireball, a brief spark effect — 6 particles shoot outward from the contact point perpendicular to the shield face, in the shield's bright color, life 200ms.

**Castle cores** — The 8×8 center marker becomes a proper castle icon:
- For alive castles: draw a small tower silhouette as a polygon — a central keep (fillRect 8×12px) with two smaller battlements on top (two 4×4px fillRects with 2px gap between them), in the castle's bright color with glow.
- For dead castles: draw a crumbled version — the same keep but with irregular broken top edges (fillPoly of irregular polygon), colored dark gray `#333`.

**Fireballs** — The current orange circle with yellow inner is a solid base. Enhance it:
- Add a comet tail: as the fireball moves, emit 4 trail particles per frame at the previous positions, each 1px smaller radius, decreasing opacity: 80%, 60%, 40%, 20%. Color shifts from orange at head to dark red `#880000` at tail.
- The inner yellow core pulses in radius (sine wave ±1.5px, 8Hz) — a flickering flame effect.
- Add a white-hot center: a 2px fillCircle in `#ffffff` at the very center.
- When a second fireball spawns: a dramatic "meteor strike" entrance — it begins off-screen and draws a streak line from off-canvas to its spawn position (a 1-frame bright line), then the normal fireball appears with a brief explosion ring.
- As frameCount increases (fireballs speed up), the trail length extends from 4 to 8 particles to reflect the higher velocity.

### Particle & Effect System

Brick destroyed: 5–8 particles of the brick's castle color + gray stone fragments, shooting outward from brick center, gravity-pulled, life 400ms.

Fireball impact on brick (any): brief yellow-orange ring (strokePoly expanding circle, radius 0→12 in 100ms) at contact, then fades.

Castle destroyed (all bricks gone): a dramatic 30-particle explosion from the castle corner — large radius, mix of castle color + fire colors, life 600ms. ShakeAmount = 10px for 400ms. The center marker pulses 3 times with the castle's color before going gray.

Shield deflect: as above — 6 particles from contact, bright color.

Player eliminated: screen goes to 60% opacity dark overlay for 200ms with a bright red border (4px border via four thin fillRects along canvas edges) then fades.

Victory: all remaining alive castles' bricks flash their color simultaneously for 200ms.

### UI Polish

Health bar redesign: Replace the current progress bars in the center with four castle miniature health indicators positioned near each corner. Each shows a vertical bar (30px tall, 6px wide) in the castle's color, with the fill proportional to alive bricks. The bar pulses when below 25%.

Status indicators (the existing center P/1/2/3 with health bars): Keep but style them as stone-tablet text — slightly rough edges would require polygon rendering, so instead just use heavier glows and the castle colors.

Round timer hint: The current game has no time pressure displayed. Add a subtle "pressure ring" at the center of the canvas: a strokePoly circle that grows from radius 30 to 200 over the course of the game (tied to frameCount), at 3% opacity in white — a visual shrinking safe zone metaphor.

Corner labels: "YOU" label for player corner gets a `#aa44ee` glow. AI corner labels styled in their respective colors but slightly smaller.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Brick hit | Short stone crack: noise burst through lowpass 400Hz | Gain 0.3→0 | 100ms | Stone impact |
| Brick destroyed | Heavier crumble: noise through lowpass 200Hz, longer | Gain 0.5→0 | 250ms | Bigger destruction |
| Shield deflect (player) | Metallic clang: sine 800Hz + harmonic 1200Hz | Gain 0.35→0 | 150ms | Shield block |
| Shield deflect (AI) | Same but quieter | Gain 0.15→0 | 150ms | Background noise |
| Fireball wall bounce | Short thud: sine 120Hz | Gain 0.2→0 | 80ms | Bouncing ball |
| Second fireball spawn | Whoosh + ping: noise sweep + 880Hz sine | Gain 0.4→0 | 300ms | New threat appears |
| Castle destroyed | Deep explosion: sine 60Hz + noise, long decay | Gain 0.7→0 | 800ms | Castle falls |
| Player eliminated | Dramatic fail: descending saw 400→80Hz | Gain 0.6→0 | 700ms | You lose |
| Victory | Triumphant: 523+659+784Hz together | Gain 0→0.5→0 | 1200ms | You win |
| Score tick | Coin sound: sine 1046Hz | Gain 0.1→0 | 60ms | +100 points |
| Fireball speed up (at 10min) | Engine rev: sine pitch rises 80→120Hz over 2s | gain 0.05 | 2000ms | Escalation cue |

### Music/Ambience

Medieval siege battle ambience. Using Web Audio:
- Low drone: sine osc at 55Hz (gain 0.06) continuous — the rumble of distant siege warfare.
- Rhythmic percussion substitute: every 1200ms trigger a short noise burst (lowpass 300Hz, gain 0.1→0, 100ms) simulating a distant drum beat.
- A mid melody hint: triangle osc playing a slow arpeggio of 196→247→294→247→196Hz (G3→B3→D4→B3→G3), each note held 800ms, gain 0.03. This loops indefinitely.
- The combined effect is a tense medieval atmosphere with a slow pulse.

When only two castles remain (high tension phase): add a 220Hz sine osc with a 0.3Hz amplitude LFO creating a slow throb, gain 0.04. The drum substitute speeds up to every 800ms. Together these signal the endgame without being jarring.

When the player is at low health (≤25% bricks): add a high tension element: 880Hz sine at gain 0.025 with 8Hz vibrato, suggesting magical alarm or danger.

## Implementation Priority
- High: Brick 3D bevel effect (highlight/shadow edges), fireball comet trail with fading particles, brick destroyed particle burst, shield deflect sparks, castle death explosion
- Medium: Corner ambient glow vignettes, fireball white core and pulse animation, stone floor subtle texture, castle alive/dead tower silhouette icons, all sound events
- Low: Brick crack visual at 50% HP, brick rubble debris persistence, center pressure ring, second fireball spawn streak entrance, medieval ambient music system
