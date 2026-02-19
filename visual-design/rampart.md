# Rampart — Visual & Sound Design

## Current Aesthetic

A 500×500 grid-based medieval castle defense game. A 25×25 grid (CELL=20px) contains land, water, wall, castle, rubble, and cannon cell types. Three phases cycle: build (15s), battle (18s), repair (12s). Tetris-like wall pieces in 10 shapes are placed during build/repair phases. Three castles on the land side. Ships approach from the right (water). Player crosshair fires teal (`#4ec`) projectiles. Enclosure detection via flood fill. The current aesthetic is flat colored cells — green land, blue water, grey walls, brown rubble, teal cannons — on a dark background with phase timers.

## Aesthetic Assessment
**Score: 2/5**

The game grid is legible and the three-phase system is well-structured. However, the cell rendering is entirely flat-filled blocks with no visual distinction between a flat field and a castle wall. The ships look like colored rectangles. Projectiles are plain circles. There's no medieval atmosphere, no weathering, no sense of the battle being epic. The grid-based approach has potential for a gorgeous stone-and-sea aesthetic.

## Visual Redesign Plan

### Background & Environment

The overall canvas background: a deep, stormy sky color (`#0a0a18`). The game grid itself sits as the battlefield. The water side (right portion) uses animated wave simulation: each water cell gets a slightly darker center and lighter border, with a subtle horizontal ripple pattern (sine wave at 3 different frequencies, all at 1% alpha, animating at different speeds creating a moiré water effect). Water color: deep ocean blue (`#0a1a3a`) with wave highlights in `#1a3a6a`.

**Land cells:** The playing field terrain uses a dark green (`#1a2a0a`) base with subtle cell-by-cell variation: every cell's shade shifts by ±5% based on a pseudo-random seed (cell x×y mod 17), simulating natural terrain variation. Add a very faint top-left highlight (1px `#2a3a1a` line) on each land cell to suggest low-angle sunlight.

