# Tetris — Visual & Sound Design

## Current Aesthetic

Classic Tetris on a 10x20 grid with 30px cells. The 7 standard pieces use their traditional colors: I=`#0ff`, O=`#ff0`, T=`#a0f`, S=`#0f0`, Z=`#f00`, J=`#00f`, L=`#f90`. A ghost piece shows the drop position in a dark tinted version of the piece color. Lines flash bright when cleared. A next-piece preview canvas sits beside the board. Score, level, and lines counters displayed in DOM elements.

## Aesthetic Assessment
**Score: 2/5**

The fundamentals work correctly and the color coding is classic and readable. But the cells are plain colored rectangles with no depth, no texture, no sense that these are blocks rather than paint squares. The background is featureless dark. The line clear flash is the one satisfying visual moment. There is no sense of polished arcade presentation — no glass effect on blocks, no satisfying board glow, nothing that makes clearing a Tetris feel like a special moment.

## Visual Redesign Plan

### Background & Environment

The board background should be a very dark grid — charcoal `#0d0d0f` fill with a subtle grid overlay: thin lines `#1a1a20` at every 30px (the cell boundary), barely visible but providing spatial reference. The entire board area should have a very faint inner vignette: slightly lighter at center than at edges, as if illuminated from within.

Flanking the board on both sides, draw tall vertical neon accent strips: on the left a thin `#0ff` (I-piece cyan) glowing bar, on the right a thin `#a0f` (T-piece purple) glowing bar. These are 2px wide rectangles with `setGlow` applied, providing ambient ambience that frames the board.

The background behind the preview box and score panel should be a darker `#08080c` panel with a 1px inset border in `#2a2a3a`.

### Color Palette
- Primary: `#0ff` (I), `#ff0` (O), `#a0f` (T), `#0f0` (S), `#f00` (Z), `#00f` (J), `#f90` (L)
- Secondary: `#fff` (block highlights/specular), `#0d0d0f` (grid background)
- Background: `#0d0d0f`, `#08080c`
- Glow/bloom: Active piece color, `#fff` on line clear, `#ffd700` on Tetris (4 lines)

### Entity Redesigns

**Placed Blocks:** Each cell should look like a 3D block rather than a flat square. Draw each occupied cell as:
1. Main fill: the piece color
2. Top highlight strip: a 4px tall lighter version of the piece color (`#fff` blended at 40%) along the top edge
3. Left highlight strip: a 3px wide lighter strip on the left edge
4. Bottom shadow strip: a 4px tall darker version along the bottom edge
5. Right shadow strip: a 3px dark strip on the right edge
6. A small 2px inset border line in a slightly darker shade — the "grout" between blocks

This gives each cell a beveled cube appearance with consistent lighting from upper-left.

**Active Piece:** The falling piece should have a subtle glow applied: `setGlow(pieceColor, 6)` during normal fall. When the piece locks into place, a brief brighter flash (`setGlow(pieceColor, 16)`) for 3 frames, then settles.

**Ghost Piece:** Render ghost cells as outline-only with a dim glow — just the 1px border in the piece color at 50% opacity, no fill. This is clean and uncluttered while remaining readable.

**Line Clear Animation:** When lines clear:
- Frame 0-3: Entire cleared rows turn white `#ffffff` with `setGlow('#fff', 20)` — a blinding flash
- Frame 4-8: Rows collapse inward from left and right (cells animate their x-position toward center)
- Frame 9-15: Gap closes as rows above fall with an easing animation (spring bounce, overshoot by 2px then settle)
- On a Tetris (4 lines): Full board briefly flashes gold `#ffd700` with `setGlow('#ffd700', 12)` before the standard animation

### Particle & Effect System

