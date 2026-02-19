# Bomberman — Visual & Sound Design

## Current Aesthetic
A 15x15 grid top-down view. Indestructible walls are dark grey with a brick pattern (two tones). Soft/destructible blocks are warm brown with highlight and shadow edges. The floor is very dark purple-blue. The player is a simple white circle (head) + white rectangle (body) + orange feet, with a faint orange glow. Enemies are ghost/blob shapes in purple or red with wavy bottom "tentacles" and white eye circles. Bombs are dark circles with an orange fuse line and glowing spark. Explosions are orange-yellow cells with a white hot core. Power-ups use simple colored shapes (circle for bomb count, diamond for range, triangle for speed). The HUD is a semi-transparent bar with orange text.

## Aesthetic Assessment
The aesthetic is functional and faithful to the grid-based feel of Bomberman. The brick walls have good texture. Enemies have personality with their bobbing and tentacles. However the color scheme is quite dull — the dark purple floor feels like a void rather than a dungeon floor. The explosions lack dynamism (they're just colored rects). The player character is barely distinguishable from the enemies in complexity. The game needs more visual drama and Bomberman's signature chaos energy.
**Score: 2/5**

## Visual Redesign Plan

### Background & Environment
The floor tiles get a proper dungeon stone look. Each empty tile: a dark charcoal base (`#111118`) with a subtle stone texture — a slightly lighter center region and darker edges (inner shadow), giving a depressed stone tile appearance. Every 3rd tile in a checkerboard pattern gets a very slightly different hue (`#12121a` vs `#111118`) for subtle variety.

Indestructible walls: completely redesigned as proper metal/concrete blocks. Dark steel base (`#252535`) with riveted corners (four small bright dots at each corner), a bright top-edge highlight, and a dark bottom-edge shadow. These should look like unmovable military bunker walls.

Soft blocks: warmer, more organic — a wooden crate look. Brown with a visible wood grain (3-4 faint horizontal lines), bright top edge, dark bottom edge, and an X mark across the face (like shipping crates). When about to be destroyed (just placed bomb nearby), they briefly crack: a thin zigzag line appears across the crate face.

### Color Palette
- Player: `#ffffff` body, `#ffaa00` boots/glow
- Enemy fast: `#ff4444`
- Enemy normal: `#cc44ff`
- Floor base: `#111118`
- Floor accent: `#12121a`
- Wall steel: `#252535`
- Wall highlight: `#404055`
- Soft crate: `#8b5a1a`
- Crate highlight: `#c98030`
- Bomb dark: `#1a1a1a`
- Bomb fuse: `#ff8800`
- Explosion center: `#ffffff`
- Explosion mid: `#ffdd00`
- Explosion outer: `#ff6600`
- Background: `#0a0a12`

### Entity Redesigns
**Player character:** Upgraded from a generic blob to a recognizable Bomberman-style character:
- Head: larger circle in cream/white
- Helmet: a blue-tinted dome arc over the top of the head
- Scarf/body: a distinctive white trapezoidal body with subtle blue collar line
- Arms: small circle gloves on each side (matching the direction of movement)
- Feet: two small orange/yellow boots that alternate in height during walking animation
- Glow: soft white glow instead of orange — Bomberman is the hero

**Enemies:** Normal enemies (purple ghosts) get rounder, friendlier-shaped heads with bigger eyes and a Pac-Man style mouth. Fast enemies (red) get a more angular, aggressive face with narrow eyes. Both enemy types get the tentacle waving but more dramatically (deeper sine wave, more tentacles — 5 instead of 4).

**Bombs:** Redesigned as a classic black sphere with a distinctive bright orange/yellow fuse coil at top. The sphere has a visible specular highlight (bright dot at top-left). As the timer depletes, the sphere pulses faster AND grows slightly (25% larger at last second). The fuse spark becomes a rapidly flickering bright dot.

**Explosions:** Multi-stage: frame 1-3 (instant, white flash), frame 4-8 (bright yellow core + orange arms), frame 9-20 (orange fading, smoke particles rising). The explosion cells have proper directional "arms" — center is a circle, arms are elongated in the blast direction.

### Particle & Effect System
**Bomb explosion:** Each explosion cell spawns 4-6 fire particles: bright orange/yellow dots that rise upward with slight randomness, fading over 12 frames. A shockwave ring briefly expands from the center explosion cell (circle outline, orange, fades over 6 frames).

**Soft block destruction:** The crate explodes into 6-8 wooden plank shards (small brown rectangles at random angles) that fly outward and fall with gravity, fading over 20 frames. A small brown dust puff rises.

**Enemy death:** Purple/red burst of 8 particles in the enemy's color. The enemy briefly flashes white before disappearing (frames of inverted color).

**Power-up sparkle:** All active power-ups have a continuous slow-rotation sparkle: 4 bright dots orbit the power-up icon in a circle, creating a sense of magical energy.

**Player death:** Player flashes 6 times (white/invisible alternating), each flash 4 frames. Then a small cross-shaped explosion centered on player.

### UI Polish
HUD bar at top: wider with more polish. Lives shown as small Bomberman character silhouettes instead of circles. Bomb count (B:X) shown as tiny bomb icons. Range shown as a horizontal line with arrowheads. Level shown prominently in the center in bright orange. Score displayed right-aligned. The HUD has a dark gradient bar rather than flat semi-transparent.

## Sound Design Plan
*(Web Audio API only — no external files)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Bomb place | Thud + click | 100Hz sine + 800Hz click | 0.2s | Bomb dropped |
| Fuse sizzle | White noise | Bandpass 2000-4000Hz, low amp | per bomb | Continuous while bomb counting |
| Explosion | Boom + crack | 60Hz sine 0.4s + noise burst 0.15s | 0.6s | Powerful boom |
| Chain explosion | Same + delay | Multiple explosion sounds, 50ms apart | cascading | Chain reaction drama |
| Soft block destroy | Wood crack | Bandpass noise 400Hz, sharp attack | 0.15s | Wood breaking |
| Enemy die | Enemy squeal | 600→200Hz sine sweep | 0.4s | Cartoon enemy hurt |
| Player move | Footstep | 200Hz sine, very short | 0.05s | Quiet step per tile |
| Power-up pickup | Chime | 1046Hz sine, bright | 0.3s | Positive pickup |
| Player hit | Impact alarm | Noise + 880Hz alarm beep x3 | 0.6s | Danger signal |
| Level complete | Fanfare | 523+659+784+1047Hz ascending | 1.0s | Classic win jingle |

### Music/Ambience
An upbeat chiptune-style loop using square waves. Melody: simple 8-note phrase in C major (523, 523, 784, 659, 523, 659, 784, 659 Hz) on a square wave with portamento-style pitch slides between notes. Bass: 131Hz square wave hitting on beats 1 and 3. Drum: 80Hz sine (kick) on beat 1, filtered noise (snare) on beat 3. Tempo: 160 BPM. The entire loop is synthesized as a scheduled sequence of oscillator nodes. Music fades out when player dies, brightens during chain explosions.

## Implementation Priority
- High: Multi-stage explosion with fire particles and shockwave ring, bomb redesign with pulsing countdown glow, wooden crate shards on destruction
- Medium: Player character upgrade with helmet and directional arms, enemy face redesigns with bigger eyes, power-up orbiting sparkle dots
- Low: Stone tile floor texture with inner shadow, steel wall rivets, enemy pre-death white flash
