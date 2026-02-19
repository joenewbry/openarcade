# Nidhogg-Like — Visual & Sound Design

## Current Aesthetic

Dark background (#0a0a1e) with faint vertical red/blood lines. Red glowing ground strip with glow. Fighters as stick figures with rotated bones — proper limb/torso/head structure with sword or fist. Sword has guard detail. Thrown sword spins with rotation math. Block shield as dashed vertical line. "EN GARDE!" text in gold. Progress bar at bottom. Very minimal aesthetic — deliberate lo-fi. The bone-structure fighter drawing is genuinely good animation code.

## Aesthetic Assessment
**Score: 3/5**

The stick fighter movement is excellent (proper bone rotation, death tumble, limb animation). The red-on-dark color scheme has a fighting game intensity. However the background is near-empty and repetitive, the ground design is thin, and the fighters could push further stylistically while keeping the stick-figure readability. The 9-screen scrolling world is under-utilized visually.

## Visual Redesign Plan

### Background & Environment

Transform into a Greek underworld / Viking afterlife visual. The Nidhogg is the great serpent gnawing the world-tree — lean into that mythology.

**Sky/background:** Extremely dark (`#040408`) with procedurally-placed "bone rune" symbols — small 8-10px glyphs (drawn as simple line combinations: crosses, angles, circles with lines) scattered across the background in `#1a0a0a` — barely visible. Every 300px of world X position, the background hue shifts slightly (between deep red and deep purple).

**Ground:** Instead of a flat glowing strip, the ground is cracked stone tiles. Draw 40px-wide rectangular "slabs" with thin darker crack lines between them. Each slab has a subtle 3D bevel (top edge slightly lighter). The red glow strip remains but is placed beneath the ground texture as an underglow. At the screen edges, jagged broken stone column fragments rise from the ground (simple rectangles in dark gray, irregular heights 20-80px, width 10-20px).

**Screen dividers:** The dashed vertical lines (currently very faint red) become visible chains — thin vertical rects with overlapping oval "link" shapes every 20px in `#2a2020`. Slightly glowing when a fighter is in this screen zone.

**Pillars:** Upgrade from simple rects to proper stone columns — each pillar has a wide capital at top (fillPoly trapezoid) and a plinth at base. Subtle stone texture via 2-3 horizontal line variants.

**Win zones:** Left (AI goal) and right (P1 goal) zones get dramatic styling. At the far ends of the world, a glowing portal is visible — a tall rect in dark red/gold with a bright edge glow. The zone tint becomes stronger closer to the portal.

### Color Palette
- Background: `#040408`
- Ground stone: `#1a1525`
- Ground stone lighter: `#221e30`
- Ground glow: `#cc2200` (blood red)
- P1 fighter: `#ffcc00` (gold)
- AI fighter: `#ff4444` (blood red)
- Sword blade: `#c0d0ff` (cold steel)
- Guard/handle: `#886644` (brass)
- Dropped sword: `#a0b0dd`
- Thrown sword (P1): `#ffe055`
- Thrown sword (AI): `#ff6666`
- Particle (blood): `#cc0011`
- Particle (P1): `#ffcc00`
- Particle (AI): `#ff4444`
- Glow/bloom: `#cc2200`, `#ffcc00`, `#ff4444`

### Entity Redesigns

**Fighters:** Keep the excellent stick-figure structure but add:
- **Head:** Instead of a plain filled circle, a proper helmeted warrior head: the circle for the skull, plus a helmet shape (curved rectangle overlapping the top 60% of the head) in dark metal. P1's helmet has a gold crest (3px line on top). AI's helmet has a red crest.
- **Torso:** Add a slight cuirass/armor indicator — two small square "plate" shapes on the chest area (tiny rects in slightly lighter color than the body).
- **Weapon redesign:** The sword is now more detailed: blade in cold steel (`#c0d0ff`, slightly different at tip vs base), guard as a gold cross piece (horizontal fillRect + vertical short bit), handle in dark wrapped texture (alternating dark/lighter stripes).
- **Fist (disarmed):** Replace simple circle with a proper knuckle-duster look — a horizontal rectangle (like a horizontal fist from the front) with a highlighted top edge.
- **Blocking:** The dashed line shield becomes a glowing hexagonal rune shield — a regular hexagon outline (6-point polygon, ~14px radius) in the fighter's color at 0.7 glow. Stance label (H/M/L) appears inside the hexagon.

**Sword stances (High/Mid/Low):** Add a brief stance indicator on attack — a sweep arc is drawn briefly showing the attack trajectory:
- High: Short arc curving down from head level
- Mid: Horizontal line at torso level
- Low: Short arc curving up from ground level

The arc fades over 6 frames.

**Dropped swords:** Currently plain line + handle. Now drawn as a full miniature sword: blade line, guard cross, handle — resting at 20° angle on the ground.

**Death sequence:** The current tumbling is good. Add: during the tumble, the fighter's color darkens (from bright to very dark, simulating "death dimming"). Blood particles (already existing in `#cc0000`) become more numerous (25 particles). The body fades to near-black over 40 frames before disappearing.

### Particle & Effect System

**Parry/clash:** When two attacks meet at the same stance, a bright white spark burst at the clash point (10-12 white particles radiating outward) plus the existing stun effect.

**Kill:** Already has particles. Add: the ground below the kill position briefly shows a blood splatter — 3-5 dark red ellipses (very flat, like splattered drops) that persist for 90 frames.

**Sword throw:** As the sword leaves the hand, 4-5 white spark particles emit from the throw point. The sword gets a more dramatic spinning effect with a brief motion trail (last 2 positions drawn at 50% and 25% opacity).

**Fighter advancing:** When a fighter advances after a kill (the automatic stride forward), their footstep sounds and brief ground-dust particles appear beneath their feet.

**EN GARDE!:** The text zooms in from 0 scale to full over 10 frames, with a burst of gold particles from the center.

**Respawn:** The respawning fighter materializes from particles — 20 particles converge from a 40px radius to the spawn point over 15 frames.

### UI Polish

- Progress bar redesigned as a "world scroll" map — the 9 screens represented as small chambers with connecting passages. Fighter dots mark positions.
- Kill score styled as carved tally marks rather than numbers.
- "P1 →" and "← AI" direction indicators use crossed swords icons (two short line-pair symbols) rather than plain text.
- Screen position indicator shows the current screen as a highlighted zone on the map bar.
- Win condition: when P1 reaches the right portal, a massive gold glow expands from that corner. When AI wins, a blood-red pulse.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Sword swing | Sine sweep + noise | 400→800Hz sine over 80ms + brief noise | 120ms | Whoosh of metal. |
| Sword clash (parry) | Metal ring | Two OscillatorNodes: 660Hz + 880Hz, 200ms decay | 200ms | Bright metallic clang. |
| Sword stab hit | Low thud + ring | 120Hz noise + 440Hz ring | 300ms | Heavy impact sound. |
| Fist hit | Flesh thud | Lowpass noise (200Hz cutoff) | 150ms | Meaty punch. |
| Sword throw (release) | Brief whistle | 1200→400Hz sine | 150ms | Throwing sound. |
| Thrown sword hit | Louder version of stab | | 400ms | More dramatic. |
| Sword pickup (from ground) | Scrape + click | Noise then short sine | 150ms | Metal on stone. |
| Fighter death | Dramatic impact | Low noise + body thud + brief descending tone | 600ms | Satisfying kill. |
| Fighter landing | Stone thud | Lowpass noise (150Hz) | 100ms | Footfall on stone. |
| Footstep (running) | Light click | 200Hz pulse, 30ms | Per step | Subtle. |
| EN GARDE! reveal | Rising brass chord | 330-415-523Hz (C-E-G) | 400ms | Battle call. |
| Win fanfare | Medieval trumpet phrase | 261-329-392-523Hz arpeggio + sustain | 1200ms | Victory. |
| Defeat fanfare | Same arpeggio descending | 523-392-329-261Hz | 800ms | Solemn loss. |

### Music/Ambience

A dark, tense ambient drone: a very low frequency OscillatorNode (40Hz sine, volume 0.03) that throbs slowly (amplitude modulation at 0.3Hz). Over this, a second OscillatorNode at 80Hz with slight detune creates a hollow, cavernous sound. When fighters are close together (distance < 100px), a mid-range tension layer (220Hz, tremolo at 6Hz) fades in. The whole ambient pauses during "EN GARDE!" then resumes. No melodic content — only dark atmosphere appropriate to fighting in the underworld.

## Implementation Priority
- High: Sword detailed redesign (cold steel blade + brass guard), fighter helmet shapes, blood splatter on ground after kill, dropped sword full miniature design
- Medium: Stone column environment upgrade, EN GARDE! particle burst, parry spark effect, sword-throw motion trail, respawn materialization particles
- Low: Rune symbols in background, progress bar redesigned as 9-screen map, world-end portal glow, stance sweep arc on attack, footstep particles
