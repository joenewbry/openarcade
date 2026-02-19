# Volleyball 2D — Visual & Sound Design

## Current Aesthetic

A 600×400 canvas with a dark sky `#0a1628` and dark green ground `#1e3015`. Two slime blobs — blue (`#55ccff`) and orange (`#ff8855`) — are drawn as half-circle dome polygons with a single eye that tracks the ball. The ball is a yellow circle with a seam arc and highlight dot, trailing a yellow vapor trail. The net is a white rectangle. Hit and score particles exist. Ground shadow under the ball. The "slime volleyball" aesthetic is charming and complete — this is already one of the better-looking games in the arcade. The challenge is elevating from "nice" to "stunning."

## Aesthetic Assessment
**Score: 3/5**

The slime eye tracking is delightful. The ball trail works. The seam detail is good. What's missing is environmental richness, surface texture, and juicy feel on impacts. The court feels like a flat stage rather than a place.

## Visual Redesign Plan

### Background & Environment

The sky becomes a deep twilight gradient: draw 4 stacked fillRects from top to bottom — `#04081a` (top), `#071228` (middle-top), `#0a1828` (middle-bottom), `#0c1f2e` (bottom of sky). Stars: 40 tiny 1×1px white dots at fixed positions, each blinking at a unique slow frequency (sin-driven alpha 0.2–0.8, period 3–7s).

Distant background: Two faint silhouette mountain ranges drawn as polygon shapes behind the net, in `#0d1a28` (far) and `#101e2a` (near) — pure decoration, very low contrast.

Ground redesign: Replace the flat rectangle with a layered surface. Top 3px: `#2a4a1e` (bright grass line). Below: `#1a3a10` (main ground). Bottom 10px: `#101e08` (dark root zone). Add a subtle grass texture — 15 tiny vertical 1px lines of varying heights (3–8px) along the top of the ground, in `#3a6a28`, spaced every 25px.

Net redesign: The net becomes a proper volleyball net with visible posts. The net body gets a crosshatch pattern — draw thin lines across it every 8px horizontally and vertically in `#cccccc44`. The top cap becomes bright white `#ffffff`. Two thin rectangles (posts) extend from the top of the net to the ground on each side, 3px wide, `#999999`.

Court lines: Two thin white `#ffffff1a` boundary lines on the ground surface (just inside each wall), giving the game a proper court feel.

### Color Palette
- Sky top: `#04081a`
- Sky bottom: `#0c1f2e`
- Ground bright: `#2a4a1e`
- Ground main: `#1a3a10`
- Player 1 (blue slime): `#33bbff`
- Player 1 glow: `#44ddff`
- Player 2 (orange slime): `#ff7733`
- Player 2 glow: `#ffaa44`
- Ball: `#ffffc0`
- Ball trail: `#ffff8888`
- Net: `#e0e0e0`
- Glow/bloom: `#44ddff` (P1), `#ffaa44` (P2)

### Entity Redesigns

**Slimes** — Elevate the dome characters:
- The main dome fill becomes a two-tone radial gradient approximation: draw the body polygon in the base color, then overlay a smaller highlight ellipse (fillPoly of a narrow oval) at the top-center in a lighter tint (`#88ddff` for player 1, `#ffcc99` for player 2) at 50% opacity. This simulates a glossy wet surface.
- Shadow: The ground shadow becomes an ellipse (fillCircle with high flatness — drawn as fillPoly of an ellipse polygon) rather than a circle, stretched wider than tall.
- Squash/stretch animation: On ground contact, squash the dome (scale width 1.2×, height 0.85× for 4 frames then ease back). On jump, stretch vertically. This requires scaling the polygon points dynamically.
- Eye whites get a specular glint — a tiny 1px dot at top-right of the eye white.
- Spike indicator: Replace the jagged polygon with a dramatic "power burst" — 6 thin spikes radiating outward from the slime top in the player color, drawn as thin triangular polys, pulsing outward and back at 120ms interval.
- When the slime wins a point, a brief "happy" expression — the pupil becomes a crescent (simulated as two overlapping circles, the second slightly offset in dark color).

**Ball** — Enhance the existing good design:
- Increase trail length to 18 segments. Earlier segments become slightly larger-radius circles (1.1× per step back) to create a "comet" feel.
- The seam lines get a second, perpendicular seam arc, giving the ball a proper volleyball panel look.
- On fast travel (speed > 8), draw 3 motion blur ghost circles behind the ball in the trail color at decreasing opacity (30%, 20%, 10%), spaced 3px apart in the opposite velocity direction.
- The highlight dot becomes animated — it orbits very slowly around the ball surface (1 revolution per 3s), suggesting the ball's spin.

### Particle & Effect System

