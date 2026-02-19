# Tower of Hanoi — Visual & Sound Design

## Current Aesthetic

A classic puzzle game on a 500x400 canvas. Three pegs hold stacked disks in neon colors: `['#f44','#f80','#ff0','#0f0','#0ff','#48f','#a4f','#f08']`. Pegs are simple vertical rectangles on a horizontal base. Disks are plain colored rectangles of decreasing width. Level progression adds more disks (3 to 8). The theme color is green `#8da`. An optimal move counter and undo button exist. Score is based on solving with minimal moves.

## Aesthetic Assessment
**Score: 2/5**

The neon disk color spectrum is the single best visual idea here — it gives the puzzle a distinctive arcade feel. But everything else is bare: the pegs are featureless sticks, the base is a line, the background is empty. There is no sense of ceremony around the puzzle, no animation when disks move, no visual payoff when a level is solved. A puzzle this elegant deserves a presentation that makes each move feel deliberate and satisfying.

## Visual Redesign Plan

### Background & Environment

The background should evoke an ancient puzzle chamber. A dark stone floor: `#141210` base with a subtle stone tile grid — thin `#1e1c18` lines forming large rectangular tiles (every 80px). A soft radial vignette fades toward `#0a0a08` at the canvas edges.

The three peg positions should rest on a unified carved stone plinth — a wide, slightly elevated trapezoidal platform `#2a2420` sitting at the bottom quarter of the canvas, with a slightly lighter top surface `#3a332a` and a shadow underside `#1a1410`. The plinth has carved decorative grooves: thin horizontal lines at 4px intervals across the top face.

Above the plinth, a faint golden arc in `#5a4010` at 15% opacity connects the three peg positions in a gentle semicircle, suggesting the ancient mechanical nature of the puzzle. Very subtle ambient particles — tiny dust motes — drift slowly across the background (8-10 tiny 1px dots moving in random slow directions at 0.1 px/frame).

### Color Palette
- Primary: `#8da` (theme jade/green — the Jade Tower), disk spectrum (red→orange→yellow→green→cyan→blue→purple→pink)
- Secondary: `#2a2420` (stone plinth), `#5a4010` (gold accents)
- Background: `#141210` (dark stone), `#0a0a08` (vignette edges)
- Glow/bloom: Active disk color when lifted, `#ffd700` on solve, `#8da` for UI elements

### Entity Redesigns

**Pegs:** Replace plain rectangles with proper carved pillars. Each peg consists of:
1. A base capital — a slightly wider rectangle at the bottom of the peg where it meets the plinth, in `#3a332a`
2. The shaft — a slightly tapered rectangle (1px narrower at the top than the base) in `#2e2820`
3. A carved top finial — a small diamond polygon at the very top of the peg in `#5a4a30`
4. Subtle vertical groove lines on the shaft (two thin `#201e1a` lines running the length)

The active peg (where the selected disk will be placed) gets a subtle glow: `setGlow('#8da', 5)` on the shaft.

**Disks:** Transform from plain rectangles into proper disk ring shapes:
1. Main body: the colored rectangle, but with rounded ends — approximate by drawing a rectangle with two semicircles capping each short end
2. Center hole: a small dark oval `#141210` centered on the disk, suggesting the disk is hollow in the middle (like real Hanoi disks)
3. Top highlight strip: a 3px lighter version of the disk color at the top edge (light source from above)
4. Bottom shadow strip: a 3px darker version at the bottom edge
5. Each disk has `setGlow(diskColor, 4)` for a soft ambient glow — the tower of glowing disks should look spectacular

The lifted disk (in transit) glows brighter: `setGlow(diskColor, 12)`. It bobs slightly while held (±3px vertical oscillation at 3 Hz).

**Move animation:** When a disk moves from one peg to another, animate the trajectory:
- Phase 1 (12 frames): Disk rises vertically above all other disks (to a clearance height)
- Phase 2 (12 frames): Disk moves horizontally to the target peg position
- Phase 3 (12 frames): Disk descends onto the target peg stack
- All three phases use eased interpolation (sin-based ease in/out). The disk trail leaves a faint afterimage during horizontal travel (3 ghost copies at decreasing opacity).

### Particle & Effect System

