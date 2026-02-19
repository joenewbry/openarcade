# Tempest — Visual & Sound Design

## Current Aesthetic

A vector tube shooter rendered on a 500x500 canvas. The dominant color is purple (`#e4f`) for lane lines and the player claw. Enemies are distinct in color: flippers (`#0f0`), tankers (`#ff0`), spikers (`#0ff`), and fuseballs (`#f80`). The tube is drawn as lines from rim points to a central vanishing point. Player bullets are small purple lines. Particles from explosions are simple colored dots. A zoom transition occurs between levels.

## Aesthetic Assessment
**Score: 2/5**

The vector aesthetic is appropriate for Tempest — the original was a vector arcade machine — but the execution is minimal. Lines converge correctly to create tube depth, but there is no glow, no atmosphere, no sense that this is an electrifying arcade experience. Colors are solid with no bloom. Explosions are sparse dot particles. The tube shapes themselves are the most interesting visual element, but they lack any electric energy.

## Visual Redesign Plan

### Background & Environment

The background should be pure void — `#000000` black with a faint radial gradient vignette that adds just a hint of dark purple `#0a0012` at the center where the vanishing point is, creating depth. The vanishing point itself should have a persistent soft glow halo (`#5504aa` at 20% opacity, radius 40px) that pulses slowly at 1 Hz, as if there is an energy source deep within the tube.

Tube lane lines should have neon electric glow applied — `setGlow('#e4f', 8)` for all structural lines. When the player stands on a lane, that lane's rim segment brightens to `#fff` and gets a wider glow. The interior web lines (rim to vanishing point) should have a slight gradient effect: brighter at the rim, fading to 40% opacity as they approach the center.

Between levels, the zoom transition should have motion blur — render 4-5 ghost copies of the tube at different scale factors with decreasing opacity as the zoom accelerates through the tube.

### Color Palette
- Primary: `#e4f` (player claw, tube structure)
- Secondary: `#0f0` (flipper), `#ff0` (tanker), `#0ff` (spiker), `#f80` (fuseball)
- Background: `#000000`, `#0a0012`
- Glow/bloom: `#e4f`, `#fff` (active lane), `#5504aa` (vanishing point aura)

### Entity Redesigns

**Player Claw:** The claw should be a more elaborate shape — not just a simple polygon, but a stylized V with two outward-curving tines that end in pointed tips. Each tine tip gets a small bright spark highlight. During the superzapper, the claw should emit a wide arc of electricity spanning the full rim width, drawn as a jagged lightning polygon in bright white with purple glow, lasting 12 frames.

**Flipper:** Redesign from a simple colored shape into a proper winged form. Two triangular wings meeting at a center body pivot. The wings should animate by alternating which one is "up" as the flipper traverses the lane — giving a true flipping motion. Bright green `#0f0` with glow. Eyes: two tiny white dots on the center body.

**Tanker:** A bulging hexagonal container shape in yellow `#ff0`. When destroyed, split it open — two halves separating outward while releasing 2 flipper child enemies. The split animation should show the halves flying apart for 8 frames before the children emerge.

**Spiker:** A spindly arachnid form — a small body with 4 thin radiating legs. As it descends, it leaves a glowing `#0ff` spike trail on the lane web line. The spike on the lane should have a bright tip and fade to a dull color at the base.

**Fuseball:** A swirling plasma orb — render as a small circle with 8 radiating short arcs rotating continuously. Color `#f80` with an outer orange glow. Moves along the rim with a jittery frame-by-frame animation.

**Bullets:** Thick bright lines from player position inward toward vanishing point. White core `#fff` with `#e4f` outer glow, length 20px, thickness 3px.

### Particle & Effect System

- **Enemy death:** Bright starburst — 8-12 particles in the enemy's color radiating outward from the kill point on the rim, curving along the rim arc. Particles have tails (drawn as short lines behind them).
- **Player death:** Full-rim electric discharge — bright white arcs spread in both directions around the entire rim circumference, then implode inward toward the vanishing point. 20 frames total.
- **Superzapper:** Full screen flash for 2 frames, then all enemies show simultaneous death bursts at their positions.
- **Flipper reaches rim:** Red warning flash on that lane segment for 3 frames before the flipper climbs up.
- **Level zoom:** Motion-blurred tube with 5 translucent ghost copies, accelerating zoom speed, ends with a bright white flash filling the screen.
- **Lane spike hit:** Small `#0ff` burst at the spike position, player claw jolts back briefly.

### UI Polish

- **Lives:** Draw as miniature claw shapes in the HUD, not text. Lost lives are dim outlines, remaining are bright purple.
- **Level indicator:** Large dim tube shape behind the level number, suggesting the upcoming tube geometry.
- **Score:** Styled in all-caps with a subtle purple glow, top-center of screen.
- **Superzapper count:** Two lightning bolt icons — filled for available charges, hollow for spent.
- **Level transition text:** The level number appears at the vanishing point in huge bright letters, then zooms toward the player as the tube zoom plays.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Player shoot | Sawtooth, fast decay | 800 Hz → 200 Hz sweep | 60ms | Electric zap |
| Flipper death | Noise burst + sine | Noise highpass 2kHz + sine 440 Hz | 150ms | Crunchy pop |
| Tanker death | Low boom | Sine 120 Hz, slow decay | 200ms | Meaty thud |
| Spiker death | High crackle | Noise + triangle 1200 Hz | 100ms | Sharp snap |
| Fuseball death | Warbling burst | Sine 600→900 Hz wobble | 200ms | Plasma dissipate |
| Flipper on rim | Low alarm pulse | Sawtooth 160 Hz, 2 pulses | 200ms | Danger warning |
| Player death | Descending chord | Sine 440, 330, 220, 110 Hz cascade | 600ms | Defeat fall |
| Superzapper | Electric sweep | Sawtooth 200→4000 Hz, broadband | 400ms | Full discharge |
| Level complete | Ascending arpeggio | Sine 261, 329, 392, 523, 659, 784 Hz | 700ms | Victory run |
| Zoom travel | Doppler whoosh | Noise + sine 2000→200 Hz | 800ms | Through-tube effect |
| Bullet travel | Faint sine trail | Sine 1800 Hz, very low gain | Per-bullet | Subtle whine |
| Spike laid | Soft tick | Triangle 500 Hz | 30ms | Quiet deposit |

### Music/Ambience

A pulsing electronic drone: two oscillators at 55 Hz (sawtooth, gain 0.04) and 110 Hz (square, gain 0.02) running continuously, creating a buzzing arcade machine hum. A rhythmic arpeggio pattern plays at the tempo of the current level speed: sine wave hitting notes E2, G2, B2, E3 (82, 98, 123, 165 Hz) in sequence, each held for 250ms, cycling at gain 0.03. As the level number increases, the arpeggio tempo speeds up (each note shortens by 10ms per level, minimum 100ms). This creates the urgency of escalating Tempest levels through pure synthesis.

## Implementation Priority
- High: Neon glow on tube lines, flipper wing-flip animation, electric player death animation, bullet glow
- Medium: Fuseball swirl rotation, spiker leg animation, zoom motion blur ghost copies, superzapper arc
- Low: Vanishing point pulse halo, tanker split-open animation, level transition text zoom, electronic drone ambience
