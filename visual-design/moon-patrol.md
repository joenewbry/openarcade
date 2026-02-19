# Moon Patrol — Visual & Sound Design

## Current Aesthetic

Dark navy sky (#0a0a1a) with 80 twinkling stars and two parallax mountain layers (near-black silhouettes). Terrain rendered as detailed polygon surface with blue (#48e) glowing edge line. Craters dip smoothly using sine interpolation. Rocks in muted slate (#556). Mines pulse orange (#f80) with spike lines. UFOs in red (#f44) with dome detail. Buggy has excellent mechanical detail — animated spoke wheels, cabin, antenna, suspension links. Bullets in yellow (#ff0) and cyan (#0ff). Overall very solid for a side-scrolling game.

## Aesthetic Assessment
**Score: 3.5/5**

The buggy art is genuinely impressive for a canvas game. Terrain rendering is smooth. The dual parallax mountains create good depth. Main weaknesses: sky feels flat (too uniform dark), UFOs are basic colored rects, rocks are too plain, and the color palette could push further into something distinctive. The checkpoint flags are a nice touch.

## Visual Redesign Plan

### Background & Environment

Transform into a breathtaking alien moonscape at dusk. The sky gets a three-layer treatment:

1. **Deep space layer (top 40%):** Near-black (#030308) with 200 stars of 3 size tiers. Distant nebula: two wide soft blobs (large translucent filled circles in deep magenta `#4a0033` and blue `#00184a`, drawn at 0.08 opacity) that don't move with parallax.

2. **Atmospheric haze (middle 20%):** A soft horizontal gradient band shifting from dark indigo to deep orange near the horizon — approximated with 8 stacked fillRect calls getting progressively warmer.

3. **Planet in background:** A large sphere (fillCircle, radius 60px, positioned upper-right) in pale orange-tan `#c87040` with subtle band lines (2-3 thin arcs in slightly darker color). Moves very slowly (0.05x parallax). Give it a thin atmosphere glow ring.

Mountains get a complete overhaul: three parallax layers instead of two. Farthest layer: very dark purple-blue silhouettes with jagged peaks (sharper polygon points). Middle layer: slightly lighter with crater rim suggestions (small arcs cut into the mountain tops). Near layer: detailed rocky foreground hills with individual boulder shapes.

Ground: Replace flat polygon with a textured surface. The terrain surface line glows bright cyan (#00ffee) at 0.6 intensity. Beneath it: alternating bands of slightly different dark values (dust layers). Add small randomly placed surface rocks (1-3px circles in `#334455`) scattered across the ground between obstacles.

### Color Palette
- Primary: `#00ffee` (cyan glow — terrain, buggy, bullets)
- Secondary: `#ff6622` (fire orange — UFOs, mine glow)
- Tertiary: `#cc44ff` (plasma — upward bullets, special effects)
- Background layers: `#030308`, `#0a0818`, `#181030`
- Horizon glow: `#4a2010`, `#7a3820`
- Mountains far: `#0d0820`
- Mountains mid: `#161030`
- Mountains near: `#1e1840`
- Ground surface: `#1a2035`
- Glow/bloom: `#00ffee`, `#ff6622`, `#cc44ff`

### Entity Redesigns

**Buggy:** Keep the excellent existing structure but upgrade colors and effects. Body painted in metallic dark blue (`#1a3a6a`) with cyan accent stripe. Wheels glow cyan more intensely (0.6 glow). Antenna tip flashes (`Math.sin(frameCount * 0.2)` controlling brightness between #ff0 and #ff8800). Add a dust trail — 3-5 small gray particles spawning at the rear wheels every frame when moving, drifting back and fading. Gun barrel gets a tiny muzzle flash when firing (1-frame bright circle at barrel tip).

**UFOs:** Complete overhaul. Replace rect body with proper saucer: two arcs (upper dome and lower hull) forming a classic saucer silhouette using fillPoly. Hull in metallic dark gray (#2a3a4a) with orange glow (#ff6622). Dome in translucent green (#00ff6644). Three rotating colored light dots on the hull rim cycle red-orange-yellow. Tractor beam: occasional faint cone of light projecting downward from the UFO.

**Rocks:** Now have proper faceted look — drawn as 6-7 point polygons (irregular, not circles). Lighter face highlight on top edge, darker shadow on bottom. Slight blue-gray color with terrain-matching dust at base.

**Mines:** Enhanced to look like actual anti-personnel mines: a flat disk body (ellipse approximated as wide short polygon) in military green with 8 spikes. Pulses more dramatically — the spike tips flash alternately. When buggy gets close (within 60px), mines begin a rapid red flash warning.

**Craters:** Add rim highlight — a thin brighter line along the crater rim on the sunward side. Crater interior is slightly darker than surrounding terrain.

### Particle & Effect System

**Buggy destruction:** Large 30-particle burst — mix of cyan debris (buggy color) and orange fire. Particles have varying gravity and bounce once off ground.

**UFO destruction:** Green plasma particles (dome material) + orange fire particles. The UFO hull tumbles (rotate a few simplified points) before exploding.

**Bullet impact on rock:** Gray stone chips fly — 6 particles radiating outward, heavier gravity.

**Checkpoint celebration:** At each checkpoint, the flag emits gold/yellow sparkles that drift upward. A brief "+100" text floats up in bright white.

**Dust trail:** Subtle but constant — small light-gray circles (radius 1-2px, opacity 0.3-0.6) spawn at wheel contact points and drift backward, fading over 15 frames.

**UFO bomb impact:** When a bomb hits ground, a small orange flash ring expands and fades over 8 frames.

### UI Polish

- Lives display: instead of mini-buggy shapes, use three small glowing cyan dots arranged horizontally. On loss, a dot goes dark with a brief red flash.
- Checkpoint progress bar gets a gradient fill (cyan fading to darker cyan toward the right).
- HUD background: semi-transparent dark strip at top with a subtle scanline pattern.
- Wave effect when checkpoint letter appears: the letter zooms in from large (40px) to normal (14px) over 10 frames while fading from white to yellow.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Buggy engine (loop) | OscillatorNode (sawtooth) | 80Hz base, varies with scrollSpeed: 80-140Hz | Loop | Volume 0.05. Add BiquadFilter lowpass 400Hz. |
| Jump | Sine sweep up | 200→600Hz over 150ms | 150ms | Light, springy. |
| Land | Short noise burst | White noise, lowpass 200Hz | 80ms | Soft thud. |
| Forward bullet | OscillatorNode (square) | 1200Hz, immediate decay | 60ms | Sharp laser blip. |
| Upward bullet | OscillatorNode (sine) | 1600→2000Hz sweep | 80ms | Higher, whistly. |
| Rock destroyed | Noise + low sine | Noise filtered lowpass 600Hz + 100Hz sine | 200ms | Crunching impact. |
| UFO engine (loop per UFO) | OscillatorNode (sine, wobble) | 300Hz ±20Hz at 3Hz rate | Loop | Per-UFO ambient. Volume 0.04. |
| UFO destroyed | Noise sweep | Filtered noise descending | 500ms | Explosion + power-down sound. |
| Mine explode | Low noise burst | Lowpass 150Hz noise, high volume | 600ms | Heavy ground mine sound. |
| Checkpoint | Quick ascending arpeggio | C5-G5-C6 (523, 784, 1047Hz) | 300ms | Bright success jingle. |
| Buggy death | Low noise + pitch fall | 300→60Hz sawtooth | 800ms | Catastrophic crash sound. |
| Bomb drop | Short whistle sweep down | 800→200Hz sine | 400ms | Falling bomb whistle. |

### Music/Ambience

A sparse space-western ambient track: a slowly evolving pad (two detuned OscillatorNodes at 110Hz and 110.5Hz, giving slow beating) at volume 0.02. During UFO presence, add a higher ominous tone at 440Hz with vibrato (±5Hz at 4Hz rate) at volume 0.02. Checkpoint celebrations briefly add a bright chime overtone. No driving beat — the buggy engine provides the rhythm.

## Implementation Priority
- High: Dust trail particles, UFO complete redesign, planet-in-sky background element, buggy destruction particles, mine warning pulse
- Medium: Rock faceted redesign, three-layer mountain system, UFO tractor beam, checkpoint sparkle effect, gun muzzle flash
- Low: Nebula blobs in background, crater rim highlights, surface scattered rocks, HUD scanline background, buggy color upgrade
