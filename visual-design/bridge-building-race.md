# Bridge Building Race — Visual & Sound Design

## Current Aesthetic
A split-screen engineering puzzle where the player (left half, orange `#f94`) builds a bridge across a canyon gap while the AI (right half, cyan `#4af`) builds its own simultaneously. The screen is divided at x=300 with a vertical separator. Terrain is drawn as plain dark rectangles for ground platforms with a canyon void below. Beams are solid colored lines with faint length labels. Nodes are simple double-ring circles. The truck is a minimal colored rectangle with a cab extension and circle wheels. During simulation, beams color-shift from green to yellow to red based on stress. Broken beams render as faint red lines. The HUD shows budget and level as plain text. Particles are small colored circles on beam break. The background is plain black.

## Aesthetic Assessment
The stress-color visualization is genuinely clever — watching beams shift from green to amber to red as the truck crosses is inherently dramatic. The split-screen competitive format is a strong concept. However the execution is visually barren: plain black background, flat-color terrain blocks, zero environmental context. The canyon gap feels abstract rather than like a real gorge. The truck is recognizable but toy-like. The building phase UI lacks spatial clarity. This game has exceptional design bones buried under prototype-level visuals.
**Score: 2/5**

## Visual Redesign Plan

### Background & Environment
Give this game the drama of real civil engineering:

**Background:** A deep sky gradient — near-black at the top (`#04080f`) fading to dark slate blue (`#0c1a28`) in the mid-zone, then a warm canyon-floor amber-brown (`#1a0e06`) at the very bottom below the canyon walls. The sky zone above the canyon has faint distant mountain silhouettes (simple jagged polylines in dark blue-grey at 30% opacity).

**Canyon walls:** The left and right ground platforms are redesigned as layered rock faces. Each platform face shows horizontal geological strata: alternating bands of reddish-brown (`#5a2a10`), sandy tan (`#7a4a20`), and dark grey rock (`#3a3030`), each band 8-12px tall. The top surface has a gravel texture — small random darker dots scattered across the platform top.

**Canyon void:** The gap is not just empty black — a subtle fog fills the lower portion of the void (a dark brownish haze at 15% opacity filling the bottom 40px of the gap area), suggesting depth and danger far below. A faint warm glow at the canyon bottom suggests unseen lava or deep heat.

**Vertical split line:** Instead of a plain line, the screen divider is a stylized vertical beam — a dark metal post with rivets (small bright dots every 20px). "PLAYER" and "AI" labels rendered as clean white text with a subtle glow at the top of each half.

**Build zone indicator:** The dashed build boundary gets upgraded — instead of faint orange dashes, bright blueprint-grid lines (1% opacity cyan horizontal/vertical grid, 20px spacing) fill the build zone only, evoking a drafting table. The build zone border pulses gently at 70%→100% opacity.

### Color Palette
- Player beams (build): `#ff9944`
- Player beams (sim low stress): `#44dd44`
- Player beams (sim mid stress): `#ffcc00`
- Player beams (sim high stress): `#ff3300`
- AI beams (build): `#44aaff`
- AI beams (sim): same stress color scheme
- Anchor nodes: `#888899`
- Player free nodes: `#ff9944`
- AI free nodes: `#44aaff`
- Truck (player): `#ff8833`
- Truck (AI): `#33aaee`
- Ground platform: `#5a2a10` / `#7a4a20` / `#3a3030`
- Canyon void fog: `#2a1008`
- Sky top: `#04080f`
- Sky bottom: `#0c1a28`
- Build zone grid: `#004466`
- Budget low: `#ff4444`
- Budget OK: `#88aacc`

### Entity Redesigns
**Beams:** The structural beams get proper visual depth:
- Normal beam: 3px solid colored line with a 1px brighter highlight line along the top edge (as if catching light), giving a slight 3D pipe appearance
- Beam thickness scales with budget use — cheap short beams are 2px, expensive long beams are 4px, communicating structural cost
- During simulation: the stress color glow extends beyond the beam — a faint radial glow (2-3px wide soft shadow) in the stress color surrounds each beam, making a stressed bridge feel hot and dangerous
- Broken beams: instead of faint red lines, show a jagged broken-line segment with debris particles spawning at break point

**Nodes (anchor points):** Significantly upgraded:
- Fixed anchor nodes: rendered as proper steel brackets — a bright grey rounded rectangle with a central bolt circle (dark dot with light ring), beveled edges, and a small drop-shadow
- Player free nodes: bright orange double-ring with an inner glow — clearly identifiable as connection points
- Selected node: animated ring (pulsing 80%→100% alpha) with 4 directional tick marks like a targeting reticle
- Hover node: soft glow halo in the player's color

**Trucks:** The trucks get serious visual upgrades while keeping the side-view silhouette:
- Main body: a proper freight truck rectangle with panel lines (horizontal seams) suggesting cargo sections
- Cab: larger, more detailed — a distinct cab shape with a windshield trapezoid in light blue (`rgba(150,210,255,0.6)`) and a chrome bumper bar
- Wheels: larger circles with a visible tire tread outline (outer dark ring) and a bright chrome hub cap center
- Headlights: two small bright yellow dots at the truck front that actually cast a faint cone of light onto the terrain ahead during the testing phase
- A small exhaust puff: a white smoke particle spawns from the truck top every 8 frames while moving

