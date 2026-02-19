# Pac-Man — Visual & Sound Design

## Current Aesthetic

Deep navy maze walls (`#1a237e`) with light blue borders (`#3949ab`). Pac-Man is golden-yellow (`#fd0`). Ghosts use their classic arcade colors — red, pink, cyan, orange — with frightened state in dark blue. Dots are a warm peach (`#ffcc80`), power pellets pulse with glow. Background is the dark canvas default. The ghost house gate is pink. UI shows score, best, lives, and level below the maze.

## Aesthetic Assessment
**Score: 3/5**

Solid classic representation with decent glow on power pellets and Pac-Man, but the walls are flat and the maze lacks depth. The dots and pellets feel inert. No background texture, no ambient animation in the maze, no visual polish on the ghost eyes or frightened state beyond a color swap. It reads as functional but not beautiful.

## Visual Redesign Plan

### Background & Environment

The game canvas background should be a deep space dark with a very subtle radial vignette — darkest at corners, slightly lighter at center. Add a faint hexagonal tile pattern across the entire background at ~4% opacity to give depth without cluttering. The maze itself should glow faintly blue-violet; walls get an inner neon edge light so they read as glowing tubes rather than flat blocks. The tunnel wrapping zones get a starfield fade effect on the edges.

### Color Palette
- Primary (Pac-Man): `#ffe000`
- Secondary (maze walls): `#0a0e3f`
- Wall glow edge: `#2244ff`
- Background: `#050714`, `#0a0e3f`
- Dot: `#ffc87a`
- Power pellet glow: `#ff9f1c`
- Ghost house gate: `#ff88cc`
- Frightened ghost: `#2020dd`
- Glow/bloom: `#4466ff`

### Entity Redesigns

**Pac-Man:** Add a subtle radial gradient from bright yellow at the center to a slightly warmer orange at the rim. The mouth edges should have a thin bright line to emphasize the chomping. A faint circular glow bloom beneath Pac-Man as he moves — like he's rolling on a lit surface.

**Ghosts:** Each ghost body should have a subtle vertical gradient — slightly lighter at the top dome. Eyes become larger and more expressive: white irises with electric-blue pupils. The wavy bottom skirt animates smoothly with 4 waves. When frightened, ghosts visibly pulse between the dark blue and a very dark purple, with white zigzag mouth. When eaten (eyes only), the eyes leave a glowing trail behind them.

**Dots:** Slightly larger, with a gentle pulse cycle at ~0.3Hz. Give each dot a tiny specular highlight point (single bright pixel above-left).

**Power Pellets:** Dramatic glow rings — two concentric rings radiating outward at different speeds. The pellet itself cycles between warm amber and white. When eaten, an expanding ring flash briefly illuminates the surrounding cells.

**Walls:** Each wall tile gets a thin bright border on the inward face (toward the path), giving the effect of neon tubes set into dark panels. Corner pieces get a rounded neon arc rather than hard 90-degree lines. The ghost house gets a darker floor texture with faint grid lines.

### Particle & Effect System

- **Dot eat:** Small starburst of 3–4 particles in dot color, life ~12 frames
- **Power pellet eat:** Large flash ring + 8 outward particles + brief camera flash (lighten bg for 2 frames)
- **Ghost eat:** Score popup floating text (200/400/800/1600), small implosion burst in the ghost's color
- **Level complete:** Full-maze flash cycling through all ghost colors, then fade to new level
- **Pac-Man death:** Classic expanding circle collapse — Pac-Man retracts mouth to full circle then spins outward as a shower of golden sparks, 20 particles

### UI Polish

Lives display as Pac-Man icons (already present) — add a soft glow on each. Level number shown with a neon badge style. Score animates upward with a brief yellow flash on change. Add a thin neon line border framing the entire game area.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Dot eat | Square wave, rapid decay | 400Hz → 600Hz sweep | 60ms | Alternate pitch each eat for the classic waka feel |
| Power pellet eat | Sawtooth chord | 220Hz + 330Hz + 440Hz | 300ms | Swelling attack, slow decay |
| Frightened ambience | Low pulsing sine wave | 80Hz, tremolo at 4Hz | Looping | Plays while frightened timer active, fades as timer expires |
| Ghost eat | Ascending arpeggio | 400, 600, 800, 1000Hz staircase | 200ms | Each ghost in combo plays one step higher |
| Player death | Descending chromatic | 880Hz down to 110Hz, sawtooth | 1.2s | Classic descending doom sound |
| Level complete | Ascending major scale | C5→C6 arpeggio, sine wave | 800ms | Cheerful fanfare |
| Extra life | Bell-like FM | Carrier 880Hz, mod 440Hz | 400ms | Soft, pleasant ding |

### Music/Ambience

A subtle, looping ambient drone during gameplay — a very quiet chord of sine waves (C2, G2, E3) at 3% volume to add atmosphere without distracting. The frightened mode drone takes over this slot while active.

## Implementation Priority
- High: Wall neon-edge effect, power pellet ring glow, dot eat sound, death animation particles
- Medium: Ghost gradient bodies, Pac-Man glow bloom, frightened pulse, ghost eat score popups
- Low: Background hexagonal tile texture, tunnel starfield fade, level complete fanfare, ambient drone
