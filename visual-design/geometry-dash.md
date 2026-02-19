# Geometry Dash — Visual & Sound Design

## Current Aesthetic
A 600×400 canvas with a hot-pink/magenta theme (`#f2c`). The background has faint horizontal stripe bands at 6% alpha. The ground is a solid magenta strip at the bottom. The player is a rotating cube in the theme color with a white diagonal stripe. Obstacles include spikes (triangles), blocks (squares), gaps (floor holes), portals (rounded rectangles), pillars (vertical rects), ramps (right triangles), double spikes, and ceiling spikes. All obstacles share the same flat theme-color fill with an inner darker square drawn as a secondary element. A progress bar runs across the bottom edge. The level is procedurally generated using a seeded random system. The overall look is visually clean but very flat — everything is the same color, and there is no sense of environmental depth or progression.

## Aesthetic Assessment
**Score: 2/5**

The auto-runner mechanic is solid and the obstacle variety is good, but the visual design uses a single flat color for everything, making obstacles hard to distinguish and the environment feel repetitive. The background stripes barely register. A full visual pass should introduce depth layers, obstacle differentiation, environmental storytelling, and an atmosphere that evolves as the player progresses.

## Visual Redesign Plan

### Background & Environment
A **neon cyber-city at night** setting that evolves over the run. The background uses three depth layers:

1. *Sky layer*: A vertical gradient from deep violet-black (`#06000e`) at the top to a warm neon-purple glow (`#2a0040`) at the horizon (approximately 75% down the canvas). This is drawn as 4 horizontal rects of descending opacity.

2. *Mid-city silhouette layer*: A row of dark angular skyscraper silhouettes (`#0d0018`, 60–120px tall, 20–50px wide, varying widths) spans the mid-zone. Small rectangular windows in the silhouettes blink on/off randomly (once per ~200 frames per window) in warm amber (`#ffcc44` at 50% alpha). This layer scrolls at 20% of the foreground speed for parallax.

3. *Foreground environment layer*: The ground level has a glowing neon floor strip. Beneath the ground line, a darker mechanical sub-floor is visible with horizontal grid lines (`#0a0014` at 40%), suggesting an industrial platform.

The background stripe bands are replaced with slow-pulsing horizontal scan lines (3px height, scrolling upward at 0.5px/frame, `#8800ff` at 5% alpha) giving a holographic screen quality.

As the level progresses (tracked via `distanceTraveled`), the sky gradually shifts from violet to deep teal to cyan — a visual representation of the run's arc.

### Color Palette
- Background top: `#06000e`
- Background horizon: `#2a0040`
- Mid-city silhouette: `#0d0018`
- Window light: `#ffcc44`
- Ground surface: `#1a0035`
- Ground glow line: `#cc44ff`
- Foreground floor: `#0a0014`
- Scan line: `#8800ff`
- Player cube body: `#ff22cc`
- Player cube stripe: `#ffffff`
- Player cube glow: `#ff88ff`
- Spike: `#ff2266`
- Block: `#6622cc`
- Block highlight: `#9944ff`
- Gap void: `#000000`
- Portal frame: `#22ffcc`
- Portal interior: `#004444`
- Pillar: `#3322aa`
- Ramp: `#aa2288`
- Gravity indicator: `#44ffcc`
- Progress bar fill: `#cc44ff`
- Progress bar bg: `#220044`

### Entity Redesigns

**Player cube** — The rotating cube gains significantly more character:
- Main body: bright magenta square with a 2px dark border.
- Inner decoration: a white diagonal stripe (existing) plus a small neon dot at the cube center (`#ffaaff`, 4px).
- Outer glow: `setGlow('#ff88ff', 0.6)` — the cube pulses in brightness with a gentle sine wave applied to glow intensity (`0.4 + 0.2 * Math.sin(frame * 0.15)`).
- On landing: a 3-frame squash — scale Y 0.75 for 2 frames, then snap back.
- On jump: a 2-frame stretch — scale Y 1.25, then normalize.
- A particle trail of 8 small magenta sparks (3px) follows behind the cube, decreasing in alpha from 60% to 5%.

**Spikes** — Redesigned as razor-sharp crystalline shards: the triangle is filled with a bright red-pink gradient (brighter at the tip, darker at the base). A thin bright white edge highlight runs along the two side edges (1px `strokePoly`). A subtle glow: `setGlow('#ff2266', 0.5)`. Double spikes use the same design staggered by 2 frames of phase for a shimmering effect.

**Blocks** — Solid obstacles redesigned as glowing neon crates: a deep purple fill with a bright 2px border in electric violet (`#9944ff`). An inner highlight rect in slightly lighter purple sits inset 4px from the border, giving a beveled-panel appearance. Glow: `setGlow('#6622cc', 0.4)`.

**Gaps** — The floor hole becomes a void portal: the gap interior is filled with a very dark color (`#000006`) and two subtle blue scan lines scroll through it, suggesting infinite depth. The gap edges have a bright floor-line terminus (2px magenta line at the cut edge).

