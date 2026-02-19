# Klotski — Visual & Sound Design

## Current Aesthetic

Sliding block puzzle where a 2×2 "King" block (red `#f44`) must reach the exit through a grid of 1×2 vertical (blue `#4af`), 2×1 horizontal (green `#4f4`), and 1×1 small (orange `#fa0`) blocks. Grid background `#16213e`, cells `#111828`. Exit marker is a dashed pink `#f8c` line with "▼ EXIT ▼" text. Selected block gets a white border with white glow. On solution, colorful particle explosion and "SOLVED!" text in `#f8c`. Five puzzle configurations. The aesthetic is clean and functional but extremely plain — the blocks are flat colored rectangles with no depth, no surface detail, and no environmental context.

## Aesthetic Assessment

**Score: 2/5**

The color coding works well — each block type is immediately distinguishable by color. The glow on selection is the right instinct. The particle celebration on solve is a nice touch. However the blocks look like placeholder rectangles, the grid has no depth or texture, there is no ambient background, and the UI is minimal. This puzzle game can be transformed into something that feels like glowing stained glass or neon crystal tiles — elegant and satisfying.

## Visual Redesign Plan

### Background & Environment

The puzzle should feel like a sacred geometric chamber — a shrine of sliding glyphs.

- **Background:** Deep dark `#080818`, with a faint radial glow `rgba(40,50,100,0.08)` centered on the puzzle grid — as if the puzzle itself emits faint light
- **Outer area (beyond puzzle grid):** Very subtle decorative pattern — faint concentric squares or geometric mandala lines `rgba(30,40,80,0.06)` radiating outward from grid center
- **Grid cells:** `#0e1525` (darker than current), with `#1a2540` subtle border lines between cells. Cells should look like recessed slots.
- **Grid border:** Outer frame of the puzzle grid drawn as a solid border `#2a3a5a` (2px), with corner accent dots `#4466aa`

The overall effect: the puzzle sits on a glowing dark altar, each block a luminous gem that slides within carved channels.

### Color Palette

- Background: `#080818`
- Background glow: `rgba(40,50,100,0.08)`
- Grid cell: `#0e1525`
- Grid line: `#1a2540`
- Grid border: `#2a3a5a`
- King block fill: `#cc1122`
- King block bright: `#ff3344`
- King block glow: `rgba(255,50,70,0.4)`
- Vertical block fill: `#1155cc`
- Vertical block bright: `#3388ff`
- Vertical block glow: `rgba(50,136,255,0.3)`
- Horizontal block fill: `#116611`
- Horizontal block bright: `#33cc33`
- Horizontal block glow: `rgba(50,200,50,0.3)`
- Small block fill: `#bb6600`
- Small block bright: `#ffaa00`
- Small block glow: `rgba(255,170,0,0.3)`
- Exit marker: `#ff88cc`
- Exit glow: `rgba(255,136,200,0.3)`
- Selected border: `#ffffff`
- Selected glow: `rgba(255,255,255,0.5)`
- Move counter: `#aabbdd`

### Entity Redesigns

**All Blocks — shared design language:**
Each block should look like a luminous crystal tile with inner depth:
1. **Shadow layer:** Dark ellipse `rgba(0,0,0,0.3)` beneath block, offset 2px down-right — lift effect
2. **Base fill:** Deep shade of block color (e.g. King: `#880011`)
3. **Face gradient:** Gradient from top `bright color` → bottom `deep color`
4. **Top bevel:** 2px bright highlight line along top edge — `rgba(255,255,255,0.35)` — simulates light from above
5. **Left bevel:** 1px bright highlight along left edge — `rgba(255,255,255,0.2)`
6. **Bottom bevel:** 1px dark shadow along bottom edge — `rgba(0,0,0,0.3)`
7. **Corner rounding:** 3px radius on block corners (softer, more gem-like)
8. **Inner symbol:** A subtle embossed geometric mark centered on each block type:
   - King block: Crown symbol (5 points drawn as triangles) in slightly brighter red `rgba(255,100,120,0.3)`
   - Vertical blocks: Upward/downward arrow in `rgba(100,160,255,0.2)`
   - Horizontal blocks: Left/right arrow in `rgba(100,220,100,0.2)`
   - Small blocks: Diamond in `rgba(255,200,100,0.2)`
9. **Glow:** Soft outer glow in block color (3–5px) at all times, slightly stronger when selected

**King Block (2×2, red):**
- The hero piece — make it unmistakably important
- Bright red face `#ff3344` with deep `#880011` sides
- Crown emblem centered (subtle, not intrusive)
- Constant slow pulsing glow `rgba(255,50,70,0.2)` → `rgba(255,50,70,0.45)` at 1.2Hz
- When selected: glow intensifies to `rgba(255,100,120,0.6)`, white border 2px

**Exit marker:**
- Instead of a plain dashed line, draw a prominent portal effect:
  - Two bright pink `#ff88cc` vertical pillars on either side of the exit gap
  - Inner glow between pillars: `rgba(255,136,200,0.15)` fill between them
  - "EXIT" text in `#ff88cc` centered above, with glow `rgba(255,136,200,0.4)`
  - Animated: small particles `rgba(255,136,200,0.3)` drift upward through the portal at all times — 3 per second

