# Terraria-Lite — Visual & Sound Design

## Current Aesthetic

A 2D sandbox game on a 600x400 canvas with a 50x34 tile world using 12px tiles. Tiles are simple filled rectangles with distinct colors: grass (`#4a8`), dirt (`#852`), stone (`#888`), iron ore (`#a86`), gold ore (`#da4`), wood (`#963`), leaf (`#3a3`), torches (`#f80`). The player is a small amber stick figure. The ally AI companion is a blue circle. Enemies are colored circles: slime `#4f4`, zombie `#696`, skeleton `#ddd`. The Demon Lord boss is a large red circle. A day/night cycle changes the background color. Dynamic lighting from torches creates a subtle spotlight effect.

## Aesthetic Assessment
**Score: 2/5**

The tile variety and dynamic lighting are promising foundations, but every entity is rendered as a colored circle or rectangle with no detail. The world lacks any sense of texture, depth, or atmosphere. Tiles are flat fills with no variation. At 12px per tile the world is already tiny — detailed sprites are challenging, but significant improvements can be made through consistent lighting, tile texture overlays, and more expressive enemy silhouettes.

## Visual Redesign Plan

### Background & Environment

The sky background should be a full gradient that evolves with the day/night cycle. At dawn/midday: a gradient from `#87ceeb` (sky blue) at top to `#c5e8f0` at bottom. At dusk: gradient from `#ff6b35` at top to `#cc4488` at horizon. At night: `#0a0818` at top deepening to `#06040f` at bottom with 40-60 star points (tiny white 1px dots) scattered across the upper portion. The stars appear gradually as darkness falls (opacity transitions over 500 game frames).

Below the surface, the underground should have a persistent dark vignette: render a semi-transparent dark overlay `rgba(0,0,0,0.4)` on all underground tiles, with intensity increasing with depth. Cave sections feel genuinely dark except near torch-lit areas.

Torch lighting should cast warm amber light pools on surrounding tiles. For each torch, draw a soft radial gradient circle (radius 48px, amber `#f84` at center fading to transparent) blended over nearby tiles. This creates genuine atmosphere in underground caves.

### Color Palette
- Primary: `#da4` (player amber/gold), `#4a8` (grass surface)
- Secondary: `#f84` (torch light), `#4f4` (slime), `#696` (zombie), `#ddd` (skeleton)
- Background: `#87ceeb` (day sky), `#0a0818` (night sky), `#2a1a08` (deep underground)
- Glow/bloom: `#da4` (torches/gold ore), `#f80` (demon lord), `#fff` (skeleton glow)

### Entity Redesigns

**Player:** A compact humanoid. Head: small circle in skin tone `#e8b88a` with two tiny dark dot eyes. Body: amber torso rectangle `#da4` with a vertical center line (shirt seam). Arms: two small rectangles that swing during walking — left and right arm alternate forward/back over a 10-frame cycle. Legs: two small rectangles with alternating step animation. When mining, the right arm swings forward and a tiny pickaxe shape (L-shaped pair of rectangles) extends from the hand. When the player has a sword, a small diagonal rectangle appears at the hand position.

**Ally AI Companion:** Replace the plain blue circle with a floating glowing orb companion. Draw a bright blue core circle (`#4af`, radius 5px) surrounded by a larger soft glow halo (radius 10px, same color at 30% opacity). The orb bobs gently on a sine wave (±2px at 1.5 Hz). When the ally fights an enemy, it pulses brighter and emits small spark particles toward the enemy.

**Slime:** A rounded blob shape — not just a circle, but a wider-than-tall oval with a flattened bottom. Draw as a wide ellipse `#4f4` with a lighter `#6f8` oval highlight in the upper quadrant. Add two small white dot eyes. Animate with a squash-and-stretch: the slime compresses vertically and widens horizontally just before jumping, then extends tall at jump apex.

**Zombie:** A humanoid silhouette with staggering pose. Dark green `#696` body rectangle, head circle, arms positioned unevenly (one higher, one lower) to suggest zombie shamble. Tattered clothing: draw 2-3 small dark rectangular notches at the clothing edges. Eyes: two red dots `#f44`.

**Skeleton:** A loose collection of white rectangles suggesting bones — a skull circle `#ddd` with hollow black eye sockets (two small black rectangles), a ribcage drawn as 4 short horizontal bars behind the torso rectangle, arm and leg rectangles with joint gaps between segments. Apply `setGlow('#ddd', 4)` for a faint bone glow.

**Demon Lord Boss:** A towering figure. Massive body (40x50px, dark crimson `#880010`) with large spread wings (two triangular polygons extending 30px to each side). Head: a larger circle with glowing red eyes (`setGlow('#f00', 8)`). Crown: three triangular spikes along the top of the head. Phase 2 (below 50% HP): the wings spread wider, eyes glow brighter, and a persistent flame aura pulses around the body.

**Tiles:** Add subtle texture to break up flat fills:
- Grass: horizontal thin green lines (`#5b9`) across the top 2px of each tile
- Stone: small gray `#666` rectangles of varying sizes (2-3 per tile) suggesting rock facets
- Dirt: scattered brown `#6a3` dots (2-4 per tile) for soil texture
- Iron Ore: bright silver `#ccc` fleck rectangles embedded in the stone color
- Gold Ore: bright `#ff0` fleck rectangles with `setGlow('#da4', 3)` applied

