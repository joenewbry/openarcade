# Brickfall — Visual & Sound Design

## Current Aesthetic

Dark background with seven distinct tetromino colors (`#0ff`, `#ff0`, `#a0f`, `#00f`, `#f80`, `#0f0`, `#f00`), a white ball with bright glow, and an orange-themed paddle at bottom. Falling pieces use stronger glow (0.6) versus stacked blocks (0.3). No motion trail on ball, no particle effects, no background texture. The grid structure is implied but not drawn.

## Aesthetic Assessment
**Score: 2/5**

The color vocabulary is strong — seven vivid tetromino hues against dark create natural contrast — but execution is flat. The ball has no sense of kinetic energy. Stacked blocks lose all visual identity once locked, becoming a featureless mass. The paddle is a plain orange rectangle. No visual feedback distinguishes a ball-cleared row from a lock-cleared row, which are mechanically very different.

## Visual Redesign Plan

### Background & Environment

Deep near-black base (`#060810`) with a faint 30×30px grid drawn in `#0a0f18` at 0.4 alpha — just visible enough to telegraph the underlying tetromino grid without competing with pieces. Two subtle vertical vignette bands at x=0 and x=300 darken the edges by 30%. A very faint horizontal gradient at the top third of the canvas (lighter toward top, `#0d1220`) hints at depth.

Add a slow-scrolling starfield: 30 tiny single-pixel stars at 0.15–0.35 alpha, drifting downward at 0.08–0.15 px/frame. Stars loop back to the top when they reach the bottom, reinforcing the sense of tetromino pieces "falling from above."

### Color Palette

| Role | Hex | Usage |
|---|---|---|
| Background base | `#060810` | Canvas fill |
| Background grid | `#0a1020` | Faint cell lines |
| Grid line | `#141e30` | 0.5px grid strokes |
| I-piece | `#00e8ff` | Cyan (classic Tetris I) |
| O-piece | `#ffe000` | Yellow (classic Tetris O) |
| T-piece | `#cc00ff` | Purple (classic Tetris T) |
| J-piece | `#0044ff` | Blue (classic Tetris J) |
| L-piece | `#ff8800` | Orange (classic Tetris L) |
| S-piece | `#00e060` | Green (classic Tetris S) |
| Z-piece | `#ff2244` | Red (classic Tetris Z) |
| Ball core | `#ffffff` | White fill |
| Ball glow | `#ffe8cc` | Warm white outer ring |
| Paddle base | `#ff9900` | Orange body |
| Paddle highlight | `#ffcc66` | Center stripe |
| Paddle glow | `#ff6600` | Outer glow bloom |
| Row-clear flash | `#ffffff` | Full-row brief white flash |
| HUD text | `#aabbcc` | Score, level, lives |
| Danger line | `#ff2244` | Stack overflow warning |

### Entity Redesigns

**Tetromino Pieces (falling):**
Each falling piece cell is drawn as a rounded-corner rectangle (4px corner radius) with a 2px brighter inner border and a 1px outer glow using `shadowBlur = 14, shadowColor = pieceColor`. The cell face has a subtle radial gradient: full color at center, 70% saturation at edges. Falling pieces animate a gentle oscillation: scale pulses 1.0 → 1.02 → 1.0 over 40 frames, making them feel alive while descending.

**Stacked Blocks:**
Once locked, blocks dim to 60% brightness with `shadowBlur = 6` (reduced from 14). A thin 1px dark separator line between cells (`#060810`) ensures individual blocks remain readable as the stack grows. Blocks involved in a cleared row burst white before disappearing.

**Ball:**
Three concentric layers: outer glow ring (`#ff9900` at 0.2 alpha, radius 10px), mid-glow (`#ffffff` at 0.5, radius 8px), solid core (`#ffffff`, radius 6px), and a 2px specular dot at top-left (pure white at 0.9). The ball leaves a 10-frame motion trail: 10 ghost circles at radii scaling from 5.4 to 1.8 (×0.9 per step), alpha from 0.45 to 0.04. Trail color interpolates between the last block color destroyed and white — so after hitting a purple T-piece, the trail glows purple for several frames.

**Paddle:**
Horizontal gradient from `#ff6600` at edges to `#ffcc44` at center. Three thin "grip notches" (1px dark lines at 20%, 50%, 80% across) give it a tactile look. Rounded caps on both ends (6px radius). On ball contact: paddle briefly flares to `#ffffff` core with `shadowBlur = 30, shadowColor = #ff9900`, decaying over 8 frames. The paddle also compresses very slightly (scaleY 1.0 → 0.85 → 1.0) on hit over 6 frames, giving a physical squash response.

**Grid Cell Lines:**
Render the 10×16 grid faintly (`#141e30`, 0.3 alpha, 0.5px width) as context for where pieces will land. Only draw cells within the "play zone" (rows 2–16, reserving two rows at top for spawn).

**Row-Clear Effect:**
When a row clears (either ball-triggered or lock-triggered), flash the entire row white for 4 frames, then expand a thin horizontal shockwave line (1px, `#ffffff`, alpha 0.8) that travels upward 40px over 12 frames while fading. Remaining blocks above the cleared row visually "drop" with a 6-frame eased fall animation rather than snapping instantly.

**Lives Indicator:**
Three small ball icons in the top-right corner using the same layered orb style (radius 5px). Lost lives are drawn at 0.15 alpha.

### Particle & Effect System

