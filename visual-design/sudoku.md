# Sudoku — Visual & Sound Design

## Current Aesthetic

A 9x9 grid puzzle game on a 450x500 canvas. The grid uses thin grey lines with thicker lines separating the 3x3 boxes. Theme color is cyan-blue (`#4ae`). Given cells have white text, player-entered cells show in cyan. Highlighted row/column/box cells get a dim tinted background. Selected cell gets a bright border. The number pad sits below the grid as 9 + 1 buttons. The overall look is clean and functional but cold and clinical — it reads like a spreadsheet more than a satisfying puzzle game.

## Aesthetic Assessment
**Score: 2/5**

The layout is correct and the box separation is clear. But the color scheme is monotone, the grid has no warmth or tactile quality, and there is no visual feedback that makes solving feel rewarding. A good sudoku UI should feel like solving a puzzle on quality paper — satisfying, calm, and elegant.

## Visual Redesign Plan

### Background & Environment

**Canvas background**: Warm off-white cream `#f5f0e8` — like aged ivory paper. A very subtle crosshatch texture at 3% opacity (diagonal lines in slightly darker `#d8cfc0` at 0.5px width, crossing at 60 degrees) gives it a soft paper-grain feel. The margins around the grid get a slightly warmer tone `#ede6d8` to suggest the puzzle sheet sitting on a desk surface.

**Grid background**: The 9x9 grid cells use cream white `#fafaf5`. Box separators are thick (3px) and warm dark brown `#6a4e2f` — like printed ink on a quality newspaper. Cell separators are thinner (1px) in mid-brown `#c8b890`. The entire grid gets a subtle inset shadow (small dark rect border offset 2px) to suggest it is sitting slightly above the background.

**Number pad**: Each button is a rounded rectangle (strokePoly approximated) with a warm cream fill, dark brown border, and the numeral in a larger warmer typeface. The selected/active state gets a warm gold highlight `#d4a020`. The "Clear" button is subtly red-tinted `#f8d0c8` to distinguish it.

### Color Palette
- Background: `#f5f0e8`, `#ede6d8`
- Grid cells: `#fafaf5`
- Box border: `#6a4e2f`
- Cell border: `#c8b890`
- Given numbers: `#1a1a1a` (near-black ink)
- Player numbers: `#1a4a8a` (deep royal blue — pen ink color)
- Selected cell: `#fff0c0` fill with `#d4a020` border
- Highlight row/col: `#f0e8d0`
- Highlight box: `#e8dfc8`
- Conflict cell: `#fde0d8`
- Correct complete: `#d8f0d8`
- Number pad active: `#d4a020`
- Timer text: `#6a4e2f`
- Glow/bloom: `#d4a020`, `#1a4a8a`

### Entity Redesigns

**Grid cells**: Each cell has a micro-detail — a very faint corner dot at each of the 4 corners (1px circle at 15% alpha) to suggest graph paper registration marks. Given-number cells get a slightly warmer fill `#f5edd8` to distinguish them from empty cells at a glance — like printed vs. penciled values.

**Selected cell**: Warm golden fill `#fff0c0` with a bright amber border `#d4a020` (2px). A subtle glow radiates around the selected cell (setGlow at low intensity in amber).

**Conflict highlighting**: When a player enters a number that conflicts with another in the same row/column/box, the conflicting cells flash a warm pink-red `#fde0d8` and stay tinted until resolved. The entered digit in the selected cell shows in a warning orange `#e06020` rather than blue.

**Correct completion**: When the puzzle is solved, each cell gets a brief wave of green `#d8f0d8` tinting — the wave sweeps diagonally from top-left to bottom-right over 40 frames. Cells return to normal after the wave passes, leaving just a subtle victory glow.

**Number pad buttons**: Drawn as 9 rounded square buttons in a 3x3 grid layout, plus a wider "Clear" button below. Each button shows the digit in large warm-dark text. When a number is already fully placed (all 9 instances in the grid), its pad button dims to 40% alpha to indicate it is no longer needed.

