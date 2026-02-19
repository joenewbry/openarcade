# Battleship Evolved — Visual & Sound Design

## Current Aesthetic
Two 10x10 grids side-by-side on a deep navy background (`#1a1a2e`). Grid cells are dark blue (`#1a2a3e`) with a muted border. Ships are rendered as cyan-blue filled rectangles with a soft glow. Hits display as red X marks with glow; misses are small grey dots; sunk cells are red-filled with a bordered X. Explosions are simple expanding circles (orange for big, red for small). The aim highlight uses a cyan crosshair. Labels and HUD text are muted grey-blue. The overall look is functional and clean but visually flat.

## Aesthetic Assessment
The naval/military dark blue palette fits the theme well. Ship colors (cyan blues) feel like a modern tactical display. The HUD is readable. However, the grids look like spreadsheets — no sense of ocean, depth, or dramatic tension. Explosions lack impact. The AI "ENEMY WATERS" grid has no atmosphere.
**Score: 2/5**

## Visual Redesign Plan

### Background & Environment
Two distinct ocean zones. The player's grid (YOUR FLEET) has a deep underwater-sonar look: animated scanlines sweeping slowly across, with a subtle radial ping emanating from center every few seconds. The enemy grid (ENEMY WATERS) has a darker, more ominous fog-of-war appearance — deep red-black tint — with occasional radar sweep lines radiating outward. The canvas background is a deep ocean gradient from `#050a14` at top to `#0a1020` at bottom. A subtle horizon line separates the two grid zones with a thin glowing line.

### Color Palette
- Primary (player/cyan): `#00d4ff`
- Secondary (enemy/danger): `#ff3030`
- Background deep: `#050a14`
- Background mid: `#0a1525`
- Grid lines: `#0d2040`
- Glow/bloom: `#00aaff`
- Hit fire: `#ff6600`
- Sunk: `#ff2020`
- Miss: `#3a5a6a`

### Entity Redesigns
**Ships (player grid):** Each ship is a sleek, angular polygon — not just a rectangle. A Carrier looks like a long flat hull with a faint silhouette of a superstructure. Ships have a subtle animated pulse along their length (a glowing trim line that travels from bow to stern every 2 seconds). Color: layered cyan with a brighter edge highlight. Sunk ships turn dark crimson and break into two halves visually.

**Hit markers:** Instead of a plain X, a hit displays a bright orange fireball burst that fades to a smoldering ember glow. The X remains as a targeting reticle beneath it.

**Miss markers:** A water splash — a small circular ripple that expands and fades, leaving a faint white dot at center.

**Aim crosshair:** Extends across the full enemy grid with dashed lines pulsing toward the target cell. The target cell itself shows an animated circle closing in.

### Particle & Effect System
**Hit explosion:** 12 orange/red particles burst outward, arcing with gravity, fading over 40 frames. A shockwave ring expands from the hit point.

**Ship sunk:** Large multi-stage explosion: initial white flash, then orange fireball expanding to 40px radius, then 20 dark smoke particles drifting upward. The ship polygon darkens and tilts slightly.

**Miss splash:** 6 pale blue droplet particles arc outward from impact, fading over 25 frames.

**Sonar ping (player grid):** A faint cyan ring expands from grid center every 3 seconds, fading as it reaches the border.

### UI Polish
Score and ship count displayed in a sleek dark panel with a cyan border glow. Status text appears in the center header in bold with a type-on animation effect (characters appearing one at a time). The placement phase shows a holographic-style overlay with a dashed ghost of the ship dragging behind the cursor. A "TARGETING..." state shows a slow red heartbeat pulse on the enemy grid border.

## Sound Design Plan
*(Web Audio API only — no external files)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Ship placement | Sine wave + click | 440Hz sine, short attack, decay to silence | 0.15s | Satisfying thud — low frequency clunk |
| Player fire | Cannon boom | White noise burst (0.1s) + 80Hz sine decay | 0.8s | Deep boom with reverb tail |
| Hit | Impact crack + sizzle | Bandpass noise 800Hz + 200Hz sine | 0.4s | Sharp crack, brief fire crackle |
| Miss (splash) | Water sound | White noise filtered 400-1200Hz, fade | 0.5s | Splashing water feel |
| Ship sunk | Victory burst | Chord: 220+330+440Hz sawtooth, fade | 1.2s | Triumphant chord stab |
| AI hit on player | Dark impact | Low 60Hz sine + distorted noise | 0.6s | Deeper, more ominous than player hit |
| AI sinks ship | Alarm | 880Hz square wave, 3 pulses, descending | 1.0s | Danger alarm feel |
| Game over (win) | Fanfare | Ascending arpeggio: 261, 329, 392, 523Hz | 1.5s | Bright major chord sequence |
| Game over (loss) | Failure | Descending 392→261Hz sine, slow fade | 1.5s | Sad descending tone |
| Cursor move | Blip | 1200Hz sine, 0.02s | 0.02s | Subtle UI tick |

### Music/Ambience
A looping low-frequency underwater ambience: deep 40Hz sine wave barely audible, combined with occasional slow-moving filtered white noise (resembling ocean current). A second layer adds a very quiet rhythmic sonar ping — a 1000Hz sine at 0.05 amplitude, pulsing every 3 seconds with a 0.3s decay. The ambience cuts to silence during explosions then slowly returns.

## Implementation Priority
- High: Hit explosion particles, miss splash ripple, ship sunk multi-stage explosion, sonar ping visual
- Medium: Ship silhouette polygons with animated trim glow, aim crosshair dashed pulse, dark enemy grid fog tint
- Low: Type-on status text animation, ship break-apart animation on sunk, background ocean gradient layers
