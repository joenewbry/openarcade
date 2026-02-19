# Competitive Tetris — Visual & Sound Design Plan

## Current Aesthetic

The game has two 10x20 Tetris boards (CELL=22) on a 600x500 canvas. P1 at x=15, P2 at x=365. Standard Tetris piece colors are used correctly: I=`#00f0f0`, O=`#f0f000`, T=`#a000f0`, S=`#00f000`, Z=`#f00000`, J=`#0000f0`, L=`#f0a000`. Ghost piece uses magenta `rgba(255,68,255,0.15)` outline. Board border is `#ff44ff` magenta. Garbage rows are `#888888`. VS text is `#ff44ff`. The magenta competitive framing is a strong idea but execution is flat — borders, VS text, and ghost piece are the extent of the competitive visual treatment. Competitive Tetris should feel like an arena event, an esport duel with electric atmosphere.

## Aesthetic Assessment: 3 / 5

The standard Tetris colors are correct. The magenta competitive framing is a good start. But pieces are flat colored squares (no depth), the boards feel static between pieces, and the "VS" tension isn't dramatized. This needs arena energy — crowd presence, screen effects, dramatic drop impacts.

---

## Visual Redesign Plan

### Background & Environment

- **Background**: very dark near-black with a subtle downward gradient: top `#08080e` to bottom `#0e0818`. Feels like a darkened arena.
- **Background glow pools**: two large radial gradient ellipses behind each board — left board has a faint `rgba(0,200,255,0.04)` cyan pool (I-piece color), right board has a faint `rgba(255,68,255,0.04)` magenta pool. They pulse very slowly (gain oscillates ±0.02 at 0.3Hz) suggesting the boards are lit from within.
- **Scanlines**: fine horizontal alternating rows at `rgba(0,0,0,0.06)` for arcade CRT feel.
- **Board borders**: redesign from simple magenta rectangle to a **layered frame**:
  - Outer border: 2px solid `#ff44ff`.
  - Inner frame: 1px darker `#992299` 2px inside.
  - Corner brackets: small L-shaped bright `#ffffff` marks at each corner (4px each arm).
  - Subtle glow: `setGlow('#ff44ff', 6)` on entire frame.
- **Center arena**: the gap between boards is a visual arena space:
  - "VS" text — large, bold, `#ff44ff` with `setGlow('#ff44ff', 20)`. Slightly rotated (3deg).
  - Below VS: small player name / team labels.
  - Above VS: total lines cleared counter for each side (left-justified / right-justified).
  - Attack indicators: when garbage is sent, animated "ATTACK →" or "← ATTACK" text slides across the center space.

### Color Palette

| Role | Old | New |
|---|---|---|
| Background | dark default | `#08080e` → `#0e0818` gradient |
| Board fill (empty) | black | `#0a0a12` slightly visible |
| Board border | `#ff44ff` flat | `#ff44ff` with glow, corner brackets |
| I piece | `#00f0f0` | `#00f0f0` with `#aaffff` highlight face |
| O piece | `#f0f000` | `#f0f000` with `#ffffaa` highlight |
| T piece | `#a000f0` | `#a000f0` with `#cc88ff` highlight |
| S piece | `#00f000` | `#00f000` with `#88ff88` highlight |
| Z piece | `#f00000` | `#f00000` with `#ff8888` highlight |
| J piece | `#0000f0` | `#0000f0` with `#8888ff` highlight |
| L piece | `#f0a000` | `#f0a000` with `#ffcc88` highlight |
| Ghost piece | `rgba(255,68,255,0.15)` | `rgba(255,68,255,0.25)` + dashed border |
| Garbage row | `#888888` | `#3a3a4a` dark grey with `#6a6a7a` center hole |
| VS text | `#ff44ff` | `#ff44ff` with `setGlow('#ff00ff', 24)` |
| Score/level text | white | `#e8d0ff` lavender-white |
| Line clear flash | none | white board flash 0.1 alpha, 3 frames |
| Tetris flash | none | board-wide rainbow flash |

### Entity Redesigns

**Tetris Pieces (cells)**

Each piece cell is CELL=22px. Redesign from flat colored square to a **beveled block**:

1. **Main face**: filled rect in piece color, inset 1px on all sides (so 20x20 within the 22x22 cell).
2. **Top-left bevel**: L-shaped polygon along top and left edges (2px wide) in lightened piece color (mix piece color 60% with white 40%).
3. **Bottom-right bevel**: L-shaped polygon along bottom and right edges (2px wide) in darkened piece color (multiply by 0.4).
4. **Inner gloss**: tiny white ellipse (5x3px) near top-left corner at 0.5 alpha — specular highlight.
5. **Glow**: active piece only — `setGlow(pieceColor, 8)`.

**Ghost Piece**
- Same beveled block shape but fill is `rgba(pieceColor, 0.1)`.
- Border: alternating 3px dash / 3px gap in piece color at 0.6 alpha.

**Garbage Rows**
- Fill: `#2a2a3a` dark blue-grey.
- A horizontal stripe across center (y=center, 2px) in slightly lighter `#4a4a5a`.
- One random cell gap (matching hole) is lighter `#4a4a5a`.
- Glow: `setGlow('#666688', 4)` — garbage glows menacingly purple.

**Active Line Clear**
- Lines don't just disappear — they **flash white** then a brief shockwave-style clearing:
  - Frame 1: entire cleared rows go solid white.
  - Frame 2: rows compress toward center (scale y: 1.0 → 0.0), squash effect.
  - Frames 3–6: rows above fall down (smooth translate, not teleport).

