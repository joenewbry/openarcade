# Worm Pong — Visual & Sound Design

## Current Aesthetic

Steel blue theme (`#5af`). Left worm-snake has a bright head (`#adf`) dimming to `#5af` body. Right (CPU) is mirrored. Canvas divided at x=240. White ball with white glow. 2px canvas border in `#5af`. No background texture, no center divider visualization, no distinction between the two worm teams, no effects on ball return, no growth animation when a segment is added.

## Aesthetic Assessment
**Score: 2/5**

The core concept — a Pong paddle that is actually a living snake — is brilliant and unique, but visually it is almost completely unexpressed. Both worms are identical steel blue, making it hard to perceive the two teams as distinct organisms. The ball is featureless. The center dividing line is absent. The dramatic moments (worm grows, worm self-collision dies) have no visual payoff. The arena feels like an empty pool rather than a split-court battle arena.

## Visual Redesign Plan

### Background & Environment

A split arena with clear team-side identity:

**Left half (player):** Background fill `#060c14` with a very faint radial glow from the center of the left half — `#0a1a2a` at 0.25 alpha — suggesting an inhabited territory. A subtle diagonal hatching pattern (1px lines at 45°, `#0d1520` at 0.15 alpha, 24px spacing) gives the floor texture without visual noise.

**Right half (CPU):** Background fill `#140c06` with a faint warm glow (`#2a1408` at 0.25 alpha). Same hatching pattern mirrored.

**Center dividing line — DNA Helix:**
The center at x=240 is marked by a decorative double-helix motif rendered as two sine waves offset by 180° from each other. Each wave is a continuous 2px polyline drawn with `shadowBlur = 6`:
- Wave A: `#5af` (player color), amplitude ±12px, period 48px, scrolling upward at 0.3 px/frame
- Wave B: `#fa5` (CPU orange color), amplitude ±12px, same period, phase-shifted 180°

At each "crossing" point (where the two waves intersect), draw a small filled circle (radius 3px) alternating between the two colors. The helix scrolls slowly, giving the dividing line a living, biological quality that mirrors the worm theme. The overall effect is subtle but distinctive.

**Score zones:** Top-left corner: player score in `#5af`. Top-right corner: CPU score in `#fa5`. A dim horizontal band (8px tall, at y=0) shows the "net" at canvas top in team colors — player-side `#0a1520`, CPU-side `#201408`.

### Color Palette

| Role | Hex | Usage |
|---|---|---|
| Left background | `#060c14` | Player half fill |
| Right background | `#140c06` | CPU half fill |
| Left glow | `#0a1a2a` | Player territory radial |
| Right glow | `#2a1408` | CPU territory radial |
| Player head | `#66ccff` | Brightest player segment |
| Player head glow | `#44aaee` | Head shadowColor |
| Player body bright | `#4499cc` | Even body segments |
| Player body dim | `#2a6699` | Odd body segments |
| Player tongue | `#ff4466` | Tongue flick |
| CPU head | `#ffaa44` | Brightest CPU segment |
| CPU head glow | `#ee8822` | CPU head shadowColor |
| CPU body bright | `#cc7722` | Even CPU body segments |
| CPU body dim | `#994d11` | Odd CPU body segments |
| Ball core | `#ffffff` | White fill |
| Ball glow | `#ddeeff` | Outer glow ring |
| Ball trail player | `#44aaee` | Trail tint after player deflect |
| Ball trail CPU | `#ee8822` | Trail tint after CPU deflect |
| Helix wave A | `#5af` | DNA left strand |
| Helix wave B | `#fa5` | DNA right strand |
| Helix node | alternating | Crossover dots |
| Self-collision flash | `#ff2244` | Death flash |
| Growth pulse | `#ffffff` | New segment spawn glow |
| HUD text player | `#66ccff` | Score, lives (player) |
| HUD text CPU | `#ffaa44` | Score, lives (CPU) |
| Win banner | `#ffffff` | Victory text |
| Life icon | team color | Small worm-head icons |

### Entity Redesigns

**Player Worm (left half):**
Each segment is a 12×12px square with 3px corner rounding. The head segment is `#66ccff` with `shadowBlur = 18, shadowColor = #44aaee`. Body segments alternate `#4499cc` and `#2a6699`, both with `shadowBlur = 6, shadowColor = #1a4466`. A gradient exists along the snake: segment brightness decrements by 4% per index from head to tail, so a long snake naturally fades toward the tail.

The head has a forked tongue on its leading edge: two 3px red lines (`#ff4466`) extending 5px, forking at 25°, visible on a 10-frame cycle (5 in, 5 out). A 3×3px dark pupil mark on the head's leading face.

The segment-to-segment "neck" connector (a 4px wide filled rect between adjacent segment centers) uses the darker of the two adjacent segment colors. This removes the visual gap in straight runs, creating a continuous serpentine body silhouette.

