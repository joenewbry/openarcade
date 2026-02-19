# Agar — Visual & Sound Design

## Current Aesthetic
The game uses a dark navy background (`#16213e`) with a subtle grid, neon cell colors drawn from an 18-color array (red, green, blue, yellow, cyan, magenta, etc.), thin white outline rings at `rgba(255,255,255,0.15)`, a minimap in the bottom-right, and a leaderboard in the top-right. The world is 4000×4000, rendered with world-to-screen coordinate transforms.

## Aesthetic Assessment
The neon-on-dark grid is a faithful recreation of the agar.io aesthetic — clean and immediately legible. The 18-color palette ensures cells are distinguishable. However, the grid is too plain (no depth, no visual interest), the cells feel flat (no internal texture or sense of biological mass), and the food pellets are just tiny circles with no sparkle. The world feels infinite but empty. The original agar.io's appeal came from its simple but weirdly organic feel — cells that look vaguely alive. That's what's missing here.
**Score: 3/5**

## Visual Redesign Plan

### Background & Environment
Transform the flat grid into a convincing petri-dish world. Background base: very dark `#080d18`. Grid lines: thin `rgba(40,80,120,0.25)` — barely visible, blue-tinted to suggest liquid medium. Add a slowly drifting parallax layer of 30–40 tiny ellipses at `rgba(60,100,140,0.08)` — representing organelles or debris in the fluid — moving at 0.1px/frame relative to camera. At the world border, draw a thick ring with a bright cyan border-glow (`rgba(0,200,255,0.3)`) that pulses slowly at 0.3Hz, suggesting the edge of the petri dish. Small "virus" particles already exist — give them a jagged irregular polygon shape (8–12 vertices, alternating in/out by 20%) in bright `#00ff88` with a pulsing glow.

### Color Palette
Replace the flat 18-color array with a richer set that includes per-color glow tones:
- Red: `#ff2244` fill, `#ff6688` glow
- Orange: `#ff6600` fill, `#ffaa44` glow
- Gold: `#ffcc00` fill, `#ffee88` glow
- Lime: `#44ff00` fill, `#aaff66` glow
- Cyan: `#00ffee` fill, `#88ffee` glow
- Sky: `#00aaff` fill, `#66ccff` glow
- Purple: `#8800ff` fill, `#cc88ff` glow
- Pink: `#ff00cc` fill, `#ff88ee` glow
- White: `#ffffff` fill, `#aaccff` glow
- Teal: `#00cc88` fill, `#66ffbb` glow
- Background: `#080d18`
- Grid: `rgba(40,80,120,0.25)`
- Food pellet: per cell color with white center highlight
- Virus: `#00ff88` with `#003322` core

### Entity Redesigns
**Player cells**: Each cell has three rendering passes — a dark core fill (`color at 60% lightness`), a full-radius fill at cell color, and a bright rim highlight at the top-left quadrant (a partial arc at `rgba(255,255,255,0.25)`, covering the 270°–90° range). The outline ring is replaced with a subtle glow using `setGlow` in the cell's glow color. Large cells (radius > 40) get an internal pattern: 3–4 tiny circular bubbles at random positions within the cell boundary, at `rgba(255,255,255,0.12)`, giving a biological gel texture.

**Food pellets**: Upgraded from plain circles to small sparkles — a tiny circle (2px) with 4 radiating lines (4px long) at 45° angles, all in the pellet's color. They slowly pulse in size (1.5–2px) at random frequencies (0.2–0.8Hz per pellet), suggesting they're alive.

**Virus nodes**: Jagged green spiky ball with a bright lime center circle and a darker outer polygon with 10–14 spike vertices. A slow clockwise rotation (0.3°/frame) makes them feel dangerous and alive.

**Name labels**: White text with a subtle drop shadow, scale relative to cell radius (capped for very large cells). Above the name, a tiny color-matched circle indicates the cell's color identity.

**Split cells**: When splitting, the two halves animate apart with a brief stretching oval distortion — the cell appears to elongate along the split axis before separating.

### Particle & Effect System
**Cell absorption**: When one cell eats another, 8 small particles in the eaten cell's color burst outward and fade over 20 frames. A brief size-pulse (scale to 1.1 and back) on the absorbing cell confirms the eat.

**Cell split**: Split emits a ring of 12 small particles outward from the split point, then the new cell emerges with a scale-up animation from 0.5 to 1.0 over 8 frames.

**Food eat**: A tiny `+1` text appears at the food position, drifts up 8px, and fades over 25 frames.

**Pellet respawn**: New food pellets appear with a brief scale-up from 0 to full size over 6 frames with a flash.

**Death**: Own cell death triggers a large burst of 16 particles in the cell's color plus a white flash ring, then the cell shrinks to 0 over 12 frames.

**Leaderboard update**: When rank changes, the rank number briefly highlights in the cell's glow color.

### UI Polish
Leaderboard panel: semi-transparent dark `rgba(8,13,24,0.85)` background, rounded corners, each entry shows a small colored dot + name + mass. Own entry highlighted in a slightly brighter row. Mass counter in the top-left showing current total mass, with a subtle animation when it increases. Minimap border matches the game's cyan edge-glow palette. Zoom level indicator (optional) as a tiny icon. Score animations for large absorptions: "+MASS" text briefly appears near the player's cell.

---

## Sound Design Plan
*(All sounds implemented via Web Audio API — zero external files)*

### Sound Events & Synthesis

| Event | Synthesis type | Frequency/params | Duration | Notes |
|-------|---------------|-----------------|----------|-------|
| Eat food pellet | Oscillator (sine) | 880Hz brief ping | 25ms | Very subtle, multiply queued |
| Absorb small cell | Oscillator (sine) + noise | 440Hz chord, short noise | 150ms | Satisfying gulp sound |
| Absorb large cell | Oscillator (sine) + lowpass noise | 220Hz + long decay noise | 400ms | Deep satisfying crunch |
| Cell split | Oscillator (triangle) | 660→880Hz sweep up | 80ms | Light tearing sound |
| Virus eject mass | Noise + bandpass 600Hz | Short burst | 100ms | Spitting sound |
| Hit virus (large cell) | Noise burst + lowpass 400Hz | Mid boom | 250ms | Splitting impact |
| Own cell eaten | Noise + sine descent | 220→110Hz, slow | 600ms | Dramatic death |
| Become largest | Sine arpeggio | 440→660→880Hz | 300ms | Achievement chime |
| Reach rank 1 | Sine fanfare | 523→659→784→1047Hz | 400ms | Victory fanfare |
| Cell recombine | Oscillator (sine) | 330→440Hz sweep | 120ms | Merging sound |

### Music/Ambience
A slow, hypnotic ambient loop suggesting a microscopic world: a low sine pad at 40Hz (sub-bass, barely audible — felt more than heard) with a secondary pad at 80Hz for warmth. Over this, a slow LFO-modulated filter sweeps through a noise layer (bandpass 200–800Hz, sweep period 8 seconds), evoking fluid motion. Occasional random high-frequency tinkles (sine, 1200–2000Hz, random intervals 3–8 seconds, very low gain 0.02) suggest activity at the microscopic scale. The whole ambient sits at gain 0.06 — present but never intrusive.

## Implementation Priority
- High: Cell rim highlight and glow rendering, food pellet sparkle redesign, virus jagged polygon with rotation
- Medium: Floating debris parallax layer, cell absorption particle burst, food eat "+mass" text
- Low: Pellet pulse animation, split stretch distortion, petri dish border glow pulse
