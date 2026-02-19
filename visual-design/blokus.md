# Blokus — Visual & Sound Design

## Current Aesthetic
A 14x14 grid board with two player colors: blue (`#4488ff`) for player and purple (`#a966ff`) for AI. Empty cells are dark (`#222222`). Placed pieces get a small white highlight quadrant in the upper-left corner. Corner dots (valid placement indicators) are shown as small blue circles. The board has a glowing purple border. The piece panel below uses small 9px cells. Selected pieces get a blue highlighted border. The background behind the board is a dark navy. Overall it's functional and clean but visually flat — Blokus is a beautiful abstract color game and the current aesthetic doesn't capture that tactile, colorful, geometric spirit.

## Aesthetic Assessment
The piece shapes are accurate and the board reads clearly. The corner dot system works. But the cells look like pixels, not polished plastic tiles. The color contrast between blue and purple is weaker than it should be. The empty board doesn't convey the satisfying "territory claimed" feeling that makes Blokus compelling.
**Score: 2/5**

## Visual Redesign Plan

### Background & Environment
The board should feel like a high-quality board game sitting on a dark surface. Background: very dark charcoal (`#0d0d0d`) with a subtle radial gradient brightening slightly toward center (suggesting a spotlight above the board). The board itself has a slightly raised appearance: the outer border casts a faint shadow (a 4px dark edge outside the border on the bottom-right).

The board grid: empty cells use `#181818` (slightly lighter than the overall background, so the grid reads clearly). Every 2x2 block of cells has an extremely subtle different shade — a faint 2px grid at the 2-cell interval — to help players read large shapes.

Above and below the board, the area outside has a faint repeating diagonal hatch at very low opacity (suggesting a textured table surface), rather than plain navy.

### Color Palette
- Player blue: `#3399ff`
- Player blue highlight: `#66bbff`
- Player blue shadow: `#1155aa`
- AI purple: `#cc55ff`
- AI purple highlight: `#ee88ff`
- AI purple shadow: `#771199`
- Empty cell: `#181818`
- Grid line: `#0d0d0d`
- Board background: `#111111`
- Board border glow: `#cc55ff` (AI color — more visually striking than blue border)
- Background surface: `#090909`

### Entity Redesigns
**Placed pieces:** Each cell of a placed piece gets a beveled tile treatment:
1. Base fill: player/AI color
2. Top-left bright edge: 2px bright highlight (`#66bbff` for blue, `#ee88ff` for purple) — the "raised face"
3. Bottom-right dark edge: 2px shadow (`#1155aa` / `#771199`) — the "side face"
4. Small inner shine: a 3x3 white dot at top-left of each cell at 20% alpha

This makes each piece look like a glossy plastic tile, matching the actual Blokus game pieces.

**Corner placement dots:** Current small circles work but need brightening. Make them pulsing faintly (1.0 → 0.6 alpha, 1.5s cycle) to clearly signal "place here". Color matches player color.

**Hover preview (valid):** Current blue fill stays but gets a brighter glow border (2px outer glow, 3px inner glow). The piece being placed also shows a subtle "snap" animation when moved onto a valid corner — a quick bright flash (0.3 alpha white) for 3 frames.

**Hover preview (invalid):** Red fill with a pulsing red border, animated at 4Hz to clearly communicate rejection.

**Piece panel:** Pieces displayed in the bottom panel get larger cell sizes (12px instead of 9px). Selected piece has an animated glow border that cycles between bright blue and white. Used pieces appear with a faint cross-through pattern (two diagonal dim lines across the piece bounds).

### Particle & Effect System
**Piece placement:** When a piece is successfully placed, a brief burst: 6-8 small colored squares (the player's color) fly outward from the piece center and fade over 15 frames. Each cell of the placed piece briefly brightens (flashes to near-white for 3 frames) in a wave from the corner origin.

**AI placement:** AI pieces slam down with a slightly more dramatic effect — a brief purple ripple ring expands from the placed piece.

**Game end:** If player wins, all player pieces do a synchronized pulse (brighten/fade) 3 times. If AI wins, AI pieces do the same in purple.

**Valid corner indicator pulse:** The corner dots animate with a ripple — a ring expands outward from each dot every 2 seconds, fading quickly.

### UI Polish
Score and pieces-remaining displayed in styled panels with the player's color accent. Turn indicator uses a bright glowing text: "YOUR TURN" in blue or "AI THINKING..." in purple. The pass button is redesigned as a sleek dark button with a red border when forced (no moves available). Board borders change color subtly based on whose turn it is — warm blue when player, cool purple when AI.

## Sound Design Plan
*(Web Audio API only — no external files)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Select piece | Soft click | 1200Hz sine, very short | 0.05s | Picking up a tile |
| Hover valid | Subtle chime | 880Hz sine, gentle | 0.08s | Positive hover feedback |
| Hover invalid | Low thud | 200Hz sine, short | 0.1s | Rejection feel |
| Place piece | Tile drop | 180Hz sine (thud) + high 2000Hz click | 0.2s | Satisfying plastic snap |
| Rotate/flip | Whoosh | White noise 500→2000Hz | 0.1s | Piece rotating |
| AI place | Deeper thud | 140Hz sine + click | 0.25s | Slightly more ominous |
| Game win | Bright arpeggio | 392→523→659→784Hz sines, ascending | 1.2s | Victory scale |
| Game loss | Descending | 392→329→261→196Hz, slow | 1.5s | Sad descent |
| No moves | Alert | 440Hz square, 3 pulses | 0.6s | Alert tone |
| Pass | Muffled click | 300Hz sine, soft attack | 0.15s | Passing the turn |

### Music/Ambience
Blokus benefits from calm, focused ambient music. A looping ambient pad: three sine waves at 130Hz, 164Hz, and 196Hz (C-E-G major triad), each at 0.015 amplitude, creating a barely-there harmonic hum. Every 4 bars, a soft piano-like note (sine with fast attack, 2s decay) plays on a randomly chosen chord tone. The tempo is extremely slow, designed to feel like a contemplative board game session rather than arcade action.

## Implementation Priority
- High: Beveled tile rendering for placed pieces (highlight/shadow edges), piece placement burst particles, brighter corner dots with pulse
- Medium: Piece panel larger cells with cross-through for used pieces, AI slam ripple effect, turn-indicator color changes
- Low: Valid hover snap flash, game-end synchronized piece pulse, background diagonal hatch texture
