# Spy Hunter — Visual & Sound Design

## Current Aesthetic

Top-down vertical scrolling road game. Road is dark grey (`#222`) with orange-red edge lines that have glow. Lane dashes are dim grey. Grass strips are very dark green. The player car is orange-red (`#e86`) with a gun barrel. Enemy cars use flat colors: red Road Lord, yellow Switchblade, magenta Enforcer. Civilians are blue. Power-ups are colored circles. Particles are small colored squares. The overall effect is functional retro-arcade but lacking depth and atmosphere.

## Aesthetic Assessment
**Score: 2/5**

The glow on road edges is a good start, but the flat car shapes, uniform dark road, and simple particle squares leave the game feeling bare. The core loop is solid — it needs cinematic road atmosphere and car designs that read clearly.

## Visual Redesign Plan

### Background & Environment

**Road**: Replace flat `#222` with a subtle animated road texture. Draw alternating dark bands (very slight color variance `#1e1e1e` / `#242424`) scrolling with road offset to suggest asphalt grain. Add a center divider with double yellow line (two 1px lines 3px apart). Road edges get a wider glow band — draw a 6px-wide strip in `#e86` at 40% alpha behind the solid edge line for an ambient spillover effect.

**Grass**: Replace flat dark green with a procedurally varied strip. Draw small random dark-green rect patches at different shades to suggest undergrowth texture. Add very subtle parallax: grass offset scrolls at 60% of road speed, giving depth.

**Road forks**: The fork polygon fills should be the same road surface color. Add chevron warning markings at the fork entry point (angled yellow rect stripes).

**Sky/atmosphere**: Since the road fills the screen, add a speed-blur effect — horizontal faint grey lines extending from both road edges (the "rushing" feeling) that scale in count/intensity with scroll speed.

### Color Palette
- Primary: `#e86040` (player car warm orange-red)
- Road: `#1e1e22`, `#242428`
- Grass: `#0a2a0a`, `#0c320c`
- Road edge glow: `#ff6030`
- Enemy Road Lord: `#e02020`
- Enemy Switchblade: `#ffe020`
- Enemy Enforcer: `#d020d0`
- Civilian: `#40a0f0`
- Glow/bloom: `#ff6030`, `#ffe020`

### Entity Redesigns

**Player Car**: Keep the triangular hood but add more detail. Draw side exhaust vents as two small dark rects on each side of the body mid-section. Add a rear spoiler (horizontal rect across back). Windshield gets a light blue tint with a slight highlight line across the top. Headlight glow: two small circular glows at the front in warm white. Invincibility blink replaced with a ghost-blue transparent overlay instead of skip-draw.

**Road Lord (armored)**: Rounder, chunkier profile. Add riveted armor plates by drawing a grid of 2px dark dots on the body. Side spikes as small outward-pointing triangles. Red health bar above glows when at 1 HP.

**Switchblade**: Sleek wedge profile. The oscillating blade extensions animate more dramatically — longer range, thin and bright silver. Body gets a checkered roof pattern (tiny alternating squares) to suggest racing heritage.

**Enforcer**: Angular military look. Add a visible gun turret that rotates toward the player (pre-shoot warning). Warning flash becomes a building red circle that grows from the turret tip. Body gets "ENFORCER" stencil text in dark paint (implied by 2-3 rect marks).

**Civilian**: Pastel blue family car. Add a subtle roof rack (rect). Civilians that are alive have a small heart icon above them to make accidental hits feel more consequential.

**Oil Slicks**: Rainbow-sheen effect — draw 3 overlapping circles of slightly different hue (violet, cyan, yellow) at very low alpha on top of the green base circle, suggesting iridescent oil. Slowly rotate hues over time using sin(frameCount).

**Power-ups**: Instead of plain circles, draw distinct shapes per type. OIL: barrel shape (rect with oval top). SMOKE: cloud shape (3 overlapping circles). MISSILE: rocket silhouette (triangle on rect). Each pulses with a bright outer ring.

### Particle & Effect System

- **Explosion**: Replace square particles with 14 triangle/diamond polygons radiating outward, each rotating as they travel. Outer ring of spark lines drawn with drawLine from center. Brief screen flash at 10% white alpha for large explosions.
- **Bullet trails**: Each bullet leaves 3 fading trail segments behind it (previous positions at 70%, 40%, 15% alpha).
- **Oil slick hit**: Enemy cars that hit oil spiral outward with a skid mark — draw 4 arc-shaped dark lines behind the spinning car.
- **Road dust**: At high speeds, emit tiny brown/grey particles from road edges scrolling backward.
- **Civilian hit**: Small blue heart fragments scatter upward — feels bad intentionally.

### UI Polish

- **HUD**: Replace plain text weapon indicators with icon-based bars. Gun: small gun silhouette with bullet dots. Missile count: rocket icon + number. Oil count: barrel icon + number. Speed: analog-style arc meter in bottom right corner.
- **Speed indicator**: The mph text becomes a proper speedometer arc drawn with strokePoly.
- **Score flash**: Score increases trigger a brief number-float upward animation (previous score value fades upward while new value appears).

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Engine idle | OscillatorNode sawtooth, low gain | 80–120Hz, varies with scroll speed | Continuous loop | Low growl; pitch scales with scrollSpeed |
| Machine gun fire | Noise burst through BiquadFilter bandpass | 800Hz center, Q=2 | 60ms per shot, rapid repeat | Staccato crackle |
| Missile fire | Sine sweep up + noise | 200→600Hz sweep | 300ms | Whoosh launch feel |
| Enemy explosion | Noise + sine at 80Hz | Noise burst + bass thump | 400ms | Crunch then rumble |
| Player explosion | Noise burst, longer | Bandpass noise 200Hz, gain 1.0 | 600ms | More intense |
| Power-up collect | Sine arpeggio | 440→550→660Hz | 250ms | Positive jingle |
| Oil drop | Splat — noise burst low freq | Bandpass 150Hz | 200ms | Wet thud |
| Civilian hit | Sad descend sine | 440→330Hz | 300ms | Guilt-inducing |
| Score milestone | Tri-tone ascending | 440, 550, 660Hz simultaneous | 400ms | Achievement stab |

### Music/Ambience

A driving synth bass loop: two sawtooth oscillators an octave apart (55Hz and 110Hz) pulsing at 4/4 rhythm via a gain envelope that opens to 0.3 and closes to 0.05 every 0.5 seconds. Add a simple hi-hat rhythm: noise bursts through a very narrow highpass filter (4000Hz cutoff) at quarter-note intervals. Third element: a square-wave "spy theme" melody fragment — four notes cycling (A4, G4, F4, E4 = 440, 392, 349, 330 Hz) at half-note intervals. The whole thing loops every 4 seconds. Volume ducks during explosions.

## Implementation Priority
- High: Engine sound (continuous speed-reactive), gun fire sound, explosion particle triangles, road texture animation
- Medium: Car detail redesigns (player/enemies), power-up shape overhaul, missile/oil sounds, bullet trails
- Low: Grass parallax, rain-of-speed blur lines, civilian heart icons, speedometer arc HUD
