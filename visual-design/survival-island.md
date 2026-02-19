# Survival Island — Visual & Sound Design

## Current Aesthetic

A top-down survival game on a 600x500 canvas with an 80x60 tile map at 16px tiles. Tile types: OCEAN (dark blue), SAND (tan), GRASS (green), ROCK (grey). Resources: TREE, ROCK, BERRY, PLANT, FISH_SPOT. The player is drawn as a colored circle with a direction indicator. Three AI castaways have distinct personality types. Crafting menu opens with recipes. Day/night cycle shifts lighting. The current look is placeholder — flat colored tiles with no texture, resource circles with no character, and minimal UI chrome.

## Aesthetic Assessment
**Score: 2/5**

The world generation creates a believable island shape (ocean surrounding sand coast surrounding grass interior with rocky highlands) which is a strong foundation. The day/night lighting shift is a great mechanic that needs visual support. Resources need to look like resources, the castaways need personality, and the whole world needs the warmth and texture that makes a survival game feel alive and worth exploring.

## Visual Redesign Plan

### Background & Environment

**Ocean tiles**: Replace flat dark blue with animated ocean suggestion. Base color `#1a4a7a`. Draw subtle animated wave lines — horizontal sine-curved 1px lines that slowly drift across ocean tiles (2-3 visible lines per tile area, shifting at 0.05px/frame). Near the island edge (sand-adjacent ocean tiles), add a lighter seafoam band `#4a8ab8` at the shore edge — a 4px lighter rect on the coast-facing side.

**Sand tiles**: Warm tropical sand `#e8c87a`. A fine stipple texture — random 1px dark dots at 8% alpha (`#b89040`) scattered across the tile area (pre-generated per tile, stable). At sand/ocean boundary, draw a thin bright highlight `#f0e090` on the wet sand edge.

**Grass tiles**: Rich tropical green `#2a8a2a`. Draw subtle grass blade suggestion — 3-4 thin 1px vertical lines per tile at slightly lighter green `#3aaa3a` at 30% alpha, varying heights 3-6px from the bottom of the tile. Grass near water gets a slightly yellower tint `#6aaa3a`.

**Rock tiles**: Hard grey `#6a6a6a` with a roughness pattern — irregular polygon outlines (4-6 sided convex poly) in slightly darker grey `#4a4a4a` at low alpha, suggesting stone facets and cracks.

**Day/night cycle visual**: During daytime — full brightness. As the cycle moves toward evening, draw a full-canvas overlay rect in orange-amber `#ff660020` that increases in alpha (0 to 0.3). Night: deep blue-black overlay `#00003080` at up to 50% alpha. Dawn: brief warm golden wash `#ffcc0030`. The cycle should feel dramatic and beautiful — watching the sky change should itself be worth noticing.

**Night stars**: During night phase, draw small 1px white dots scattered in the upper portion of the canvas (above the island) suggesting stars through the tree canopy. Their alpha rises with darkness.

**Campfire light**: When a campfire resource/crafted item exists, draw a large warm amber glow circle (setGlow warm orange, large radius) centered on the campfire. The surrounding tiles within 3-tile radius get a subtle warm orange tint.

### Color Palette
- Ocean deep: `#1a4a7a`
- Ocean shallow: `#2a6a9a`
- Sand: `#e8c87a`
- Grass: `#2a8a2a`, `#3aaa3a`
- Rock: `#6a6a6a`, `#4a4a4a`
- Player: `#44ddff` (bright aqua)
- AI castaway 1 (cautious): `#ddaa44`
- AI castaway 2 (bold): `#ee4444`
- AI castaway 3 (social): `#44ee44`
- Tree: `#228822`, `#44aa44`
- Berry bush: `#aa2288`
- Plant/herb: `#88cc22`
- Fish spot: `#4488ff`
- Rock resource: `#888888`
- Campfire: `#ff6610`
- Night overlay: `#00003080`
- Glow/bloom: `#ff6610`, `#44ddff`, `#ffd700`

### Entity Redesigns

**Castaways (player and AI)**: Give each castaway a distinct silhouette:
- **Body**: Circle for head (slightly larger than current), with a small body rect below.
- **Clothing suggestion**: A colored horizontal band across the body rect suggests clothing — player has a bright teal stripe, each AI has their color.
- **Hair**: A small arc/cluster of slightly darker rect above the head circle.
- **Direction indicator**: Instead of a line, draw a small hand extending toward the movement direction — a small circle at arm distance.
- **Held tool**: When the player has an axe/spear crafted, draw a small tool icon in the extended hand direction — axe = two small rects in cross, spear = thin elongated rect.
- **Health state**: At low health, the character's colors desaturate and a visible sweat drop (small teardrop polygon) animates.
- **Night**: Each castaway gets a small glow halo at night suggesting body warmth.

**Trees**: Draw proper top-down tree canopy instead of circles:
- A dark brown/grey trunk rectangle in the center (small, 4x6px).
- Multiple overlapping green canopy circles (3-4 circles of radius 8-10 at slight offsets) in two shades of green `#228822` and `#44aa44`.
- A bright top highlight on the largest circle (lighter green arc) suggesting lit treetop.
- When being chopped (near player with axe), a brief shiver animation (wobble ±2px).
- Stump remains after tree is gone — a small dark circle.

**Berry bushes**: A cluster of small circles suggesting berries — 3-4 dark magenta dots `#aa2288` arranged in a tight cluster, surrounded by 4-5 small leaf shapes (tiny dark green filled ellipses).

**Rock resource**: Draw a proper boulder — an irregular polygon (8-sided convex) in grey `#888888` with a lighter facet on the top-left (bright grey `#aaaaaa` arc suggesting sunlight), and darker shadows on the right/bottom.

