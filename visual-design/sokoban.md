# Sokoban — Visual & Sound Design

## Current Aesthetic

400x400 grid puzzle game. Walls are dark `#2a2a4e` rectangles with slightly lighter borders. Floor is `#10101e` near-black with subtle `#16213e` grid lines. Boxes are `#c66` dark red rectangles with diagonal cross detail lines. Targets are `#f08` pink/magenta diamond outlines. The player is a `#f08` circle with two dark eyes. Boxes on target glow bright `#f08` with extra brightness. The overall palette is a dark purple-red scheme.

## Aesthetic Assessment
**Score: 2.5/5**

The concept is there but execution is flat. The wall tiles have no texture — they're just solid dark rectangles. The player is a featureless circle. The target diamond and box design is clear but lifeless. No move animation, no push feedback, no ambient atmosphere. A puzzle game lives and dies by the satisfaction of each push — that satisfaction needs audio and visual reinforcement.

## Visual Redesign Plan

### Background & Environment

The puzzle arena should feel like an ancient stone temple or a glowing high-tech vault — lean into the latter for a sci-fi aesthetic that matches the dark palette.

**Wall tiles:** Replace flat rectangles with textured blocks. Each wall tile should have:
- A raised inner panel (slightly lighter rectangle inset 3px from edge)
- A small corner accent (1px corner chamfer in a darker tone)
- Occasional energy conduit detail (a thin glowing line running along wall edges where they meet other walls)

**Floor tiles:** Instead of near-black, use a very subtle grid of hexagonal cells (approximated with light lines) in `#0c0c1e`. Add a very faint blue-glow gradient emanating from the center of the level downward.

**Empty space** (outside the level boundary): Pure black, slightly darker than walls, with very subtle scanline texture.

**Ambient glow:** The level itself should have a soft blue-purple ambient light source suggesting the energy flowing through the walls.

### Color Palette
- Primary: `#cc44ff` (player, target glow)
- Secondary: `#ff6644` (box, unsolved tension)
- Background/floor: `#080816`, `#0c0c1f`
- Wall: `#1a1a3a`
- Wall highlight: `#252550`
- Wall conduit: `#3333aa`
- Box solved: `#cc44ff` (matches player/target)
- Glow/bloom: `#cc44ff`, `#ff6644`
- Gold accent: `#ffcc44` (score, level number)

### Entity Redesigns

**Player character:** Replace the plain circle with a small glowing android/robot figure. Keep it simple for the small tile size:
- Circular head in `#cc44ff` with a visor line
- Tiny body rectangle below
- Facing direction indicated by which side the visor faces
- A soft circular aura glow beneath the player (floor reflection)

**Boxes (unpushed):** Redesign as cargo crates:
- Outer shell with a hazard-stripe corner pattern (alternating `#ff6644` and `#222233` thin diagonal bands on edges)
- Center panel with a "CARGO" label or warning symbol (triangle with !)
- When pushed, emit a brief scraping particle trail

**Boxes (solved/on target):** Transform completely — instead of the same shape glowing, morph into a "activated" look: pulse with `#cc44ff` inner glow, the corner hazard stripes switch to match the target color, a small checkmark or star symbol appears in the center

**Targets:** Replace the simple diamond outline with a floor inlay design — a glowing geometric pattern (like a landing pad) set into the floor. Multiple concentric rings that pulse outward slowly, drawing the eye.

**Undo/Reset:** Brief reverse-animation when undoing — the last box briefly flashes its previous position before snapping back.

### Particle & Effect System

- **Push box:** 4 scraping particles at the back edge of the box (direction of push), short trail
- **Box lands on target:** 8-10 radial particles in `#cc44ff` from the target position; target pulses brighter briefly; a soft ring expands outward
- **Box leaves target:** 4 particles in `#ff6644` — a "de-activation" effect
- **Player moves:** Tiny footstep dot at previous position that fades
- **Level complete:** Cascade of `#cc44ff` particles from each solved box simultaneously; screen brightens then fades to transition
- **Undo move:** Brief time-rewind flash (frame of inverted colors for 1-2 frames)

### UI Polish

- Move counter displayed as a glowing number with a subtle increment pulse animation on each move
- Level number as a large faint watermark centered on the floor
- At level complete, morph the level name into a "SOLVED" stamp that slams down with a shockwave
- Undo (Z) key hint glows when player appears stuck (no progress for 15+ moves)

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Move (player steps) | Soft tap | 600 Hz sine, very short | 30ms | Rhythmic, subtle |
| Push box | Stone scrape | Brown noise, 400 Hz low-pass, medium length | 180ms | Weight and friction |
| Box reaches target | Resonant chime | 880 Hz sine + 1320 Hz overtone, bell envelope | 500ms | Victory micro-moment |
| Box leaves target | Reverse chime | Reversed version of above at lower pitch | 300ms | Subtle failure signal |
| Undo | Reverse whoosh | White noise sweep from hi to lo, 400→100 Hz | 200ms | Time-rewind feel |
| Reset level | Harsh reset buzz | Sawtooth 220 Hz, 200ms, then silence | 200ms | |
| Level complete | Ascending harmony | 440, 554, 659, 880 Hz, soft sine, staggered | 1.0s | Each box contributes a note |
| Player hits wall | Thud | 120 Hz sine, very short | 40ms | Gentle — not punishing |
| Puzzle start | Subtle unlock tone | 330 Hz sine rise | 150ms | |

### Music/Ambience

A minimalist ambient soundscape: a very slow pad of filtered sawtooth waves at 55 Hz and 110 Hz, barely audible (volume ~4%), suggesting a deep underground hum. Occasional crystalline ping tones (sine wave at random pitches between 800-2400 Hz, very low volume, every 8-15 seconds) to break the silence without distracting. The music should feel like the interior of a structure, not a song. As levels progress (higher level numbers), add a very subtle high-frequency shimmer — increasing tension.

## Implementation Priority
- High: Box push scrape sound, box-on-target chime + particle burst, target floor-inlay design, wall tile texture
- Medium: Player android redesign, level-complete harmony sequence, undo sound, move counter pulse animation
- Low: Ambient underground drone, background ambient particles, undo visual flash, adaptive tension shimmer
