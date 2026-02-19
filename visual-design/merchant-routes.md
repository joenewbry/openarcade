# Merchant Routes — Visual & Sound Design

## Current Aesthetic

A 600x500 canvas with a turn-based medieval trading game. 10 cities are circles on a road network. Dark background, roads in `#333333`, city circles `#252545`. Gold UI accent `#dda466`. Goods have distinct colors: Grain=`#eda`, Ore=`#aab`, Silk=`#daf`, Spices=`#fa8`, Wine=`#d6a`, Lumber=`#a86`, Gems=`#aef`, Fish=`#8ce`. Player marker `#4af`, AI merchants `#f64`/`#6d4`. 25-turn game with market events. The map view is functional but looks like a developer prototype — roads are plain lines, cities are plain circles, and the medieval trading atmosphere is completely absent. It could be any abstract graph puzzle.

## Aesthetic Assessment

**Score: 2/5**

The information design is sound (goods colors are distinct and memorable) but the visual world has no personality. A medieval trading game should feel like an old map come to life — parchment textures, handdrawn-style city icons, roads with a dirt-track quality. The potential for a beautiful "living map" aesthetic is completely unrealized. With the right art direction this could be stunning.

## Visual Redesign Plan

### Background & Environment

Replace the abstract dark background with a parchment-style illustrated map. Background base: a warm cream-tan gradient `#f5e8c8` to `#e8d5a8` (parchment). Add subtle texture: 2px noise grain with occasional `#d8c898` darker patches and `#f8eedc` lighter spots — like aged paper. Render faint topographic features: mountain silhouettes in `#c8a888` in barren regions between cities, forest clusters (small repeating tree icons `#8a9a5a`) along edges, river lines `#8ab0d0` crossing the map.

The overall effect should feel like an illuminated medieval manuscript map. Add a decorative border: thick `#8a6a3a` frame with corner ornaments (stylized compass rose `#6a4a2a`).

Road network: replace plain grey lines with dirt track styling — two thin lines `#a87840` with a darker center `#8a6030` (suggesting wheel ruts). Roads that pass through forest darken slightly.

City markers should look like medieval icons, not just circles.

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Map parchment base | Warm cream | `#f5e8c8` |
| Map parchment shadow | Aged tan | `#e0c898` |
| Road track | Dirt brown | `#a87840` |
| Road rut | Dark earth | `#7a5a28` |
| City icon | Warm ivory | `#f0e0c0` |
| City icon border | Medieval brown | `#6a4a22` |
| City selected | Gilded highlight | `#ffcc44` |
| Player marker | Royal blue | `#2266cc` |
| AI merchant A | Rival scarlet | `#cc2222` |
| AI merchant B | Rival emerald | `#228844` |
| Grain | Golden wheat | `#e8c84a` |
| Ore | Grey iron | `#8899aa` |
| Silk | Lavender purple | `#cc88ee` |
| Spices | Cinnamon orange | `#ff9944` |
| Wine | Deep burgundy | `#aa3366` |
| Lumber | Forest brown | `#aa7744` |
| Gems | Jewel teal | `#44ccaa` |
| Fish | Ocean blue | `#66aacc` |
| UI panel | Vellum | `#f0e0c0` |
| UI border | Oak | `#7a5a28` |
| UI text | Ink black | `#1a1008` |
| Gold coin accent | Rich gold | `#ddaa22` |
| Glow/bloom | Trade glow | `#ffcc44` |

### Entity Redesigns

**City Icons** — Each city rendered as a small medieval settlement icon. Rather than a plain circle, draw:
- A 3-crenellated castle tower silhouette (5 pixel blocks suggesting battlements) in `#6a4a22`
- Arch gate opening at the base in `#2a1808`
- The tower filled with `#f0e0c0` (stone color)
- Size varies with city wealth/population

City name in a small parchment-style label below each icon (semi-transparent `#f5e0c0` backing, ink text `#1a1008`).

When selected: city icon gains a gold halo glow `setGlow('#ffcc44', 1.5)` and animates a brief scale pulse.

**Roads** — Two-tone dirt tracks. The road line becomes: outer track in `#a87840` (4px wide), inner shadow `#7a5a28` (2px, centered) creating a wheel-rut look. Where roads cross rivers, add a tiny bridge indicator (2 dark rectangles perpendicular to road).

**Merchant Markers** — Move from plain colored circles to illustrated peddler carts:
- Small wagon shape: rectangle body + two circle wheels (solid fill in team color)
- Colored flag on top (same team color) that waves slightly
- Player: royal blue `#2266cc` wagon with gold wheels `#ddaa22`
- AIs: their respective colors with silver wheels

**Good Icons** — Each good type has a mini-icon alongside its color in UI panels:
- Grain: sheaf of wheat silhouette
- Ore: small anvil or rock chunk
- Silk: flowing ribbon
- Spices: small pepper/sack shape
- Wine: wine barrel
- Lumber: log stack
- Gems: crystal diamond
- Fish: simple fish silhouette

### Particle & Effect System