**Fish spots**: Animated water disturbance — a circle of ripple rings that expand from the center and fade. 2-3 rings at different expansion stages, in light blue `#aaddff` at low alpha. Small scale-shaped polygon for the fish silhouette briefly visible.

**Plants/herbs**: Small green leafy cluster — 3-4 elongated ellipses radiating from a center point, in bright lime green `#88cc22`.

**Crafted items** (raft, shelter, campfire):
- **Campfire**: Three log shapes (thin dark rects in a triangle) with animated flame above — 3-4 orange/yellow triangular polys that shift position each frame to suggest flickering. Large warm glow.
- **Shelter**: Rectangular outline with a triangular roof suggestion (two angled lines forming a peak). Brown/tan coloring.
- **Raft**: A rectangular dock of 3 horizontal plank rects in warm wood brown, with a rope detail (small circles at corners).

### Particle & Effect System

- **Tree chopped**: 5-6 wood chip particles (small irregular brown rects) fly outward from the tree. Leaves (small green circles) drift downward with gravity after chopping.
- **Rock mined**: 4-5 small grey stone chip polygons fly outward from the rock impact point.
- **Berry picked**: 3 small magenta sparkle dots burst from the bush.
- **Campfire**: Continuous particle system — small orange-yellow circles (radius 2-3) rise upward from the flame with slight horizontal drift and fade after 20 frames. A wisp of grey smoke (very small grey circles) rises above the flame.
- **Fish caught**: A brief splash at the fish spot — 6 small blue water droplet particles spray upward.
- **Crafting complete**: A bright golden flash (screen-edge highlight at 15% alpha) and 8 golden star particles burst from the player position.
- **Day transition (dawn)**: A golden horizontal line sweeps down from the top of the canvas (5px tall bright amber rect that moves 10px/frame) suggesting the sun rising. Dramatic effect.
- **Night approaching**: Fireflies — small dim yellow dots that slowly drift in random patterns across the screen at night. 8-10 dots with slow sinusoidal paths.
- **AI castaway interaction**: When AI castaways approach or compete, a small "!" symbol above the competing AI castaway.

### UI Polish

- **Inventory panel**: The crafting/inventory panel gets a beach-survival aesthetic — a wood-plank styled panel (brown rect with horizontal grain lines) that slides in from the bottom when opened. Recipe items shown as small icon-like drawings.
- **Day/night indicator**: A small circular compass-rose in the corner with a sun/moon icon that changes with cycle phase. The sun = bright yellow circle, moon = crescent (circle with offset dark circle masking part of it). A small arc below shows cycle progress.
- **Health bar**: Styled as a coconut/tropical motif — a horizontal bar with small leaf decoration at the ends. Fills in warm green.
- **Resource counter**: Small icon + count for each collected resource type. Icons drawn as mini-versions of the resource shapes (tiny tree, berry, rock).
- **Status messages**: Messages appear at the bottom as a teletype-styled log — dark semi-transparent panel with green text appearing character by character (typewriter effect).

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Tree chop | Thwack: triangle + noise | 300Hz triangle + noise burst | 120ms | Axe hitting wood |
| Rock mine | Clank: metallic sine | 800Hz with fast decay | 100ms | Stone on stone |
| Berry pick | Soft pluck | Sine 660Hz, quick decay | 80ms | Gentle rustle |
| Fish caught | Splash | Noise burst through bandpass 400Hz | 200ms | Water splash |
| Craft complete | Success chime | 523→784→1047Hz arpeggio | 400ms | Achievement jingle |
| Day transition | Ambient swell | Sine 220Hz, slow gain rise | 800ms | Dawn awakening |
| Night falls | Low drone fade-in | Sine 110Hz, slow gain rise | 1000ms | Darkness approaching |
| AI castaway action | Soft alert | Sine 440Hz | 100ms | Distant activity notice |
| Campfire crackle | Filtered noise | Bandpass noise 300Hz, Q=3 | Continuous | Fire ambient |
| Win (raft escape) | Full fanfare | Ascending 4-note scale + chord hold | 1000ms | Triumphant escape |
| Lose | Gentle descend | 440→330→220→110Hz slow | 800ms | Somber end |

### Music/Ambience

A layered tropical island ambient soundscape:
- **Ocean waves**: Filtered white noise through a slowly modulating lowpass filter (cutoff sweeps between 200-400Hz via a 0.03Hz LFO) at gain 0.025. Represents the ever-present ocean surrounding the island.
- **Bird calls**: Every 6-15 seconds (random interval), a brief two-note synthetic bird call — two sine tones in quick succession (880Hz then 1047Hz, each 80ms with fast decay) at gain 0.04. Subtle and irregular.
- **Wind rustle**: Very soft broadband noise at 0.004 gain, with slow amplitude modulation (LFO 0.1Hz) — a gentle breeze through palm trees.
- **Night cricket**: When night phase is active, add a periodic narrow-bandpass noise burst (3000Hz, Q=8) that repeats every 0.5 seconds at gain 0.008 — simulates crickets chirping. Fades in as night deepens.
- **Campfire layer**: When a campfire exists, add soft filtered noise (500Hz, Q=4, gain 0.01) looping — crackle of the fire provides warmth to the soundscape.
- The combination creates the sense of a deserted island with ocean, wind, wildlife, and firelight. No rhythm or melody — pure atmosphere.

## Implementation Priority
- High: Ocean wave ambient loop, campfire flame particle animation + glow, tree canopy redesign (multi-circle), day/night sky transition visual
- Medium: Sand tile stipple texture, tile grass blade detail, castaway redesign with clothing/tools, crafting complete particle burst
- Low: Night firefly particles, fish spot ripple animation, beach-wood UI panel, typewriter status message log