**Terrain:** The canyon ledges stop being plain rectangles:
- Top surface: a rough gravel line (irregular 1-2px bright specks at random intervals)
- Face: layered geological strata as described — horizontal bands of color giving real rock-face depth
- The ledge edge where trucks approach shows a subtle crumble warning effect (tiny dust particles) if the bridge is stressed

### Particle & Effect System
**Beam break:** When a beam snaps during simulation, 6-8 metal shard particles burst from the break point — thin bright rectangles at random angles, some orange (hot metal), some grey (steel). A small orange flash illuminates the break point for 2 frames. The break sound triggers.

**Truck falling:** If the bridge collapses and the truck falls, a dramatic cascading effect: each remaining beam cracks one by one (150ms apart), then the truck tumbles with rotation (approximated by wobbling the truck rectangle's draw position), trailing a red damage trail, and a large explosion of dust/debris fills the canyon when it hits bottom (or falls off screen).

**Successful crossing:** When a truck crosses successfully, the beams flash bright green simultaneously (1 frame white flash, then solid green), and 8 golden confetti particles burst from the truck's final position. A score number rises from the crossing point and floats upward while fading.

**Level complete:** Both sides of the screen flash white simultaneously, then a large centered "LEVEL COMPLETE" banner drops from the top of the screen. Score comparison shows both player and AI scores with animated number count-up.

**Budget warning:** When remaining budget drops below 50, each new beam placement triggers a brief red flash at the budget display, and a small red exclamation mark floats above the build zone.

**Blueprint preview:** The dashed preview line during beam placement gets a length-cost color: green when affordable, yellow when it would leave under 20% budget, red when it would exceed budget. The preview line animates — the dashes scroll toward the target node (suggesting a measuring tape being extended).

### UI Polish
The HUD bars at the top of each half get redesigned as proper engineering panels:
- A dark slate-grey header strip with a subtle gradient (darker at top, slightly lighter at bottom)
- The player label is styled like a blueprint title block — "PLAYER BUILD" in small-caps with an orange accent underline
- Budget display shows as a fill bar: a horizontal bar that depletes left-to-right as beams are placed, color-shifting from green → amber → red as budget runs out, with the number overlaid in white
- Truck progress during testing: a small progress bar appears below the budget bar showing how far across the gap the truck has traveled (percentage), color-coded: yellow while crossing, green on success, red on failure
- A small icon next to each player's score: a bridge silhouette icon for the player, a circuit-board icon for the AI

## Sound Design Plan
*(Web Audio API only — no external files)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Place node | Click | 400Hz sine, sharp attack | 0.05s | Clean placement click |
| Place beam | Metallic ring | 800Hz sine + short 200Hz square | 0.12s | Steel beam clanging into place |
| Delete beam/node | Snap | 300→150Hz sine sweep | 0.08s | Structure removed |
| Beam break | Crack + ping | Noise burst + 600Hz descend | 0.2s | Metal fracturing |
| Truck moving | Engine hum | 80Hz square, low amp | continuous | Light truck engine rumble |
| Truck accelerating | Engine rise | 80→120Hz square over 0.5s | 0.5s | Speed increase |
| Truck crossing success | Victory thud | 150Hz sine thump + 523Hz shine | 0.4s | Safe landing feel |
| Truck falling | Fall whistle | 400→80Hz sine sweep | 0.8s | Descending disaster tone |
| Level complete | Fanfare | 523+659+784+1046Hz arpeggio | 1.2s | Engineering triumph |
| Over budget warning | Alert | 880Hz sine, double beep | 0.3s | Budget exceeded |
| Bridge collapse | Crumble | Pink noise 0.4s + 60Hz rumble | 0.6s | Catastrophic failure |
| Score tally | Counting | 600Hz sine, rapid repeat | per point | Score counting tick |

### Music/Ambience
A construction-site ambient soundscape that builds tension during the race. During the building phase: a ticking clock pulse — a 1200Hz sine wave at very low amplitude (0.015) ticking at 0.5-second intervals, subtly counting down the urgency without showing an explicit timer. A low background wind tone (filtered pink noise, bandpass 200-800Hz at 0.008 amplitude) suggests open air and height. As more budget is spent: a second low drone (65Hz sine at 0.01 amplitude) gradually fades in, building subconscious tension. During the testing/simulation phase: the ticking stops and is replaced by the truck engine sound, plus a tension swell — a 110Hz sine wave that slowly rises in amplitude (0 → 0.02 over 3 seconds) as the truck approaches the gap. On a successful crossing: the swell resolves with a brief bright chord (major triad at 523+659+784Hz). On failure: the swell cuts to silence then a low 40Hz rumble.

## Implementation Priority
- High: Canyon layered rock-face terrain, beam stress glow effect, beam break particle burst with metal shards, budget depletion bar
- Medium: Truck exhaust smoke particles, truck falling animation with rotation, anchor node steel-bracket redesign, blueprint grid in build zone
- Low: Sky gradient with mountain silhouettes, canyon void fog, golden confetti on successful crossing, geological strata texture
