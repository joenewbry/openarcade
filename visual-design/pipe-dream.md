# Pipe Dream — Visual & Sound Design

## Current Aesthetic

A 7x10 grid of pipe cells on a dark background. Pipes are rendered as colored line segments within each cell — vertical, horizontal, four corner types, and cross pipes. Water flows through connected pipes in cyan (`#0af`). The source cell is orange (`#f80`). A yellow cursor highlights the selected placement cell. A queue panel on the right shows upcoming pipe types. A countdown timer delays the water flow start. Score and level are shown at the top.

## Aesthetic Assessment
**Score: 2.5/5**

The plumbing puzzle mechanic is clean and functional, but the visual presentation is thin. Pipes look like line drawings with no sense of physical depth or materiality. The grid background is featureless. Water filling is a solid color with no animation texture. The queue panel is a plain list. The countdown is just a number. The whole thing reads as a wireframe prototype rather than a finished game.

## Visual Redesign Plan

### Background & Environment

The grid background should feel like looking down at a wall or floor surface where you're routing pipes — a dark industrial tile floor with subtle grout lines forming a slight grid pattern at a darker shade. The overall color: deep slate `#0e0e1a` with faint grid lines at `#1a1a2a`. The border around the playfield becomes a thick metal frame with a brushed-steel appearance — lighter top edge, darker bottom edge, corner bolts rendered as small circles.

The queue panel on the right gets a proper mechanical housing — a chute or hopper shape suggesting pipes queuing to be dropped. Decorative pipe fitting connectors appear at the top and bottom of the panel. The countdown timer becomes a dramatic industrial pressure gauge — a circular dial with a needle sweeping from full to empty, red zone near zero.

### Color Palette
- Background: `#0e0e1a`, `#151522`
- Grid line: `#1a1a2a`
- Pipe body: `#708090` (steel gray)
- Pipe highlight: `#a0b0c0`
- Pipe shadow: `#404850`
- Water fill: `#00ccff`
- Water glow: `#00eeff`
- Source cell: `#ff8800`
- Source glow: `#ffaa33`
- Cursor: `#ffee00`
- Cursor glow: `#ffff66`
- Queue panel bg: `#1a1a2e`
- Metal frame: `#505560`, `#707880`

### Entity Redesigns

**Pipe segments:** Each pipe becomes a 3D rendered tube — a cylindrical cross-section drawn with gradient shading. The pipe body is steel gray with a lighter highlight stripe running along the top-left edge and a dark shadow on the bottom-right. Pipe ends show circular openings — small dark circles with an inner ring. Corner pipes show a smooth elbow bend with proper 3D curvature. The cross pipe shows a central junction fitting — a wider hub circle where the four arms meet.

**Water fill:** Water flowing through pipes is rendered as a translucent animated liquid — a vivid cyan `#00ccff` with a bright white highlight shimmer that moves along the pipe as it fills. The water fill has a wave-like leading edge (a bright brighter stripe at the flow front) rather than a hard cutoff. Once a pipe is fully filled, the water glows gently and small bubble particles drift slowly along the flow direction.

**Source cell:** The source pipe becomes a dramatic pressure valve fitting — a hexagonal nut body in warm amber/orange with a central circular opening from which water erupts. Small spray particles emit from it before the countdown reaches zero. A pressure gauge needle sits beside it.

**Cursor:** The selected cell gets a bright yellow pulsing selection ring rather than a filled square — a glowing dashed rectangle that breathes in and out at 0.5Hz. Corner accents (small L-shaped brackets) mark each corner of the cell.

**Queue panel:** Each queued pipe in the panel is a small 3D rendered preview — the same pipe segment art at reduced scale, shown in a recessed slot. The next-to-place pipe is slightly larger and brighter. A faint drop shadow separates each slot.

**Countdown:** The pressure gauge style — a large semi-circular dial, needle sweeps clockwise from left (full time) to right (zero). The gauge face shows tick marks. The dial glows red when under 5 seconds. A steam puff particle emits at zero.

### Particle & Effect System

- **Water leading edge:** 3 bright droplet particles pulse forward just ahead of the water fill front, 6-frame life, cyan color
- **Pipe placement:** Small metallic click — 4 spark particles emit from cell corners, silver/white, 8-frame life
- **Water leak (game over):** Water bursts from the last pipe in 12 droplet particles — cyan, spreading in a fan, gravity-affected, 30-frame life
- **Source startup:** 8 water spray particles arc upward from source when countdown hits zero
- **Pressure bubble:** Every 90 frames, a small translucent bubble drifts along any filled pipe segment
- **Score milestone:** Brief golden flash on the score display + 4 gold particles emit upward

### UI Polish

Score displayed top-center with a metal-engraved look — slightly embossed text in gold on a dark steel plate. Level indicator shows as a pressure level — a vertical gauge with colored zones (green/yellow/red). The "Flow starts in X" countdown uses the gauge aesthetic. When the flow begins, a mechanical steam-release puff animation plays. Between levels, a brief "LEVEL CLEAR" industrial stamp animation slaps down over the grid.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Pipe placement | Metallic click | Square wave 800Hz + noise burst, sharp decay | 60ms | Crisp mechanical snap |
| Water flowing | Burbling liquid | Filtered noise, bandpass 400–800Hz, slight modulation | Looping | Quiet continuous sound while water flows |
| Water leading edge tick | Soft drip | Sine 600Hz, very fast decay | 30ms | Each cell the water enters |
| Pipe rotation | Ratchet click | Square 1200Hz, very short | 20ms | When cycling pipe types |
| Game over / leak | Splashing burst | Noise burst, lowpass 1.5kHz | 400ms | Water erupting from broken pipe |
| Countdown tick | Pressure click | Sine 440Hz, percussive | 100ms | Each second of countdown |
| Countdown final 3 | Urgent ticking | Sine 660Hz, 2x speed | 100ms | Last 3 seconds get higher and faster |
| Level complete | Steam release + chime | Noise whoosh + ascending sine 400→800Hz | 600ms | Triumphant but mechanical |
| Score increment | Register ding | Sine 880Hz, fast decay | 80ms | Soft cash-register feel |
| Bubble pop | Soft pop | Sine 400Hz with pitch drop, 200→100Hz | 80ms | Ambient bubble sounds |

### Music/Ambience

An industrial ambience rather than a melody: deep rhythmic hum of machinery (sine wave at 55Hz, very low volume), occasional distant clanking (noise bursts at irregular intervals), and a soft background drone that subtly shifts pitch as the flow timer pressure increases. As water fills more of the grid, the ambient sound gets slightly more intense. No looping melody — the sound design is environmental and tension-building.

## Implementation Priority
- High: 3D pipe tube rendering with highlight/shadow, animated water fill with leading-edge glow, pipe placement click sound, water flow burble sound
- Medium: Source pressure valve design, cursor pulse ring, queue panel pipe previews, countdown gauge style, level complete steam animation
- Low: Bubble particle drifts, grid grout-line texture, metal frame border detail, pressure-based ambient music, score milestone flash
