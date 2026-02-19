# Civilization Micro — Visual & Sound Design Plan

## Current Aesthetic

The game uses a hex grid (15x12, HEX_W=38, HEX_H=34) with muted terrain colors: plains=`#5a7a3a`, hills=`#8a7a4a`, forest=`#3a6a3a`, mountain=`#6a6a6a`, water=`#3a5a8a`. Unexplored tiles are `#0a0a18`. Player colors are blue/red/green/purple. Units are text/unicode characters placed on tiles. A minimap (92x62) with gold `#ca4` border is present. Fog of war darkens explored-but-not-visible tiles. The overall look is functional but looks like an unfinished prototype — the hex tiles have no shading depth, no terrain texture, no atmospheric beauty. A civilization-style game should feel like a rich tapestry map or an illuminated manuscript.

## Aesthetic Assessment: 2 / 5

The hex grid system works. Terrain color differentiation is present. But the visual execution is flat — no elevation shading, no terrain texture, no unit models, no cultural visual language. The game should feel like gazing down at an ancient world waiting to be shaped by history.

---

## Visual Redesign Plan

### Background & Environment

- **Outer background** (outside the hex grid): a deep aged parchment brown `#1a1208`, suggesting the edge of an ancient map.
- **Map border decoration**: a thin ornamental frame around the hex grid — 2px outer stroke in `#8b6914` gold, 1px inner stroke in `#5a4a20`. Corner flourish: draw small filled diamond shapes at each corner in `#8b6914`.
- **Hex tile interior shadows**: each hex tile is drawn with a subtle inner shadow at the bottom edges — darken the bottom 30% of the hex by overlaying a dark polygon at 0.2 alpha. This gives each tile the illusion of concave depth.
- **Terrain detail marks**: on each tile (when explored), add a small detail symbol centered:
  - Plains: 3 tiny upward curved lines (grass tufts) in slightly darker green.
  - Hills: a small bump contour (arc) in slightly darker brown.
  - Forest: 2 small triangle trees (filled circles on short trunks) in dark green.
  - Mountain: small angular triangle peak in `#888`.
  - Water: 2-3 short wave arcs in lighter blue.
- **Fog of war**: explored-but-unseen tiles get a dark blue-grey wash `rgba(10,10,20,0.65)` — they should be clearly dimmed but recognizable (visible through the fog).
- **Unexplored**: `#0a0a18` remains — true darkness.

### Color Palette

| Role | Old | New |
|---|---|---|
| Plains | `#5a7a3a` | `#6a8a44` slightly brighter green |
| Hills | `#8a7a4a` | `#9a8a54` warmer tan |
| Forest | `#3a6a3a` | `#2a6030` deeper green |
| Mountain | `#6a6a6a` | `#787878` with snow cap `#f0f0f0` on tip |
| Water | `#3a5a8a` | `#3a6aa0` richer blue |
| Unexplored | `#0a0a18` | `#080810` |
| Fog overlay | darker | `rgba(10,10,20,0.65)` |
| Hex border (explored) | none | `#1a2010` (plains), terrain-matched darker |
| Hex border (unexplored) | none | `#0c0c18` |
| Player 1 (Blue) | `#4488ff` | `#4488ff` + glow 8px |
| Player 2 (Red) | `#ff4444` | `#ff4444` + glow 8px |
| Player 3 (Green) | `#44ff44` | `#44cc44` (slightly muted) |
| Player 4 (Purple) | `#aa44ff` | `#9944ff` |
| Gold/resource | `#ca4` | `#d4a830` richer gold |
| Map frame | none | `#8b6914` gold ornamental |
| Minimap border | `#ca4` | `#8b6914` with `#c4a030` inner |
| UI panel bg | dark | `#12100a` parchment dark |
| UI text | white | `#e8d8a0` aged parchment white |

### Entity Redesigns