**Timer**: Displayed in the top-right above the grid, styled as a warm-toned digital clock. Each digit is drawn using rect-segment rendering (seven-segment style) in dark brown — evocative of a quality desk clock. The timer bracket gets a thin warm border.

### Particle & Effect System

- **Number placed correctly**: A brief ripple circle expands from the cell center (2px stroke circle expanding from 0 to 20 radius over 20 frames, fading). In the cell's fill color.
- **Row/column/box completed**: When all 9 cells in a row, column, or box are correctly filled, a golden shimmer sweeps across those cells — a bright 1px highlight bar that travels the length of the row/column, or a rotating highlight around the box border.
- **Puzzle solved**: A cascade of small golden star shapes (5-point polygon, radius 4) rains down from the top of the canvas — 25 particles over 60 frames. The grid border glows gold for 30 frames. "SOLVED" text blooms from the center in large gold lettering.
- **Wrong number flash**: The selected cell briefly flashes red-orange and shakes horizontally (±3px over 6 frames) before settling.
- **Erase/clear**: A small eraser-dust effect — 4 tiny grey square particles drift from the cell.

### UI Polish

- **Progress indicator**: A small compact bar across the top of the grid shows percentage complete — fills amber as more correct cells are placed. Labeled "Progress" in small text.
- **Hint mode**: When hinting is available, candidate numbers appear in the cell corners as tiny grey subscript numerals (4 per corner = covers all 9 candidates) — drawn at small size in muted brown.
- **Box shading**: Alternate 3x3 boxes receive a very slight tint difference — odd boxes `#fafaf5`, even boxes `#f5f0e8` — creating a chess-like macro-pattern that helps orient the eye.
- **Number pad count badges**: Each number pad button shows a tiny badge in its top-right corner indicating how many of that digit remain to be placed (0-9 in small text).

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Number placed | Soft sine tap | 660Hz, gentle envelope | 80ms | Like a pencil tap on paper |
| Number correct (row/col/box) | Ascending chime | 523→659→784Hz, sine with decay | 400ms | Satisfying completion tone |
| Cell selected | Minimal click | Sine 880Hz, very short | 40ms | Soft selection feedback |
| Number conflict | Low dull thud | Triangle 200Hz + brief noise | 120ms | Negative but not harsh |
| Erase/clear | Soft swoosh | Noise sweep 2000→800Hz | 80ms | Eraser sound |
| Puzzle solved | Full jingle | Arpeggio C4→E4→G4→C5 + hold chord | 800ms | Triumphant but calm |
| Timer warning (<60s) | Gentle tick accent | Sine 440Hz, one per second | 60ms each | Subtle urgency |
| Row complete | Bell tone | Sine 784Hz, medium decay | 300ms | Clean ring |
| Column complete | Bell tone | Sine 880Hz, medium decay | 300ms | Slightly higher pitch |
| Box complete | Double bell | 784+1047Hz together, decay | 400ms | Fuller completion sound |

### Music/Ambience

A calm, focused ambient loop appropriate for puzzle-solving concentration:
- **Ambient pad**: Two sine oscillators (220Hz and 330Hz) at very low gain (0.015 each), slightly detuned (+2 cents one, -2 cents other) creating a gentle beating chorus. Slowly modulate gain with a 0.03Hz LFO (barely perceptible breathing). Evokes quiet focus.
- **Occasional soft chime**: Every 8-12 seconds (random interval), a brief sine tone (1047Hz, gain 0.04, 200ms decay) sounds — like a distant clock. Creates gentle temporal awareness without distraction.
- **Pencil ambience**: Very subtle: white noise through a narrow bandpass filter (4000Hz, Q=8) at gain 0.003, with slow amplitude modulation — suggests the ambient sound of someone writing on paper.
- No rhythm, no melody — pure atmosphere. The sound design supports concentration rather than competing with it.

## Implementation Priority
- High: Warm cream/parchment grid aesthetic, seven-segment timer display, number conflict flash + shake, row/col/box completion chime
- Medium: Cell ripple on correct placement, number pad count badges, puzzle solved particle cascade, golden progress bar
- Low: Pencil ambient sound, box alternate shading, hint candidate subscript numbers, solved wave animation
