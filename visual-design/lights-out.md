# Lights Out — Visual & Sound Design

## Current Aesthetic

A 5x5 grid puzzle on a 400x440 canvas. Lit cells render as solid `#4fc` (cyan-green) rectangles with glow intensity 0.8. Unlit cells are dark `#1a3a30`. The background is near-black. There's a hover effect that previews neighbor toggles. Solve counter and move count display above the grid. The game is minimal and clean but feels like a developer demo rather than a polished puzzle experience — the cells look like colored rectangles with no depth, texture, or personality.

## Aesthetic Assessment

**Score: 2/5**

The core mechanics communicate well, but the visual execution is bare. The grid cells have no tactile quality — they don't feel like physical light panels. The color scheme is serviceable but not evocative. The hover preview is helpful but underdeveloped visually. There's potential for a gorgeous neon panel aesthetic that matches the game's electronic theme.

## Visual Redesign Plan

### Background & Environment

Transform the background into a dark brushed-metal control panel aesthetic. Use a very dark charcoal background (`#0a0c0e`) with subtle diagonal stripe texture (alternating 1px rows at `#0c0e10` and `#080a0c`). Add a faint outer vignette. Place the 5x5 grid as an inset panel with a raised border — draw a 2px border in `#1a2a20` with an inner 1px highlight `#2a4a38` to simulate a beveled metal surround.

Add a subtle ambient glow radiating from the overall lit cells — when 3+ cells are lit, the entire panel area has a soft green emission behind it (drawn as a blurred rectangle at low alpha).

Corner decorations: small circuit board trace patterns (thin lines in `#1a2a20`) extending from the grid corners to suggest an electronic PCB aesthetic.

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Primary (lit cell) | Electric lime green | `#39ff14` |
| Secondary (lit inner glow) | Bright cyan-green | `#00ffaa` |
| Unlit cell base | Deep slate | `#0d1f18` |
| Unlit cell border | Dark teal | `#1a3a28` |
| Background panel | Charcoal black | `#080c0a` |
| Background texture | Dark stripe | `#0c1008` |
| Grid border/bevel | Gunmetal | `#1a2420` |
| Hover preview | Soft amber | `#ffaa00` |
| Hover preview lit | Dimmed amber | `#aa6600` |
| Glow/bloom | Green neon | `#39ff14` |
| UI text | Ice white | `#e0ffe8` |
| Move counter accent | Electric blue | `#00aaff` |

### Entity Redesigns

**Lit Cells** — Each lit cell is a glowing neon panel. Render layers: (1) dark base fill, (2) bright inner rectangle (inset 3px from edges) in primary green `#39ff14`, (3) inner highlight strip along top-left edges (`#80ffaa`, 1px) to simulate 3D convex lens, (4) soft outer glow via `setGlow('#39ff14', 1.5)`. The bright fill should have a subtle radial gradient — brighter center, slightly dimmer at edges — suggesting a bulb behind glass.

**Unlit Cells** — Dark recessed panels. Render: (1) very dark base `#0d1f18`, (2) subtle inner shadow (1px darker border along top-left = `#080f0c`), (3) faint grid line pattern inside the cell at 20% opacity to show the panel is an inactive LED matrix.

**Hover Effect** — When hovering, the clicked cell and its 4 neighbors preview their new state. Show hover-targeted cells with an amber tint overlay: lit cells darken to `#aa6600`, unlit cells glow to `#ffaa00` at 60% brightness. Add a pulsing ring animation on the hovered cell (expanding circle, `#ffaa00`, lifetime 0.3s).

**Solved State** — When the board is cleared, all cells simultaneously flash bright white (`#ffffff`) then fade to a deep satisfied glow. Play a cascade animation — row by row or spiral — for the final clear.

### Particle & Effect System