- **Ball-block destroy:** 6 particles burst from impact point. Velocity 1.5–4 px/frame in random directions biased away from ball trajectory. Lifetime 20 frames. Color = destroyed block's tetromino color. Size 2×2px squares that rotate as they travel.
- **Falling-piece cell hit:** 4 smaller particles, velocity 1–2.5 px/frame, lifetime 14 frames. Same color as the piece cell hit.
- **Row clear (ball-triggered):** 24 particles sweep outward from the cleared row's center in a horizontal fan. Velocity 2–6 px/frame. Lifetime 30 frames. Color = white fading to the color of the most-recently-cleared block type. These particles are larger (3×3px) and leave brief 4-frame sub-trails.
- **Row clear (lock-triggered):** 16 particles in a contained burst (narrower spread than ball-clear). Color = gold (`#ffdd00`). Lifetime 22 frames.
- **Ball lost (life lost):** 20 particles explode from the paddle position in a downward arc. Color = orange (`#ff6600`). Each particle fades from full color to transparent. Lifetime 40 frames.
- **Paddle hit:** 8 particles emit perpendicular to ball's reflection angle. Color = paddle orange. Lifetime 16 frames.
- **Stack overflow warning:** When the stack reaches row 4 (top 25%), danger particles drift upward from the top of the stack: 2 new `#ff2244` particles per frame drifting at 0.3 px/frame upward, alpha 0.4 max.

### UI Polish

- Level and score displayed top-left with a pixel-font style (large, slightly transparent outlined digits).
- Lines cleared counter top-center in a smaller weight.
- On level-up: a brief "LEVEL X" text animates in from the left (slides 20px), holds 60 frames, then fades. Color matches current piece color for visual variety.
- Ball speed implied by the trail length — no explicit speed bar needed.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis

| Event | Oscillator | Frequency | Envelope (A/D/S/R) | Filter / Effect | Character |
|---|---|---|---|---|---|
| Ball-block destroy | square | 440 Hz → 220 Hz sweep | 0ms / 40ms / 0 / 20ms | BiquadFilter lowpass 800 Hz | Punchy digital pop; pitch scales with block row (higher rows = higher pitch, range 660→220 Hz) |
| Falling piece cell hit | triangle | 330 Hz | 0ms / 30ms / 0 / 10ms | none | Soft hollow tap; quieter than full-block destroy |
| Paddle hit (ball) | square | 180 Hz, flat | 0ms / 55ms / 0 / 15ms | BiquadFilter highpass 120 Hz | Low thwack; fundamental differentiates from block hits |
| Wall bounce | triangle | 260 Hz | 0ms / 25ms / 0 / 8ms | none | Quick click; minimal volume (0.3×) |
| Row clear (ball) | sawtooth → sine | 880 Hz sweep up to 1320 Hz | 5ms / 80ms / 0.4 / 120ms | BiquadFilter bandpass center 1000 Hz Q=2 | Bright rising sting; triumphant feel |
| Row clear (lock) | sine | 660 Hz + 880 Hz simultaneous | 5ms / 60ms / 0.3 / 100ms | chorus via two detuned oscillators ±4 Hz | Softer, harmonious chord; less dramatic than ball-clear |
| Piece lock | triangle | 110 Hz | 0ms / 90ms / 0 / 30ms | BiquadFilter lowpass 300 Hz | Deep dull thud; confirms piece placement |
| Ball lost (life -1) | sawtooth | 440 Hz → 55 Hz slide | 0ms / 350ms / 0 / 100ms | BiquadFilter lowpass 600 Hz, Q=4 resonance | Descending wail; melancholy |
| Game over | sine | 220 Hz → 110 Hz → 55 Hz (3 steps) | 20ms / 200ms each step / 0 / 80ms | reverb via short delay (0.15s, feedback 0.4) | Slow descending triple-note funeral cadence |
| Level up | square + triangle | 523 Hz → 659 Hz → 784 Hz arpeggio | 5ms / 100ms / 0.2 / 80ms per note | BiquadFilter highpass 200 Hz | Bright ascending arpeggio; celebratory |
| Stack danger (near top) | sine | 55 Hz pulse, repeating every 40 frames | 5ms / 300ms / 0.5 / 100ms | none | Sub-bass heartbeat; subtle unease |
| Game start | sawtooth | 330 → 440 → 523 → 659 Hz | 5ms / 80ms / 0 / 40ms | BiquadFilter bandpass 600 Hz | Rising 4-note fanfare |

### Music / Ambience Generative Approach

A procedural 120 BPM pulse bass loop built from two OscillatorNodes:
- Bass oscillator 1: `#1` sine wave at 55 Hz (A1), gain 0.06
- Bass oscillator 2: `#2` sine wave at 82.5 Hz (E2), gain 0.04

The two notes alternate every beat (500ms at 120 BPM), filtered through a BiquadFilter lowpass at 180 Hz. This creates a near-subliminal rhythmic foundation. As the level increases, tempo ramps: level 1 = 120 BPM, level 5 = 150 BPM, level 9+ = 180 BPM. The filter cutoff also rises with level (180 → 320 Hz), making the bass progressively brighter and more present.

A secondary noise layer: a filtered white noise source (BiquadFilter bandpass at 4000 Hz, Q=8, gain 0.015) fires on every tetromino cell that locks into place, creating a subliminal "click-tick" texture that becomes denser as pieces fall faster.

## Implementation Priority

- **High:** Ball motion trail with block-color interpolation, block rounded-corner rendering with glow, paddle hit flash + squash animation, ball-block destroy particles, row-clear flash + shockwave line, all sound events (ball hit, paddle hit, row clear, ball lost)
- **Medium:** Stacked-block dimming with separator lines, falling piece oscillation, row drop animation (blocks above fall smoothly), level-up text slide animation, background grid lines, music bass loop, stack danger pulse sound
- **Low:** Starfield background, specular highlight on ball, multi-row clear color interpolation on particles, row-clear particle sub-trails, halftone vignette at canvas edges, noise click texture in music
