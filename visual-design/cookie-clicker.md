# Cookie Clicker — Visual & Sound Design Plan

## Current Aesthetic

The game has a central golden cookie (radius=100) with layered fills: outer `#8B6914`, mid `#b8860b`, inner `#d4a030`. A scalloped polygon edge. 9 chocolate chip positions. Right-side shop panel in `#16213e` dark blue. 6 building types with color-coded icons (Cursor=`#ed4`, Grandma=`#f80`, Farm=`#0f0`, Factory=`#0ff`, Mine=`#88f`, Bank=`#f0f`). Floating "+1" texts in gold. The cookie itself is reasonably charming but sits on a generic dark background with a flat dark shop panel. The game should feel warm, cozy, and irresistibly sweet — like a beloved bakery or grandmother's kitchen.

## Aesthetic Assessment: 2.5 / 5

The cookie polygon shape is a solid foundation. Chocolate chips are a nice detail. But the dark blue shop panel is completely wrong for a cozy bakery aesthetic — it looks like a space game's inventory. The background is sterile. Floating text feedback is minimal. The cookie clicking should feel enormously satisfying, with particles, warmth, and personality.

---

## Visual Redesign Plan

### Background & Environment

- **Background**: warm gradient, top = deep warm brown `#1a0e06`, bottom = dark amber-brown `#240f04`. Like the inside of a warm kitchen at night.
- **Background texture suggestion**: very faint repeating diamond pattern in `rgba(255,200,100,0.03)` — the wallpaper of a kitchen.
- **Left panel** (cookie area, left 60%): warm ambient glow behind the cookie — a large radial gradient from `rgba(255,200,80,0.08)` at center to transparent, radius=200px. Cookie "glows" like it's fresh from the oven.
- **Right panel** (shop): completely redesign from cold `#16213e` to warm bakery aesthetic:
  - Background: `#1a0d06` dark wood-grain feel.
  - Top border: 2px `#8b5a2b` warm wood.
  - Panel header: "BAKERY" in `#ffd78c` amber letters with a small cookie icon.
  - Building card rows: each building is a small warm card with `#211206` fill, `#3a2010` border, and the building icon on the left.
- **Floor/counter suggestion**: a very faint horizontal line at y=400 in `#2a1a0a` suggesting a kitchen counter surface.
- **Steam particles**: 2–3 slow-rising curly steam wisps emanate from the cookie at all times (white/cream at low alpha), suggesting it's hot.

### Color Palette

| Role | Old | New |
|---|---|---|
| Background top | dark engine | `#1a0e06` |
| Background bottom | dark engine | `#240f04` |
| Cookie outer | `#8B6914` | `#8b5a1a` darker warm brown |
| Cookie mid | `#b8860b` | `#c87a20` deeper amber |
| Cookie inner | `#d4a030` | `#e8a030` warm golden center |
| Cookie highlight ring | none | `#f0c060` bright top-left arc |
| Chocolate chip | implied | `#3d1a00` dark chocolate, `#5a2a00` lighter face |
| Shop panel | `#16213e` cold blue | `#1a0d06` warm dark wood |
| Shop border | none | `#8b5a2b` warm wood border |
| Cursor building | `#ed4` | `#f5cc30` warm gold |
| Grandma building | `#f80` | `#e87030` warm orange |
| Farm building | `#0f0` | `#4a9a30` natural green |
| Factory building | `#0ff` | `#40a0cc` industrial blue |
| Mine building | `#88f` | `#8870cc` cave purple |
| Bank building | `#f0f` | `#c040b0` money magenta |
| Score text | `#ed4` | `#ffd78c` warm amber |
| CPS text | white | `#f0c880` warm light |
| Floating +N text | gold | `#ffd700` with `setGlow('#ff8800', 6)` |
| Shop item price | white | `#c4a050` warm brass |
| Shop item name | white | `#f0d090` |

### Entity Redesigns

**The Cookie**
- Keep the scalloped polygon shape — it's correct and charming.
- Redesign the fill layers for more depth:
  - Outermost layer (scalloped polygon): `#7a4a10` dark burnt-brown edge.
  - Second layer: `#b86a1a` medium brown.
  - Third layer (main body): `#d4901e` golden amber.
  - Inner highlight: `#f0c050` bright golden top-left area (an arc covering ~30% of area, lighter fill).
  - Top-left specular shine: small white ellipse (15x8px) at 0.3 alpha — fresh-baked gloss.
- Chocolate chips:
  - Each chip: filled ellipse in `#3d1a00` dark chocolate.
  - Each chip gets a tiny `#5a2a00` lighter crescent on the upper-left edge — 3D chip effect.
  - 9 chips positioned as before but slightly randomized per session.
- **Click feedback** — the cookie should visibly react:
  - Click: brief scale pulse (1.0 → 0.92 → 1.0 over 4 frames, compress-and-spring).
  - Click glow: `setGlow('#ffcc44', 20)` flashes on for 2 frames then back to ambient level.
  - Golden crumbs particle burst (see particles).
  - The scalloped edge briefly brightens.
- **Passive rotation**: the cookie very slowly rotates (0.001 rad/frame) to suggest it's being examined from all sides.

**Building Icons (in shop)**
- Each building card has a small icon drawn with the game's renderer:
  - Cursor: small arrow shape (polygon, thin and pointed).
  - Grandma: round face (circle), two small arm shapes.
  - Farm: simple barn shape (rect + triangle roof) in green.
  - Factory: rectangular body with two small chimney rectangles.
  - Mine: pickaxe shape (L-polygon + handle rect).
  - Bank: pillared building (rect with 3 thin vertical rects as columns).
- All icons: small (20x20px), team-appropriate color.

