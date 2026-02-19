# Nonogram — Visual & Sound Design

## Current Aesthetic

560x560 canvas. Puzzle grid with clue numbers in dark navy side panels. Filled cells in purple (`#aa88ee`). Empty cells on a dark background. Grid borders in muted purple. Completed row/column clues turn green (`#44aa66`). Incorrect cells flash red (`#f44`). Cursor is a highlighted cell outline. Timer and mistake counter in the HUD. Clean but generic puzzle interface — functional and readable but visually uninspiring.

## Aesthetic Assessment

**Score: 2/5**

The logic is well-implemented but the visual design feels like a spreadsheet application. The purple color choice is pleasant but arbitrary — it has no thematic connection to the puzzle content. The grid itself is flat and textureless. Completed clues turning green is good feedback. But the overall presentation lacks any invitation to play — no personality, no atmosphere, no delight in solving. A nonogram is a deeply satisfying puzzle form that deserves a visual wrapper that makes the solving process feel like artistic revelation.

## Visual Redesign Plan

### Background & Environment

Transform into a "pixels emerging from darkness" aesthetic — each solved cell feels like lighting a pixel in a neon art canvas. The theme is a dark digital canvas where the player is revealing a hidden pixel artwork.

**Overall background:** Near-black (`#080812`) everywhere outside the puzzle area. A faint grid ghost (`#ffffff04`) covers the entire canvas — barely visible, suggesting infinite grid extending beyond the puzzle boundary.

**Puzzle grid background:** The grid cells rest on a very dark navy (`#0a0f20`). The cell background alternates ever-so-slightly between two near-identical darks (`#0a0f20` and `#0d1228`) in a 5x5 block pattern — matching the standard nonogram 5-cell grouping visual convention. This makes 5-cell groups instantly readable.

**Clue panels (left and top):** Styled as dark instrument panels in `#060910` with a subtle border line in `#1a2040` separating them from the grid. Clue numbers sit in these panels. Complete clues change the entire clue cell background to a deep satisfied green (`#0a2a15`) with text in bright `#44ff88`.

**Grid lines:** Two line weights. Fine cell dividers every cell in `#1a2040` (barely visible). Bold 5-cell group dividers in `#2a3060` (more visible, gives the 5-block groupings clear separation). This matches standard printed nonogram conventions.

**Corner decoration (new):** The top-left corner cell (where left panel and top panel intersect) is filled with a small compass-rose style pixel pattern — a decorative 4x4 arrangement of tiny filled rects in the current puzzle's accent color, suggesting the puzzle's pixel art nature.

### Color Palette
- Background: `#080812`
- Grid background: `#0a0f20`
- Grid group alternate: `#0d1228`
- Clue panel: `#060910`
- Clue text unsolved: `#8899bb`
- Clue text solved: `#44ff88`
- Cell filled (normal): `#aa88ee` (retain + enhance)
- Cell filled glow: `#cc99ff`
- Cell X mark (empty guess): `#445566`
- Cursor: `#ffdd44` outline
- Error flash: `#ff3355`
- Grid line thin: `#1a2040`
- Grid line thick (5-group): `#2a3060`
- Glow/bloom: `#aa88ee`, `#44ff88`, `#ffdd44`

### Entity Redesigns

**Filled cells:** Complete redesign. Each filled cell is no longer a plain filled rectangle. It's drawn as:
1. Full dark background (`#0a0f20`)
2. Filled cell body in primary purple (`#aa88ee`) — slightly inset (2px margin) from cell edges, giving a gap between adjacent filled cells
3. A subtle top-left highlight: a 1px white line along the top edge and left edge at 20% opacity — giving the cell a lit-pixel look
4. Cell glow: `setGlow('#cc99ff', 0.4)` while filling, then reduced to 0.2 after settled — recently-filled cells are brighter, fading over 30 frames

**Empty guess cells (X marks):** Instead of a simple X drawn in lines, use a small centered dot (3px radius, `#445566`) — cleaner, less visually noisy. The player marks empties with a subtle indicator rather than a prominent X.

**Cursor:** Animated cursor using double-outline: outer outline in `#ffdd44` at full opacity, inner outline in `#ffdd4440` pulsing (sin wave, ±0.3 opacity, 0.05Hz). The cursor cell background is slightly lighter (`#141828`) than surrounding cells.

**Clue numbers:** Larger and cleaner. Unsolved clues in cool blue-gray (`#8899bb`). When a clue group is satisfied (all its runs are accounted for), it smoothly transitions: text brightens to `#44ff88`, background subtly greens, and a tiny checkmark appears to the right of the number (a 3px filled right-angle polygon in green).

**Mistake indicator:** When a cell is incorrectly filled (or a wrong X is placed in a cell that should be filled), the cell flashes: 3 rapid alternations between `#ff3355` and normal fill over 12 frames, then settles. A tiny shake animation (±2px horizontal) accompanies the flash — physical feedback for the mistake.

**Completion reveal (new):** When the entire puzzle is solved, the filled cells go through a "full illuminate" sequence: starting from the top-left filled cell, each filled cell brightens to full white (`#ffffff`) then fades back to a brighter version of its fill color over a 30-frame cascade. This reveals the pixel art image in a wave of light.

