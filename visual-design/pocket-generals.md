# Pocket Generals — Visual & Sound Design

## Current Aesthetic

A 600x500 canvas with an 8x8 grid (60x50 cells). Terrain types color the cells: plains (`#2a2a3e`), mountains (`#3a3a4e`), and forests (`#2a4a2a`). Player units are blue (`#4488ff`), AI units are red (`#ee5555`). Infantry renders as a small square, tanks as diamonds, artillery as triangles. Each base is a flag polygon. The game UI shows unit stats on the right panel, turn info at top, and an End Turn button. Minimax AI controls the opponent with alpha-beta pruning.

## Aesthetic Assessment
**Score: 2/5**

The game mechanics are solid — turn-based tactics with meaningful unit differentiation and terrain bonuses. But visually it's barely above a spreadsheet. The grid is a uniform dark rectangle with colored squares and shapes. Terrain has no visual identity. Units are tiny geometric primitives with no character. The right panel is a text list. This could be a beautifully atmospheric war game with a distinctive visual voice.

## Visual Redesign Plan

### Background & Environment

Lean into a classic military strategy map aesthetic — like a hand-rendered tactical operations map. The overall canvas gets a parchment-like dark background with a subtle paper texture (faint grain pattern at 3% opacity). Grid lines become visible as thin map-grid lines in a slightly lighter shade of the terrain color.

Each terrain type gets a rich visual treatment:
- **Plains:** Medium tan-green, with subtle horizontal grass stroke lines suggesting open land
- **Mountains:** Dark gray-brown with visible ridge lines and shadow faces — small chevron/peak shapes drawn in each cell at lower opacity
- **Forests:** Dark forest green with small tree-top shapes (small circles or asterisks) clustered in each cell

The base areas get a special treatment — a perimeter of fortification lines (thin defensive markers) and a pennant flag shape above the base structure.

### Color Palette
- Plains: `#3a4a28`, `#2e3e20`
- Plains highlight: `#4a5a32`
- Mountains: `#4a4040`, `#3a3030`
- Mountain highlight: `#6a6060`
- Forest: `#224828`, `#1a3c20`
- Forest canopy: `#2a5830`
- Player blue base: `#223a8a`
- Player blue units: `#4488ff`
- Player blue glow: `#88aaff`
- AI red base: `#8a2222`
- AI red units: `#ff5555`
- AI red glow: `#ff9999`
- Grid line: `#404428`
- Selected cell: `#ffee44`
- Move range: `#4488ff` (blue tint overlay)
- Attack range: `#ff4444` (red tint overlay)
- UI panel: `#1a1a2a`
- UI text: `#d4c88a`
- Gold accent: `#c8a830`

### Entity Redesigns

**Infantry:** A proper top-down soldier figure — a small oval helmet shape, a slightly wider body rectangle below, and two tiny arm stub rectangles. The unit color fills the body. A bayonet-like spike extends from one side suggesting a rifle. When multiple infantry are stacked in a unit, 2-3 overlapping figure silhouettes suggest a squad.

**Tanks:** A proper top-down tank silhouette — a rectangular hull with rounded corners, a visible turret circle on top, and a barrel line extending from the turret. Track marks (horizontal lines) appear on the hull sides. The unit's team color fills the hull; the turret is slightly darker.

**Artillery:** Top-down field gun — a triangular or wedge shape for the gun mount, with a long thin barrel extending forward. Support legs (two diagonal lines) extend back. The unit is larger than infantry, suggesting heavy equipment. A small wheel circle is visible on each side.

**Bases:** A proper fortified position — a square perimeter with indented corner blocks suggesting ramparts. A central structure (small rectangle) sits inside. A flag pole rises from the center with a pennant (small triangle flapping — alternating between two states). The base perimeter wall uses the owning team's color for the flag.

**Terrain details:**

Mountains: Each mountain cell gets 2-3 peak shapes — small triangles of varying sizes stacked together, with a light gray highlight on one face and dark shadow on the other. Looks like a proper topographic symbol.

Forests: Each forest cell gets 4-6 small tree canopy circles (filled, dark forest green with a lighter highlight) scattered within the cell bounds. A subtle shadow darkens the bottom of each canopy.

