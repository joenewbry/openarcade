# Puzzle Race — Visual & Sound Design

## Current Aesthetic

A 600×400 canvas showing two 9×9 Sudoku grids side-by-side — left for the player, right for an AI opponent. The background uses dark `#0d0d1a` and `#1a1a2e` tones. The primary accent color is purple (`#a4f`). Cell selection uses `#a44fff`-toned highlights. Grid lines vary in thickness for 3×3 block boundaries. Pencil marks support small candidate numbers. Error cells flash red. The AI solves cells with a timed delay. The aesthetic is functional but visually sterile — a plain dual-grid with no personality or race-game excitement.

## Aesthetic Assessment
**Score: 2/5**

The dual-grid layout clearly communicates the competitive premise. However, the visual presentation lacks urgency, excitement, or the feeling of a race. Grids look like plain spreadsheets. There's no animation communicating progress, no visual feedback for "falling behind" or "pulling ahead," and no cohesive theme beyond purple highlights on a dark background.

## Visual Redesign Plan

### Background & Environment

Introduce a racing-game-meets-puzzle-book aesthetic. The overall background is deep charcoal (`#080812`) with a very subtle diagonal cross-hatch texture (1px lines at ±45°, `#ffffff` at 1.5% alpha, 24px spacing) evoking graph paper at a vast scale. A center dividing strip (20px wide, `#0a0a1a` with a 2px bright `#a4f` center line) separates the two grids visually — like a finish line tape dividing the two competitors.

**Per-grid atmosphere:** Each grid sits on a slightly lighter panel (`#0f0f22`) with a 1px border in `#2a2a44` and a subtle inner glow from the top edge (light `#6644ff` at 4% alpha, fading downward 30px) — like a backlit puzzle board.

**Progress aura:** Behind each grid, a very large transparent numeral showing the percentage complete (e.g., "72%") in the player's theme color at 4% alpha — a ghost watermark that grows more visible as the puzzle nears completion.

### Color Palette
- Primary (Player): `#aa44ff` (purple)
- Primary (AI): `#ff4466` (red-pink — competitive rival)
- Background: `#080812`, `#0f0f22`
- Grid lines (thin): `#222238`
- Grid lines (thick box): `#3a3a5a`
- Correct cell fill: `#0f0f22` (default)
- Selected cell: `#1e1040` with `#aa44ff` border
- Error flash: `#3a0010`
- Pencil marks: `#667799`
- Glow/bloom: `#cc88ff` (player), `#ff6688` (AI)

### Entity Redesigns

**Grid cells:** Each cell gets a subtle upgrade. The default cell uses a very faint inner shadow (1px darker border on bottom-right edges) to create a slightly recessed look. Selected cell: glowing border (2px `#aa44ff`, `shadowBlur = 12` in the glow color). Recently filled cell: brief white inner flash (fills to `#ffffff` at 20% alpha for 3 frames then fades over 10 frames). Cells pre-given in the puzzle render with a slightly lighter background (`#191932`) and the number in a brighter `#ccbbff` shade to distinguish givens from user-entered values.

**Numbers:** Player-entered correct numbers render in bright `#ffffff`. Pencil-mark candidates render in `#667799` at 70% the cell font size, arranged in a 3×3 micro-grid within the cell. Incorrect entries flash the cell red (`#3a0010`) and the number turns `#ff4466` before shaking (±2px horizontal for 6 frames) and then clearing.

**AI grid:** The AI's grid has its numbers appear with a typewriter-animation: each digit starts at scale 0.3 and 0 alpha, grows to 1.15× scale and full alpha over 6 frames, then settles to 1.0×. AI-placed numbers use a slightly cooler white (`#ddeeff`) to subtly distinguish AI from player even when viewing the AI grid.

**Section divider (center strip):** The center `#a4f` line has a bright glow (`shadowBlur = 20`). Along this line, draw small animated "speed lines" — 6 horizontal dashes of 4px length, moving upward at 2px/frame, repeating, in `#a4f` at 40% alpha — evoking a race track center stripe.

**Progress bar (per player):** A thin 4px bar above each grid, filling left-to-right from 0% to 100% as cells are correctly filled. Player bar: purple gradient (`#6622cc` → `#cc44ff`). AI bar: red gradient (`#cc2244` → `#ff6688`). When one player overtakes the other's completion percentage, the overtaking bar briefly pulses bright (2× brightness for 10 frames).