**CPU Worm (right half):**
Identical structure with the orange palette. Head `#ffaa44`, shadowColor `#ee8822`. Body alternates `#cc7722` and `#994d11`. Same tongue and pupil feature. The CPU worm's tongue flick is offset by 5 frames from the player's, so they don't flick in perfect synchrony — a subtle humanizing touch.

**Ball:**
Three-layer orb: outer ring (`#ddeeff` at 0.3, radius 9px), inner glow (`#aaccff` at 0.5, radius 7px), white core (radius 6px), specular dot at top-left (2px, `#ffffff` at 0.9).

8-frame motion trail: ghost circles at radii 5.4 → 0.8 (×0.9 per step), alpha 0.45 → 0.04. Trail color changes based on last deflection: if player worm touched it last, trail is `#44aaee` (player blue); if CPU worm, trail is `#ee8822` (CPU orange); if neither, trail is neutral `#667799`. This makes ball ownership legible at a glance — is it coming off the player's worm or the CPU's?

At high speed (above 7 px/frame), the ball distorts slightly: it renders as an ellipse rather than a circle, stretched along the velocity vector (axis ratio up to 1.0 : 1.4). This speed deformation communicates kinetic intensity.

**Growth Event (new tail segment added):**
When a segment is added after a successful ball deflection: the new tail segment spawns at 0.15 alpha and scales from 0.3× to 1.0× over 8 frames, pulsing with a brief white `shadowBlur = 20, shadowColor = #ffffff` that decays over those same 8 frames. The worm literally grows with a visible pulse of energy.

**Self-Collision (death event):**
The head briefly flashes `#ff2244` for 4 frames, then the entire worm dissolves: each segment fades from full alpha to 0 over 20 frames, staggered by 2 frames per segment from head to tail (head fades first, tail last). A brief screen flash (`#ff2244` at 0.2 alpha for 6 frames) punctuates the death.

**Score / Goal Event:**
When the ball exits the arena: the scoring side's background briefly flares (their territory color at +30% brightness for 8 frames). The losing side's worm resets to 3 segments with a respawn animation (segments pop in with scale 0 → 1.2 → 1.0 over 12 frames).

### Particle & Effect System

