# Soccer Heads — Visual & Sound Design

## Current Aesthetic

600x350 two-player soccer game. Background is a very dark navy `#0a0a1e` sky and a dark green `#2a5a1a` ground strip with a bright green `#44dd44` ground line. Goals are white L-shapes with faint grid lines. Characters have a large circular head, a rectangular body, stubby legs and arms — cartoony proportions. Player is blue, CPU is red. Ball is white with grey pattern dots. There are minimal particles on collision. The large faded score watermark in the background is a nice touch.

## Aesthetic Assessment
**Score: 3/5**

The character design concept is right for Soccer Heads (big head = identity of the game). The field is sterile though — it reads more like a void than a soccer pitch. The goal nets have no depth. Color palette is functional but bland. The ball lacks spin visual feedback.

## Visual Redesign Plan

### Background & Environment

Transform into a proper stadium atmosphere. Add a multi-layer background:
1. **Sky layer:** Deep blue-purple gradient `#060614` → `#0d0d24` with stadium floodlight glow circles (4-6 large soft white/warm-yellow circles at the top, very low opacity, suggesting overhead lights shining down)
2. **Stadium crowd:** A horizontal band across the upper third — a row of tiny colored rectangles at random heights suggesting packed spectators, very low alpha (~15%), occasionally "waving" by shifting positions slightly
3. **Pitch texture:** Replace flat green with a proper football pitch — alternating light/dark green stripes (6-8 vertical bands), center circle drawn in white at low opacity, penalty arcs visible
4. **Ground line:** Keep the bright green, but add a subtle glow beneath it

Goals should look 3D — add a back netting grid (diagonal cross-hatch pattern in dark semi-transparent lines behind the goal mouth). Post glow when a goal is scored.

### Color Palette
- Primary (player): `#3399ff`
- Primary (CPU): `#ff4433`
- Background: `#06060e`, `#0d0d24`
- Pitch dark stripe: `#0d2210`
- Pitch light stripe: `#102814`
- Ground line: `#44ee44`
- Goal post: `#ffffff`
- Ball: `#f0f0f0`
- Glow/bloom: `#ffdd44` (goals), `#3399ff`, `#ff4433`

### Entity Redesigns

**Characters:** The big-head concept is the game's charm — lean into it. Make the head a full 60-70% of the total character height. Add:
- A team-colored headband/hair tuft at the top
- Expressive faces: calm neutral expression normally, FIERCE expression when kicking (draw open mouth, angled eyebrows), SHOCKED when the ball flies past them
- Team jersey pattern on the body (thin horizontal stripes in a slightly lighter shade)
- Feet as solid colored ovals (boots)
- When jumping, the hair/headband lifts slightly

**Ball:** Add spin visualization — as the ball moves, draw 2-3 rotating "seam" arcs on its surface that rotate in the direction of travel. The ball should compress slightly on ground bounces (squash/stretch: draw as an ellipse for 3-4 frames on impact) and then spring back to round.

**Goal scoring:** When a goal is scored, the net should "bulge" backward — draw several particles flying into the net and bouncing. Goal posts flash bright white.

### Particle & Effect System

- **Header/collision:** 4-6 white spark particles from contact point between head and ball
- **Kick:** 6 particles in the character's team color, short life, burst outward
- **Goal scored:** 20+ confetti particles in the scoring team's color + white, falling from above; goal posts glow; crowd "wave" animation intensifies briefly
- **Ball hits ground:** Puff of dust/turf particles (4 green-brown particles)
- **Ball hits post:** Metallic ping visual — bright white flash on post + 3 ring particles
- **Character lands from jump:** Small ground-impact dust puff at feet

### UI Polish

- Score watermark: increase opacity slightly and add a glow pulse on each goal
- Timer: large, centered above the action with a subtle tick animation each second
- Goal message: large text that zooms in, overshoots, and settles — with a glow halo
- Pre-kick arrow indicator: replace the semi-transparent arc with a more visible glowing power arc that shows aim direction

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Ball bounce (ground) | Soft rubber thud | 120 Hz sine, fast attack/decay | 80ms | Pitch varies with impact velocity |
| Header (ball hit head) | Solid thwack | 200 Hz sine + noise burst | 120ms | |
| Kick | Harder thwack | 160 Hz sine + stronger noise, Q=3 | 150ms | |
| Ball hits post | Metallic clang | 600 Hz sine with rapid frequency wobble | 300ms | Slight reverb |
| Goal scored | Air horn + crowd cheer | Sawtooth 110 Hz for 800ms; then white noise crescendo | 1.5s | |
| Jump | Light spring | 300→500 Hz sine | 60ms | |
| Land | Soft thud | 80 Hz sine | 60ms | |
| Kick action (swing) | Whoosh | White noise hi-pass swept 1000→4000 Hz | 100ms | |
| Win fanfare | Ascending brass-like chord | Sawtooth 220, 330, 440, 550 Hz | 800ms | |
| Lose | Descending wah | Sawtooth 440 → 220 Hz with LFO tremolo | 600ms | |

### Music/Ambience

Crowd ambience synthesized as filtered pink noise at very low volume, with an occasional crowd roar sample (synthesized: a chord of 8-12 random sine waves between 200-800 Hz, brief burst). When a goal is scored, the ambient crowd noise swells for 2 seconds then settles. During play, add a very faint rhythmic handclap pattern (pink noise clicks at 2Hz) suggesting crowd rhythm. No melodic music during play — the action should carry the sound.

## Implementation Priority
- High: Ball spin seams, goal net bulge particles, goal scored confetti burst, stadium floodlight glow in background
- Medium: Character expressions (kick face), pitch stripe texture, ball squash/stretch, character landing dust
- Low: Crowd silhouette band, ball hits post metallic ping, crowd ambience synthesis, jersey stripes on characters