- **Cell toggle ON**: Bright flash burst — 6 small spark particles radiate from cell center, color `#39ff14`, short lifetime 0.25s. Plus brief bloom pulse on the cell.
- **Cell toggle OFF**: Quick "power down" flicker — the lit cell rapidly dims over 3 frames before going dark. 3 dim particles `#1a3a28`.
- **Hover pulse**: Expanding ring at `#ffaa00`, alpha fade from 0.6 → 0, radius 5→20px, lifetime 0.2s.
- **Solve cascade**: When board clears, each cell triggers a green spark burst in sequence (150ms stagger). Final burst: 20 particles from board center in all directions, colors `#39ff14`, `#00ffaa`, `#ffffff`.
- **Move counter tick**: Small `+1` text floats up in `#00aaff` when a move is made, fades over 0.5s.
- **Ambient flicker**: Each lit cell has a 2% chance per second to very briefly flicker (1-frame dimming) — like a fluorescent light — adds life without distraction.

### UI Polish

The move counter and level indicator should be styled as digital LCD displays — use a monospace font with a dark background panel and green text (`#39ff14`). Label text in muted `#4a7a60`. Render the counter in a display bracket: `[ MOVES: 14 ]`.

Below the grid, add a minimal "RESET" and "NEW PUZZLE" button styled as physical switches — dark raised rectangles with a 1px lighter top edge. On click, animate a brief depression (darker for 1 frame).

Puzzle number shown as `PUZZLE 03 / 20` in small caps, top center, in `#4a8a68`.

A subtle "BEST" score display below shows the minimum possible moves for the current puzzle (if known), giving a goal to optimize toward.

## Sound Design Plan

*(Web Audio API only)*

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Cell toggle ON | Sine ping + harmonic | 880 Hz + 1760 Hz, fast attack/decay | 0.15s | Bright click-on, like a light switch |
| Cell toggle OFF | Sine, downward bend | 440→300 Hz, medium decay | 0.12s | Satisfying thud-off |
| Hover enter cell | Soft tick | Triangle wave 600 Hz | 0.04s | Very subtle UI feedback |
| Puzzle solved | Rising arpeggio | C5→E5→G5→C6 (sine) | 0.8s | Clean major chord sweep |
| Puzzle solved (perfect) | Full chord bloom | C major + reverb, sine waves | 1.5s | Grander, sustained |
| New puzzle load | Descending sweep | 1200→300 Hz, sine | 0.2s | Panel powering up |
| Reset click | Low click | Sine 200 Hz, very fast | 0.06s | Physical button press |
| Move counter increment | Soft blip | Sine 1000 Hz, triangle env | 0.05s | Barely audible, satisfying |
| Near-complete feedback | Tension hum | Sine 60 Hz + 120 Hz, low vol | loop | 2 cells remain = builds anticipation |

### Music/Ambience

A quiet electronic hum ambience — generate a sub-bass drone at 55 Hz (sine, very low amplitude) combined with occasional high-frequency digital "blip" accents (random sine at 2000–4000 Hz, 0.03s, every 3–8 seconds). This suggests a server room / electronics lab atmosphere without being distracting.

Optional: generate a minimal ambient melody using sawtooth waves through a heavy low-pass filter (cutoff 400 Hz) — a slow 4-bar loop at 80 BPM with notes from an F pentatonic scale. Meditative and focused. Volume very low (0.05 gain).

## Implementation Priority

**High**
- Lit cell layered render (base + bright inner + highlight strip)
- Glow bloom on lit cells (`setGlow` with high intensity)
- Toggle ON/OFF particle sparks
- Cell toggle sound (ON ping, OFF thud)
- Hover amber preview with ring pulse
- Solve cascade animation + sound

**Medium**
- Brushed metal background texture (stripe pattern)
- Grid bevel/inset border styling
- Digital LCD UI styling for move counter
- Ambient flicker on lit cells
- Move counter float-up animation
- Near-complete tension hum

**Low**
- Corner circuit board trace decorations
- Physical button style for reset/new puzzle
- Sub-bass drone ambience loop
- Ambient digital blip accents
- Perfect-solve grand chord bloom
