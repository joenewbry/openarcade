# Swarm Control — Visual & Sound Design

## Current Aesthetic

A real-time strategy game on a 600x400 canvas (world 900x600) with a camera system. BOID units are tiny 3x3 pixel dots. Resource nodes are simple colored circles. The two hives are hexagonal outlines. The player drags a selection rectangle to split the swarm; clicking moves the entire swarm. An AI opponent controls the opposing swarm. The UI shows resource counts and a mini overview. The overall aesthetic is extremely minimal — the boid simulation is impressive technically but visually reads as a barely-labeled dot field.

## Aesthetic Assessment
**Score: 2/5**

The boid flocking behavior is the star of this game and it deserves a visual language that makes the swarm feel organic, alive, and threatening. Resource nodes need to clearly communicate their value and state. The two hives need to feel like organic command centers — not geometry exercises. The camera/zoom system is good infrastructure for a rich world.

## Visual Redesign Plan

### Background & Environment

**World background**: Deep space-biology dark `#050c10` — near-black with a barely visible hex grid at 3% opacity in dark teal `#0a2028`. The hex grid evokes both a natural honeycomb structure (fitting for a hive game) and a science fiction tactical display.

**Terrain zones**: Add subtle background variety to the world. The center region (near resource nodes) gets slightly lighter tinted patches `#080f14` suggesting open ground. Areas near hives get a subtle gradient glow in the hive's faction color at very low alpha — the hive's "territory aura."

**World boundary**: A faint glowing border marks the world edges — a dim teal line at the edge of the 900x600 world space, with a subtle outward glow suggesting an electrified arena boundary.

**Spatial grid visualization** (debug off / subtle): A very faint grid at 40x40 cell size (the spatial hashing grid) at 2% alpha — suggests the underlying tactical structure without being visible as a debug overlay.

### Color Palette
- World background: `#050c10`
- Grid lines: `#0a2028`
- Player swarm: `#22ddff` (cyan)
- Player hive: `#0a6888`
- AI swarm: `#ff4422` (orange-red)
- AI hive: `#882210`
- Resource node: `#44ff88` (green crystal)
- Resource depleted: `#224433`
- Resource contested: `#ffdd00` (gold when both swarms present)
- Selection drag box: `#22ddff40`
- Glow/bloom: `#22ddff`, `#ff4422`, `#44ff88`

### Entity Redesigns

**BOID units**: Move beyond 3x3 dots to living micro-creatures:
- Each unit is drawn as a tiny elongated oval (2x4 pixels) or a tiny pointed oval (3-sided isoceles triangle) in the faction color, oriented in the direction of its velocity vector. This immediately makes flocking behavior visually apparent as units align when moving together.
- **Glow core**: Each unit has a tiny bright center (1px white dot at the unit center) suggesting bioluminescent life.
- **Density glow**: When many units are clustered together (as a dense swarm), the overlapping translucent units create a natural bright cloud effect. The faction color at ~60% alpha allows this emergent brightness.
- **Selected units**: When the player's swarm is selected (drag or click), each unit gets a brief white flash ring for 5 frames — visible in the swarm as a rolling sparkle.
- **Unit count display**: A small number above the player's swarm center (not each unit) showing total unit count, in faction color.

**Hives**: Redesigned as organic command centers:
- **Structure**: Three concentric hexagons — outermost is thin and dim (30% alpha), middle is medium brightness (60%), inner is filled and bright. Sizes: outer radius 28, mid 20, inner 14.
- **Honeycomb detail**: Within the inner hex, draw 6 tiny hexagons arranged in a flower pattern (center hex + 6 surrounding). This suggests a honeycomb interior.
- **Spawn pulse**: When the hive spawns new units (at resource intervals), a bright ring pulses outward from the inner hex and fades over 20 frames.
- **Health state**: The hive's outer hex opacity scales with its health — full health = full brightness, low health = dim and flickering.
- **Hive glow**: A large soft glow circle (setGlow, large radius) in the faction color centered on the hive, providing an ambient "territory" feel.
- **Production indicator**: A slowly rotating indicator around the inner hex — a small bright arc segment that completes a full orbit over the spawn interval, then triggers the spawn pulse.

**Resource nodes**: Visually distinct organic crystal formations:
- **Shape**: Instead of a plain circle, draw a cluster of 5-7 small hexagon polygons in varying sizes radiating from a center point (like crystal facets). The largest is centered, smaller ones radiate outward at slight angle offsets.
- **Color**: Bright bioluminescent green `#44ff88` for full resource nodes. As resources deplete, the crystals dim and shift toward dark grey-green `#224433`.
- **Glow**: Full nodes pulse gently (sin-based alpha variation between 80-100%) with a setGlow in bright green. Depleted nodes have no glow.
- **Contested indicator**: When both swarms are overlapping a node, the node's glow shifts to gold `#ffdd00` and flickers rapidly — a visual signal of contest.
- **Respawn animation**: When a depleted node regenerates, the crystals grow from 0 to full size over 30 frames (scale animation from center).