- **Profitable trade**: Gold coin particles — 5 coin-shaped (small circles) `#ddaa22` pop up from the city and arc toward the gold counter. Lifetime 0.8s.
- **Merchant move**: As the merchant moves along a road, leave a brief dust trail of `#c8a060` pixel-dust particles behind the cart. 3 particles per frame of movement, fade 0.4s.
- **Market event positive**: Brief burst of festive sparks at affected city — 8 particles in the relevant good's color + gold.
- **Market event negative**: Dark smoke puff `#444433` rising from the city, 4 particles.
- **City selected pulse**: Expanding ring in `#ffcc44`, radius 10→40px, fades over 0.4s.
- **Turn advance**: Subtle page-turn-style animation — info panel slides out to the right and new turn info slides in from left.
- **New high score**: Coin shower — 20 gold particles fall from top, `#ddaa22`, gravity, lifetime 1.5s.
- **Game won**: Firework-style bursts at city positions: 6 particles each, team color, 3 cities fire simultaneously.

### UI Polish

All UI panels transformed to medieval manuscript style:
- Panel backgrounds: `#f0e0c0` (vellum/parchment) with `#7a5a28` border (oak wood)
- Corner flourishes: small curved ornament lines at panel corners
- Headers: bold text in `#1a1008` (ink) with a thin decorative line below
- Numbers (gold, turns, prices): displayed in `#ddaa22` with "coin" or "turns" labels in smaller ink text

Turn counter: displayed as an hourglass icon + "Turn X / 25" in a prominent banner at top. When final 5 turns, hourglass flips and text turns red-brown `#aa3300`.

Trade info panel: shows buy/sell prices in a two-column ledger format. Price advantages highlighted in green-tinted text, disadvantages in red-tinted text.

Event notification: scroll-unfurl animation — a small scroll icon expands to show the event text, stays 2s, then furls back.

## Sound Design Plan

*(Web Audio API only)*

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Merchant move | Cart rumble | Low noise 80–200 Hz, brief | 0.3s | Wagon on dirt road |
| Arrive at city | Bell chime | Sine 523 Hz + 659 Hz | 0.4s | Town bell ringing |
| Buy goods | Coin exchange | High metallic tink | 0.2s | Sine 1200 Hz, fast decay |
| Sell goods | Cash register | 2 quick tinks | 0.25s | Two sine pings in sequence |
| Profit (big trade) | Coin shower | 5 quick tinks descending | 0.4s | Multiple coin sounds |
| Market event (good) | Fanfare | Ascending 3-note: C-E-G | 0.3s | Positive jingle |
| Market event (bad) | Dour tone | Descending: G-E-C minor | 0.3s | Trouble afoot |
| Turn advance | Page turn | High-pass noise 2000 Hz, soft | 0.15s | Like flipping a page |
| City selected | Soft chime | Sine 660 Hz, medium decay | 0.2s | Town bell, quieter |
| Game over (win) | Victory fanfare | 8-note ascending major phrase | 1.5s | Grand flourish |
| Game over (lose) | Defeat | 4-note descending minor | 1.0s | Trade route lost |
| New turn alert | Bell toll | Sine 220 Hz, long decay, reverb | 0.8s | Church bell weight |
| Price alert (big opportunity) | Bright chime | Sine 880+1320 Hz | 0.3s | Opportunity knocks |
| Inventory full warning | Low horn | Sawtooth 110 Hz, 2 short bursts | 0.3s | Cart overloaded |

### Music/Ambience

A medieval market town atmosphere. Generate using Web Audio:
- Foundation: a simple lute-style melody (triangle oscillator, 90 BPM, major key in G) — triangle waves have the right warm, slightly hollow quality
- Percussion: light tambourine equivalent (filtered noise burst every 1–2 beats, 200–800 Hz, short decay)
- Bass: sine wave following the root notes of the melody, 1–2 octaves below, light volume
- Ambience: distant crowd noise (very filtered noise, barely audible, 80–200 Hz, slow volume oscillation suggesting a busy marketplace)

The overall feel: a traveling merchant's jaunty theme. Upbeat but not frantic. The 16-bar loop repeats. When nearing the game end (last 5 turns), the melody subtly shifts to a more urgent tempo (105 BPM) and briefly touches minor chords.

## Implementation Priority

**High**
- Parchment background texture (warm gradient + grain noise)
- City castle tower icon (crenellated silhouette)
- Road dirt track styling (two-tone with rut effect)
- Merchant arrival bell chime + coin buy/sell sounds
- Gold coin particle burst on profitable trade
- City selected glow pulse animation + sound

**Medium**
- Merchant cart/wagon marker (rectangle body + wheels + flag)
- UI vellum panel styling (parchment background + oak border)
- Good type mini-icons in UI panels
- Market event notifications (positive/negative sounds + particles)
- Merchant movement dust trail particles
- Turn advance page-turn animation + sound
- Topographic features (mountains, forests, rivers)

**Low**
- Decorative map border with compass rose
- Bridge indicators where roads cross rivers
- City name label plates
- Scroll-unfurl event notification animation
- Coin shower on win/high score
- Medieval market ambient music loop
- Tempo shift in final 5 turns