**Progress indicator (new):** A thin progress bar at the very bottom of the canvas (4px tall, full canvas width). It fills from left to right based on percentage of cells correctly solved. Color shifts from blue → purple → gold as it nears completion.

### Particle & Effect System

**Cell fill:** When the player fills a cell, a tiny 4-point star burst (4 particles, `#cc99ff`, 1px each) fires from the center of the cell and disperses within the cell bounds over 6 frames. Subtle, satisfying pixel-pop.

**Clue completion:** When a clue is fully satisfied, a brief shimmer runs across all cells in that row/column — a thin bright line (`#44ff8840`) sweeps across the row or down the column over 8 frames, then fades. Feels like the puzzle acknowledging your correct deduction.

**Row/column completion:** When every cell in a row or column is correctly determined (all fills and empties correct), the entire row/column briefly glows (`#44ff8830` overlay across all its cells, 15 frames).

**Mistake particles:** When an error is made, 6 red sparks (`#ff3355`, 1px) radiate from the mistake cell, dispersing within a 20px radius over 10 frames. The sparks add urgency without being punishing.

**Puzzle solved:** Full celebration sequence. Gold particles (20 of them, `#ffdd44`, 2-3px) burst from the center of the grid, arcing outward. The filled-cell wave sequence (described above) plays simultaneously. A brief bright white full-canvas flash (3 frames at `#ffffff08`) precedes the sequence.

**Timer urgency (new):** If the game has a time limit, when time is low the background very subtly pulses red (a `#ff000008` overlay that breathes at 1Hz) — barely perceptible but registers as tension.

### UI Polish

- **Timer:** Styled as a digital readout in amber (#ffaa44), monospaced. When time is low, it turns red (`#ff3355`) and the digits flash (every 0.5s). The timer is positioned in the top-right of the HUD area.
- **Mistake counter:** Each mistake shown as a small filled circle in red (`#ff3355`), arranged horizontally. Maximum mistakes creates a row of filled red dots — intuitive lives-remaining visual. When a mistake is used, the rightmost filled dot briefly animates (expands then shrinks back) before going dark.
- **Puzzle title/number:** Styled as a "PUZZLE N" label in the top-left HUD area, with the puzzle number in the current accent color.
- **Level complete overlay:** "SOLVED" text appears in large gold letters (`#ffdd44`) with a strong glow, centered on the canvas. Below it, completion time and mistake count are shown. A brief grid-wide light sweep precedes the overlay.
- **Hint system indicator (if present):** Styled as a lightbulb icon (small fillPoly triangle + rectangle base) in the HUD, dimming as hints are used.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Cell filled | Soft click | 880Hz sine, 20ms attack, 60ms decay | 60ms | Satisfying pixel-place sound. |
| Cell unfilled (undo) | Reversed click | 660Hz sine, short | 40ms | Soft pop for removal. |
| Empty cell marked (X) | Lower soft click | 440Hz sine, 30ms | 30ms | Quieter than fill — secondary action. |
| Mistake | Dissonant buzz | 220Hz + 233Hz (slight flat) simultaneously, 150ms | 150ms | Two-tone wrong-note buzz. |
| Clue satisfied | Chime | 1320Hz triangle wave, 150ms decay | 150ms | Bright bell for group completion. |
| Row/column complete | Double chime | 1320Hz + 1760Hz, 100ms each, slight overlap | 200ms | More celebratory than clue. |
| Puzzle solved | Fanfare arpeggio | C5-E5-G5-C6 (523-659-784-1047Hz) ascending, 100ms each | 500ms | Full victory sound. |
| Cursor move | Very subtle tick | 200Hz sine, 10ms | 10ms | Barely audible navigation feedback. Volume 0.05. |
| Timer warning (if timed) | Heartbeat pulse | 80Hz noise burst, 50ms, every 2s → every 1s → every 0.5s | Per pulse | Urgency ramp-up. |
| New puzzle load | Warm tone | 440Hz sine with slow attack (200ms) | 400ms | Puzzle begin sound. |
| Hint used | Soft descending | 880→660Hz over 200ms | 200ms | Thoughtful helper sound. |

### Music/Ambience

A contemplative ambient for deep thinking: a very low-volume (0.015) drone at 110Hz (sine wave) — the low A, suggesting calm focus. Above it, a second OscillatorNode at 220Hz (one octave up) at 0.008 volume with extremely slow amplitude modulation (0.05Hz, ±30%) — it breathes. A third tone at 330Hz (perfect fifth above the octave) at 0.005 fades in and out very slowly (0.02Hz). Together these three tones form a stable, meditative power chord that fills silence without competing with the solving process. The tones have slight independent detuning (3-5 cents) that creates gentle beating — organic, like a resonating room. When the puzzle is solved, all three tones swell briefly (volume doubles over 5 frames) then fade out cleanly as the fanfare plays.

## Implementation Priority
- High: 5-cell group visual separation (thick grid lines), cell glow effect on fill (fades after 30 frames), clue satisfaction checkmark + green background, mistake flash + shake animation
- Medium: Filled-cell border highlight (top/left edge lit), cursor double-outline pulse, row/column completion shimmer, particle burst on cell fill
- Low: Progress bar at bottom, puzzle-solved cell illuminate cascade, completion overlay animation, corner decorative pixel pattern, timer urgency background pulse