**King block at exit position:**
- When King block aligns with exit, both the block and portal glow white `rgba(255,255,255,0.4)` dramatically before the solve celebration triggers

### Particle & Effect System

- **Block slide:** Faint motion blur — 2 ghost copies of block `rgba(color, 0.15)` at 2px and 4px back along movement direction
- **Block land:** On block settling after a move, very brief (0.1s) small bounce (scale 1.0 → 1.02 → 1.0) + 2 tiny dust particles at base
- **Block select:** White glow pulse radiates outward 0px → 8px and fades over 0.3s on first select
- **Valid move hover:** When hovering over a movable block, glow brightens +30%
- **Solve burst:** On "SOLVED!":
  - Phase 1 (0ms): Screen flash `rgba(255,255,255,0.5)` for 0.15s
  - Phase 2 (0ms): 24 particles in all four block colors radiate from King block center
  - Phase 3 (100ms): 12 larger star particles in gold `#ffee66`
  - Phase 4 (300ms): "SOLVED!" text scales in 0.5 → 1.0 with bright pink glow
  - Phase 5 (500ms): Gentle particle rain from top of screen — colorful small dots
- **Exit portal drift particles:** 3 pink particles per second rise through portal gap
- **Move counter increment:** Counter briefly brightens on each move

### UI Polish

- Move counter: Top-center, "MOVES: N" in `#aabbdd` with subtle glow. Personal best displayed in gold `#ffee66` below it.
- Puzzle selector: Bottom-center, "PUZZLE N / 5" with left/right arrow buttons in `#3388ff`
- Reset button: Top-right, small dark button `rgba(30,40,60,0.8)` with `#445577` border, "↺" symbol in `#8899bb`
- Puzzle name/number: Elegant top-left text, small, `#556688`
- Completion screen: Dark overlay `rgba(8,8,24,0.9)`, "SOLVED!" in large `#ff88cc` with glow, move count summary, "NEXT PUZZLE →" button in bright blue

## Sound Design Plan

*(Web Audio API only)*

### Sound Events & Synthesis

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Block select | Crystal ping | 660Hz sine, gain 0.3 | 0.12s | Glass tap |
| Block slide (short) | Soft scrape | White noise, bandpass 800Hz, gain 0.15 | 0.1s | Tile sliding |
| Block slide (long) | Extended scrape | White noise, bandpass 600Hz, gain 0.2 | 0.25s | Longer move |
| Block land/settle | Low thud | 150Hz sine, gain 0.35 | 0.1s | Tile settling |
| Invalid move | Low negative | 200Hz sine down to 120Hz, gain 0.25 | 0.15s | Can't move |
| Hover (movable) | Soft hover tone | 440Hz sine, gain 0.08 | 0.06s | Available hint |
| King near exit | Rising shimmer | 660Hz → 880Hz sine, gain 0.15 | 0.3s | Getting close |
| Solve flash | Bright chime | 1046Hz sine (C6), gain 0.6 | 0.3s | Initial flash |
| Solve fanfare | Ascending arpeggio | C5-E5-G5-B5-C6, sine, gain 0.5 | 0.8s | Victory |
| Particle burst | Sparkle | 880Hz + 1108Hz triangle chord, gain 0.4 | 0.2s | Burst sound |
| Puzzle reset | Whoosh | White noise sweep highpass 3000→500Hz, gain 0.3 | 0.4s | Reset |
| Next puzzle | Transition | 440Hz → 660Hz sine, gain 0.3 | 0.3s | Advance |
| Move counter | Tick | 600Hz triangle, gain 0.1 | 0.04s | Each move |

### Music/Ambience

Zen ambient puzzle music — calm, focused, meditative:
- Pad: Triangle wave cluster 110Hz/138Hz/165Hz (A-C#-E major), gain 0.08, very slow attack 4s — constant soft harmonic hum
- Sine melody: Very low gain (0.04) slow pentatonic melody — notes A3/C4/E4/G4/A4, each held 2–4s randomly, soft fade in/out each note
- Deep bass drone: Sine 55Hz (A1), gain 0.06, constant — felt as body resonance
- Crystal accent: Triangle 1320Hz (E6), occasional single notes every 8–15 seconds at random, gain 0.12, 0.5s decay — like light catching a crystal
- Ambient: The music should be so quiet it's almost subliminal — the puzzle environment sounds should dominate
- On solve: music briefly swells (all gains ×3 for 0.5s), then fades to silence for 1s, then resumes for next puzzle

## Implementation Priority

- High: Layered block rendering (bevel/gradient/shadow/corner radius), King block pulsing glow, solve particle burst + screen flash, all slide/settle/solve sounds
- Medium: Exit portal pillars + drift particles, block slide motion blur, block select glow pulse, move counter tick sound, ambient zen music loop
- Low: Inner block symbols (crown/arrows/diamond), decorative background mandala pattern, King-near-exit shimmer sound, particle rain on solve, move counter personal best display