**Portals** — Two tall rounded rectangles framing an interior: the frame is bright cyan-teal (`#22ffcc`) with a 3px border. The interior is filled with a gradient from dark teal to void black. An animated particle stream of tiny cyan dots flows upward within the portal interior. On passing through: a 10-frame flash of the portal color replaces the cube momentarily, then the gravity indicator updates.

**Pillars** — Vertical obstacles redesigned as thick support columns: a deep indigo fill with a bright vertical highlight stripe on the left face. Horizontal band lines every 16px suggest structural segments. The column base and cap are slightly wider rects (suggesting a plinth and capital).

**Ramps** — The right-triangle ramp gets a surface texture: the hypotenuse edge has a bright 2px highlight. A series of 4–5 thin lines parallel to the hypotenuse are drawn inset from it at 8px intervals, suggesting a grooved surface.

**Ground** — The ground strip is now 16px tall with a bright neon top-edge glow line (`#cc44ff`, 2px). The floor surface has a subtle repeating grid pattern (thin lines every 32px in both directions at 15% alpha).

### Particle & Effect System
- **Cube trail**: 8 magenta sparks following the cube, opacity descending, spaced 6px apart.
- **Death explosion**: 12 cube-colored debris squares (4–8px, random rotations) scatter from death position; 8 bright spark lines radiate outward; 3-frame screen flash at `rgba(255,30,200,0.3)`.
- **Portal crossing**: 16 cyan particles burst from the portal frame, radiating outward; cube briefly scales to 1.3x for 3 frames.
- **Jump dust**: 3 small grey circles (6–10px) appear at the jump-off point, expanding and fading over 15 frames.
- **Obstacle glow pulse**: Spikes and blocks pulse their glow intensity using `Math.sin(frameCount * 0.1 + phase)` for a breathing neon effect, staggered per obstacle instance.
- **City window blink**: 12 window rects in the silhouette buildings randomly toggle on/off (once per ~180 frames each, slightly different timing per window).
- **Progress milestone**: At 25%, 50%, 75% completion, a brief golden ring expands from the progress bar center, and the background shifts hue.

### UI Polish
- Progress bar at the top of the screen (relocated from bottom) using the full canvas width. The filled portion glows in the theme color with a 3px pulsing front edge.
- Percentage text on the progress bar transitions from white to gold as the player nears 100%.
- "New Best!" text appears in golden glow when the player surpasses their record distance.
- Attempt counter in the top-right corner, styled as a small dim amber label.
- On death, the screen briefly shows a pixelated "X" graphic at the death position before the death explosion clears.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Jump | Short boing | 300→700 Hz sine sweep, fast attack | 100 ms | Springy launch |
| Land | Soft thud | 200 Hz sine, 50 ms decay | 60 ms | Ground contact |
| Death | Crunch + noise | 100 Hz sine punch + white noise burst | 250 ms | Impact and end |
| Portal crossing | Whoosh + chime | White noise 1000→4000 Hz + 660 Hz sine ping | 300 ms | Dimensional shift |
| Gravity flip | Reverse whoosh | White noise sweep 4000→500 Hz | 200 ms | Inverse sensation |
| 25% milestone | Short chime | 880 Hz sine, fast attack, 150 ms decay | 200 ms | Progress marker |
| 50% milestone | Two-tone chime | 880–1047 Hz sine, 100 ms each | 250 ms | Halfway mark |
| 75% milestone | Three-tone chime | 880–1047–1319 Hz sine, 80 ms each | 300 ms | Almost there |
| 100% complete | Triumphant fanfare | C5–E5–G5–C6 sawtooth arpeggio | 600 ms | Victory |
| New best | Ascending sparkle | 6 rapidly ascending sine tones | 400 ms | New record |
| Obstacle glow pulse | Subtle hum | 80 Hz triangle, gain 0.01, looped | Looped | Background tension |

### Music/Ambience
Driving electronic music that matches the auto-runner pace: a 150 BPM four-on-the-floor pattern. Kick: 60 Hz sine, 80 ms decay, gain 0.6. Hi-hat: white noise HPF 7 kHz, 30 ms, gain 0.15, every 8th note. Bass: sawtooth oscillator, LPF 300 Hz, 0.2 gain, playing a driving minor-key bass riff. Lead melody: square wave with mild overdrive (waveshaper), playing an 8-bar energetic phrase in a minor pentatonic. The music tempo subtly tightens by 3% each time the player beats their best distance. At portal crossings, a brief filter sweep (LPF cutoff sweeps from 4000 Hz down to 400 Hz and back in 500 ms) warps the music. Overall gain: 0.12.

## Implementation Priority
- High: Death explosion particles, cube trail sparks, portal crossing flash + particles, cube squash/stretch on jump/land, spike and block glow redesign, all sound events
- Medium: Background city silhouette layer with window blinks, multi-layer parallax, portal animated particle stream, progress milestone chimes, ground neon edge glow
- Low: Background hue progression over level, sky color shift with distance, obstacle glow phase offset pulsing, ambient music with filter sweep, scan line animation