- **Ball-worm head deflection:** 8 particles from the collision point. Direction: outward from the collision normal (opposite to ball's incoming angle). Velocity 2–5 px/frame. Lifetime 20 frames. Color = deflecting worm's team color (player: `#44aaee`, CPU: `#ee8822`). Size 2×2px.
- **Ball goal (exits arena):** 16 particles from the exit edge. The scoring team's color. Velocity 1.5–4 px/frame inward (toward center of arena). Lifetime 35 frames. Plus the background territory flare.
- **Worm segment growth:** The brief white pulse on the new tail segment (described above). Additionally, 4 tiny sparkle particles scatter from the new segment position: color white, velocity 0.5–1.5 px/frame, lifetime 12 frames.
- **Self-collision death:** 20 particles from the collision point (where head met body). Mix of team color and `#ff2244`. Velocity 2–7 px/frame, all directions. Lifetime 45 frames. Screen flash.
- **High-speed ball (> 7 px/frame):** 2 small white particles per frame emit from the ball's trailing edge (opposite velocity direction). Velocity 0.5 px/frame, lifetime 6 frames. Creates a comet-tail at top speed.
- **Near-miss (ball passes within 15px of worm body without hitting head):** A single 6px white sparkle at the nearest worm body point for 4 frames.
- **Worm respawn (after life lost):** New segments pop in with the scale animation described above. Plus 3 small color-matched particles drift upward from each respawning segment, velocity 0.5 px/frame up, lifetime 20 frames.

### UI Polish

- Player score top-left in `#66ccff`, large outlined numerals.
- CPU score top-right in `#ffaa44`, same treatment.
- On goal: scoring side's digit pulses scale 1.0 → 1.5 → 1.0 over 10 frames.
- Lives shown as small worm-head icons (10px) below each score: player left, CPU right. Lost lives at 0.15 alpha.
- "MATCH POINT" (one player at 6 points): banner of team color slides in from their side (player from left, CPU from right), holds 60 frames, slides back. Pulses every 25 frames.
- Ball speed implied by trail length and ellipse deformation — no explicit bar needed.
- Self-collision count (how many times each worm has died) shown as a small italic number beneath lives in 0.4 alpha — a light statistical touch.
- Win screen: "PLAYER WINS" or "CPU WINS" in `#ffffff` with team-colored drop shadow, centered, appearing after a 20-frame delay following the final score.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis

| Event | Oscillator | Frequency | Envelope (A/D/S/R) | Filter / Effect | Character |
|---|---|---|---|---|---|
| Ball deflect (player) | square | 330 Hz → 440 Hz sweep | 0ms / 55ms / 0 / 15ms | BiquadFilter bandpass 600 Hz Q=2 | Crisp bright thwack; slightly higher pitch than CPU side |
| Ball deflect (CPU) | square | 220 Hz → 330 Hz sweep | 0ms / 55ms / 0 / 15ms | BiquadFilter bandpass 500 Hz Q=2 | Same character but a third lower; side distinction |
| Ball wall bounce (top) | triangle | 260 Hz flat | 0ms / 30ms / 0 / 10ms | none | Short neutral ping |
| Goal scored (player) | sawtooth + sine | 523 → 784 → 1047 Hz arpeggio | 5ms / 120ms each / 0.2 / 80ms | BiquadFilter highpass 250 Hz | Rising 3-note sting; triumph |
| Goal scored (CPU) | sine | 440 → 220 → 110 Hz slide | 5ms / 180ms each / 0 / 120ms | BiquadFilter lowpass 600 Hz | Descending slide; disappointment |
| Worm grows (+segment) | sine | 880 Hz blip | 0ms / 35ms / 0.1 / 60ms | none | Clean high bell note; positive reinforcement |
| Self-collision (death) | sawtooth | 440 → 55 Hz slide | 0ms / 400ms / 0 / 150ms | BiquadFilter lowpass 700 Hz, Q=5 | Long falling wail; dramatic |
| Worm respawn | triangle | 220 → 330 Hz | 5ms / 80ms / 0 / 50ms each | none | Two-note reentry tone |
| Match point reached | sine | 55 Hz + 82.5 Hz pulse | 5ms / 500ms / 0.5 / 300ms | BiquadFilter lowpass 150 Hz | Deep sub-bass tension pulse |
| Ball at high speed (> 7 px/frame) | triangle | 1760 Hz very quiet | 0ms / sustain / 5ms release | BiquadFilter highpass 1200 Hz | Faint high whistle; speed indicator |
| Game start | square | 330 → 440 → 523 → 659 Hz | 5ms / 80ms each / 0 / 40ms | BiquadFilter bandpass 700 Hz | 4-note rising fanfare |
| Win (match end) | square + triangle | 659 → 784 → 880 → 1047 → 1319 Hz | 5ms / 160ms each / 0.3 / 140ms | BiquadFilter highpass 300 Hz | 5-note triumphant ascending fanfare |
| CPU wins | sine | 880 → 659 → 523 → 440 Hz | 5ms / 180ms each / 0 / 120ms | BiquadFilter lowpass 1000 Hz | Descending 4-note diminuendo |

### Music / Ambience Generative Approach

Two independent oscillator loops — one for each side of the arena — that interplay as the worms grow:

**Player side loop (left):**
- Bass: sine at 55 Hz (A1), gain 0.04, beats every 1.0s
- Arp: triangle at 220 / 277 / 330 Hz cycling (A3–C#4–E4), gain 0.025, one note per beat, cycling forward through the triad
- Beat interval: 1.0s at worm length 3 → 0.6s at worm length 15+

**CPU side loop (right):**
- Bass: sine at 41.2 Hz (E1), gain 0.04, same interval as CPU worm length
- Arp: triangle at 165 / 196 / 220 Hz cycling (E3–G3–A3), gain 0.025
- Pitched a fourth below player — the two loops create a natural harmonic tension when both worms are long

Both loops route through separate StereoPannerNodes: player loop panned −0.4 (left), CPU loop panned +0.4 (right). This spatial stereo separation means a player with headphones can hear their worm "on their side." As either worm grows, its loop's bass gain increases (0.04 → 0.08 at max length), making the arena progressively louder and more chaotic.

The DNA helix center is sonically represented by a 110 Hz drone (sine, gain 0.015) panned center. It is always present — the stable midpoint between the two competing organic rhythms.

When a self-collision death occurs: the dead side's loop immediately drops to gain 0 (silence on that side) for the 3-second respawn animation, then ramps back to the base gain over 1 second on respawn.

## Implementation Priority

- **High:** Two-color worm palette (player blue vs CPU orange), ball trail with team-color tinting, ball ellipse deformation at high speed, DNA helix center divider animation, growth segment pulse animation, deflect particle burst, player/CPU deflect sounds, goal sounds (both sides), self-collision death sound
- **Medium:** Split-background territory tinting, snake neck-connector fill (continuous body silhouette), tongue flick animation, worm respawn scale animation, self-collision dissolve animation, match-point banner, worm-length-scaled music loop tempo, stereo panning on music loops
- **Low:** Background diagonal hatching, specular on ball, near-miss sparkle, comet-tail at high speed, self-collision count display, win-screen animated reveal, high-speed whistle sound, DNA helix node dots at crossings, sub-bass tension pulse at match point
