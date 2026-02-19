# Dig Dug — Visual & Sound Design

## Current Aesthetic
A classic grid-based digging game with four depth-layered dirt colors ranging from sandy brown (`#8B6914`) at top to dark brown (`#503A0D`) at depth. Tunnels reveal a near-black background (`#12121e`). The sky is two rows of dark-to-slightly-darker blue gradient. The player is a blue-helmeted white-suited digger rendered in simple rectangles. Pookas are red circles with white goggle squares, Fygars are green rectangles with dragon snouts. Rocks are hexagonal grey polygons with highlight and crack lines. The overall aesthetic captures the original but feels muted — the colors are dark and the sprites lack expressiveness.

## Aesthetic Assessment
**Score: 2.5/5**

The depth layering is a smart visual cue and the enemies are recognizable. But the sprites are boxy, the dirt texture is nearly featureless, and the underground environment lacks the claustrophobic charm of the arcade original. The inflated enemy states need much more dramatic treatment.

## Visual Redesign Plan

### Background & Environment
The underground becomes a rich stratified world — each layer has distinct character:

**Surface (rows 0-1 — sky)**: A warm sunset-orange-to-deep-blue gradient sky. A silhouetted surface (dirt mound profile) along the boundary. A small cloud or two float in the top strip.

**Layer 1 (top dirt — sandy)**: Sandy loam with small pebble inclusions. Color: `#9a7020`. Occasional root tendrils (thin brown lines) wind through dirt blocks. Small earthworm sprites appear rarely.

**Layer 2 (clay)**: Denser, redder — `#7a3a18`. Clay veins in slightly lighter orange cross some blocks diagonally.

**Layer 3 (stone layer)**: Grey-brown `#584030`. Embedded fossil outlines (simple bone-like lines) suggest ancient depth.

**Layer 4 (deep rock)**: Near-black with magenta mineral glints `#3a0a20` + sparkle dots. Deepest, most dangerous feeling.

**Tunnel interiors**: Not just black — a deep blue-black `#06060e` with subtle bioluminescent patches: tiny clusters of 3–5 glowing dots in `#2a6aaa` at random tunnel intersections. The walls of dug tunnels get a thin bright edge on the freshly cut side.

### Color Palette
- Layer 1 (sandy): `#9a7020`
- Layer 2 (clay): `#7a3a18`
- Layer 3 (stone): `#584030`
- Layer 4 (deep): `#3a0a20`
- Tunnel: `#06060e`
- Tunnel bioluminescence: `#2a6aaa`
- Player suit: `#d8e8ff`
- Player helmet: `#3a8aff`
- Pooka body: `#e84040`
- Fygar body: `#3aaa3a`
- Rock: `#787898`
- Sky top: `#ff8a30`
- Sky bottom: `#1a2a6a`
- Pump beam: `#44bbff`

### Entity Redesigns
**Player**: More expressive design. The helmet becomes a round dome shape (circle on top of head) in `#3a8aff` with a small visor window. The suit has clear overalls shape — bib straps visible. Walking animation: feet kick outward in alternating motion. Digging animation: the arm with pump extends in a punching motion. The pump hose is a distinct dashed animated line that extends from the player's chest.

**Pookas**: Fuller, rounder bodies — no more boxy goggles; instead two large white circular eyes with black pupils that look toward the player. Red body has a subtle sheen highlight at top. When inflating, the body grows proportionally AND the expression changes — eyes get wide and terrified, mouth opens in a round "O". At max inflation, the entire sprite flashes white between red pulses. Ghost mode: Pooka becomes partially transparent with a faint blue outline, particles drift off its edges.

**Fygars**: Much more dragonlike — the rectangular body gets swept-back spines along the top edge. The snout extends further and has two small nostril dots. Fire breath becomes spectacular: a three-segment expanding cone of fire (yellow core, orange mid, red outer edge) that illuminates the surrounding tunnel walls orange. Wings (already present) flap once per movement step.

