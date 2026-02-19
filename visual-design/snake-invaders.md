# Snake Invaders — Visual & Sound Design

## Current Aesthetic

Purple theme (`#a0f`). Snake body alternates `#80d000` / `#60b000` with a bright `#d0ff80` head. Aliens are purple with white eyes. Alien bullets in red (`#f44`), player bullets in cyan (`#0ff`), food dots in yellow (`#ff0`). Grid-based movement on a 20×20 cell dark canvas. No background texture, no marching animation on aliens, no grid lines, no particle effects.

## Aesthetic Assessment
**Score: 2/5**

The color language is clear and purposeful — green snake vs purple alien is a strong contrast. But both entities are flat. The aliens have no character: no march animation, no formation hierarchy (front-row vs back-row look identical). The snake segments have alternating color but no gradient or directional sense — it's hard to read the snake's head from its body at a glance. The grid-based movement is not visually telegraphed. No environmental context communicates that this is a snake surviving an alien invasion.

## Visual Redesign Plan

### Background & Environment

A dark tactical battlefield grid: the 20×20 cell structure is drawn with very faint lines (`#0d1008` at 0.6 alpha, 0.5px) on a `#060c06` base fill. Every 5 cells, a slightly brighter grid line (`#111a0a` at 0.7 alpha) marks the major grid intervals — subtle graph-paper structure.

