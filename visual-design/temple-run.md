# Temple Run — Visual & Sound Design

## Current Aesthetic

A 3-lane endless runner on a 400x600 canvas. The player is a simple amber `#d84` rectangle. The corridor walls scroll upward with tiled stone texture (rectangular panels). Three obstacle types: OBS_ROOT (a brown root cluster to jump over), OBS_FIRE (an orange flame to slide under), OBS_GAP (a void to jump across). Yellow coins bob on a sine wave. A particle trail follows the player. Score and distance shown in DOM elements.

## Aesthetic Assessment
**Score: 2/5**

The lane structure and obstacle variety are solid game design, but the visuals are primitive. The player is a featureless box, the temple walls are repetitive rectangles with no character, and obstacles have almost no visual distinction beyond color. There is no sense of urgency, no jungle atmosphere, no feeling of running through an ancient perilous structure. The camera perspective is flat with no depth illusion.

## Visual Redesign Plan

### Background & Environment

The background on either side of the corridor (the flanking panels) should suggest a dense jungle: dark green `#0a1a0a` with overlapping leaf silhouettes — draw 20-30 irregular pentagon shapes at varying sizes (8-25px) scattered randomly across the side panels, in colors ranging from `#0f2208` to `#1a3a0a`, layered to suggest foliage depth.

The corridor itself should look like ancient stone — the wall tiles should have a cracked stone texture: draw each tile as a filled dark-gray rectangle, then overlay 2-3 thin random crack lines (short jagged polylines in `#1a1a14`) across each tile face. Alternate tile colors slightly between `#2a2820` and `#343028` to break monotony.

At the far top of the corridor (the "ahead" direction), add a subtle vanishing-point depth effect — draw the corridor walls converging slightly (the far end narrower than the near end) by 8-10px on each side. This creates a forced perspective that suggests forward motion.

Hanging vines cross the corridor periodically — thin wavy green `#1a4a10` lines that dangle from the top edge and sway gently with a slow sine oscillation. These appear as background decoration only (not obstacles) and scroll with the world.

### Color Palette
- Primary: `#d84` (player amber/gold — treasure hunter)
- Secondary: `#c44` (root obstacles), `#f82` (fire obstacles), `#ffd700` (coins)
- Background: `#0a1a0a` (jungle flanks), `#2a2820` (stone corridor tiles)
- Glow/bloom: `#ffd700` (coins), `#f82` (fire glow), `#d84` (player trail)

### Entity Redesigns

**Player Character:** A stylized human silhouette with more detail. Body: an amber `#d84` torso rectangle with a slightly narrower head circle on top. Two small arm rectangles angled downward while running. During jump: arms swing up (rotate arm angle 45 degrees upward, animate over 8 frames). During slide: the entire body flattens to half height, head disappears, arms extend outward. Running animation: alternate left/right foot (two small rectangles below torso) with a 6-frame cycle, offset by 3 frames.

A flowing scarf/cape renders behind the player — 3-4 connected line segments that trail and wave. During normal running the cape streams backward at 15-20px. During jumps it lifts upward. Color: deep red `#c23a10`, drawn before the player body each frame.

**Root Obstacle:** Replace the simple shape with an actual gnarled root cluster. Draw 3-4 thick curved arcs (bezier approximations using line segments) erupting from the ground in dark brown `#5a2808`, each ending in a pointed tip. Add dirt particles scattered near the base (4-6 tiny brown rectangles).

**Fire Obstacle:** A proper animated flame. Draw 3 overlapping flame shapes (irregular tall ovals narrowing to a tip) in concentric layers: outer `#f44` (red), middle `#f80` (orange), inner `#ff0` (yellow). Animate by shifting the flame shapes' tip positions left/right by ±3px each frame using a sine wave at 8 Hz. Apply `setGlow('#f80', 12)` around the fire. The fire should illuminate the nearby floor tiles with an orange tint glow pool beneath it.

**Gap Obstacle:** The gap should show depth — a dark void `#050505` with a subtle downward gradient and distant rocky walls visible at the sides. Draw a faint mist effect at the gap edges: 3-4 semi-transparent white thin rectangles hovering just above the void edge.

