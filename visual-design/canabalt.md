# Canabalt — Visual & Sound Design Plan

## Current Aesthetic

The game uses a 3-layer parallax background (far=`#0a0a18`, mid=`#0e0e22`, near=`#1a1a35`) with a cyan (`#0af`) stick-figure runner. Buildings are dark navy rectangles. Windows are dim cyan rectangles. Particles are cyan. The screen shakes on heavy landings. The palette is entirely cyan-on-dark-blue — monochromatic and clean. The runner is drawn with simple line segments and circles. The mood is cold and sparse, which partially fits the dystopian runner genre, but lacks the cinematic weight and atmospheric drama that makes Canabalt iconic.

## Aesthetic Assessment: 3 / 5

The parallax layering and screen shake are solid foundations. The monochromatic cyan approach is coherent but too flat. The buildings need skyline character. The runner needs silhouette weight. The windows need to tell a story (some lit warmly, some dark, the city lives around the runner). Rain or environmental particles would transform the atmosphere.

---

## Visual Redesign Plan

### Background & Environment

- **Sky gradient**: top = near-black blue-grey `#0a0b12`, bottom horizon = faint amber-orange glow `#1a1208` suggesting a burning city on the horizon. Draw as a vertical gradient fill.
- **Distant city silhouette layer** (parallax 0.1x speed): flat dark shapes `#0d0e18` representing skyscraper outlines, no windows — pure silhouette for depth.
- **Mid city layer** (parallax 0.3x): buildings `#111520` with scattered warm amber windows (`#ff9945` at 0.4 alpha) and a few lit-blue windows (`#6699ff` at 0.4 alpha). Some windows flicker.
- **Near building layer** (parallax 0.7x): actual platform buildings the runner traverses — dark concrete `#161820` with visible architectural detail: window grids, antenna spires on some rooftops, rooftop water-tower silhouettes.
- **Active platform buildings**: slightly lighter `#1e2130` for the running surface, clear edge definition.
- **Foreground debris**: very occasionally (every 8–15 seconds) a piece of rubble or broken sign scrolls by at 1.2x speed in the extreme foreground — dark shape at 0.6 alpha.
- **Screen shake**: on landing from large height — translate canvas randomly ±3–6px for 4 frames. Already exists, enhance with radial blur suggestion (draw 3 ghost copies at ±1px offset at 0.1 alpha).

### Color Palette

| Role | Old | New |
|---|---|---|
| Sky top | `#0a0a18` | `#080910` |
| Sky horizon | same | `#1a1208` (warm amber tint) |
| Far buildings | `#0e0e22` | `#0d0e18` |
| Mid buildings | `#1a1a35` | `#111520` |
| Near buildings (platform) | `#12122a` | `#1e2130` |
| Warm window glow | none | `#ff9945` at 0.4 alpha |
| Cool window glow | `#0af` dim | `#6699ff` at 0.35 alpha |
| Runner body | `#0af` cyan | `#e8eaf0` near-white silhouette |
| Runner outline/glow | `#0af` | subtle `#6699ff` glow at 6px |
| Runner coat trail | none | dark motion-blur ghost at 0.12 alpha |
| Dust particles | `#0af` | `#c4c8d4` grey-white concrete dust |
| Explosion/debris | `#0af` | `#ff9945` warm fire orange |
| UI text | white | `#d0d4e0` cool light grey |
| Distance meter | white | `#ffd090` warm amber |

### Entity Redesigns

**Runner (silhouette approach)**
- Rather than a cyan wireframe, render as a **dark silhouette** `#1a1c28` against the lighter sky, with a crisp `#6699ff` rim-light outline on the right edge (2px stroke) to make them pop from the background.
- Coat/cape flapping: add 2–3 dynamic bezier polygon shapes behind the runner representing a trench coat — they trail behind based on velocity, polygon points offset by speed * 0.3.
- Running animation: existing leg/arm geometry but with more extremity — arms swung back at high speed, forward lean increases with velocity.
- Eyes: two small white rectangles visible in the dark silhouette — the only bright element on the body.
- At very high speed (>800m): rim-light shifts from blue to amber `#ff9945`, suggesting the runner is literally on fire with momentum.

**Buildings / Platforms**
- Top edge of platform: 1px bright line in `#3a4060` (subtle edge highlight).
- Window grids: draw 3x4 grid of small rectangles per building in the mid layer. Each window: 70% chance dark `#0a0c14`, 20% chance warm amber `#ff9945` at 0.4 alpha, 10% chance flickering (alternate each 0.5s).
- Rooftop details: small polygons for AC units, antennas (single vertical line + horizontal) on some rooftops.
- Broken/gap buildings: when a gap approaches, the far edge building has a crumbling top — a few irregular polygon chips removed from the corner, displaced slightly.

**Obstacles (bombs/crates)**
- Crates: filled rect in `#3a3020` dark wood with `#5a4a30` highlight on top face. Small "X" or strap lines drawn over.
- Birds: V-shaped 3-point polygon in dark grey `#4a4e5a`. Flock of 3–5, they scatter on approach.
- Missile: slim triangle in `#cc4422` with exhaust trail of 4 white-orange circles fading behind.

