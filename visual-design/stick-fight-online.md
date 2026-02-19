# Stick Fight Online — Visual & Sound Design

## Current Aesthetic

A physics platformer with stick-figure fighters. Background is dark navy with a faint red grid. Platforms are flat rectangles in dark purple-blue (normal) and brown (crumble), with thin border lines. The lava is an orange-red layered rect fill with an animated wave poly. Fighters are stick figures: circle head, line body, line arms and legs. Weapons are very small colored shapes floating and bobbing. Particles are simple squares. The overall aesthetic is minimal but has decent bones — the lava wave and weapon glow effects already exist.

## Aesthetic Assessment
**Score: 2.5/5**

The stick-figure art style is intentional and charming. The main weakness is the backgrounds (flat navy with barely-visible grid) and the sameness of platforms. Lava is decent. The game needs more dynamic arena feel and weapon impact weight.

## Visual Redesign Plan

### Background & Environment

**Background**: A dynamic arena concept. Base is deep dark navy-black (`#080818`). Columns of faint hexagon grid lines at 4% opacity in neon blue-green provide a futuristic arena feel. Add 3 parallax layers of floating geometric shapes (thin outlines of triangles, hexagons) very slowly drifting at different speeds — suggesting an industrial suspended arena.

**Background glow zones**: Near the lava, the lower third of the background gets a warm orange upwash — a large semi-transparent orange circle centered at the bottom (`#f8440015` fill) that pulses with the lava.

**Platform redesign**: Normal platforms — metallic appearance using three layers: dark base rect, slightly lighter top face rect, bright 1px highlight line on the very top edge. Add subtle rivets (small circles at platform ends). Crumble platforms have visible crack patterns drawn in with thin diagonal line polys, and shake more dramatically (increase shakeX range). The crack lines deepen in color as the crumble timer progresses.

**Lava**: More dramatic. Multiple wave layers at different phases and amplitudes — draw 3 wave polys stacked: deepest in dark orange-red, middle in bright orange, top wave in near-yellow with a glow. Add random lava bubbles (circles that appear and pop at the surface — small circles that scale up from 0 to 6 radius over 20 frames then disappear). The lava glow halo spreads higher as lava rises.

### Color Palette
- Fighter 1 (Player): `#44aaff`
- Fighter 2 (CPU): `#ff4444`
- Fighter 3: `#44ff44`
- Fighter 4: `#ff44ff`
- Normal platform: `#3a3a5a` / `#5a5a8a`
- Crumble platform: `#5a4422` / `#8a6633`
- Lava surface: `#ff6600`, `#ff9900`
- Lava deep: `#cc2200`
- Background: `#080818`, `#0d0d22`
- Glow/bloom: `#ff6600`, `#44aaff`, `#ff4444`

### Entity Redesigns

**Stick Fighters**: Keep stick figure style but add personality:
- **Head**: Slightly larger circle, with two tiny dot eyes that shift direction based on facing direction.
- **Body**: Lines are slightly thicker (2.5px → 3px). The torso has a subtle colored outline ring suggesting a shirt/vest.
- **Arms/Legs**: Animated more fluidly — leg swing extends further, arm positions during attacks show more follow-through.
- **Hit flash**: White flash stays, but add a colored ring expanding from the hit point.
- **HP bar**: Styled as a narrow neon bar with inner glow. Low HP bar flickers (alternates between normal and bright every 3 frames).
- **Death**: Instead of disappearing, the stick figure crumples — body line collapses, limbs fall, then dissolves into particles.

**Weapons** (pickup and held):
- **Sword**: A proper blade — elongated thin polygon with a guard (crosspiece rect) and grip (darker colored handle). In hand, held at a proper angle.
- **Gun**: Rectangular with visible barrel, trigger guard, grip. Shows small muzzle flash circle when firing.
- **Grenade**: Egg-shaped (octagon poly) with pin detail (small line).
- **Laser pistol**: Sleek angular polygon with glowing barrel tip.

