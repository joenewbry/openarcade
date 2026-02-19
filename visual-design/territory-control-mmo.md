# Territory Control MMO — Visual & Sound Design

## Current Aesthetic

A turn-based hex grid strategy game on a 600x500 canvas with a 20x15 hex grid (HEX_R=16). Three factions rendered in distinct colors: Empire `#cc6644` (orange-red), Dominion `#4488cc` (blue), Horde `#44aa44` (green). Hexes are filled polygons with faction color for captured territory, gray `#555` for neutral. Resources (food/ore/wood/gold) display as small text labels. Buildings are simple circles inside hexes. Troops are tiny triangles. The UI shows resource counts and available actions at the bottom.

## Aesthetic Assessment
**Score: 2/5**

The hex grid is functionally clear — faction control reads well from colors. But aesthetically this looks like a wireframe prototype. Hexes are flat fills with no terrain variety. Buildings are dot placeholders. Troops are invisible at a glance. There is no map character — everything looks the same except color. A proper strategy map needs geographic texture, faction identity, and clear visual hierarchy between terrain, structures, and units.

## Visual Redesign Plan

### Background & Environment

The canvas background should be a parchment-like map texture: a warm cream `#e8d5a8` base with subtle diagonal hatching lines (1px, `#c8b588`, 15% opacity, spaced 8px apart) suggesting aged cartographic paper. At the canvas border, draw a thick dark frame (`#5a3a18`, 8px wide) as a map border with corner decoration — small circle ornaments at each corner.

Each hex should convey terrain type through its interior rendering:
- Plains hexes (default): light yellow-green `#c8d8a0` fill with 3-4 tiny curved blade-of-grass lines
- Forest hexes (near wood resources): darker green `#4a6a28` with 2-3 small tree silhouettes (triangle on a small trunk)
- Mountain hexes (near ore resources): light gray `#b8b0a0` with jagged peak lines inside
- Water hexes (decorative border): dark blue `#2a4a8a`
- Captured hexes: overlay faction color at 40% opacity on top of terrain, so terrain texture still shows through

Hex borders should vary: neutral hexes get a thin dark gray line. Faction-controlled hexes get a slightly thicker border in a darker shade of their faction color. Borders between adjacent controlled hexes of different factions glow with a tension line (bright white, 1px, setGlow with faction color).

### Color Palette
- Primary: Empire `#cc6644`, Dominion `#4488cc`, Horde `#44aa44`
- Secondary: `#e8d5a8` (parchment), `#5a3a18` (border/wood)
- Background: `#e8d5a8`, `#c8b588`
- Glow/bloom: Faction colors for active selection, `#fff` for tension borders, `#ffd700` for gold resources

### Entity Redesigns

**Hexes:** Each hex gets an interior icon when it contains a notable feature:
- Outpost: A small square tower shape (two rectangles forming a battlement)
- Fort: A larger castle silhouette — square base with two corner towers
- Barracks: A barracks tent shape — triangle roof over a rectangle body
- Market: A small pitched-roof building with a coin icon beside it

These icons should be drawn in a dark faction color, centered in the hex, sized to fit within the hex radius minus 4px padding.

**Troop indicators:** Replace invisible triangles with visible unit count badges. Draw a small circle (radius 7px) in the faction color positioned at the bottom-right of the hex, with the troop count number centered inside in white text. If multiple unit types exist (infantry/cavalry/siege), show the dominant type as a tiny silhouette above the badge: a pike for infantry (vertical line with a small cross), a horsehead oval for cavalry, a catapult arc for siege.

**Resource markers:** At hexes that generate resources, draw a small icon in the top-left of the hex: crossed pickaxes for ore, wheat stalk for food, tree for wood, coin for gold. Each icon should be 8px wide in a distinct neutral color (ore=`#887760`, food=`#88aa44`, wood=`#664422`, gold=`#ccaa00`).

**Selection highlight:** Selected hex shows a bright white hex outline with `setGlow('#fff', 8)` pulsing at 2 Hz. Reachable hexes for movement show a soft yellow `#ffd700` outline at 40% opacity.