### Particle & Effect System

- **Correct cell entry:** When the player places a correct number, 4 small particles radiate outward from the cell in the player's purple, lifetime 12 frames, size 2px. A brief ripple ring expands from the cell (0 → cell diagonal over 8 frames, alpha 0.5 → 0).
- **Error entry:** The cell emits 4 red particles (size 2px, lifetime 8 frames) in the error direction, plus the cell shake animation.
- **Box completion (3×3 solved):** When a 3×3 box is fully and correctly filled, all 9 cells flash white simultaneously then a ring of 12 particles bursts from the box center in the player's color.
- **AI solving burst:** The AI grid emits a brief bright pixel at each cell it fills, creating a visual rhythm of the AI's solving cadence.
- **Winner announcement:** When a player finishes the grid, 40 confetti particles in their color rain down from the top of the canvas, lifetime 80 frames, with random rotation and drift.

### UI Polish

- **Player labels:** "YOU" and "CPU" banners above each grid in their respective colors, with a subtle embossed look (1px white highlight offset 1px above, 1px dark shadow offset 1px below). Under each label, a small difficulty indicator: filled star icons (`★ ★ ★ ☆ ☆`).
- **Timer:** A central countdown or elapsed timer between the two grids, rendered large and in a monospaced style. The timer digits scale up to 1.1× for 6 frames on each second tick. At under 10 seconds (if timed), the timer turns red and pulses.
- **Completion percentage:** Below each progress bar, a small percentage label (`72%`) in the matching color at 80% alpha, updating live.
- **"LEAD" indicator:** When the player is ahead of the AI, display a small "LEADING" badge in gold (`#ffd700`) above the player grid, fading in/out. When behind, display "CATCHING UP" in the same gold. Badges slide in from the top over 20 frames.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Number placed (correct) | OscNode (sine) | 660 Hz, soft envelope | 80 ms | Satisfying click-tone |
| Number placed (error) | OscNode (triangle) dissonant | 220 Hz + 233 Hz simultaneously | 200 ms | Unpleasant clash |
| Pencil mark toggle | OscNode (sine) very soft | 880 Hz, 0.05 vol | 40 ms | Quiet tick |
| Box completed | OscNode (sine) chord | 523 + 659 + 784 Hz | 250 ms | C-E-G mini-fanfare |
| AI places number | OscNode (sine) soft | 440 Hz, 0.03 vol | 50 ms | Quiet — AI not intrusive |
| Cell selected | OscNode (sine) very short | 1320 Hz, 0.04 vol | 25 ms | UI click |
| Player takes lead | OscNode (sawtooth) sting | 880 → 1108 Hz sweep | 150 ms | Assertive |
| Puzzle complete (win) | Ascending arpeggio | 262, 330, 392, 523, 659 Hz | 600 ms | Victory fanfare |
| Puzzle complete (lose) | Descending minor | 523, 440, 349, 294 Hz | 500 ms | Defeat |
| New puzzle start | Two-note chime | 523 + 784 Hz | 200 ms | Ready signal |

### Music/Ambience

A focused, intellectual-competition soundscape. Rather than a melody, synthesize a rhythmic "thinking" pulse: a soft 72 BPM metronome tick — a very short `440 Hz` sine tone (20ms, 0.025 vol) on every beat. Layer over this a slow, rising tension pad: `110 Hz` sawtooth through a `BiquadFilter` lowpass at 200 Hz, volume 0.03, playing continuously. The pad pitch slowly rises by 1 semitone every 30 seconds of elapsed time (implemented as gradual frequency increase), creating subliminal urgency without being distracting. When the player is behind the AI (fewer cells filled), increase the metronome tempo from 72 to 90 BPM and raise the pad volume slightly from 0.03 to 0.05. When the player wins or solves a box, the pad briefly resolves upward (frequency jumps +5 semitones for 1 second then returns) as a reward signal.

## Implementation Priority
- High: Selected cell glow, correct/error cell particle bursts, progress bars with overtake pulse, number place sound effects
- Medium: Ghost completion watermark, box-complete ring burst, AI number typewriter animation, per-second timer tick
- Low: Center divider speed lines, confetti winner celebration, tension pad music, lead/catching-up badge