**Hex Tiles**
- Primary hex fill in terrain color.
- Flat-top hexagon drawn as 6-point polygon.
- Edge highlight: the top-left two edges drawn 1px lighter (faux top-light).
- Edge shadow: bottom-right two edges drawn 1px darker.
- Terrain symbol centered (small, at 0.6 alpha, in terrain's darker shade).

**Units**
- Replace unicode text characters with small **colored heraldic shields**:
  - Shield shape: 5-point polygon (classic pointed-bottom shield, ~14x16px).
  - Fill: player color.
  - Highlight: lighter player color strip on left third of shield.
  - Unit type indicator: small icon drawn inside shield:
    - Warrior/Military: small sword shape (thin vertical rect + crossguard horizontal rect) in white.
    - Settler: small house outline (triangle roof + rect body) in white.
    - Scout: small eye symbol (ellipse with circle inside) in white.
    - Worker: small gear/wrench (simplified) in white.
  - Glow: `setGlow(playerColor, 6)`.
  - Selection ring: when selected, white hexagon stroke around the hex, 2px, pulsing alpha (0.5→1.0 at 1Hz).
  - HP indicator: tiny colored bar below shield (3 segments).

**Cities**
- Replace text with a small **stylized city icon**:
  - 3 rectangles of varying heights (skyline silhouette) in player color.
  - A small flag polygon on the tallest building in player color.
  - Glow: `setGlow(playerColor, 12)`.
  - City name: text below hex in small `#e8d8a0`, 8px.
  - City level: number in white above city icon.

**Resources / Improvements**
- Gold mine: small star polygon in `#d4a830`.
- Food: small round fruit icon (circle + leaf) in `#44cc44`.
- Production: small anvil shape in `#888`.

**Borders**
- Territory borders: when a player controls adjacent hexes, draw the shared edge in player color (2px, at 0.7 alpha). Border glow: `setGlow(playerColor, 3)` on each border segment.

### Particle & Effect System

| Effect | Description |
|---|---|
| Unit move | Small trail of 3 dust motes along movement path, fade 500ms, terrain color |
| Combat | Brief flash of white on defending hex (50ms), then sparks: 4 gold `#d4a830` particles |
| City capture | Pulsing ring expands from city (capturing player's color), 3 rings, 1.5s each |
| City growth | Green upward particles (5) rise from city, fade 1s |
| Tech research | Gold sparkle burst: 8 particles from tech panel, 400ms |
| Fog reveal | Fog wash dissolves on newly explored hexes: alpha fades from 0.65 to 0, 0.5s |
| Wonder built | Large gold ring pulse from city, with expanding white cross (+) shape, 2s |
| Unit death | Shield breaks: 3 shield-fragment polygons fly outward, fade 400ms |

### UI Polish

- **Resource bar**: horizontal bar across top, parchment `#12100a` background, gold border. Shows: Gold (coin icon), Production (hammer icon), Science (flask icon), Food (wheat icon). Values in `#e8d8a0`.
- **Turn indicator**: "TURN 47" in `#d4a830` gold, top center.
- **Current player indicator**: colored banner at top with player name and color.
- **Tech tree panel**: slide-in from right, dark parchment background, techs as nodes with lines connecting them. Unlocked = bright, available = outlined, future = dim.
- **Action menu** (when unit selected): 4 buttons in dark rounded rect, icons + text in `#e8d8a0`. Active hover: gold highlight.
- **Minimap**: `#080c10` background, terrain colors at 50% saturation, player cities shown as colored dots. Border: double gold line. Viewport indicator: white dashed rectangle.
- **Win screen**: "VICTORY" in large `#d4a830` gold with `setGlow` — parchment pane with player's score summary.

---

## Sound Design Plan

### Sound Synthesis Table

| Event | Oscillator | Frequency | Envelope | Filter/Effect | Character |
|---|---|---|---|---|---|
| Unit select | triangle | 440Hz | A:0 D:0.08 S:0.3 R:0.1 | none | clear bell ting |
| Unit move confirm | sine | 330→440Hz | A:0 D:0.1 | none | soft rising tone |
| Combat start | sawtooth | 220Hz + 330Hz | A:0.01 D:0.3 S:0.2 R:0.2 | lowpass 800Hz | clash |
| Combat win | sine | 440→550→660Hz arpeggio | A:0 D:0.08 per | reverb | triumphant sting |
| Combat loss | sawtooth | 330→220→110Hz | A:0 D:0.1 per | lowpass 500Hz | defeat fall |
| City capture | sine chord | 523+659+784Hz | A:0.01 D:1.0 S:0.6 R:0.5 | reverb | bold fanfare |
| City founded | sine | C4 E4 G4 sequence | A:0 D:0.12 per | reverb | founding chime |
| Tech complete | triangle chord | 880+1100+1320Hz | A:0 D:0.5 | reverb | discovery chime |
| Turn end | sine | 220Hz click | A:0 D:0.05 | none | turn clock |
| Wonder built | sine arpeggiated chord | G3 B3 D4 G4 B4 D5 G5 | A:0 D:0.15 per | long reverb | epic proclamation |
| Fog reveal | sine | 880→440Hz | A:0 D:0.2 | lowpass 2000Hz | discovery whoosh |
| Resource gain | triangle | 660Hz | A:0 D:0.06 | none | coin ting |

### Music / Ambience

- **Ambient base**: a quiet, slow evolving pad — two sine oscillators (220Hz and 330Hz) with slow LFO vibrato (0.3Hz, depth 5Hz), very low gain (0.05). This creates a timeless, contemplative hum.
- **Game music**: classical-style generative loop using triangle oscillators (organ-like timbre). Four-bar pattern in D minor:
  - Bass: triangle at 110Hz playing D2-A2-F2-C2 (one note per bar).
  - Harmony: two triangle oscillators a third apart, playing sustained chords (D+F at 294+349Hz, etc.), changing each bar.
  - Melody: slower, random-walk within D minor scale at 4x frequency (upper register), each note held 0.5–1s. Gain 0.04.
  - Tempo: 60 BPM — slow and majestic.
- **Tension**: when at war (combat in last turn), the bass drops to D1 (55Hz) and the melody becomes more dissonant (uses minor 2nd intervals).
- **Peace/victory near**: when leading in score, harmony shifts to D major (bright), melody speeds up slightly.
- **Master gain**: 0.3.

---

## Implementation Priority

**High**
- Hex tile edge highlighting (top-light / bottom-shadow) for depth
- Terrain detail symbols (grass tufts, tree triangles, wave arcs, etc.)
- Unit shield shape redesign (heraldic shields with unit-type icons)
- City icon redesign (skyline silhouette with flag)
- Territory border edge coloring in player color
- Fog of war dissolve animation on exploration

**Medium**
- Mountain snow cap rendering
- Map ornamental frame (gold border with corner diamonds)
- Unit selection hex pulse ring
- Combat spark particles
- City capture ring pulse
- Resource/top bar UI redesign
- Tech complete chime

**Low**
- Generative classical ambient music
- Wonder built epic sound stinger
- Minimap viewport dashed-rect indicator
- Fog reveal sound
- Parchment-style win screen