**Floating Text**
- "+N" text rises from the click point.
- Size scales with N: +1 = small, +100 = medium, large N = very large.
- Color: `#ffd700` with warm orange glow `setGlow('#ff8800', 6)`.
- Path: floats upward 60px over 1.2s with slight random x-drift (±10px).
- Fade: alpha goes 1→0 in last 0.4s.

### Particle & Effect System

| Effect | Description |
|---|---|
| Cookie click crumbs | 6 golden crumbs burst from click position: small filled circles (3–6px) in `#e8a030`, radial outward, gravity-pulled (y velocity increases), fade 600ms |
| Cookie click sparkle | 4 tiny star-points (4-arm polygon, 4px) in `#ffd700` fly outward at 45deg angles, fade 400ms |
| Steam wisps | 2-3 particles per second: start at top of cookie (y-20), rise upward with slight x-sine oscillation, white `rgba(255,248,240,0.2)`, size 4–8px, fade as they rise over 2s |
| Shop purchase | Small coin arc: 3 gold dots fly from shop item to cookie center, in 0.5s arc trajectory |
| Grandma auto-click | Small grandma icon (circle + hat) briefly appears at cookie edge, then retracts — every auto-click |
| Milestone achievement | Large flash: golden ring expands from cookie, 3 concentric rings, 1s each, `#ffd700` |
| Idle accumulation | CPS popup: "+[CPS] cookies" in small floating text rises from score every 1s |
| Big purchase (expensive) | Shop item has a brief "shimmer" animation: horizontal highlight sweeps across the card |

### UI Polish

- **Score display**: large, centered at top of left panel (cookie area). "N COOKIES" in `#ffd78c`, size 18. Below: "per second: N" in smaller `#c4a050`.
- **Shop panel**:
  - Header: "BAKERY" in `#ffd78c` with small horizontal rule below.
  - Each building row: icon | name | owned count | price. Warm card styling.
  - Affordable items: card has slight golden border `#8b6914`.
  - Too expensive: card border `#3a2010` and text dims to 0.5 alpha.
  - Hover state: card brightens slightly (increase fill alpha).
- **Milestone notification**: bottom of screen — slide-up card "You baked 1,000 cookies!" in `#ffd700` with cookie icon, holds 3s, slides back down.
- **Golden cookie** (special event): a golden shimmer ring pulses around the normal cookie every 30–120s randomly. Clicking during this grants 10x multiplier. Ring: animated dashed border in `#ffd700` rotating.

---

## Sound Design Plan

### Sound Synthesis Table

| Event | Oscillator | Frequency | Envelope | Filter/Effect | Character |
|---|---|---|---|---|---|
| Cookie click | sine | 440→330Hz | A:0 D:0.08 | lowpass 2000Hz | soft satisfying thump |
| Cookie click alt (varies) | sine | 550Hz | A:0 D:0.06 | none | alternate click tone |
| Purchase building | sine | 523→659→784Hz | A:0 D:0.1 per | none | register chime |
| Can't afford | triangle | 330→220Hz | A:0 D:0.1 | none | denied buzz |
| Milestone reached | sine chord | C5 E5 G5 C6 | A:0.01 D:0.5 S:0.5 R:0.3 | reverb | achievement jingle |
| Golden cookie appear | triangle | 880Hz with tremolo 4Hz | A:0.5 D:0 S:1 R:0.3 | none | shimmer tone |
| Golden cookie click | sine chord | E5 G5 B5 E6 | A:0.01 D:1.0 | reverb | jackpot fanfare |
| Grandma click (auto) | sine | 330Hz short | A:0 D:0.05 | lowpass 800Hz | gentle old-lady pat |
| Farm (every 5s) | sine | 220Hz | A:0 D:0.1 | lowpass 400Hz | gentle rustle |
| Factory (loop) | white noise | — | sustained gain 0.01 | bandpass 200Hz | distant machinery |
| 100 clicks | sine | 880→1320Hz | A:0 D:0.3 | reverb | celebration burst |

### Music / Ambience

- **Ambient base**: very gentle, warm kitchen ambience. White noise filtered to lowpass 300Hz at gain 0.015, with a slow 0.5Hz LFO on gain (simulates air conditioning hum or distant oven). Occasional creak sound: sine at 200→180Hz, D:0.1, random every 10–30s.
- **Background music**: a gentle, cozy loop in 3/4 waltz time (90 BPM). Triangle oscillators only (soft, warm timbre):
  - Bass: C2 / G2 / F2 / G2 (one note per bar).
  - Harmony: stacked thirds at 3x bass frequency, sustained per bar.
  - Melody: sparse, warm notes from C major scale, one every 1–3 beats, each held 1 beat. Very soft gain 0.03.
  - The waltz rhythm on percussion: a triangle pulse (sine 440Hz, D:0.05) on beat 1 only — like a kitchen clock.
- **Building unlock accumulation**: as more buildings are owned, additional melody layers are added (each building type = one more harmony voice enters the arrangement).
- **Master gain**: 0.3.

---

## Implementation Priority

**High**
- Cookie click scale-pulse animation (compress and spring)
- Golden crumb particles burst on click
- Cookie fill redesign (layered amber gradient, specular shine, 3D chips)
- Floating "+N" text with size scaling and drift
- Steam wisp particles rising from cookie
- Shop panel warm wood redesign

**Medium**
- Cookie click sound (soft satisfying thump + variant)
- Purchase sound (cash register chime)
- Background ambient warm kitchen hum
- Milestone notification slide-up card
- Golden cookie shimmer ring animation
- Score text warm amber styling

**Low**
- Building icon redesigns (barn, factory, mine etc.)
- Coin-arc purchase particle
- Grandma auto-click icon animation
- Generative waltz background music
- Factory distant machinery ambient
- Building count layering music effect