### Particle & Effect System

- **Mining:** When breaking a tile, emit 4-6 small particles in the tile's color, arcing outward with gravity. A brief screen shake (±2px for 4 frames) on each swing.
- **Enemy hit:** Red flash on the enemy body for 2 frames. White impact spark particles (3-4 points) at the hit location.
- **Enemy death:** Body explodes into 8-12 colored rectangle particles matching the enemy type, arcing outward with gravity and fading over 30 frames.
- **Torch placed:** Immediate warm flare — a bright `#f80` circle at full opacity that fades to the persistent glow level over 20 frames.
- **Player hurt:** Red screen edge vignette flash (dark red border, 4 frame pulse). Player blinks (alternating visible/invisible for 60 frames of invincibility).
- **Item pickup:** Small golden sparkle at the pickup position — 4 star-shaped particles rising upward.
- **Crafting:** Gear icon animation near the player — a small rotating rectangle outline for 20 frames.
- **Day-to-night transition:** A brief orange-purple sky shimmer as colors shift. Stars fade in with staggered timing (each star appears randomly within a 200-frame window).
- **Boss death:** Massive explosion — 20 dark crimson particles + 10 gold particles radiating from boss center. 3-frame white screen flash. Dramatic bass boom.

### UI Polish

- **HP bar:** Draw as a heart-shaped icon followed by a bar. The bar fill should be bright red `#f44` with a white specular stripe at top. Below 25% HP, the bar pulses with a red glow.
- **Day/night indicator:** Small sun or moon icon in the top-right corner. The sun is a yellow circle with 8 short rays; the moon is a crescent polygon. Transition between them with a scale animation.
- **Hotbar / inventory slots:** Draw slots as beveled stone texture rectangles — dark outer border `#1a1a1a`, slightly lighter face `#3a3a3a`. Selected slot has an amber highlight border `#da4`.
- **Crafting menu:** A stone tablet popup with carved text headers and item icon slots in the same beveled style.
- **Boss HP bar:** Appears at the bottom center, wider than the player bar, with a dark background panel and the boss name in red text above it.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Pickaxe swing | Metallic click | Triangle 800 Hz, sharp decay | 50ms | Tool impact |
| Block break | Noise thud | Lowpass noise 300 Hz | 100ms | Material crumble |
| Player footstep | Soft tap | Sine 180 Hz, short | 35ms | Alternating L/R |
| Player hurt | Yelp tone | Sine 440→220 Hz descent | 150ms | Pain signal |
| Player death | Long descent | Sine 330, 262, 220, 165 Hz | 700ms | Defeat fall |
| Slime jump | Soft spring | Sine 200→350 Hz | 80ms | Boing |
| Slime land | Wet thud | Noise lowpass 150 Hz | 60ms | Splat |
| Zombie groan | Low warble | Sawtooth 80 Hz, slow tremolo | 300ms | Undead growl |
| Skeleton rattle | Noise burst | Highpass noise 1.5kHz | 80ms | Bone clatter |
| Boss roar | Chord cluster | Sawtooth 60+80+100 Hz | 500ms | Massive boom |
| Sword swing | Whoosh | Sawtooth 400→100 Hz | 80ms | Blade sweep |
| Item pickup | Bright chime | Sine 880 Hz, brief | 60ms | Collect ping |
| Torch place | Ignite crackle | Noise 2kHz + 80 Hz sine | 100ms | Fire light |
| Level up / craft | Success chord | Sine 523+659+784 Hz | 300ms | Achievement tone |
| Day transition | Bell toll | Sine 440 Hz, slow decay | 400ms | Dawn bell |

### Music/Ambience

**Day ambience:** Gentle outdoor atmosphere — very quiet white noise filtered through a bandpass at 1200 Hz (wind, gain 0.02), and occasional bird chirp synthesis (sine 1800→2200 Hz sweep, 80ms, gain 0.04, random interval 8-15 seconds).

**Night ambience:** Darker tone — filtered noise at 400 Hz (gain 0.02) for nocturnal insect sound, no bird calls. Occasional distant wolf howl (sine 300→200 Hz slow descent, gain 0.03).

**Underground ambience:** Near-silence. Only a faint low drone (sine 55 Hz, gain 0.015) and occasional drip sound (sine 600 Hz, 40ms, very infrequent).

**Boss battle:** An aggressive rhythmic pattern activates — sawtooth bass note at 55 Hz pulsing in a 4/4 rhythm at 160 BPM (gain 0.06), with a noise hi-hat layer on every beat (highpass noise, 30ms, gain 0.03). This creates urgency that replaces the ambient sounds during the boss encounter.

## Implementation Priority
- High: Torch light pool rendering, slime squash-and-stretch animation, tile texture overlays, player mining arm swing
- Medium: Day/night sky gradient cycle, skeleton bone-segment rendering, Demon Lord wings + phase 2 aura, enemy hit flash
- Low: Star field night sky, ally orb bob animation, boss battle music layer, crafting gear animation