### Particle & Effect System

| Effect | Description |
|---|---|
| Footstep dust | 2 grey-white particles per step, velocity outward from foot, fade 400ms, size 3–6px |
| Heavy landing dust | 8 particles burst outward horizontally from both feet, size 4–10px, fade 600ms |
| Screen shake (large gap) | Canvas translate ±4px random, 5 frames at 60fps |
| Fall death | Runner tumbles: rotate at -15deg per frame, trail of 5 ghost copies at decreasing alpha |
| Window flicker | Random amber windows toggle on/off every 400–1200ms |
| Explosion (bombs) | 12 particles: 8 orange `#ff9945`, 4 white, radial burst, size 6–20px, 500ms |
| Coat trail | 3 ghost copies of coat polygon drawn behind runner at 0.12, 0.06, 0.02 alpha |
| Speed lines | At >600m, 6 horizontal lines from screen edges, white at 0.15 alpha, 30px long |
| Rain (optional) | Diagonal streaks `#8090b0` at 0.3 alpha, 15px long, many per frame, parallax-scroll |

### UI Polish

- **Distance counter**: top center, large clean sans-serif numerals in `#ffd090` amber. No border — just the number floating with a subtle text shadow.
- **Best distance**: smaller, `#8090b0` grey, below current distance.
- **Speed indicator**: faint horizontal gradient bar at bottom of screen — transitions from cool blue (slow) through white (medium) to orange (fast) based on current speed. Height: 3px. Nearly invisible but conveys pace subconsciously.
- **Death screen**: black fill slides down from top over 0.5s. White text "YOU RAN" large, distance in amber below, "AGAIN?" small at bottom. Minimalist.
- **Start screen**: single line "RUN" pulsing in white, instructions in small grey text.

---

## Sound Design Plan

### Sound Synthesis Table

| Event | Oscillator | Frequency | Envelope | Filter/Effect | Character |
|---|---|---|---|---|---|
| Footstep (light) | noise burst | — | A:0 D:0.04 | highpass 200Hz, lowpass 800Hz | soft thud |
| Footstep (heavy) | noise + sine | — + 80Hz | A:0 D:0.08 | lowpass 400Hz | heavier concrete impact |
| Jump | sine | 220→340Hz, 0.1s | A:0 D:0.15 | none | quick whoosh-up |
| Small landing | noise | — | A:0 D:0.06 | lowpass 600Hz | light thud |
| Large landing | noise + sine | — + 60Hz | A:0 D:0.2 | lowpass 300Hz | heavy crash |
| Building collapse (bg) | noise | — | A:0.02 D:0.5 | lowpass 200Hz | distant rumble |
| Glass shatter | noise burst | — | A:0 D:0.3 | bandpass 3000Hz Q=2 | tinkle crash |
| Explosion | noise | — long | A:0 D:0.8 | lowpass 300Hz | deep boom |
| Death impact | noise + sawtooth | — + 55Hz glide down | A:0 D:0.4 | lowpass sweep | hard crash thud |
| Wind (ambient) | white noise | — | sustained | bandpass 400Hz Q=0.5, gain 0.04 | constant wind |
| Speed up (milestone) | sine | 440→880Hz | A:0 D:0.3 | none | rising whine |

### Music / Ambience

- **Ambient base**: constant filtered white noise (bandpass ~200Hz, gain 0.03) for wind. Layered with a very quiet deep sine tone at 55Hz (gain 0.02) for industrial city rumble.
- **Generative percussion loop**: no melody — just rhythm. A kick pattern using noise burst + 60Hz sine (A:0 D:0.15) at beats 1 and 3, 140 BPM. A hi-hat using white noise highpassed at 3000Hz (A:0 D:0.04) on every 8th note. The rhythm gets more complex (add snare on 2+4) as speed increases past 600m.
- **Tension layer**: as speed increases, a sawtooth drone (110Hz, gain 0.04) fades in with a slow LFO tremolo (4Hz) on its gain. By 1000m it's clearly audible, adding a sense of mounting dread.
- **Distance milestones**: at 500m, 1000m, 2000m — a brief metallic ping (triangle oscillator, 1200Hz, D:0.4) acknowledges the achievement.
- **Death**: all sounds stop abruptly. 0.2s silence. Then a single low reverberant boom (noise, lowpass 150Hz, D:1.5s with delay feedback at 0.4).
- **Master gain**: 0.4.

---

## Implementation Priority

**High**
- Sky horizon amber gradient (dramatic atmosphere)
- Runner silhouette + blue rim light redesign
- Coat/trail ghost effect
- Footstep dust particles
- Landing screen shake (enhance existing)
- Building warm amber windows

**Medium**
- Window flicker system
- Speed lines at high velocity
- Coat flapping polygon simulation
- Generative percussion rhythm loop
- Wind ambient constant noise
- Speed indicator bar UI

**Low**
- Rooftop architectural details
- Far city pure-silhouette layer
- Rain particle layer
- Distance milestone sound pings
- Tension drone that builds with speed
