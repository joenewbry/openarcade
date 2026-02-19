# Columns — Visual & Sound Design Plan

## Current Aesthetic

The game uses a 300x600 canvas with 6 COLS, 13 ROWS, CELL=50. Six gem colors: `#f44` (red), `#4f4` (green), `#44f` (blue), `#ff0` (yellow), `#f0f` (magenta), `#0ff` (cyan). Gems are filled rectangles with a top-left highlight corner. A ghost piece at 0.2 alpha shows preview. Chain bonus text appears in `#c6f`. Background is flat `#1a1a2e`. The colors are correct and vibrant, but the gems look like colored squares with a corner highlight — they need to look like actual gemstones with depth, facets, and prismatic brilliance.

## Aesthetic Assessment: 2.5 / 5

The color selection is excellent. Six distinct gem colors is correct. The ghost piece is a smart touch. But gems as flat rectangles is the weakest possible execution of the gem concept. Columns is ALL about the gems — they should sparkle, refract, and make you want to match them. The background also needs atmosphere to complement the crystal aesthetic.

---

## Visual Redesign Plan

### Background & Environment

- **Background gradient**: a deep cosmic dark, top = `#0a0a18` to bottom = `#12082a`. The gradient runs vertically across the full game area, suggesting looking into a deep cave of crystals.
- **Background crystal field**: scattered faint geometric shapes (hexagons or diamond outlines) in `rgba(100,80,200,0.05)` distributed across the background at random sizes 10–40px. These represent the rock/crystal matrix the gems are embedded in.
- **Side walls**: the left and right edges of the game area (outside the 6 columns) are drawn as **crystal cave walls** — dark purple-grey `#1a1530` fill with a 2px inner-edge line in `#2a2050` and small facet marks (short diagonal lines) in `#251e40`.
- **Bottom floor**: a 4px horizontal line at the bottom of the playfield in `#4a3080` purple-grey.
- **Scanline suggestion**: extremely faint alternating-row darkening (every other row at `rgba(0,0,0,0.03)`) for CRT atmosphere.

### Color Palette

| Role | Old | New |
|---|---|---|
| Background top | `#1a1a2e` | `#0a0a18` |
| Background bottom | `#1a1a2e` | `#12082a` |
| Background crystals | none | `rgba(100,80,200,0.05)` hexagons |
| Wall sides | none | `#1a1530` cave walls |
| Red gem | `#f44` | `#ff3333` with `#ff8888` highlight, `#aa0000` shadow |
| Green gem | `#4f4` | `#33ff44` with `#88ff99` highlight, `#007700` shadow |
| Blue gem | `#44f` | `#3344ff` with `#8899ff` highlight, `#000099` shadow |
| Yellow gem | `#ff0` | `#ffee00` with `#ffff88` highlight, `#888800` shadow |
| Magenta gem | `#f0f` | `#ff33ff` with `#ff88ff` highlight, `#880088` shadow |
| Cyan gem | `#0ff` | `#00ffee` with `#88ffff` highlight, `#007777` shadow |
| Gem cell bg (empty) | none | `#0e0e1e` very faint fill |
| Ghost piece | 0.2 alpha | 0.25 alpha + dashed border |
| Chain text | `#c6f` | `#ffddff` warm white with `#c044ff` glow |
| Score text | white | `#e8e0ff` |
| Grid lines | none | `#14122a` at 0.5 alpha |

### Entity Redesigns

**Gems — the core redesign**

Each gem occupies a CELL=50 square. The gem should be drawn as a **faceted jewel**, not a flat square:

1. **Outer shape**: the full CELL square acts as the bounding box, but inset 3px on each side. So the gem is 44x44px.

2. **Facet polygon layout** (drawn with `fillPoly`):
   - **Main face** (largest): an octagon (square with corners cut at 45deg, 8px cut), fill = base gem color.
   - **Top-left facet triangle**: fills the top-left corner triangle area, fill = bright highlight color (gem color lightened 60%).
   - **Top-right facet**: narrow triangle, fill = slightly lighter than base.
   - **Bottom-right facet**: darker shade (gem color darkened 40%).
   - **Bottom-left facet**: medium-dark shade.
   - **Top edge highlight bar**: 1px line at very top of octagon in near-white `rgba(255,255,255,0.8)`.

3. **Inner shine spot**: a small bright ellipse (6x4px) in near-white `rgba(255,255,255,0.6)` at position (gem_x + 10, gem_y + 10). This simulates a light reflection highlight.

4. **Glow**: `setGlow(gemColor, 6)` active when a gem matches 3+ in a column during fall/idle. Normally `setGlow(gemColor, 2)` ambient.

5. **Active column** (the falling piece): gems in the active column get `setGlow(gemColor, 12)` for strong visibility.

6. **Match disappear animation**: matched gems don't just vanish — they **shatter**:
   - 6 triangular fragment polygons fly outward from gem center.
   - Each fragment fades over 300ms.
   - Brief bright flash (white fill on gem cell at 0.8 alpha, 3 frames).

**Ghost piece**
- Same faceted octagon shape but fill = `rgba(gemColor, 0.15)` and a dashed stroke border (alternate 4px dash, 4px gap) in gem color at 0.4 alpha.

### Particle & Effect System