Plains: Subtle horizontal dash lines at 8% opacity across the full cell, with a slight color gradient (darker at edges, lighter in center) suggesting open field.

**Selection and range indicators:** Selected units have a bright pulsing border (the cell highlight color pulses in and out at 1Hz). Move-range cells get a soft blue tint overlay with a dashed border. Attack-range cells get a red tint with a dotted border — distinct from move range. The path between current position and a hovered move destination is shown as a bright dotted arrow.

### Particle & Effect System

- **Unit move:** Small dust cloud — 4 gray particles scatter from the starting position, 12-frame life
- **Combat attack:** Flash at attacking unit + impact burst at target — 6 white/yellow particles at target cell, 10-frame life
- **Unit destroyed:** Explosion — 8 particles in the team color + dark smoke (4 gray particles), 20-frame life, then a small wreck icon remains on the cell for 2 turns before fading
- **Base captured:** Flag change animation — old flag shrinks and disappears, new flag rises with a brief burst of the new team's color particles
- **Turn start:** A soft directional wave sweeps across the grid in the active player's color at very low opacity (5%), moving left to right or right to left depending on team side
- **Terrain bonus hit:** Small green up-arrow particle emits from a unit that attacks from advantageous terrain

### UI Polish

The right panel becomes a proper field commander's briefing board — a dark tactical clipboard aesthetic with a clipboard clip at the top. Unit stats are displayed as compact readout entries: unit icon, HP bar (narrow colored strip), attack/defense icons. Terrain info for the selected cell appears at the bottom of the panel with a small terrain color swatch. Turn order is displayed as a ribbon at the top — "PLAYER TURN" in blue or "ENEMY TURN" in red, with a subtle banner animation on change. The End Turn button looks like a physical stamped button with a slight 3D bevel — press animation sinks it slightly.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Unit select | Click | Square 600Hz, very fast | 30ms | Crisp selection acknowledge |
| Unit move | March step | Low noise + 150Hz sine, 2 quick pulses | 200ms | Marching sound |
| Infantry attack | Gunfire burst | White noise, highpass 2kHz, sharp | 150ms | Rifle shot character |
| Tank attack | Cannon boom | Sine 60Hz + noise, lowpass 800Hz | 400ms | Heavy artillery boom |
| Artillery attack | Heavy shell | Deeper sine 40Hz + noise burst | 600ms | Largest, most impactful |
| Unit takes damage | Impact thud | Noise + 200Hz sine | 150ms | Generic hit sound |
| Unit destroyed | Explosion | Noise burst + descend 300→50Hz | 500ms | Destruction sound |
| Base captured | Fanfare | 4-note ascending, square wave | 500ms | Triumphant capture |
| Turn start (player) | Command tone | Sine 550Hz, clean | 300ms | Clear signal — your turn |
| Turn start (AI) | Lower tone | Sine 330Hz, slightly darker | 300ms | Different from player turn |
| Game win | Victory march | Rising 5-note arpeggio, C major | 1.5s | Triumphant resolution |
| Game lose | Retreat | Descending minor 4-note, slow | 1.5s | Somber end |

### Music/Ambience

A military march atmosphere: a steady 4/4 pattern at 100 BPM with a snare-like noise burst rhythm (sparse — kick on 1, snare on 3). A simple trumpet-like melody (square wave, upper register) plays a 8-bar loop in a minor key suggesting tactical tension. During AI thinking time, the music pauses and only a low ambient drone continues. Between turns, the music shifts slightly — brighter register when it's the player's turn, darker when it's the AI's. Volume: ~15%, very subdued so gameplay sounds come through clearly.

## Implementation Priority
- High: Terrain visual redesign (mountains with peaks, forest with tree canopies), unit silhouette redesign (proper infantry/tank/artillery shapes), attack particle effects
- Medium: Base fortification visual with flag animation, range indicator tint overlays with dotted borders, combat boom/explosion sounds
- Low: Parchment texture background, terrain detail brush strokes, unit wreck icon persistence, move dust cloud particles, tactical march music