- **Disk pickup:** A brief lift whoosh — 4 small particles in the disk color drift downward from the pickup position as the disk rises.
- **Disk place:** Impact particles — 4 small sparks in the disk color radiate outward from the placement point. A brief ring expands from the stack position (radius 10→20px in the disk color, fading over 10 frames).
- **Illegal move (large on small):** The target peg briefly flashes red `#f44` (2 frame pulse). The carried disk shakes (±6px horizontal for 6 frames, easing out). A brief low "bong" sound.
- **Level complete:** Full-canvas celebration — 24 particles in the current disk color spectrum radiate outward from the top of the solved peg, each carrying a different disk color. The solved peg glows bright gold `#ffd700` with `setGlow('#ffd700', 20)`. "SOLVED!" appears in large jade `#8da` text with a scale-in animation. The plinth base briefly illuminates.
- **Optimal solve (minimum moves):** A bonus star burst above the solved peg — 8 gold star shapes rising upward and fading. "PERFECT!" text in gold overlays the "SOLVED!" text with a brief delay.
- **New level intro:** The canvas briefly fades to black, then the new disks appear one at a time from bottom to top (each disk slides down to its position with a 4-frame delay between each), arriving with a soft placement sound.

### UI Polish

- **Move counter:** Displayed as a carved stone tablet at the top-center — a dark rectangle with a lighter inset area, the move count in bright `#8da` jade color. Beside it, the optimal move count in gold `#ffd700` (target to beat). When the player achieves optimal, the counter turns gold.
- **Level indicator:** Top-left, styled as "TOWER LEVEL N" in jade with a small stacked disk icon beside it showing the current number of disks.
- **Undo button:** Styled as a curved arrow icon (quarter-circle arc with an arrowhead) rather than text. Presses with a brief scale-down animation.
- **Disk count in peg:** A subtle number badge at the base of each peg showing how many disks are currently stacked there.
- **Progress between levels:** A horizontal bar at the bottom edge of the plinth showing progress through the current set of levels (e.g., level 3 of 6), filled in jade green.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Disk pickup | Soft chime | Sine 660+880 Hz, brief | 80ms | Light lift |
| Disk travel | Whoosh | Sine 300→500 Hz sweep | 200ms | Movement arc |
| Disk place | Stone thud | Lowpass noise 250 Hz | 80ms | Settled weight |
| Illegal move | Low buzz | Sawtooth 120 Hz, brief | 100ms | Error warning |
| Move count tick | Subtle click | Triangle 400 Hz | 20ms | Count increment |
| Near optimal alert | Gentle ping | Sine 784 Hz | 60ms | Almost perfect |
| Level solved | Victory chime | Sine 523, 659, 784, 1047 Hz | 500ms | Ascending major |
| Perfect solve bonus | Fanfare | Same + 1318, 1568 Hz continuation | 800ms | Extended triumph |
| New level intro | Bell peal | Sine 440 Hz, slow decay | 400ms | New challenge |
| Game complete | Grand fanfare | Sawtooth 523+659+784 Hz + sine 1047 Hz | 1000ms | Full completion |
| Undo | Reverse whoosh | Sine 500→300 Hz descent | 120ms | Step backward |
| Ambient | Stone hum | Sine 55 Hz, very quiet | Continuous | Chamber resonance |

### Music/Ambience

A meditative ancient puzzle atmosphere: a sustained ambient drone on two sine oscillators at 55 Hz and 82.5 Hz (perfect fifth, gain 0.02 each) with an extremely slow tremolo (0.08 Hz LFO) creating a breathing stone chamber feel. A pentatonic melody plays on triangle waves very quietly (gain 0.02): notes in the pentatonic scale C4, D4, F4, G4, A4 (262, 294, 349, 392, 440 Hz), each held for 1.5-3 seconds with random selection, giving a wandering meditative quality. Occasional resonant low-frequency pulses (sine 28 Hz, 200ms, gain 0.04) sound like deep stone vibrations every 15-25 seconds. The overall feel is calm, focused, ancient — like solving a puzzle in a stone temple. On level completion, the ambient music briefly swells in gain for 2 seconds before returning to quiet.

## Implementation Priority
- High: Disk rounded-end shape with highlight/shadow strips and glow, 3-phase animated disk movement, level complete particle celebration
- Medium: Carved peg pillar (base capital + finial + shaft grooves), disk center-hole oval, illegal move shake animation, optimal solve gold fanfare
- Low: Stone chamber background with floor tiles, dust mote particles, plinth carved grooves decoration, new level disk-drop intro animation