| Effect | Description |
|---|---|
| Gem match flash | White fill on matched cells at 0.8 alpha, 3 frames, then fade |
| Gem shatter | 6 triangular fragments fly outward per gem, fade 300ms in gem color |
| Prismatic shimmer | Random matched gem emits a small rainbow streak: 3 colored dots (red, green, blue) fly off in star pattern, 200ms |
| Chain x2 | Large "CHAIN x2" text appears at center: `#ffddff`, scale from 0.5 to 1.5, fade 800ms |
| Chain x3+ | As above but adds a background flash of chain color across the board (0.1 alpha, 2 frames) |
| Gem land | Small dust puff: 3 particles of very light color fly from landing position |
| Score popup | "+N" floats up from matched area in `#e8e0ff`, 1s |
| New gem entry | Gem slides in from top with slight stretch (scale y from 0.5 to 1.0 over 4 frames) |
| Background pulse | On high chain: background hexagon shapes briefly brighten (0.15 alpha, 0.5s) |

### UI Polish

- **Left score panel**: slim vertical strip (width 20px each) on left side showing current score in rotated text — but this is too narrow; instead place scores above the grid in a clean header bar.
- **Score**: above grid, centered. Font-size large in `#e8e0ff` with subtle `setGlow('#c044ff', 4)`.
- **Level indicator**: "LVL 5" right-justified above grid in smaller text, `#c8c0f0`.
- **Chain display**: centered below grid during chain, `#ffddff` with glow, auto-fades after 1.5s.
- **NEXT preview**: separate small cell next to top of grid showing next 3-gem column (smaller cells, 30x30) with a "NEXT" label above in `#a090d0`.
- **Game over overlay**: dark overlay `rgba(0,0,0,0.7)` with "GAME OVER" in large `#ff3333` red with `setGlow('#ff0000', 20)`. Score summary below in `#e8e0ff`.

---

## Sound Design Plan

### Sound Synthesis Table

| Event | Oscillator | Frequency | Envelope | Filter/Effect | Character |
|---|---|---|---|---|---|
| Red gem clear | sine | 523Hz (C5) | A:0 D:0.15 S:0.3 R:0.1 | reverb | crystal chime |
| Green gem clear | sine | 659Hz (E5) | A:0 D:0.15 S:0.3 R:0.1 | reverb | crystal chime |
| Blue gem clear | sine | 784Hz (G5) | A:0 D:0.15 S:0.3 R:0.1 | reverb | crystal chime |
| Yellow gem clear | sine | 880Hz (A5) | A:0 D:0.15 S:0.3 R:0.1 | reverb | crystal chime |
| Magenta gem clear | sine | 988Hz (B5) | A:0 D:0.15 S:0.3 R:0.1 | reverb | crystal chime |
| Cyan gem clear | sine | 1047Hz (C6) | A:0 D:0.15 S:0.3 R:0.1 | reverb | crystal chime |
| Gem land | sine | 220Hz | A:0 D:0.06 | none | soft thud |
| Chain x2 | sine chord | 523+659+784Hz | A:0.01 D:0.3 S:0.5 R:0.2 | reverb | chord shimmer |
| Chain x3 | sine chord | 659+784+988+1047Hz | A:0.01 D:0.5 S:0.5 R:0.3 | reverb | higher chord |
| Chain x4+ | sine arpeggio | C5 E5 G5 B5 C6 | A:0 D:0.06 per | long reverb | ascending fanfare |
| Column swap | triangle | 660→880Hz | A:0 D:0.06 | none | rotation click |
| Game over | sawtooth | 220→110Hz | A:0 D:0.8 | lowpass 600Hz | heavy descent |
| Level up | sine arpeggio | C4 E4 G4 C5 | A:0 D:0.1 per | reverb | rising celebration |

### Music / Ambience

- **Ambient crystal hum**: two triangle oscillators (110Hz and 165Hz, a fifth apart) at gain 0.02, with very slow LFO vibrato (0.2Hz). Sounds like a cave resonance.
- **Background music**: a meditative pulse at 100 BPM. Bass: triangle at 55Hz pulse (D:0.3, every beat). Harmony: slow chord progression (D minor: Dm → F → C → Am, 4 beats each). Chords as stacked sine oscillators at root + major/minor 3rd + 5th, very soft gain 0.03. Melody: sparse — one triangle note every 2–4 beats, picking notes from current chord, held 1–2 beats. Reverb applied.
- **Speed increase** (higher levels): BPM increases by 5 per level. By level 10, it's 150 BPM and energetic.
- **Chain reaction**: during chain matches, background music briefly doubles in volume for 1 bar, then returns.
- **Master gain**: 0.35.

---

## Implementation Priority

**High**
- Faceted octagon gem shape (8-point polygon with highlight/shadow facets)
- Inner shine spot (white ellipse in top-left quadrant of gem)
- Gem match shatter animation (6 fragment polygons)
- Match flash (white cell flash, 3 frames)
- Gem glow intensity (active column brighter, matched gems flash)

**Medium**
- Background gradient (dark top to deeper-purple bottom)
- Crystal background hexagon shapes
- Cave wall sides
- Chain text visual (scale animation, glow)
- Prismatic shimmer particle on match
- Each gem color has its own chime note (C, E, G, A, B, C6)

**Low**
- Ghost piece dashed border
- Background pulse on high chain
- Crystal cave hum ambient
- Generative meditative music loop
- Level-up fanfare
- Score panel polish