Hit particles: Current 6-particle system → upgrade to 12 particles. Mix the slime's color (8 particles) with white sparks (4 particles `#ffffff`). Add a brief ring expansion (strokePoly circle growing 0→10 over 100ms) at the hit point.

Spike particles: On a spike hit, emit 16 particles with higher velocity, include some small streak-shaped ones (tiny elongated fillRect aligned to velocity direction). A bright flash fills a 30px radius around the hit point for 40ms.

Score particles: On point scored, a 30-particle confetti burst from the ball position. Include the scoring player's color (20 particles) and gold `#ffd700` (10 particles). Gravity pulls downward at 0.2px/frame². Life 800ms.

"Match Point" state: Add a subtle slow-pulse red vignette (dark fillRect at screen edges, alpha 0.04→0.08→0.04 at 1Hz) when either player is at match point.

Net brush particle: If the ball grazes the net top, 4 white sparks fly upward from the contact point.

### UI Polish

**Score display**: The HTML score elements get a brief scale-up pulse (CSS transform scale 1.0→1.4→1.0 over 200ms) when either score changes.

**Bounce counter**: Replace the small text indicator with an arc indicator that appears beneath the ball's side of the court. Each bounce fills one segment of a 3-segment arc. Turns red when at MAX_BOUNCES.

**Serve indicator**: The downward arrow becomes an animated beacon — the arrow bobs up and down with a sine animation, plus a pulsing glow ring around the ball on serve. "Press any key to serve" text pulses in opacity (0.6→1.0 at 0.5Hz).

**Match Point banner**: A brief bold "MATCH POINT" text floods in from the sides (two halves sliding toward center) over 300ms, holds 1s, then fades. Red color, large font, glow.

**Win screen**: On game end, an animated confetti rain — 50 particles starting at random x positions above the canvas falling downward at varied speeds, in alternating winner colors, continuing until restart.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Ball hit (normal) | Short bounce: sine 440Hz | Gain 0.3→0 | 80ms | Volleyball thwack |
| Ball hit (spike) | Harder impact: noise burst + sine 300Hz | Gain 0.5→0 | 100ms | Power hit |
| Ball hits net | Dull thud: sine 180Hz + noise lowpass 300Hz | Gain 0.3→0 | 150ms | Net impact |
| Ball hits ground | Deep bounce: sine 120Hz sweep 120→80Hz | Gain 0.4→0 | 200ms | Ground thump |
| Ball hits wall | Short snap: noise highpass 800Hz | Gain 0.25→0 | 60ms | Wall bounce |
| Point scored | Ascending chime: 659→784→1047Hz sine | 80ms each, gain 0.4 | 240ms | Score fanfare |
| Match point alert | Dramatic stab: sine 220Hz + sawtooth 440Hz together | Gain 0.4→0 | 400ms | Tension |
| Serve (ball released) | Soft whoosh: noise through highpass 1000→3000Hz | Gain 0.2→0 | 150ms | Ball served |
| Spike activate | Short charge: ascending noise sweep | 200→2000Hz highpass, gain 0.15→0 | 80ms | Power up |
| Win | Victory fanfare: 523+659+784+1047Hz all at once | Gain 0→0.5→0 | 1500ms | Full win sting |
| Lose | Deflation: sawtooth 440→220→110Hz | Gain 0.3→0 | 800ms | CPU wins |
| Crowd ambient | Pink noise very quiet through lowpass 600Hz | Gain 0.03 | Continuous | Arena atmosphere |

### Music/Ambience

A lively upbeat ambient loop to match the sport's energy. Built from Web Audio oscillators:
- Bass line: sine osc following a simple 4-note pattern (G2=98Hz, A2=110Hz, C3=130Hz, D3=147Hz), 500ms per note, gain 0.08.
- Mid rhythmic element: square osc at 196Hz (G3) pulsed at quarter notes (every 500ms with gain envelope 0→0.06→0), creating a rhythmic chord pulse.
- High shimmer: sine at 784Hz (G5) with a slow vibrato (LFO 4Hz depth 10Hz), gain 0.03. Plays continuously.
- This creates an upbeat but understated musical bed appropriate for a sport game.

Intensity scaling: When a point rally extends beyond 5 ball-hits without scoring, slowly raise the bass gain from 0.08 to 0.12 and add a subtle drum kick pattern (sine 60Hz, 80ms, every 500ms, gain 0.08) — this signals a long exciting rally to the player.

## Implementation Priority
- High: Multi-layer sky gradient, slime glossy highlight overlay, enhanced ball trail with motion blur, hit sound effects, score particle confetti
- Medium: Slime squash/stretch animation, net crosshatch detail, ground grass texture details, spike power burst, bounce arc indicator
- Low: Background mountain silhouettes, star twinkle, ball spinning highlight, match point vignette pulse, ambient crowd noise, dynamic rally music
