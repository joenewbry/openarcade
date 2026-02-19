# SimCity — Visual & Sound Design

## Current Aesthetic

600×600 canvas with a 40×40 grid map at 30px per cell. Zone types use solid fills: Empty (dark grey `#1a1a2e`), Residential (`#0c4` green), Commercial (`#28f` blue), Industrial (`#ec0` yellow), Road (`#666` grey), Power Plant (`#f33` red), Park (`#3b3` bright green). Buildings grow across 5 levels, each level adding taller/more-detailed rect compositions. The HUD has a top bar with population/money/happiness stats and a bottom bar with zone type buttons plus stats bars (jobs/commerce/power). Power plants emit a lightning emoji. Tax collection flashes the screen briefly. The overall look is a programmer's grid map with labeled rectangles.

## Aesthetic Assessment
**Score: 2/5**

The zone color coding is immediately readable, which is a genuine strength. But every building is a stack of colored rectangles — there's no skyline character, no day/night, no street-level texture. The grid feels sterile rather than city-like. The HUD is functional but completely unpolished. SimCity's premise deserves a real urban miniature feel.

## Visual Redesign Plan

### Background & Environment

Add a **day/night cycle** that shifts every 1200 frames (one complete cycle). During day: the grid background is a warm concrete grey (`#1e1e2a`). During night: the background shifts to deep blue-black (`#080818`), and buildings with power emit warm golden window-light glows. A top sky band (top 30px of canvas, above the grid) shows the sky gradient: blue during day, deep indigo at dusk, near-black at night with tiny white star dots. A subtle sun/moon disc in the top-right corner of the sky band.

Each road cell gets visual surface detail: faint lane marking lines (dashed centerline) and subtle crosshatch at intersections. Road cells adjacent to buildings get a slightly lighter sidewalk margin along the building edge.

Add a thin ambient grid overlay (faint white lines at 30px intervals) at 5% opacity across the entire map to maintain the grid structure visually.

### Color Palette
- Residential (low): `#2a6a2a`
- Residential (high): `#44aa44`
- Commercial (low): `#1a3a8a`
- Commercial (high): `#3366ff`
- Industrial (low): `#886a00`
- Industrial (high): `#ddaa00`
- Road surface: `#333344`
- Road marking: `#cccccc`
- Power plant: `#cc2222`
- Park: `#225522`
- UI panel: `#080818`
- UI accent: `#44ffaa`

### Entity Redesigns

**Residential buildings (Level 1–5):** Level 1 is a simple cottage — a small rect body with a triangle roof peak (draw as a filled triangle above the rectangle). Level 2 adds a second floor. Level 3: a 3-story apartment with 4 window rectangles per floor (small lit yellow rects). Level 4: taller residential tower with a grid of window rectangles (warm yellow, some dark to suggest empty units). Level 5: glass tower with a full-height facade of blue-tinted windows in a grid pattern, plus a small rooftop water tower shape.

**Commercial buildings (Level 1–5):** Level 1: a flat-roofed shop with a large front window rect and a small sign strip at top. Level 2: 2-story with a glowing sign strip (blue-white). Level 3: office block with a recessed entrance arch. Level 4: glass commercial tower with a blue curtain-wall window grid. Level 5: skyscraper with an antenna spire on top — a thin vertical line extending 10px above the building roof.

**Industrial buildings (Level 1–5):** Level 1: a low warehouse shed. Level 2: shed with a ventilation chimney stack (thin rect on top). Level 3: factory building with 2 chimneys; add animated smoke puffs — small grey circles that drift upward from each chimney stack and fade. Level 4: large factory complex with multiple roof sections. Level 5: industrial megacomplex with 3 chimneys constantly emitting smoke, and orange glow from the "furnace" windows.

**Power plant:** Redesign as a proper power station: a large dark building with 2 cooling towers (tall trapezoid shapes wider at base than top) flanking the main building. A glowing red core window. High-voltage pylon shapes (triangle outline) on either side. Animated electricity arc between the towers (a jagged line that changes each frame).

**Roads:** Intersections get proper crosswalk stripe patterns (thin white parallel rects across the road at corners). Along road segments, draw faint direction arrows. Road cells adjacent to the canvas edge get a slightly lighter shoulder.

**Parks:** Draw actual park contents: a central circular fountain (concentric thin rings), 2–4 tree silhouettes (circle canopy on a line trunk), a diagonal walking path.

**Power lines:** Draw the power distribution as faint yellow lines connecting from the power plant along road edges, glowing slightly.

### Particle & Effect System

