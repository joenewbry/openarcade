# Rally-X — Visual & Sound Design

## Current Aesthetic

A 480×480 top-down maze racer with a 50×50 tile maze (TILE=24px). The player car is cyan-green (`#4fd`). Enemy cars are red (`#f44`). Yellow flags (`#ff0`) are the collectibles. Smoke screens are grey. A BFS pathfinding AI drives enemy cars. A fuel gauge, smoke counter, and score display appear in the UI. A radar minimap shows the full map. The camera follows the player. The game reads clearly but feels like placeholder art — flat colored blocks on a dark grey maze.

## Aesthetic Assessment
**Score: 2/5**

The top-down maze concept is clear, but the visual execution is minimal. Cars are tiny colored rectangles with no vehicle character. The maze walls are plain blocks. There's no sense of speed, asphalt texture, or the late-70s arcade color palette energy. The radar is functional but visually plain. Smoke is just a grey circle.

## Visual Redesign Plan

### Background & Environment

Transform the maze from a grey block grid into a vivid arcade racing track. The open road (path tiles) uses dark asphalt (`#111118`) with a subtle texture: a very fine noise pattern (alternating 1px cells at `#131318` and `#0f0f14` in a pseudo-random grid, based on tile coordinates) giving the road a rough tarmac quality. Center dashes on straight sections: every 3 tiles of straight road, draw a short white dashed line (12px × 2px) centered in the tile at 30% alpha, suggesting road markings.

**Walls:** Maze walls get a concrete/barrier upgrade. Wall tiles: a medium grey base (`#333340`) with a 1px brighter top-left edge (`#44445a`) and darker bottom-right edge (`#222230`), creating a beveled 3D block look. Every 4th wall tile (pattern-based on tile coordinates): a thin horizontal stripe in a slightly different grey (`#2a2a38`) suggesting poured concrete layers.

**Background beyond maze:** The sky/void outside the visible maze area: a very dark blue-navy (`#050510`) with a faint vignette — slightly darker at the extremes of the visible area, lighter near the car. This frames the road without being distracting.

**Finish/start indicator:** At the player's starting position, draw two small chequered flag icons (alternating 4×4 white/black grid in a 16×8px patch) at the tile edges. A subtle glow around the starting tile.

### Color Palette
- Player car: `#00ffcc` (vivid cyan)
- Player glow: `#44ffdd`
- Enemy car: `#ff3322`
- Enemy glow: `#ff6655`
- Flag: `#ffee00` with `#ffcc00` shading
- Smoke: `#aaaaaa` fading to transparent
- Road: `#111118`
- Wall: `#333340`
- Radar background: `#0a0a16`
- Radar player: `#00ffcc`
- Radar enemy: `#ff3322`
- Radar flag: `#ffee00`

### Entity Redesigns

**Player car:** Replace the colored rectangle with a proper top-down car silhouette. Draw a rounded rectangle body (14×10px) in the car's main color. Add:
- Two headlights (tiny white ellipses at the front, 3×2px, with a faint forward glow `shadowBlur=6` in white at 40% alpha).
- Two tail-lights (tiny red ellipses at the rear, 2×1px, `#ff2200`).
- Four wheel arches: slightly darker quarter-circle fills at each corner (radius 3px, darker version of car color).
- A windshield: small rounded rect across the top third of the car, filled with `#111133` at 70% alpha (tinted glass).
- A thin bright stripe down the car's center from front to back (1px, white at 30% alpha) — a speed stripe.
- The car renders rotated to match heading direction. Smooth rotation interpolation (no snapping) makes movement feel fluid.

**Enemy cars:** Similar treatment but in red (`#ff3322`). Slightly different body proportions (slightly narrower, more aggressive shape). No headlights — instead, two menacing red front grill bars (2px horizontal lines, dark red, across front face). A faint red tail glow when accelerating toward the player.

**Flags:** Upgrade from plain yellow triangles/circles to a proper checkered flag pole. A thin 2px grey pole rising 12px. At the top, a small (8×6px) flag in the flag color with a slightly darker stripe or shadow on the lower half. The flag waves: its right edge oscillates ±2px vertically in a sine wave (period 40 frames). A soft gold glow (`shadowBlur = 8`, `#ffee00` at 50% alpha) radiates from each flag.

**Smoke screen:** Replace the plain grey circle with a convincing puff cloud. Draw 5–7 overlapping ellipses in very slightly different sizes (radius 8–16px), all in `#999999` at varying alpha (0.15–0.35), with slight random offset per ellipse. The smoke puff slowly expands (radius × 1.02 per frame) and fades (alpha × 0.97 per frame) as it dissipates. On initial deploy, a brief white flash at the deploy point.