**Selection rectangle**: The drag-select box becomes a stylized tactical selection UI. Instead of a plain rect, draw it with:
- Corner ornaments: Small L-shaped brackets (2 short lines per corner) in bright cyan.
- The fill is a very low alpha (`#22ddff18`) with a slightly brighter edge.
- A dashed animated border (offset marching ants pattern, cycling 1px per frame).
- The count of selected units appears inside the box in small cyan text.

### Particle & Effect System

- **Swarm movement**: When the swarm is ordered to a location, a brief targeting reticle appears at the destination — two concentric circles that pulse and fade over 30 frames.
- **Swarm split**: When the player drags to split the swarm, a brief burst of particles marks the split point — 8 small dots scatter in the selection drag direction.
- **Resource capture**: When the player's swarm successfully captures a resource node, a golden particle burst — 12 diamond-shaped polys radiate from the node in the player's faction color. "+N resources" text floats upward.
- **Unit death**: When units die (to enemy swarm or at boundary), small faction-colored dust particles scatter — 1-2 tiny dots that fade quickly. At mass deaths (large battles), the area becomes briefly hazy with overlapping fade particles.
- **Hive attack**: When a swarm directly attacks the enemy hive, the hive flashes the attacking faction's color briefly (2 frames) on each unit that reaches it. Damage is shown as a brief darker ring on the hive.
- **Battle zone**: When both swarms collide in open territory, a chaotic micro-explosion effect — many tiny flash particles in both faction colors appearing and fading rapidly at the contact zone.

### UI Polish

**HUD**: The resource counter and status display gets a sci-fi tactical styling:
- **Resource bar**: A horizontal bar at the top showing each player's resource total, styled as a thin neon progress bar in faction color. Numerical value displayed inside.
- **Unit count indicator**: Small unit count displayed as two opposing meters (player left, AI right) with a center divider — a bar that shifts left/right based on relative swarm sizes.
- **Minimap**: The overview in the corner becomes a proper tactical minimap — dark panel with thin border, faction-colored dots for units, smaller dots for resources. The camera viewport is shown as a translucent rect overlay on the minimap.
- **Phase indicator**: "GATHERING", "CONTESTING", "ASSAULTING" phase text at top center in appropriate faction/neutral color based on current tactical situation.

**Camera pan indicator**: When the camera is zoomed in and panning near the edge, brief directional arrows appear at the screen edge indicating there is more world in that direction.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Swarm move order | Soft whoosh | Noise sweep 2000→400Hz | 150ms | Movement command |
| Swarm split | Slice | Highpass noise 4000Hz burst | 80ms | Division sound |
| Resource captured | Crystal chime | Sine 880→1047Hz | 300ms | Node acquisition |
| Resource lost | Low drop | Sine 440→220Hz | 200ms | Node lost |
| Hive spawn pulse | Low organic pulse | Sine 110Hz, soft attack | 200ms | Birth event |
| Battle (swarm contact) | Swarm hiss | Narrow bandpass noise 1500Hz | Duration | Sustained during contact |
| Hive damaged | Bass impact | Sine 80Hz + noise | 300ms | Heavy hit |
| Win | Triumphant arpeggio | 523→659→784→1047Hz + chord hold | 800ms | Victory |
| Lose | Descend drone | Sine 220→110Hz, slow fade | 1000ms | Defeat |
| Resource node respawn | Crystal grow | Sine 660→880Hz slow sweep | 400ms | Crystal formation |

### Music/Ambience

An organic/electronic hybrid ambient loop suggesting a living hive world:
- **Hive drone**: Two sine oscillators at 55Hz and 82.5Hz (a fifth apart) at very low gain (0.018 each) — a constant subsonic hum suggesting the vibration of thousands of living creatures. Very slowly modulate gain via a 0.04Hz LFO.
- **Wing flutter texture**: Narrow bandpass noise centered at 2500Hz (Q=6) at 0.006 gain with a rapid amplitude modulation LFO (8Hz) — creates a subtle insect-wing buzzing texture. Barely audible but creates the "swarm" feel.
- **Electronic pulse**: A square oscillator at 165Hz (E3) with hard gain envelope gating — 50ms on, 350ms off, looping at a 2/4 rhythm suggesting a heartbeat. Gain 0.012. Evokes both organic and synthetic.
- **Battle intensity**: When swarms make contact, all three elements scale up (gain x2.5) and the bandpass noise frequency drops to 1500Hz for a more aggressive, lower buzz. Fades back after contact ends.
- **Resource zone**: Near resource nodes (spatially — gain scales with camera proximity to nodes), a bright narrow bandpass node at 4000Hz plays at 0.005 gain — a crystalline shimmer suggesting the energy of the resources.

## Implementation Priority
- High: BOID unit directional oval shape, hive concentric hex redesign with honeycomb interior, resource crystal cluster shape, battle zone particle effect
- Medium: Hive spawn pulse ring animation, resource contested gold glow, swarm hive drone ambient, selection box corner ornaments
- Low: World hex grid background, territory aura glow, minimap tactical styling, camera edge direction arrows