**Rocks**: Larger apparent size — the wobble before falling is more pronounced (6px swing vs 2px). The rock now has visible crack lines that deepen as it wobbles more. When falling, a shadow rectangle appears below it. On impact: rock shatters into 6–8 polygon shards that scatter and fade.

### Particle & Effect System
- **Digging**: Small dirt particles (3–5 brown rectangles, 2x2px) scatter in the direction opposite to player movement, fade in 8 frames.
- **Pump hit**: Air pressure rings — two expanding concentric rings emitting from pump tip on each pump increment.
- **Enemy pop**: Radial burst of 10 colored shards (enemy color) + brief white flash filling the cell.
- **Rock impact**: Shard explosion (6–8 grey polygon fragments), dust cloud (5 grey circles expanding and fading).
- **Player death**: Rapid spin animation (player sprite rotates while shrinking), then a burst of white stars.
- **Depth bonus text**: Points float upward from kill location in the layer's accent color.

### UI Polish
- Level depth indicator: instead of small "L1–L4" text, a vertical bar on the left side of the screen shows current layer as a glowing segment.
- Lives display: mini digger sprites with helmets.
- Level complete: "LEVEL COMPLETE!" banner with a fanfare of particles and the screen briefly tinting the layer color.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Digging | Short noise burst, lowpass 400 Hz | 50ms per step | Muffled crunch |
| Pump extend | Square wave 600→800 Hz sweep | 80ms | Air pressure |
| Pump hit enemy | Higher pitch hit: sine 900 Hz, quick | 60ms | Satisfying poke |
| Inflate step | Pitch-rising pop: sine 400 Hz + 100 Hz per level, 80ms | 80ms | Gets higher each pump |
| Enemy pop | Explosion: noise burst + bass sine 80 Hz | 200ms | Satisfying bang |
| Rock wobble | Low creak: triangle 150 Hz with pitch wobble ±20 Hz | 60ms per wobble | Ominous |
| Rock fall | Descending rumble: white noise + sine 100→40 Hz | 400ms | Heavy crash |
| Rock crush enemy | Deep thud: sine 60 Hz + crack noise | 250ms | Brutal |
| Player death | Descending melody: sine 880→110 Hz | 600ms | Sad fall |
| Level complete | 4-note ascending arpeggio: C5 E5 G5 C6 | 400ms | Bright celebration |
| Fygar fire | Hiss + crackle: noise + sine 300 Hz tremolo | 300ms | Fire breath |
| Ghost mode | Eerie reverb tone: triangle 440 Hz with vibrato | Looping | Ghostly |

### Music/Ambience
The ambient underground soundtrack builds from silence and percussion:
1. **Heartbeat pulse**: Two short sine bursts (60 Hz, 80ms) at 1.2-second intervals, representing underground tension.
2. **Depth tone**: A sine drone that descends in pitch as the player goes deeper — Layer 1: 110 Hz, Layer 2: 98 Hz, Layer 3: 82 Hz, Layer 4: 65 Hz. Very quiet, always present.
3. **Movement percussion**: Each player step triggers a very quiet triangle 200 Hz blip (20ms) — creates a subtle rhythm during active play.
4. **Enemy proximity alarm**: When an enemy is within 3 cells, a 440 Hz triangle wave pulses at 2 Hz at low volume.

No constant music loop — the ambient elements create enough atmosphere without competing with the digging sounds.

## Implementation Priority
- High: Layered dirt color redesign with texture inclusions, enemy inflate expression changes + white flash, rock shatter particle explosion, Fygar fire cone illuminating tunnel walls
- Medium: Player helmet dome redesign, Pooka ghost particle drift, bioluminescent tunnel patches, dirt dig particles
- Low: Sky gradient + surface silhouette, fossil outlines in stone layer, depth indicator bar, earthworm sprite cameos