**Radar minimap:** The radar gets a styled frame: a rounded-rect border in `#2a2a44` with a subtle inset shadow, and a header label "RADAR" in small `#6677aa` text. The radar background is dark navy (`#0a0a16`). Car blips render as small directional arrows (3px triangle) rather than dots — showing heading as well as position. Flags render as tiny star shapes. Enemy blips pulse (scale 1.0 → 1.3 → 1.0 over 20 frames, in red) when they are within 5 tiles of the player.

### Particle & Effect System

- **Player car acceleration:** From the rear of the car, emit 3 small particles per frame when accelerating — dark grey smoke (size 2px, alpha 0.4→0 over 12 frames, slight upward drift) to simulate exhaust.
- **Tire screech (turn):** On sharp direction change, 4 dark tyre-mark dots appear at the car's previous position (`#333322`, size 3px, alpha 0.6, persistent for 120 frames then fading).
- **Flag collected:** 8 yellow-gold particles burst from the flag position in a radial burst, lifetime 15 frames, size 3→1px. A brief "+score" float text in gold, rising and fading over 25 frames.
- **Enemy car nearby (danger):** When an enemy is within 3 tiles, emit a brief red shimmer around the player car (red particles orbiting at radius 14px, 4 particles, lifetime 10 frames, repeating).
- **Smoke activated:** On deploying smoke, 10 initial particles burst from the rear of the car — large grey puffs (size 8px, alpha 0.5→0 over 20 frames).
- **Car collision (player hit by enemy):** Screen briefly flashes red (`rgba(255,0,0,0.12)`) for 10 frames. Player car emits a crash spark burst: 12 orange/white sparks radiate, lifetime 12 frames.

### UI Polish

- **Fuel gauge:** Replace the plain rectangle with a styled curved gauge. Draw a partial arc (270° sweep) filled from left to right as fuel remains. Color gradient: full = green (`#00ff88`) → half = yellow (`#ffee00`) → empty = red (`#ff2244`). A needle indicator line at the current level. When fuel is below 20%, the gauge pulses red (brightness cycles 0.7 → 1.0 over 15 frames).
- **Smoke counter:** Small smoke-cloud icons (simple grey ellipse icon) stacked horizontally, one for each remaining smoke charge. Used smokes are darker/greyed out.
- **Score:** Large digits at top-center. On flag collection, the score animates: digits roll upward (old digits scroll up/out, new digits scroll up/in over 8 frames).
- **Speed indicator:** A thin horizontal bar at the bottom of the visible road area (2px tall), filling left-to-right based on current speed (calculated from velocity magnitude). Green at normal, red at full throttle.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Car engine (idle) | OscNode (sawtooth) + filter | 80 Hz through BPF at 200 Hz, 0.05 vol | continuous | Low rumble |
| Car engine (accelerating) | OscNode (sawtooth) pitch rise | 80 → 180 Hz based on speed | continuous | Engine pitch scales with speed |
| Turn/screech | OscNode (triangle) + noise | 300 Hz + white noise 0.3 vol | 80 ms | Tyre screech |
| Flag collected | OscNode (sine) ascending | 660 → 1320 Hz sweep | 120 ms | Bright collect chirp |
| All flags (round clear) | Ascending arpeggio | 523, 659, 784, 1047 Hz | 400 ms | Victory |
| Smoke deployed | Noise burst | White noise through BPF at 400 Hz | 150 ms | Hiss of smoke |
| Enemy nearby alarm | OscNode (triangle) pulse | 440 Hz on/off at 4 Hz | 200 ms | Warning beeps |
| Car collision | OscNode (square) + noise | 220 Hz + noise 0.7 vol | 250 ms | Crash crunch |
| Fuel low warning | OscNode (sine) beep | 880 Hz, short, 0.07 vol | 50 ms | Repeated every 2s |
| Game over | Descending slide | 440 → 55 Hz, sawtooth | 500 ms | Defeat |

### Music/Ambience

A driving, frenetic arcade energy soundtrack. Synthesize a 4/4 pattern at 160 BPM with a retro electro feel: a short `110 Hz` sawtooth "bass synth" hit (100ms, through lowpass at 300 Hz, 0.07 vol) on every beat, and a filtered noise snare (600 Hz bandpass, 60ms, 0.05 vol) on beats 2 and 4. Layer a simple 4-note bassline loop: `110, 110, 146, 130 Hz` (whole beats, half-beats, etc.) alternating each measure, creating a minimal head-bobbing loop. The engine sound plays continuously over this as a diegetic layer. When all flags are collected on a round, briefly shift the tempo up by 15 BPM for the victory fanfare duration, then it resets for the next round.

## Implementation Priority
- High: Car silhouette with headlights/tail-lights/windshield, asphalt road texture, flag wave animation + gold glow
- Medium: Smoke cloud multi-ellipse puff with expansion, tyre-mark trail on sharp turns, fuel arc gauge with color gradient
- Low: Enemy car red grill bars + approach shimmer, radar directional arrows + enemy pulse, speed indicator bar, engine pitch-scaling audio