### Particle & Effect System

- **Territory capture:** When a hex changes faction control, a spreading ripple effect — concentric hex outline polygons in the new faction color expand outward from the captured hex center and fade over 30 frames.
- **Battle resolve:** At the attacker hex, flash a small sword-cross icon (two diagonal lines forming an X) in white for 10 frames. At the losing side, a brief dark smoke puff — 4-6 dark gray particles drifting upward.
- **Building completed:** Shimmer effect over the hex — bright sparkle particles (6 points of light) radiating outward and rising.
- **Resource collected:** Small icon of the resource type floats upward from the hex and fades — gold coin rising for gold, food icon for food, etc.
- **Turn change:** A banner sweeps across the top — a colored ribbon in the active faction's color slides in from the left, displaying "EMPIRE TURN" etc., then recedes after 60 frames.
- **Victory:** Confetti burst — 30 small rectangle particles in the winning faction's color raining from the top of the canvas over 120 frames.

### UI Polish

- **Resource panel:** Style as a wooden sign plaque — dark brown `#3a2010` background rectangle with carved-look inset for each resource type. Resource icon beside the count number. Font in `#e8d5a8` warm cream.
- **Action buttons:** Style as stone tablet buttons — rounded rectangle with a beveled stone texture (lighter top/left edges, darker bottom/right edges). Active actions pulse with a subtle glow in the player's faction color.
- **Faction identity panel:** Each faction has a small heraldic crest icon (Empire: stylized eagle outline, Dominion: compass rose, Horde: skull outline) in their panel area.
- **Turn counter:** Styled as a scroll — curled ends on a horizontal rectangle containing the turn number.
- **Hover tooltip:** When hovering a hex, show a parchment-style popup card with terrain type, resource output, occupying faction, building, and troop count.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Hex select | Soft click | Triangle 600 Hz | 40ms | Tile tap |
| Hex hover | Subtle tick | Sine 400 Hz, very quiet | 20ms | Navigate feedback |
| Move troops | March beat | Sine 80 Hz + noise, 3 pulses | 300ms | Footstep rhythm |
| Battle (win) | Brass fanfare | Sawtooth 392+523+659 Hz | 300ms | Victory chord |
| Battle (lose) | Low drop | Sine 220→110 Hz | 250ms | Defeat fall |
| Capture territory | Triumphant blip | Sine 784 Hz, brief | 100ms | Territory ping |
| Building placed | Stone thud | Lowpass noise 200 Hz | 120ms | Construction impact |
| Resource collected | Coin clink | Sine 1100 Hz, sharp | 60ms | Metallic ring |
| Turn end | Deep gong | Sine 120 Hz, slow decay | 500ms | Turn bell |
| Turn start (new faction) | Drum roll lead | Noise + sine 100 Hz | 200ms | Attention signal |
| Victory | Ascending fanfare | Sine 261, 329, 392, 523, 659, 784 Hz | 800ms | Major scale run |
| Defeat | Descending minor | Sine 220, 196, 165, 130 Hz | 600ms | Somber fall |

### Music/Ambience

A medieval strategy atmosphere: a low sustained drone on two triangle oscillators at 55 Hz and 82 Hz (perfect fifth, gain 0.025 each) creates a tense battlefield backdrop. A slow arpeggio on sawtooth wave plays notes in D minor (D2, F2, A2, C3 = 73, 87, 110, 131 Hz), one note per 2 seconds, cycling, at gain 0.02. The tempo and drone volume increase slightly during the active faction's turn relative to their controlled territory percentage — more territory means slightly higher ambience energy, rewarding the leading faction's feel. A distant drum hit (noise pulse at 60 Hz, gain 0.04) sounds every 4 seconds, suggesting a war drum.

## Implementation Priority
- High: Terrain type hex fills (plains/forest/mountain), troop count badge circles, faction tension border glow, hex selection pulse
- Medium: Building silhouette icons within hexes, resource type markers, territory capture ripple effect, battle sword-flash
- Low: Parchment background texture, turn banner sweep animation, heraldic faction crests, medieval ambience drone
