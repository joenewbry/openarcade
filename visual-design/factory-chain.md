# Factory Chain — Visual & Sound Design

## Current Aesthetic
A split-screen competitive factory builder. Background is flat `#1a1a2e` navy. Each factory grid is `#10102a` with faint `#1c1c3a` grid lines. Machines (Smelter/Assembler/Constructor) are tinted bordered rectangles with a single-letter symbol and a color-coded border in orange (`#e88030`), blue (`#50a0e0`), or purple (`#b060e0`). Belts are dark `#2a2a50` squares with animated `>>` chevron glyphs. Progress bars run along the machine bottom. Input/output edges have green (ore) and amber (money) accent strips. A dashed divider separates player and AI sides. The overall feel is functional but cold and visually sparse.

## Aesthetic Assessment
**Score: 2/5**

The mechanics are strong but the visual design is entirely utilitarian. There is no atmosphere, no sense that real industrial things are happening, no visual joy in watching a factory produce. A redesign should make the machines feel alive and the factory feel like a bustling industrial space.

## Visual Redesign Plan

### Background & Environment
Each factory side gets its own industrial floor: a warm charcoal grey (`#141018`) with a subtle perspective-grid floor pattern (thin lines converging toward a central vanishing point at about 30% opacity). Overhead, faint diagonal shadow bands cross the factory at 20px intervals to suggest industrial ceiling structure. The center divider becomes a thick glowing wall — a neon dividing beam in `#ff4400` with heat shimmer particles floating upward.

### Color Palette
- Player factory background: `#141018`
- AI factory background: `#0e1420`
- Smelter: `#ff7020` (furnace orange)
- Assembler: `#2090ff` (arc-weld blue)
- Constructor: `#aa40ff` (plasma purple)
- Belt: `#302840`
- Belt chevron active: `#605090`
- Ore edge: `#40c040`
- Exit edge: `#ffaa00`
- Divider wall: `#ff4400`
- Background deep: `#0d0d14`
- Glow warm: `#ff6020`
- Glow cool: `#2080ff`

### Entity Redesigns

**Machines** — Each machine type gets a unique silhouette drawn from filled polygons:
- *Smelter*: A squat furnace shape — rectangular body with a wider base, two small chimney stacks at the top drawn as thin vertical rects. When processing, animated fire particles drift upward from the chimney openings (orange → yellow → white particles, 20-frame lifetime). The front panel has a circular porthole window that glows orange when active.
- *Assembler*: A more angular robot-arm aesthetic — a rectangular body with two diagonal arm-lines extending from each side toward the cell boundary, suggesting mechanical arms reaching in/out. When active, tiny white spark points flash at arm tips.
- *Constructor*: The largest machine — wider rectangular body with a domed top, four corner bolts (filled circles), and a central holographic-display rectangle that cycles through blue/purple gradient when active.

**Belts** — Replace the glyph-based belts with a physical conveyor visual: a dark gray belt surface with evenly-spaced raised ridges (horizontal lines every 4px within the cell). The belt color animates horizontally using the `beltPhase` offset already tracked — ridges appear to roll in the direction of flow. When items are on the belt (signaled by machine `outBuf > 0` nearby), add a small glowing dot moving along the belt.

**Item flow indicators** — Animated resource icons traveling between machines along belts: a small colored square (orange for ingot, blue for part, purple for product) that slides from machine output toward the next machine input over 30 frames.

**Ore inlet edge** — Left edge becomes a glowing portal: a vertical slot that pulses green, with small green dots periodically emerging from it and moving right.

**Exit edge** — Right edge becomes a glowing amber chute. When a product exits, a brief amber flash bursts from the exit point.

### Particle & Effect System
- **Smelter active**: 4–6 ember particles per second drifting up from chimneys; orange/yellow/white; gravity -0.08; lifetime 30 frames; fade out.
- **Assembler active**: 2 white sparks at arm tips every 10 frames; 8-frame lifetime; rapid fade.
- **Constructor active**: Slow blue-purple particle ring orbiting the dome center (8 particles in slow circular motion).
- **Machine placed**: Quick radial burst of 8 small sparks in the machine color; lifetime 20 frames.
- **Machine deleted**: Dark smoke puff — 6 dark grey particles, upward drift, slower fade over 40 frames.
- **Product sold**: Amber coin-burst from exit edge — 10 particles in a fan pattern, curving upward; lifetime 35 frames.
- **Score update**: Number floats upward from the exit edge position, fades over 60 frames.

### UI Polish
- Score displays use chunky industrial LCD-style font rendering (monospaced, amber for player, red for AI) with a subtle underscreen glow.
- Timer bar becomes a large central countdown display between the two factory names — a glowing ring that drains, turning from green to amber to red in the last 30 seconds.
- Tool selection toolbar buttons get machine-color borders when selected; inactive buttons are flat grey.
- Machine inspect popup appears as a floating industrial panel with dark glass aesthetic and amber text.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Smelter processing (loop) | Low hum + crackle | 80 Hz sine + white noise bandpass 400 Hz, low gain | Looped | Furnace ambience per active smelter |
| Assembler processing (loop) | Mechanical whirr | 220 Hz sawtooth + rhythmic gate (4 Hz LFO) | Looped | Robot arm sound |
| Constructor processing (loop) | Sci-fi hum | 160 Hz triangle + subtle FM mod (2.5 ratio) | Looped | Space-age assembly |
| Item produced (ding) | Triangle wave bell | 880 Hz, fast attack, 300ms decay | 300 ms | Satisfying completion ding |
| Product sold | Cash register jingle | C5–E5–G5 sine arpegio, 60 ms each | 280 ms | Money in! |
| Machine placed | Mechanical clunk | Low noise burst 150 Hz | 120 ms | Tool engagement |
| Machine deleted | Brief reverse | Short noise sweep descending | 100 ms | Removal whoosh |
| Belt drawn | Click sequence | 600 Hz click per tile placed | 40 ms each | Satisfying placement |
| Timer critical (last 30s) | Rhythmic pulse | 1 Hz sine gate on 440 Hz tone | Looped | Urgency beat |
| Game end (win) | Major fanfare | G4–B4–D5–G5 sawtooth + reverb | 1 s | Victory chords |
| Game end (lose) | Minor descent | G4–F4–Eb4–C4, slow | 1 s | Defeat |
| AI places machine | Quick beep | 700 Hz square, fast decay | 80 ms | AI activity indicator |

### Music/Ambience
Industrial techno backdrop: a steady 120 BPM kick drum (sine sub at 60 Hz, short decay) with a hi-hat on every 8th note (white noise filtered at 8 kHz, 40 ms decay). Over this, a cycling bass riff in minor pentatonic plays on a fat sawtooth synth. Volume stays low (gain ~0.15) to not overwhelm the machine sounds. Tempo increases by 10% when timer drops below 60 seconds.

## Implementation Priority
- High: Machine visual redesign (smelter fire, assembler arms, constructor dome), belt ridge animation, product-sold amber burst, all core sound events
- Medium: Industrial floor pattern, divider glow wall, ore/exit portal effects, score float animation, timer ring display
- Low: Item flow dots on belts, machine placed/deleted particles, ambient techno music, score font LCD styling
