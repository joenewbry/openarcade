# Flapomino — Visual & Sound Design

## Current Aesthetic

Gold/yellow theme (`#fe0`) on a dark background. The bird is a gold rectangle with orange beak and white-pupiled eye. Tetromino obstacle columns use varied bright hues (`#f80`, `#0ff`, `#ff0`, `#a0f`, `#0f0`, `#f44`, `#4af`) with moderate glow. The stacked dead-zone at the bottom uses the same colors at 0.3 glow. No sky texture, no parallax, no bird animation, no particle effects.

## Aesthetic Assessment
**Score: 2/5**

The color contrasts between obstacles work well but the execution lacks depth. The bird reads as a plain rectangle. The background is a featureless dark fill. The stack at the bottom — a critical mechanic that threatens the player — has no visual urgency. The obstacle columns do not feel like "tetromino pieces falling from a digital sky." The game's hybrid identity (Flappy Bird + Tetris) is not communicated visually.

## Visual Redesign Plan

### Background & Environment

A layered parallax sky with three depth bands:

1. **Distant layer** (slowest, 0.3× scroll speed): 8–10 faint pixel-art cloud shapes drawn with `#1a2240` at 0.5 alpha. These move left at 0.25 px/frame, wrapping. Each cloud is a cluster of overlapping rounded rects.
2. **Mid layer** (0.6× speed): 4–5 larger clouds at `#1e2a50` at 0.35 alpha, drifting at 0.5 px/frame.
3. **Foreground color gradient**: canvas fills with a top-to-bottom linear gradient: `#0a0e1e` at top → `#0d1430` at middle → `#111828` at bottom.

The stack zone at the bottom uses a distinct floor aesthetic: a `#0a0810` dark band with a sharp 2px warning line at its top edge that glows brighter red as the stack grows. Faint vertical "striation" lines (1px, `#141020`, 0.3 alpha) inside the stack zone reinforce the compressed space.

Above the bird's fixed horizontal position, render a faint vertical guide beam: a 1px wide vertical line in `#ffffff` at 0.05 alpha, running from bird to top of canvas. This subliminally marks the bird's constant x=60 lane.

### Color Palette

| Role | Hex | Usage |
|---|---|---|
| Sky top | `#0a0e1e` | Background gradient top |
| Sky bottom | `#111828` | Background gradient bottom |
| Cloud far | `#1a2240` | Distant parallax clouds |
| Cloud mid | `#1e2a50` | Mid-distance clouds |
| Bird body | `#ffe033` | Main yellow body |
| Bird wing | `#ffb800` | Wing accent (slightly darker) |
| Bird beak | `#ff6600` | Orange beak |
| Bird eye white | `#ffffff` | Eye sclera |
| Bird pupil | `#111111` | Eye pupil |
| Bird glow | `#ffe066` | Outer glow bloom |
| I-obstacle | `#00e8ff` | Cyan tetromino column |
| O-obstacle | `#ffe000` | Yellow tetromino column |
| T-obstacle | `#cc00ff` | Purple tetromino column |
| L-obstacle | `#ff8800` | Orange tetromino column |
| S-obstacle | `#00e060` | Green tetromino column |
| Z-obstacle | `#ff2244` | Red tetromino column |
| J-obstacle | `#44aaff` | Blue tetromino column |
| Stack (dead zone) | same as obstacle, 40% dim | Landed obstacle remnants |
| Stack warning line | `#ff3300` | Top edge of stack |
| Gap highlight | `#ffffff` | 0.04 alpha fill inside passage gap |
| Score HUD | `#ffe066` | Points display |
| Stack height HUD | `#ff4444` | Stack row count |

### Entity Redesigns

**Bird:**
Replace the plain rectangle with a proper pixel-art-inspired silhouette. The body is a rounded 22×16px rect with `#ffe033`. A wing is rendered as a 10×6px dark-orange oval on the left side, animating up and down (±3px) on a 12-frame cycle — fast flap when ascending, slow glide when descending. The eye is a 5×5px white circle with a 3×3 dark pupil. On flap: the wing snaps up (2-frame instant jump) and the body tilts nose-up by −15°. When falling: body tilts nose-down progressively up to +25° (matching the classic Flappy Bird kinematic tilt). A warm `shadowBlur = 16, shadowColor = #ffe066` glow halos the bird at all times.

**Obstacle Columns:**
Each obstacle is three cells wide (each cell = 20px). Draw each cell as a rounded-corner rect (3px radius) with its assigned tetromino color. Cell face has a subtle inner highlight: a 2px lighter stripe along the top and left edges. Between adjacent cells, draw a 1px dark separator (`#060810`). The entire obstacle column has `shadowBlur = 18, shadowColor = column_color`. Top and bottom obstacle sections have a chamfered inner edge — the cell facing the gap has an extra 2px bright border on its gap-facing side, drawing the eye toward the passage.

The gap itself is filled with a faint `#ffffff` at 0.04 alpha, subtly illuminating the safe passage zone without obscuring it.

**Stack (Bottom Zone):**
Landed obstacle cells use 40% brightness of their original color with `shadowBlur = 5`. A bright 2px horizontal line in `#ff3300` marks the stack top, pulsing between 0.6 and 1.0 alpha on a 30-frame cycle. As the stack grows above 50% of canvas height, the warning line intensifies: `shadowBlur` rises from 6 to 20.

**Score Display:**
Score in top-right in a large outlined font. Stack row count shown bottom-right in red. On row clear: the row flashes white before vanishing (4 frames), then remaining rows drop with an 8-frame ease.