**Coins:** Replace simple circles with proper gold coins — a filled yellow circle `#ffd700` with a darker ring `#b8860b` inside (like a coin face). Rotate the coin to show it spinning: alternate between full width and a narrow ellipse over 8 frames to simulate 3D spin. Apply `setGlow('#ffd700', 6)`.

### Particle & Effect System

- **Player footsteps:** Every 6 frames while running, emit 2 tiny dust particles `#8a7a60` that rise and fade over 12 frames behind the player's feet.
- **Coin collected:** 6 star-shaped spark particles in gold radiate from the coin position and fly upward, fading over 20 frames. A brief `+1` text floater appears.
- **Root collision (stumble):** Brief screen shake (offset canvas by ±4px for 6 frames). Dirt burst — 8 brown particles arc outward from impact point.
- **Fire collision:** Orange flash overlay at 60% opacity for 3 frames, then fade. Ember particles (4 glowing orange dots) drift upward from player position.
- **Gap fall:** Player body tumbles (rotate the player rectangle) while falling off screen. Faint scream dust trail.
- **Near miss:** When an obstacle passes within 20px of player without collision, brief white outline flash on player for 3 frames.
- **Speed milestone:** Every 10% speed increase, brief golden radial flash from player center, score multiplier text zooms in and out.

### UI Polish

- **Distance counter:** Style as a stone tablet texture — dark bordered rectangle with carved text aesthetic. The number itself in amber glow `#d84`.
- **Score multiplier:** Large floating number above the player when a streak is active, drawn in bright gold with scale-in animation.
- **Lives (if applicable):** Draw as small running figure silhouettes in the top-left, dimming to outline for lost lives.
- **Speed indicator:** A subtle horizontal bar at the bottom — amber fill showing current speed percentage from base to max. The bar pulses brighter when speed increases.
- **Game over overlay:** Stone tablet slabs slide in from both sides to cover the screen, revealing carved text "YOU FELL". Crumbling particle effect at the seam where slabs meet.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Footstep | Noise burst, lowpass | Lowpass noise 300 Hz, soft | 30ms | Staggered L/R |
| Jump | Sine sweep up | 200→600 Hz | 120ms | Rising whoosh |
| Land | Sine thud | 100 Hz, sharp attack | 80ms | Stone impact |
| Slide | Noise scrape | Sawtooth 120 Hz, lowpass 400 | 80ms | Slide sound |
| Coin collect | Sine chime | 1200+1600 Hz brief overlap | 80ms | Bright ping |
| Coin streak (×3) | Ascending chime | 1200, 1400, 1600 Hz | 150ms | Rising reward |
| Root hit | Noise thud | Broadband noise, lowpass 200 | 150ms | Hard stumble |
| Fire hit | Crackle burst | Noise highpass 2kHz + 80 Hz sine | 200ms | Heat impact |
| Gap fall | Descending sine | 400→50 Hz sweep | 400ms | Falling into void |
| Speed up | Brief whoosh | Sine 300→800 Hz | 100ms | Velocity ramp |
| Game over | Sad tone | Sine 440, 392, 349, 294 Hz | 600ms | Defeat chord fall |
| Start run | Drum hit | Noise 200 Hz + sine 80 Hz | 100ms | Starting kick |

### Music/Ambience

A looping jungle percussion ambience: a bass drum pattern using sine 60 Hz with fast decay (gain 0.08) hitting every 0.5 seconds, with a softer hi-hat substitute (highpass noise at 6kHz, gain 0.02) on the off-beat at 0.25s intervals. A distant tribal melody plays on triangle waves: notes A3, C4, E4, G4 (220, 262, 330, 392 Hz) in a repeating 4-beat pattern at gain 0.03. The tempo of all ambience elements scales linearly with the current scroll speed — at base speed the tempo is 120 BPM, at max speed it reaches 180 BPM, creating an audio-visual urgency lock.

## Implementation Priority
- High: Fire obstacle animation (layered flames + glow), player running/jump/slide stance changes, coin spin animation
- Medium: Root cluster arcs, stone tile crack overlay, footstep dust particles, coin collect spark burst
- Low: Jungle foliage side panels, vine sway decoration, cape trail behind player, game over stone slab animation
