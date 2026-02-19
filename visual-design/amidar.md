# Amidar — Visual & Sound Design

## Current Aesthetic
The game uses a dark background `#16213e` for untraced grid edges, pink `#f4d` with glow for traced edges, a cyan `#0ff` player circle, red `#f44` diamond-shaped enemies that turn blue `#48f` when a power-up is active, and filled boxes that pulse pink. The canvas is 480×480 with a 7×7 grid structure.

## Aesthetic Assessment
The neon-pink-on-dark palette is visually striking and evokes the original Amidar's use of bright colors. The traced vs. untraced edge distinction is clear. But the player and enemies are plain geometric shapes with no character — the original Amidar had pixel art that suggested jungle animals (gorilla, pigs). The grid itself has no texture. The filled boxes just change color without any celebratory feeling. The power-up freeze effect works but lacks visual drama.
**Score: 3/5**

## Visual Redesign Plan

### Background & Environment
The game board needs a sense of setting. Give the background a subtle green-black jungle feel: base `#0a1a0e` (very dark forest green). Untraced grid edges: dim `rgba(40,120,60,0.4)` — muted green, suggesting rope or vine that hasn't been traveled yet. The grid lines should be slightly wider (2–3px) with rounded endcaps for an organic rope feel. Between the grid lines, in the interior of each cell, place a faint texture suggestion: tiny random 1px dots in `rgba(20,80,30,0.2)` suggesting jungle floor. The border of the play area gets a thick bamboo-colored frame (`#8a6a20`, 8px) with subtle knot marks.

When a box is fully traced and filled, the fill color should be a rich jewel tone that brightens the whole board — use a progression: first box `#00cc44` (jungle green), subsequent boxes cycle through `#00aaff`, `#ff8800`, `#ff00cc`, `#ffcc00`.

### Color Palette
- Background: `#0a1a0e`
- Untraced edges: `rgba(40,120,60,0.4)` (dim green vine)
- Traced edges: `#44ff88` (bright green with glow) — changed from pink to fit jungle theme while keeping visibility
- Traced edge glow: `#00ff66`
- Player: `#ffffff` with `#88ffaa` glow (white gorilla suggestion)
- Enemy (active): `#ff4422` fill, `#ff8866` glow (red pig enemies)
- Enemy (frozen): `#4488ff` fill, `#88aaff` glow (frozen blue)
- Filled box (first): `#00cc44` at `rgba` 0.5
- Filled box (cycling): see progression above
- Grid border: `#8a6a20` (bamboo)
- Score text: `#ffee88` gold

### Entity Redesigns
**Player**: Instead of a plain circle, draw a simplified gorilla silhouette using polygons: a large circle for body, a slightly smaller circle for head, two small circles for hands on the current edge (left and right of movement direction). All in white `#ffffff` with a green ambient glow. When moving along an edge, the hands alternate in a simple 2-frame animation (one hand slightly up, then the other).

**Enemy**: Instead of plain diamonds, draw a pig-like shape: an oval body with two tiny ear triangles at the top and a small circle snout. In red `#ff4422`. When frozen (power-up active), the pig turns blue `#4488ff` and appears to shiver — alternate between two slightly different positions (±1px horizontal) every 8 frames.

**Traced edges**: Glow-on rendering: draw the edge twice — once with a wide blur in `rgba(0,255,100,0.2)` (4px wide), then the main bright line in `#44ff88` (2px). This creates a neon tube effect.

**Filled boxes**: When a box is filled, use a quick fill animation — a colored rectangle grows from the center of the box outward to full size over 8 frames, then settles at 50% opacity. Active filled boxes shimmer slightly (opacity oscillates between 0.4 and 0.6 at 0.5Hz).

**Power-up item**: A bright golden circle with a star polygon overlay, slowly rotating. When collected, emits a ring of 8 particles and disappears.

### Particle & Effect System
**Box completed**: 12 particles burst from the box center in the box's fill color — small 3×3 squares, velocity 2–4px outward, fade over 25 frames. Score popup: "+BOX" text in gold floats up from box center over 30 frames.

**Enemy caught (power-up)**: When power-up activates, all enemies briefly flash white (3 frames), then switch to frozen blue with a pulsing ring of 6 particles around each enemy.

**Power-up collect**: 16-particle starburst in gold from the power-up position. A bright flash covers the screen for 2 frames at `rgba(255,220,0,0.15)`.

**Player death**: Player explodes into 8 particles in white, each drifting outward and fading over 20 frames. The grid is briefly shown at reduced opacity before respawn.

**Level complete**: All filled boxes flash in sequence (ripple from bottom-left to top-right) with a colored flash per box over 30 frames, then a bright overall flash.

**Edge trace effect**: As the player moves along an edge, leave a brief bright trailing glow that fades to the traced-edge color over 6 frames — shows the edge being "painted."

### UI Polish
Score in top-left: gold `#ffee88` text with a dark stroke, sized 18px. Lives as tiny gorilla head icons (3-layer circle stack) next to the score. Level number as a roman numeral below the score. Power-up timer: a shrinking horizontal bar below the score in `#ffcc00` that depletes over the power-up duration. When the bar is nearly empty (last 20%), it flashes red. High score shown in dim text at top-right.

---

## Sound Design Plan
*(All sounds implemented via Web Audio API — zero external files)*

### Sound Events & Synthesis

| Event | Synthesis type | Frequency/params | Duration | Notes |
|-------|---------------|-----------------|----------|-------|
| Player move (step) | Oscillator (triangle) | 200Hz brief | 30ms | Soft footstep feel |
| Edge traced | Oscillator (sine) | 440Hz brief chime | 50ms | Satisfying per-edge sound |
| Box completed | Sine chord | 330+440+550Hz | 200ms | Rewarding completion chime |
| Power-up collect | Sine arpeggio | 440→660→880Hz | 200ms | Bright upward sweep |
| Enemy frozen | Oscillator (triangle) descend | 660→440→330Hz | 200ms | Freeze sound |
| Enemy catch player | Noise + sine | Crash noise + 220Hz drop | 400ms | Death jingle |
| Level complete | Sine fanfare | Full ascending arpeggio | 600ms | Celebration fanfare |
| Power-up expiring | Oscillator (sine) | 880Hz rapid pulse, 3 per sec | 1000ms | Warning beeps |
| Enemy unfreeze | Oscillator (triangle) ascend | 330→440→660Hz | 150ms | Thaw sound |
| Score milestone | Sine ping | 1047Hz clean | 100ms | Achievement ping |

### Music/Ambience
Jungle rhythm loop: a low-frequency tom-drum simulation (noise burst filtered through lowpass 150Hz, 80ms decay) hitting on beats 1 and 3 at 100bpm, and a lighter mid-frequency hit (bandpass 400Hz, 40ms decay) on beats 2 and 4 — a simple 2-bar jungle rhythm. Layer a triangle oscillator playing a simple 4-note repeating motif (220→196→165→196Hz, 200ms per note) over the rhythm — a playful, slightly exotic tune suggesting a jungle setting. Total gain stays low (0.08) so gameplay sounds dominate.

## Implementation Priority
- High: Jungle color palette (green vine edges, dark jungle background), traced edge glow effect, box fill animation
- Medium: Player gorilla silhouette, enemy pig shape, power-up starburst particle effect
- Low: Bamboo border frame, box shimmer, edge trace trailing glow