**Sky/backdrop:** Above the grid (if there's margin), a faint distant treeline or horizon — drawn as an irregular silhouette of dark tree shapes (`#0a1205` at 50% alpha) along the top-left edge.

### Color Palette
- Land: `#1a2a0a`, `#222e10` (varied)
- Water: `#0a1a3a`, wave accent `#1a3a6a`
- Wall (intact): `#888898` with highlight `#aaaabc` and shadow `#555560`
- Wall (low HP): `#666672` (slightly darker/damaged)
- Castle: `#7a6a50` (stone buff), roof `#5a4a38`
- Rubble: `#444438` scattered
- Cannon: `#334433` barrel, `#4ec` muzzle glow
- Ship hull: `#4a3020` (dark wood), sails `#cccc99`
- Player projectile: `#44ffcc` (teal glow)
- Enemy projectile: `#ff4422` (red-orange)
- Background: `#0a0a18`

### Entity Redesigns

**Wall cells:** The most important upgrade. Each intact wall cell gets a stone masonry treatment:
- Base fill: medium grey (`#888898`).
- Stone block pattern: Draw 2 alternating rows of "bricks" within each cell using thin dark lines (`#555560`, 1px) at midpoints — horizontal at y=CELL/2, vertical at x=CELL/2 (offset by half a brick between rows). This creates a staggered mortar pattern.
- Top-left highlight: 1px bright line (`#aaaabc`) on top and left edges — light hitting the stone face.
- Bottom-right shadow: 1px dark line (`#555560`) on bottom and right edges.
- Damaged walls (low HP): stone block pattern same but with 3–4 small "crack" strokes (1px dark lines at random angles within the cell, 40% alpha) added progressively as health decreases.

**Castle cells:** Draw a stylized castle tile. A stone base (same masonry pattern as wall), but with a distinctive silhouette: a crenellated top edge (alternating raised merlons at the top 4px of the cell — alternating filled/empty in a 4px pattern). The castle fills render in a warm stone color (`#7a6a50`). Add a small dark arch window shape in the center of each castle cell (an inverted-U stroke, `#333` at 60% alpha, 4px wide, 6px tall).

**Rubble cells:** Scatter 4–6 irregular polygon fragments (3–5 sided, 4–8px across) in dark grey (`#444438`) at random positions within the cell, slightly rotated. Some fragments have a lighter top edge (1px highlight) to suggest broken stone.

**Cannon cells:** Draw a proper cannon silhouette. A rounded rectangular base (8×6px) in dark iron grey (`#334433`), with a cylindrical barrel extending forward (6×3px, rounded end). The barrel end has a subtle circular muzzle highlight. When firing, the muzzle emits a brief orange flash (filled circle, 3px, `#ff8800`, 3 frames).

**Enemy ships:** Each ship gets a full nautical treatment. A wooden hull (trapezoid shape, darker at waterline `#3a2010`, lighter above `#5a4030`), a mast (1px vertical line `#4a3020`), and a triangular sail (filled triangle, canvas-white `#cccc99` with a faint horizontal stripe every 4px at 10% alpha). The hull rocks gently (±1° rotation oscillation over 60 frames). Ship wake: 3 small white ellipses (`#ffffff` at 15% alpha) positioned behind the ship, fading over 40 frames.

**Player projectile:** Upgrade the teal circle to a glowing cannon ball with a bright arc tail. The ball: filled circle in `#44ffcc` with `shadowBlur = 12` in the same color. Behind the ball: 5 progressively smaller ghost circles at prior positions (alpha 0.5→0.1), giving a comet-tail impression.

**Enemy projectile:** Red-orange cannonball (`#ff4422`) with `shadowBlur = 10` and a 4-ghost tail in red.

**Tetris pieces (build phase):** Each wall piece renders in a soft green ghost-fill (`#224422` at 50% alpha) while being placed, with a bright green border (`#44ff88`). Valid placement: bright green border. Invalid: red border (`#ff2222`). On locking in, a brief white flash on all cells.

### Particle & Effect System

- **Cannon fire:** Muzzle flash at cannon cell (orange ellipse, 3 frames). Shell leaves a brief grey smoke trail (3 small ellipses, `#888880` at 30% alpha, 1px per frame, 8 frames).
- **Projectile hit (land/wall):** 8 stone-colored particles (`#888898`) burst from impact point, lifetime 12 frames. Wall cell briefly flashes white (2 frames). Crater dust: 4 grey particles drift upward and fade over 20 frames.
- **Ship destroyed:** 16 particles in wood-brown and orange (explosion), plus 3 plank-shaped rectangle particles flying outward (rotation animating), lifetime 30 frames. A large dark smoke puff: 8 dark grey ellipses expanding and fading over 60 frames.
- **Wall piece placed (build):** Each cell of the placed piece flashes bright green briefly (3 frames), then settles. A small dust puff at the base of each placed cell.
- **Castle enclosure complete:** When a wall encloses a castle, all cells of the enclosing wall flash in a ripple pattern (outermost cells first, then inner, over 20 frames) in gold/bright green. A fanfare particle burst from the castle itself: 20 gold particles radiate outward.
- **Phase transition:** A flash overlay across the full canvas (for 6 frames) in the new phase's color (gold for build, red for battle, teal for repair).

### UI Polish

- **Phase timer:** Large arc gauge in the top area — a partial circle filling clockwise, colored per phase (gold/red/teal). As the timer approaches zero, the arc pulses (brightness oscillating at 4 Hz). At 5 seconds remaining, the arc turns bright red regardless of phase.
- **Phase label:** "BUILD PHASE" / "BATTLE PHASE" / "REPAIR PHASE" displayed in a large banner that slides in from the top on phase transition, stays for 2 seconds, then slides back up.
- **Score / Castle health:** Castle health shown as a small heart-icon row above each castle cell cluster rather than text. Each heart is a simple `♥` in red; destroyed hearts are grey outlines.
- **Piece selector (build):** The next tetris piece preview renders in a small inset box with a wood-frame border (`#4a3020`), showing the next 2 shapes.
- **Enclosure indicator:** Newly enclosed areas briefly fill with a light gold `rgba(255,215,0,0.15)` overlay for 30 frames when a valid enclosure is detected.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Cannon fire (player) | OscNode (square) boom + noise | 180 Hz + white noise 0.6 vol | 200 ms | Heavy cannon blast |
| Cannon fire (enemy) | OscNode (square) lower boom | 140 Hz + noise 0.5 vol | 200 ms | Slightly different pitch |
| Projectile in flight | OscNode (triangle) whistle | 800→600 Hz descend | 300 ms | Falling cannonball whistle |
| Impact (land) | OscNode (triangle) thud + noise | 100 Hz + noise 0.5 vol | 150 ms | Earth thud |
| Wall hit | OscNode (square) crack | 200 Hz + noise 0.4 vol | 120 ms | Stone crack |
| Wall destroyed | OscNode (square) + noise | 120 Hz + noise 0.7 vol | 300 ms | Shattering stone |
| Ship destroyed | OscNode (square) explosion | 150 Hz + noise 0.8 vol | 400 ms | Big explosion |
| Piece placed (build) | OscNode (triangle) click | 330 Hz | 80 ms | Thud of stone placed |
| Enclosure complete | Ascending arpeggio | 262, 392, 523, 659 Hz | 400 ms | Victory riff |
| Phase change (build) | Two-note chime | 523 + 659 Hz | 200 ms | Positive transition |
| Phase change (battle) | Low warning | 220 Hz then 180 Hz | 300 ms | Ominous shift |
| Phase change (repair) | Soft three-note | 440, 523, 659 Hz | 300 ms | Relief tone |
| Castle lost | Descending minor | 440, 330, 262, 220 Hz | 600 ms | Defeat |

### Music/Ambience

Medieval battlefield ambience without music. Key elements: a distant ocean wave sound — low-frequency noise (`BiquadFilter` lowpass at 150 Hz, white noise at 0.025 vol) slowly modulated in amplitude (±30% over 4-second cycles) to simulate wave rhythm. Occasional distant cannon boom from enemy ships between battle-phase shots (triangle wave, `80 Hz`, 200ms, 0.03 vol) every 5–12 seconds at random, creating tension even during the build phase. A subtle wind effect: very faint filtered noise (BPF at 800 Hz, Q=0.3, 0.01 vol) with slow amplitude LFO (0.1 Hz) — the breeze on the castle battlements. During the build phase, add distant hammering sounds: a short triangle `220 Hz` tone (40ms, 0.04 vol) repeated every 1.2–2.0 seconds at random — soldiers reinforcing walls.

## Implementation Priority
- High: Stone masonry wall cell pattern with highlight/shadow edges, ship nautical silhouette with mast and sails, cannon fire muzzle flash and blast sound
- Medium: Rubble fragment scatter rendering, projectile comet-tail glow, enclosure complete gold ripple flash, phase-transition banner
- Low: Animated water wave cells, ship hull rocking oscillation, ocean wave ambience loop, castle heart-icon health display, crenellated castle silhouette