**Projectiles**:
- **Bullets**: Elongated oval (3x1 rect), leaves 4-frame light trail.
- **Grenades**: More visible — green circle with dark cross pattern, bounces with a metallic clink visual (small star spark at each bounce).
- **Laser**: Thicker beam (4px), magenta glow, leaves 8-frame afterimage that fades.

### Particle & Effect System

- **Hit particles**: On damage, 6 particles eject with the fighter's color plus 3 small white sparks. Each particle is a diamond (rotated square) not a plain square.
- **Platform crumble**: When a platform dies, 12-15 chunk particles in platform color eject and bounce with gravity.
- **Explosion (grenade)**: Expanding circle ring + 20 fire particles. Shockwave circle expands to 80 radius over 12 frames and fades.
- **Lava death**: Large burst of orange particles with upward initial velocity. Screen edge flashes deep orange for 15 frames.
- **Weapon pickup glow**: When a weapon spawns, a vertical light beam shines upward (narrow white rect, fading). Weapon bobs with a glow ring.
- **Round win**: Confetti burst from winner — 20 particles in winner's color shooting outward.

### UI Polish

- **Player score display**: Each player's score is shown as glowing dots (filled circles) in their color, one per round won.
- **Round transition**: Between rounds, a dramatic white flash fills the screen and fades over 20 frames. "ROUND X" text zooms in from tiny to normal size.
- **Lava warning**: "LAVA RISING" text pulses and grows slightly before lava appears.
- **Weapon HUD**: Bottom bar shows held weapon icon + ammo count as small bullet dots.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Punch hit | Triangle osc + noise | 200Hz blip + noise burst | 80ms | Meaty thwack |
| Sword slash | Noise filtered highpass | 3000Hz, fast attack | 100ms | Whoosh-crack |
| Gun shot | Noise burst with reverb tail | Broadband, short sharp | 120ms | Pop with brief echo |
| Grenade bounce | Triangle wave | 400→300Hz | 60ms | Metallic clunk |
| Grenade explosion | Noise + bass thump | Noise burst + 60Hz sine | 500ms | Boom — separate channels |
| Laser fire | Sine sweep | 800→200Hz | 200ms | Sci-fi pew |
| Player death | Descend chord | 330, 220, 165Hz arpeggio down | 600ms | Defeat wah |
| Platform crumble | Low noise rumble | Bandpass 150Hz | 400ms | Creak and collapse |
| Lava sizzle | White noise filtered bandpass | 800Hz, Q=3, continuous | Continuous loop | Bubbling lava ambient |
| Round win | Ascending stab | 523→659→784→1047Hz | 600ms | Victory sting |
| Weapon pickup | Bell-like sine | 880Hz with fast decay | 200ms | Ding |
| Jump | Short sine up | 330→440Hz | 100ms | Hop sound |

### Music/Ambience

An intense electronic battle theme loop. Four bars at ~140 BPM:
- **Bass**: Square oscillator at 55Hz with heavy envelope gating (0.3s on, 0.1s off) driving a 4/4 rhythm.
- **Lead**: Sawtooth at 220Hz, filtered through a resonant lowpass (cutoff sweeps from 400 to 2000Hz over 4 bars using an LFO).
- **Hi-hat**: Narrow bandpass noise (8000Hz) every eighth note at low volume.
- **Lava intensity layer**: As lava rises, a low drone oscillator fades in (80Hz sine, gain scales with lava height). Creates urgency.
- **Round win sting**: Short fanfare stab plays over the loop.

## Implementation Priority
- High: Weapon redesigns (sword/gun/grenade/laser shape), explosion shockwave ring, grenade/gun sound effects, lava bubbles
- Medium: Platform metallic look + rivets, background hexagon grid, lava wave multi-layer, death crumple animation
- Low: Parallax floating geometry background, confetti round win, fighter detail eyes, lava ambient loop integration