Three depth layers of environmental detail:
1. **Ground plane:** The lower portion of the canvas (below the snake's starting area, roughly y > 280px) has a very faint horizontal gradient: `#060c06` transitioning to `#08100a` — a slightly warmer tone suggesting solid ground.
2. **Sky zone:** Upper quarter (y < 100px) transitions to `#060810` with faint purple cast (`#080612`) — the alien domain.
3. **Starfield:** 20 static faint pixels (0.15–0.3 alpha) in the upper two-thirds of the canvas. These do not move but reinforce the "alien space invader" context.

A faint vignette darkens all four corners by 25%, focusing attention on the central grid.

### Color Palette

| Role | Hex | Usage |
|---|---|---|
| Background | `#060c06` | Base canvas fill |
| Grid minor | `#0d1a0d` | Cell lines every 1 cell |
| Grid major | `#121f10` | Cell lines every 5 cells |
| Sky upper | `#060810` | Top gradient band |
| Snake head | `#ccff44` | Head segment (brightest) |
| Snake head glow | `#aaee00` | Head shadowColor |
| Snake body even | `#88cc00` | Even-index segments |
| Snake body odd | `#60aa00` | Odd-index segments |
| Snake body glow | `#446600` | Body shadowColor |
| Snake tongue | `#ff2244` | Tongue tip |
| Bullet (player) | `#00ffee` | Cyan player bullet |
| Bullet glow | `#00ccbb` | Player bullet shadowColor |
| Bullet (alien) | `#ff3344` | Red alien bullet |
| Alien body (row 1) | `#dd00ff` | Front row (most dangerous) |
| Alien body (row 2) | `#aa00cc` | Middle row |
| Alien body (row 3) | `#7700aa` | Back row |
| Alien eye | `#ffffff` | Eye sclera |
| Alien pupil | `#000000` | Eye pupil |
| Alien glow | `#8800cc` | Alien shadowColor |
| Food dot | `#ffee00` | Food drop glow center |
| Food dot ring | `#ffaa00` | Food drop outer ring |
| Shield segment | `#ccff44` | Body segments acting as shield (same as normal body, but highlighted differently on hit) |
| Hit flash | `#ffffff` | Brief white flash on hit |
| Danger zone | `#ff2200` | Color for aliens near snake row |
| HUD text | `#aabbaa` | Score, wave |
| Wave title | `#cc00ff` | Wave announcement |

### Entity Redesigns

**Snake Head:**
Drawn as a 20×20px rounded-rectangle cell (4px corner radius) in `#ccff44` with `shadowBlur = 18, shadowColor = #aaee00`. On the leading edge (direction of movement), a forked tongue extends: two 4px red lines (`#ff2244`) projecting 6px outward from the head's front face, forking at 30° angle. The tongue flickers in and out on a 12-frame cycle (visible 6 frames, hidden 6 frames). A small 4×4px dark dot on the head's front-center acts as the "eye" — a minimal reptilian feature.

The head's facing direction rotates the tongue and eye: the tongue always projects from the leading face, and the eye dot sits slightly offset toward the leading corner.

**Snake Body Segments:**
Each body segment is a 20×20px rounded-rect (3px radius) with alternating colors `#88cc00` and `#60aa00`. The segment connecting corners between adjacent cells uses a 4px "neck" connector: a filled rect bridging the gap between two adjacent cell centers, painted in the darker of the two segment colors. This eliminates the visual gap between segments in straight runs, giving the snake a continuous worm-like silhouette.

Body segments have `shadowBlur = 8, shadowColor = #446600`. The segment immediately behind the head is slightly brighter (lerp toward head color by 30%) for a natural brightness gradient from head to tail.

**When a body segment is destroyed by an alien bullet:** The segment flashes `#ffffff` for 2 frames, then plays a dissolve: it shrinks from 20px to 0px over 6 frames while rotating 90°. The remaining tail detaches cleanly — the snake is now shorter at that index.

**Alien Formation:**
Three rows of 5 aliens each. Visual differentiation by row:
- **Row 1 (front/bottom):** `#dd00ff` — brightest, most prominent, 24×18px, `shadowBlur = 16`
- **Row 2 (middle):** `#aa00cc` — mid-brightness, same size, `shadowBlur = 12`
- **Row 3 (back/top):** `#7700aa` — darkest, `shadowBlur = 8`

Each alien body is drawn as an irregular pixel-art silhouette: a central ovoid body (22×14px) with two antennae stubs projecting upward (2×4px rects at ±7px from center). Two white eye circles (4×4px) with 2×2 dark pupils. Two small "leg" stubs projecting downward at 30° from the body sides.

Alien march animation: on each alien move-interval tick, all aliens shift their antenna and leg positions. Antenna swap between +2px up and −1px up. Legs alternate left/right kick. This creates the classic Space Invaders shuffle. The entire formation also has a very subtle Y-axis sine oscillation (+1 / −1px over a 60-frame cycle), making it feel alive between marching steps.

**Player Bullet:**
A 2×12px elongated capsule in `#00ffee` with `shadowBlur = 10, shadowColor = #00ccbb`. A 4px bright tip at the leading edge. 3-frame motion trail: 2 ghost copies at 0.5 and 0.2 alpha, each offset 4px behind.

**Alien Bullet:**
A 2×10px red capsule (`#ff3344`), `shadowBlur = 8, shadowColor = #ff1122`. It has a jagged visual — slightly wavy path (±1px horizontal oscillation at 6px wavelength) to look menacing and organic compared to the player's clean straight shot.

**Food Dot:**
A pulsing orb: outer ring (`#ffaa00` at 0.4 alpha, radius 9px), inner glow (`#ffee00` at 0.7, radius 6px), solid center (radius 4px `#ffffff`). Pulses in scale 1.0 → 1.15 → 1.0 over a 24-frame cycle. Lifetime countdown shown as the ring alpha fading from 0.4 to 0.0 over 180 frames — the player can read remaining time from the ring brightness.

**Shield Visualization:**
When snake body is more than 5 segments long, a very faint blue-green overlay (`#aaffcc` at 0.08 alpha) tints each body segment that is in the "defensive zone" (segments 1–N-1 that can absorb alien bullets). This is a subtle "shield active" visualization. On each absorbed hit: that segment's overlay briefly flares to `#aaffcc` at 0.6 alpha for 4 frames.

### Particle & Effect System

- **Alien destroyed by player bullet:** 10 particles explode from alien center. Color = alien's row color (front: `#dd00ff`, mid: `#aa00cc`, back: `#7700aa`). Velocity 2–6 px/frame, random directions. Lifetime 28 frames. 2 of the 10 particles are white (`#ffffff`) "eye fragments" that rotate as they travel.
- **Snake head shoots:** A tiny cyan muzzle flash at the head tip on each shot. 3 particles, velocity 2–4 px/frame forward. Lifetime 8 frames. Color `#00ffee`.
- **Body segment absorbed (alien bullet hits body):** The segment flash + shrink described above. Also: 6 green fragments scatter (color = segment color `#88cc00`), velocity 1.5–3.5 px/frame, lifetime 20 frames.
- **Food dot eaten:** 8 radial particles. Color `#ffee00`. Velocity 2–4 px/frame. Lifetime 18 frames. Accompanied by a brief golden ring expand: a circle starting at radius 4px expanding to 14px over 10 frames, alpha 0.6 → 0.
- **Snake head hit (death):** 20 fragments from head position. Mix of `#ccff44` and `#ffffff`. Velocity 3–8 px/frame. Lifetime 50 frames. Screen flash: `#ffffff` at 0.3 alpha for 6 frames.
- **Alien formation reaches snake row:** Screen edge flashes red (`#ff2200` at 0.2 alpha for 8 frames) as a danger cue.
- **Wave clear (all aliens destroyed):** 30 multi-color particles across the entire formation area sweep downward. Colors cycle through all alien palette colors. Lifetime 45 frames.
- **New wave spawn:** Aliens fade in over 20 frames from 0 to full alpha rather than snapping into place.

### UI Polish

- Score top-left in `#aabbaa`. Wave number top-right in `#cc00ff`.
- On alien destroyed: score increments with a brief scale-up (1.0 → 1.2 → 1.0 over 8 frames).
- Wave announcement: "WAVE X" slides in from top, holds 90 frames, fades. Uses large outlined font in alien-row-1 color.
- Lives displayed as small snake-head icons (12px wide) in top-center. Lost lives dim to 0.15 alpha.
- Formation progress: a faint horizontal bar below the formation shows how many aliens remain in the current wave (100% full → empty as aliens are destroyed). Color = wave's primary alien color.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis

| Event | Oscillator | Frequency | Envelope (A/D/S/R) | Filter / Effect | Character |
|---|---|---|---|---|---|
| Player shoots | square | 880 Hz → 1760 Hz sweep | 0ms / 40ms / 0 / 10ms | BiquadFilter highpass 400 Hz | Sharp upward zing; classic laser blaster |
| Player bullet hits alien | sawtooth | 440 Hz → 220 Hz slide | 0ms / 80ms / 0 / 30ms | BiquadFilter lowpass 800 Hz, Q=3 | Satisfying crunch + descend |
| Alien bullet fired | triangle | 220 Hz short blip | 0ms / 50ms / 0 / 15ms | BiquadFilter lowpass 600 Hz | Soft descending blip; less prominent than player shot |
| Alien bullet hits body | noise + square | noise burst + 180 Hz | 0ms / 100ms / 0 / 40ms | BiquadFilter lowpass 500 Hz | Meaty thud; body absorbing hit |
| Snake head hit (death) | sawtooth | 440 Hz → 55 Hz | 0ms / 500ms / 0 / 200ms | BiquadFilter lowpass 700 Hz, Q=4 resonance | Long descending wail; death |
| Food eaten | sine | 660 Hz → 880 Hz | 0ms / 60ms / 0.15 / 100ms | none | Sweet ascending tone; reward |
| Snake move tick | none / silent | — | — | — | No sound per step (would be too frequent) |
| Alien march step | triangle | 80 Hz or 60 Hz alternating per step | 0ms / 80ms / 0 / 20ms | BiquadFilter lowpass 200 Hz | Classic Space Invaders bass march; alternates two pitches |
| Alien formation descends | sine | 55 Hz brief | 0ms / 150ms / 0 / 60ms | BiquadFilter lowpass 180 Hz | Deep sub thud on each row-step descent |
| Wave clear | square + sine | 523 → 659 → 784 → 1047 Hz arpeggio | 5ms / 100ms each / 0.2 / 80ms | BiquadFilter bandpass 800 Hz | Bright rising 4-note fanfare |
| New wave start | sawtooth | 220 → 330 → 440 Hz | 10ms / 120ms each / 0 / 60ms | BiquadFilter highpass 200 Hz | Tense ascending 3-note sting |
| Game over | sine | 330 → 220 → 165 → 110 Hz | 15ms / 200ms each / 0 / 100ms | BiquadFilter lowpass 800 Hz, reverb delay 0.2s | Slow descending 4-note gloom |
| Self-collision death | noise burst | white noise | 0ms / 200ms / 0 / 100ms | BiquadFilter lowpass 800 Hz | Harsh organic crunch; different from alien-kill |

### Music / Ambience Generative Approach

The iconic Space Invaders march is the template — two-note bass alternation — but made dynamic and generative:

- **March oscillator:** triangle at 80 Hz and 60 Hz alternating. The interval between beats equals the current alien `move_interval` in frames converted to milliseconds. At wave 1 (16 frames at 60fps = 266ms), beat interval = 266ms. At wave 4+ (4 frames = 67ms), the march becomes frantic.
- **Harmonic layer:** A second triangle at 160 Hz (octave above the 80 Hz) at 40% amplitude, firing on every other march beat for a syncopated feel.
- **Tension drone:** A sine at 55 Hz, gain 0.03, continuous. Represents the unrelenting alien threat.
- **High shimmer:** A sine at 1320 Hz (E6), gain 0.008, triggered every 2.0 seconds. Very short (30ms, immediate release). Creates a subtle alarm shimmer above the march.

All elements pass through a BiquadFilter lowpass at 2500 Hz. As the wave progresses and aliens are destroyed, the march continues at the same alien-movement interval. When fewer than 5 aliens remain, an additional peaking filter at 400 Hz (Q=6, gain +8 dB) kicks in, making the march tonally sharper and more tense.

Between waves (wave-clear → new wave spawn): the march stops and only the tension drone plays for the 90-frame announcement window. On new wave, march restarts at the new (faster) interval.

## Implementation Priority

- **High:** Alien row-color differentiation (3 tiers), alien march animation (antenna + leg toggle), snake tongue rendering, player bullet trail, food dot pulsing ring, alien-destroyed particles, player-shoots sound, march bass alternation, alien-bullet-hits-body sound
- **Medium:** Snake segment neck-connector fill, snake head eye dot, body-segment absorbed dissolve animation, shield overlay tint on body, food-lifetime ring alpha fade, alien formation descent sub-thud, wave-clear fanfare, new-wave fade-in spawn, danger flash at snake row
- **Low:** Background grid major/minor lines, starfield, sky gradient, row-1/2/3 glow intensity differentiation, wave-announcement text slide, alien bullet wavy path, formation-progress bar, tension-drone high shimmer, peaking filter on last-5-aliens march