- **Piece lock:** 4-8 small square particles in the piece color burst outward from the lock position, hitting a 1-cell radius and fading over 15 frames.
- **Line clear:** Each cleared cell emits 2-3 small rectangle particles that fly upward and fade — the particles are the piece colors of what was cleared, creating a colorful explosion unique to each clear.
- **Tetris clear:** Larger particle burst — 20 gold star particles arc up and outward from the cleared rows, combined with the standard white flash. A "TETRIS!" text floater appears in large gold letters for 60 frames.
- **Piece entry:** When a new piece spawns at the top, brief scan line effect — a thin bright white horizontal bar sweeps down from the spawn row over 4 frames.
- **Level up:** The board border pulses with a new glow color for 30 frames. A "LEVEL UP!" text slides in from the right.
- **Stack height warning:** When the stack reaches the top 4 rows, the danger zone gets a dim red overlay that pulses at 2 Hz.

### UI Polish

- **Score/Level/Lines panels:** Render as glowing neon-lit display panels. Dark background rectangle with a 2px colored border — cyan for score, purple for level, green for lines. Numbers rendered with extra pixel spacing for a digital-display feel.
- **Next piece preview:** The preview box should have a subtle drop shadow and the piece rendered with the full 3D block style (not a flat version). Label "NEXT" in dim white at top.
- **Board border:** A 3px glowing border around the playfield — white `#ddd` with a slight glow, framing the board as a distinct arena.
- **Score animation:** When points are awarded, the score number briefly scales up to 120% then back to 100% (pop animation over 8 frames). Large point gains (line clears) trigger the number turning gold temporarily.
- **Game over:** Placed blocks all flash red simultaneously, then fall downward off the board one row at a time from bottom to top over 30 frames. "GAME OVER" appears in large glowing text.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Piece move (left/right) | Soft tap | Sine 300 Hz, fast decay | 30ms | Subtle navigation |
| Piece rotate | Quick blip | Triangle 500 Hz | 40ms | Rotation confirm |
| Soft drop | Tick sequence | Sine 250 Hz per row | 25ms each | Falling taps |
| Hard drop | Sharp impact | Sine 150 Hz + noise | 80ms | Slam down |
| Piece lock | Thud | Lowpass noise 200 Hz | 60ms | Settle sound |
| Single line clear | Pop | Sine 440+660 Hz | 150ms | Satisfying click |
| Double line clear | Two-tone pop | Sine 440+660, then 523+784 | 200ms | Rising pair |
| Triple line clear | Rising chord | Sine 392, 523, 659 Hz stacked | 250ms | Building chord |
| Tetris! (4 lines) | Fanfare | Ascending arpeggio 261, 329, 392, 523, 659, 784 Hz | 600ms | Full major scale |
| Level up | Triumphant blip | Sawtooth 523+659+784 Hz | 300ms | Level chime |
| Game over | Sad descent | Sine 440, 392, 330, 261, 196 Hz | 700ms | Defeat fall |
| Danger zone | Low pulse | Sine 80 Hz, slow pulse at 2 Hz | Continuous | Stack near top |
| New piece spawn | Silent | — | — | No spawn sound needed |

### Music/Ambience

A synthesized Korobeiniki-inspired loop (no samples): Triangle wave playing the famous Tetris A melody in A minor at 140 BPM, transposed into pure synthesis. Main melody notes on triangle wave (gain 0.06): A4, E4, F4, G4, E4, D4, C4, D4, E4, F4, G4, A4, A4, A4... (sequence approximating the classic theme). A bass accompaniment on sawtooth at one octave below the melody roots (gain 0.03). The tempo increases by 5 BPM per level (starting 120 BPM, max 200 BPM), matching the increasing fall speed. At level 10+, a second triangle voice enters a third above the melody (harmonized version) at gain 0.04, making the music richer as gameplay intensifies.

## Visual Style
**Style:** Neon Arcade
**Rationale:** Fast-paced puzzle with neon blocks on dark grid — the established modern look for competitive Tetris. Glowing-on-dark palette is perfectly suited to the existing infrastructure and the piece-color vocabulary.

## Implementation Priority
- High: 3D block beveled rendering (highlight/shadow strips), line clear white flash + row collapse animation, ghost piece outline style
- Medium: Piece lock particle burst, Tetris gold flash + TETRIS text, danger zone red overlay pulse, score pop animation
- Low: Board flanking neon accent strips, game over block-fall animation, level up border pulse, synthesized Tetris theme