### Particle & Effect System

- **Bird flap:** 4 tiny air-puff particles emit leftward from the bird's tail on each flap. Color `#aaccff` at 0.5 alpha, velocity 1.5–2.5 px/frame, lifetime 18 frames. They drift down-left, simulating displaced air.
- **Obstacle pass (gap cleared):** 2 green sparkle particles in the gap zone, velocity upward at 1–2 px/frame, lifetime 16 frames. Color `#00ff88` at 0.7. Subtle reward cue.
- **Bird death (obstacle collision):** 16 particles from bird position. Mix of yellow (`#ffe033`) and orange (`#ff6600`). Velocity 2–7 px/frame in all directions. Lifetime 45 frames. Bird sprite disappears and a brief screen shake (±3px, 8 frames) punctuates the death.
- **Row clear (stack):** 20 particles across the cleared row width, sweeping outward. Color = the dominant obstacle color in that row. Lifetime 28 frames. Velocity 2–5 px/frame horizontally, ±1 vertically.
- **Stack growing (landing event):** When an obstacle section lands on the stack, 6 small dust particles puff upward from the landing cells. Color `#888888` at 0.5. Lifetime 22 frames. Reinforces the stack's physical weight.
- **Near-miss (bird passes within 8px of obstacle edge):** A brief spark (1 white pixel, 0.8 alpha) flashes at the closest obstacle corner for 3 frames. Tension reward for threading narrow gaps.

### UI Polish

- "SCORE" label and value centered top. On obstacle clear: score digit scales 1.0 → 1.3 → 1.0 over 10 frames.
- Stack height: a thin red vertical bar on the right canvas edge fills upward as the stack grows (0% to 100% of canvas height). As it approaches 80%, the bar pulses.
- Between obstacles, a faint dotted vertical line at x=120 (passage approach marker) gives the player a visual anchor for timing flaps.
- On row clear: "ROW CLEAR +50" text briefly appears in center-bottom at 0.9 alpha and floats upward 20px over 40 frames.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis

| Event | Oscillator | Frequency | Envelope (A/D/S/R) | Filter / Effect | Character |
|---|---|---|---|---|---|
| Flap | triangle | 380 Hz → 280 Hz sweep down | 0ms / 70ms / 0 / 20ms | BiquadFilter highpass 150 Hz | Soft "fwop" wing beat; familiar Flappy Bird analog |
| Gap cleared (obstacle pass) | sine | 660 Hz, flat | 0ms / 40ms / 0.1 / 80ms | none | Clean high ping; rewards threading the gap |
| Obstacle collision (death) | sawtooth | 220 Hz → 80 Hz slide | 0ms / 400ms / 0 / 150ms | BiquadFilter lowpass 500 Hz, Q=3 | Descending crunch; game-over punch |
| Ceiling bounce | triangle | 440 Hz | 0ms / 30ms / 0 / 10ms | none | Quick soft tick |
| Stack row clear | square + sine | 523 Hz + 784 Hz chord | 5ms / 120ms / 0.3 / 150ms | BiquadFilter bandpass 650 Hz Q=1.5 | Bright double-tone ding; satisfying Tetris echo |
| Stack danger (>50% full) | sine | 55 Hz pulse every 25 frames | 5ms / 200ms / 0.4 / 80ms | BiquadFilter lowpass 120 Hz | Deep sub-bass heartbeat; grows faster as stack rises |
| Obstacle land (stack hit) | noise burst | white noise | 0ms / 80ms / 0 / 30ms | BiquadFilter lowpass 600 Hz | Muffled thud; weight of landing blocks |
| Game start | sawtooth | 330 → 440 → 523 Hz | 5ms / 90ms / 0 / 40ms each | BiquadFilter bandpass 700 Hz | Three-note rising fanfare |
| Score milestone (×50) | sine | 880 Hz → 1047 Hz | 5ms / 60ms / 0.2 / 100ms | none | Brief bright chirp at multiples of 50 |

### Music / Ambience Generative Approach

A dreamy-tense chiptune loop at 95 BPM using three OscillatorNodes:

- **Root bass:** triangle at 55 Hz (A1), gain 0.05, plays on beats 1 and 3
- **Mid arp:** square wave at 220 / 277 / 330 Hz alternating (A3–C#4–E4 minor triad), gain 0.03, one note per beat subdivided into 8th notes, cycling through the triad
- **High shimmer:** sine at 880 Hz, gain 0.015, triggered on beat 2 and 4, very short (50ms)

All three pass through a master BiquadFilter lowpass at 2200 Hz for a muffled retro feel. The arp sequence is programmed using `AudioContext.currentTime` scheduling for tight timing. As obstacles cleared count rises, the arp cycles faster (95 → 130 BPM between 0 and 50 obstacles), adding urgency. When the stack exceeds 60% height, a fourth low-frequency rumble oscillator (sine at 40 Hz, gain 0.03) fades in over 60 frames.

## Implementation Priority

- **High:** Bird kinematic tilt (nose-up on flap, nose-down on fall), bird wing animation, obstacle column cell rendering with inner highlight, gap safe-zone fill, bird death particles + screen shake, flap/pass/death/row-clear sounds
- **Medium:** Parallax cloud layers, stack warning pulse line, stack-landing dust particles, row-clear flash + particle sweep, stack height bar indicator, gap-cleared sparkle particles, music arp loop
- **Low:** Near-miss spark effect, score digit scale animation, guide beam at x=60, floating "ROW CLEAR" text, noise rumble at high stack, cloud opacity variation, sub-bass stack danger sound escalation