- **Tax collection:** Golden coins rise from each zone cluster — small yellow circles float upward from the map toward the money counter, then the counter briefly flashes green.
- **Building level-up:** A bright construction flash at the cell — the old building briefly shows a scaffolding outline (dotted rect border) before the new building materializes. A small upward arrow floats above the cell.
- **Building collapse (no power/roads):** The building rect dims and a crack line appears across it. A small dust cloud puff rises.
- **Power plant area:** Faint blue power radius indicator — on click/hover, draw the concentric ring showing the power plant's range 6 cells.
- **Industrial smoke:** Each level 3+ industrial building continuously emits smoke puffs (2–3 grey circles per second, drifting upward and fading, max 5 active per chimney).
- **Low happiness:** When happiness is below 30%, small red frowning emoji-like icons (arc mouth) float over residential zones randomly.
- **Bulldoze:** A brief yellow ripple effect radiates from the demolished cell. Debris particles fly outward (4 small rect fragments).
- **Bankrupt warning:** Screen edges flash red. A warning banner slides in from the top.

### UI Polish

- Zone buttons: Redesign as proper action cards at the bottom with a dark panel, zone color border, small building silhouette icon, and the zone name. Active zone highlighted with full border glow and inner background shift.
- Money display: Large amber monospace numbers at top-left with a "$" prefix. Brief green flash on tax gain. Red flash on expense.
- Population counter: Animated numeric display with a small people icon (stick figure). Number counts up smoothly on growth.
- Happiness bar: Semi-circular gauge (like a speedometer arc) with a needle sweeping from red (0) through yellow to green (100). The needle position animates smoothly.
- Stats bars (jobs/commerce/power): Replace plain rects with gradient fills (red→yellow→green) and add percentage labels inside the bar. Bars animate fill-level transitions.
- Time speed indicator: Small badge showing the simulation speed (1x/2x/paused) with a play/pause icon.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Zone placed | OscillatorNode, triangle | 440 Hz, 60ms | 0.06s | Soft placement click |
| Zone bulldozed | White noise | Lowpass 400 Hz, 0.1s | 0.1s | Debris crumble |
| Building level-up | OscillatorNode, sine | 523→659→784 Hz, 60ms each | 0.2s | Construction chime |
| Tax collected | OscillatorNode, sine | 880→1047 Hz sweep | 0.15s | Cash register ding |
| Power on | OscillatorNode, square | 220 Hz hum, fade in 0.3s | 0.3s | Electrical buzz |
| Power loss | OscillatorNode, square | 220→80 Hz fade out | 0.4s | Power down |
| Building collapse | White noise + OscillatorNode 60 Hz | Lowpass 300 Hz, 0.4s | 0.4s | Structural crumble |
| Industrial smoke | White noise highpass 2kHz | Soft puff, 0.1s | 0.1s | Steam vent |
| Happiness up | OscillatorNode, sine | 659→784 Hz | 0.12s | Positive note |
| Happiness down | OscillatorNode, sawtooth | 330→220 Hz | 0.2s | Negative note |
| Bankrupt warning | OscillatorNode, square | 300 Hz 3× pulse, 150ms each | 0.6s | Alert alarm |
| Game over (bankrupt) | White noise burst + 60 Hz sine | 0.8s total fade | 0.8s | City collapse |
| Road placed | White noise | Highpass 1kHz, 0.05s | 0.05s | Asphalt tap |
| Park placed | OscillatorNode, sine | 784 Hz, soft 0.1s | 0.1s | Nature ping |
| Large population | OscillatorNode, sine chord | 523+659+784 Hz, 0.3s | 0.3s | Achievement sting |
| Simulation tick | No sound | — | — | Silent |

### Music/Ambience

A gentle urban generative soundscape. The base is a slow synthesizer pad: two triangle oscillators at 110 Hz and 165 Hz (perfect fifth), slow-attack 800ms, constant sustain at gain 0.04, creating a background drone. Overlaid with a sporadic piano-like melody (sine oscillator with short 200ms decay, no sustain) that plays random notes from a C major scale (C4, D4, E4, G4, A4) every 2–4 seconds, simulating an ambient city-life haze. A subtle rhythm layer (filtered noise, 500Hz bandpass, 30ms, very low gain 0.02) ticks every quarter note at 80 BPM — like distant traffic. During night mode, the ambient pad shifts to a minor chord (110+131+165 Hz) and the melody notes slow to one every 4–6 seconds. When large milestones are hit (population 1000, 5000, etc.), a brief bright chord stab plays on top.

## Implementation Priority
- High: Residential building window-rect grids per level; commercial skyscraper antenna spire; industrial chimney smoke puff particles; power plant cooling tower + electricity arc; road crosswalk stripe patterns at intersections
- Medium: Day/night cycle with building window glow at night; building level-up scaffolding flash; golden coin tax collection particles; happiness gauge needle; park fountain and tree silhouettes
- Low: Bankrupt warning red screen vignette; road direction arrows; power line yellow glow paths; sky strip with sun/moon; urban ambient soundscape music