**Tetris (4-line clear)**
- The board flashes with a **rainbow wave**: each row cycles through rainbow hue from top to bottom over 8 frames.
- "TETRIS!" text appears large at board center, white with rainbow gradient stroke, scale 0→1.5→1.0 animation.

### Particle & Effect System

| Effect | Description |
|---|---|
| Piece lock | 4 tiny sparks fly from each locked cell's bottom edge, in piece color, 150ms |
| Line clear | Horizontal burst: 6 particles fly left/right from each cleared row, piece colors |
| Tetris clear | Board rainbow flash + 12 particles burst from both sides |
| Garbage receive | Board shakes: translate ±3px randomly for 4 frames |
| Garbage row enters | Row slides up from bottom with a red `#ff4444` flash on the board border |
| "ATTACK →" indicator | Text slides across center divider in 0.4s, `#ff6644`, bold |
| Speed up notification | "SPEED UP!" text appears briefly above board in `#ffcc44` |
| Piece hard drop | Speed lines: 4 vertical white dashes behind piece during hard drop |
| Level up | Brief golden border flash: `#ffd700` replaces normal border for 0.5s |

### UI Polish

- **Score panel**: above each board. Player 1: left-aligned labels in `#e8d0ff`. Player 2: right-aligned. Shows: SCORE, LINES, LEVEL.
- **Next piece box**: to the right of P1's board and to the left of P2's board (or above/below). Dark panel `#0c0c1a` with `#ff44ff` border, labeled "NEXT" in `#a080cc`.
- **Center panel**: "VS" large. Below: live stats — current level and lines per side. Small line-clear history icons (mini representations of last clear type).
- **Combo counter**: when multiple clears happen, "COMBO x3" appears above board in `#ffcc44` with scale animation.
- **Attack counter**: incoming garbage shown as orange blocks stacked on the right/left edge of the board preview.
- **Game over**: losing board freezes and fills with dark grey from top to bottom (rain of grey blocks, 0.5s). "WINNER: P1" in large rainbow-glow text.

---

## Sound Design Plan

### Sound Synthesis Table

| Event | Oscillator | Frequency | Envelope | Filter/Effect | Character |
|---|---|---|---|---|---|
| Piece move (left/right) | square | 220Hz very short | A:0 D:0.04 | highpass 200Hz | chip click |
| Piece rotate | square | 330Hz | A:0 D:0.05 | none | chip rotate tick |
| Piece soft drop | square | 165Hz, per step | A:0 D:0.03 | none | descend tick |
| Piece hard drop | noise + sine | — + 120Hz | A:0 D:0.12 | lowpass 500Hz | heavy slam |
| Piece lock | sine | 440Hz | A:0 D:0.08 | none | lock click |
| Line clear (1) | sine | 523→659Hz | A:0 D:0.15 | none | single clear |
| Line clear (2) | sine | 523→659→784Hz | A:0 D:0.12 per | none | double chime |
| Line clear (3) | sine | C5 E5 G5 B5 | A:0 D:0.1 per | reverb | triple chime |
| Tetris (4) | sine arpeggio | C5 E5 G5 C6 E6 | A:0 D:0.08 per | reverb | Tetris fanfare |
| Garbage sent | noise | — | A:0 D:0.2 | lowpass 400Hz | rumble |
| Garbage received | noise + sine | — + 80Hz | A:0 D:0.3 | lowpass 300Hz | heavy thud |
| Level up | sine | 880→1320Hz sweep | A:0 D:0.4 | none | rising sweep |
| Game over | sawtooth | 220→55Hz | A:0 D:1.0 | lowpass 600Hz | heavy descent |
| Win | sine chord | C5 G5 E6 arpeggio | A:0.01 D:0.5 | long reverb | victory |

### Music / Ambience

- **Game music**: high-energy Tetris-inspired electronic track at 160 BPM. Generative loop:
  - Kick: noise+60Hz (D:0.1) on beats 1+3.
  - Snare: noise highpass 1500Hz (D:0.08) on beats 2+4.
  - Hi-hat: noise highpass 5000Hz (D:0.02) on every 8th note.
  - Bass synth: sawtooth at 110Hz playing [A, A, E, G] (4 beats each), lowpass cutoff 600Hz.
  - Lead melody: square oscillator (4x bass frequency = 440Hz range) playing a driving 8-note pattern in A minor: A-B-C-D-E-G-A-G, each 8th note duration.
- **Intensity**: as game level increases, bass synth gain increases 0.01 per level (from 0.04 to 0.1 max). Hi-hat doubles at level 10.
- **Tetris clear sound**: music briefly (0.5s) adds a chord stab (sawtooth chord, C5+E5+G5+C6 at gain 0.15) then continues.
- **Opponent Tetris clear**: music momentarily (0.3s) drops in volume to 0.3x, then recovers — dramatic response.
- **Master gain**: 0.35.

---

## Implementation Priority

**High**
- Beveled block design (top-left highlight bevel, bottom-right shadow bevel, inner gloss spot)
- Active piece glow `setGlow(pieceColor, 8)`
- Line clear flash + compress animation (rows go white then squash-clear)
- Tetris 4-line rainbow flash + "TETRIS!" text
- Garbage row shaky entrance
- Hard drop speed lines

**Medium**
- Board border corner bracket design
- Background glow pools behind each board
- Ghost piece dashed-border redesign
- Piece lock spark particles
- "ATTACK →" center divider text
- Center panel live stats
- All move/rotate/lock sound effects

**Low**
- Scanline CRT effect
- Generative high-energy music loop
- Combo counter display
- Level up golden border flash
- Game over grey-rain animation
- Win rainbow glow text
