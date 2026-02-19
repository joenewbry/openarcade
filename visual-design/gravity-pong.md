# Gravity Pong — Visual & Sound Design

## Current Aesthetic

Deep space setting with a cyan player ship (`#0cf`), orange CPU ship (`#f84`), light blue-white puck (`#ddf`), dark-grey asteroids (`#445`), and a dashed center dividing line (`#0c3040`). Goal zones are very dark bands at top and bottom with label text. No thruster particles, no puck trail, no asteroid texture, no star field. Visually functional but cold and empty.

## Aesthetic Assessment
**Score: 2/5**

The color assignments are sound — cyan vs orange is a strong visual contrast for the two factions — but every entity is a primitive shape with no personality. The ship triangles have no thruster glow. The asteroids are featureless grey discs. The puck is a plain circle. The arena feels like a developer placeholder rather than a designed space environment. The zero-gravity concept is not visually communicated at all.

## Visual Redesign Plan

### Background & Environment

A rich deep-space backdrop built in layers:

1. **Base gradient:** Radial gradient from `#0c1428` at center to `#050a12` at corners. The center is slightly lighter, creating a soft "arena spotlight" feel.
2. **Starfield:** 80 static stars at varied radii (0.5–1.5px) and alphas (0.15–0.7), distributed using a seeded pattern. Stars do not move — the field is the fixed reference frame. 12 of these are "bright stars" at radius 2px with a soft `shadowBlur = 6` glow.
3. **Nebula wisps:** 3–4 very large ellipses (180×80px) with radial gradient fills in `#0a1f3a` at 0.12 alpha, scattered at positions that don't overlap the center play zone. These add color depth without clutter.
4. **Arena boundary:** The 480×480 canvas edge is marked by a subtle 2px border glow: `#0c2a40` on the left/right walls (active bounce walls), and a slightly different treatment for goal zones.
5. **Goal zones (top 22px / bottom 22px):** Each goal band fills with a very dark tinted gradient — CPU goal (`#150820` deep purple-blue), Player goal (`#0c1808` deep green-black). A bright 2px inner line at the goal's inner edge glows in team color (cyan for player goal, orange for CPU goal). Team color text label ("PLAYER GOAL", "CPU GOAL") at 0.25 alpha.
6. **Center dividing line:** Replace the plain dash with a double-line: two 0.5px lines 4px apart, in `#0c3040` at 0.5 alpha, with the gap creating an implied center plane.

### Color Palette

| Role | Hex | Usage |
|---|---|---|
| Space background center | `#0c1428` | Radial gradient center |
| Space background edge | `#050a12` | Radial gradient corners |
| Nebula accent 1 | `#0a1f3a` | Blue-teal nebula wisps |
| Nebula accent 2 | `#12082a` | Purple nebula wisps |
| Player ship body | `#00ccff` | Cyan triangle fill |
| Player ship glow | `#00aaee` | Outer shadow bloom |
| Player thruster | `#44ddff` | Thrust particle start color |
| Player thruster tail | `#0088cc` | Thrust particle end color |
| CPU ship body | `#ff8844` | Orange triangle fill |
| CPU ship glow | `#dd6622` | Outer shadow bloom |
| CPU thruster | `#ffbb66` | CPU thrust particle start |
| CPU thruster tail | `#cc4400` | CPU thrust particle end |
| Puck core | `#eef4ff` | Near-white fill |
| Puck ring | `#aaccff` | Outer glow ring |
| Puck trail | `#667799` | Motion trail ghost color |
| Asteroid fill | `#2a3040` | Dark grey-blue body |
| Asteroid edge | `#3a4460` | Slightly lighter border |
| Asteroid glow | `#445566` | Subtle outer bloom |
| Player goal line | `#00ccff` | Inner goal edge (cyan) |
| CPU goal line | `#ff8844` | Inner goal edge (orange) |
| Wall bounce | `#336688` | Brief wall flash color |
| HUD text | `#7799bb` | Score labels |
| Win flash | `#ffffff` | Full canvas flash on score |

### Entity Redesigns

**Player Ship (cyan triangle):**
The ship is drawn as a sharp isoceles triangle pointing in the direction of `angle`. The triangle has a gradient fill: `#00ccff` at the tip, dimming to `#006688` at the base. A thin 1px outline in `#44eeff` at 0.6 alpha traces the perimeter. The ship has a persistent ambient glow: `shadowBlur = 16, shadowColor = #00aaee`. When thrust is active, a thruster cone appears at the base: 3 elongated flame particles that scale from 4px wide at origin to 0 at 12–18px back, colored `#44ddff` → `#0088cc` → transparent. On brake (Space): two lateral retro-thruster sparks emit perpendicular to the ship nose, 4px wide, 6px long.

**CPU Ship (orange triangle):**
Identical structure to player ship but with orange palette. CPU ships use `#ff8844` fill, `#ffaa66` outline, `#dd6622` glow. CPU thrust particles: `#ffbb66` → `#cc4400`. The CPU ship's thruster flickers slightly (opacity 0.8–1.0 alternating every 4 frames) hinting at automated AI firing rhythm.

**Puck:**
Layered orb: outer ring (`#aaccff` at 0.3, radius 11px), mid glow (`#ddeeff` at 0.5, radius 9px), solid core (`#eef4ff`, radius 8px), specular dot at top-left (2px, `#ffffff` at 0.9). The puck leaves an 8-frame motion trail: 8 ghost circles at radius scaling 7.2 → 1.4 (×0.9 per step), alpha 0.4 → 0.04, color `#667799`. When the puck is moving very fast (speed > 6 px/frame), the trail elongates and trail alpha increases to 0.6 — speed is visually legible from across the canvas.

**Asteroids:**
Each asteroid is rendered as an irregular polygon (8–12 vertices) rather than a circle. Generate the polygon once using the asteroid's seeded random velocity: each vertex is at angle `i * (2π/n)` with a radius wobble of ±20% using `Math.sin(seed + i)`. Fill with `#2a3040`, 1px outline `#3a4460`, and `shadowBlur = 8, shadowColor = #445566`. Each asteroid also has 3–5 small "crater" ellipses drawn on its surface at 0.6 alpha darker than the body — pure cosmetic detail. The asteroid rotates at its defined spin rate, so the cratered polygon tumbles convincingly.

**Ships' Half-Court Marking:**
A faint team-colored tint at the player's half: a full 480×240 rect in `#00ccff` at 0.02 alpha (barely perceptible blue-tinted floor) and CPU half in `#ff8844` at 0.02 alpha. This subliminally reinforces territorial ownership.

### Particle & Effect System

- **Ship thrust:** 3 particles per frame while thrust key held. Spawn at ship base center (opposite to nose). Velocity: ship-backward direction ±15° scatter, 2.5–4.5 px/frame. Lifetime 14 frames. Color: player = `#44ddff` → `#0088cc`, CPU = `#ffbb66` → `#cc4400`. Size: 2×2px start, fade to transparent.
- **Puck-ship collision:** 8 particles at collision point. Direction: outward from collision normal. Velocity 2–5 px/frame. Lifetime 20 frames. Color: 50% puck (`#aaccff`) + 50% ship color. This mix signals which ship hit the puck.
- **Puck-asteroid collision:** 6 grey rock-chip particles. Color `#556677`. Velocity 1.5–3.5 px/frame radially. Lifetime 18 frames. Plus a brief rocky grey flash on the asteroid surface (4 frames, +20% brightness).
- **Puck-wall bounce:** 4 particles in the puck's incoming direction. Color `#aaccff`. Lifetime 12 frames. Plus a brief flash on the wall edge.
- **Goal scored:** 24 particles explode from the goal zone. Color = scoring team color (cyan for player, orange for CPU). Velocity 3–8 px/frame in a semicircle toward the center of the arena. Lifetime 50 frames. Particles are larger (4×4px) and leave 4-frame sub-trails. A brief whole-canvas desaturate flash (white overlay at 0.25 alpha for 6 frames) punctuates the event.
- **Ship brake:** 4 perpendicular particles (2 each side) in the ship's lateral direction. Color = team color at 0.6 alpha. Lifetime 10 frames. Velocity 1–2 px/frame.
- **Match point state:** All particles for the leading ship have a gold shimmer mixed in (`#ffcc00` at 30% blend). The leading ship's glow intensifies by 1.5× shadowBlur.

### UI Polish

- Score displays in team colors (cyan for player, orange for CPU) in the center of their respective goal zone bands.
- On goal: score digit animates scale 1.0 → 1.5 → 1.0 over 12 frames.
- "MATCH POINT" banner slides down from top when a player reaches 4 points (one away from 5). Colored in the leading player's team color, pulsing every 30 frames.
- A thin circular radar at canvas center (radius 20px, `#ffffff` at 0.05 alpha) marks the puck's target zone with no information overload.
- Speed readout: the puck's glow radius scales dynamically with speed (radius 9 at 0 px/frame → 16 at 10 px/frame).

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis

| Event | Oscillator | Frequency | Envelope (A/D/S/R) | Filter / Effect | Character |
|---|---|---|---|---|---|
| Ship thrust | noise burst | white noise continuous while held | 5ms ramp up / sustain / 50ms release | BiquadFilter bandpass 800 Hz Q=4 | Filtered spaceship engine hiss; low volume (0.12) |
| Ship brake | triangle | 180 Hz blip | 0ms / 60ms / 0 / 20ms | BiquadFilter highpass 100 Hz | Soft retro-thruster pop |
| Puck-ship collision (player) | square | 330 Hz → 440 Hz sweep | 0ms / 50ms / 0 / 15ms | BiquadFilter bandpass 600 Hz Q=2 | Crisp digital "thwack"; slightly bright |
| Puck-ship collision (CPU) | square | 220 Hz → 330 Hz sweep | 0ms / 50ms / 0 / 15ms | BiquadFilter bandpass 500 Hz Q=2 | Same but slightly darker to distinguish sides |
| Puck-wall bounce | triangle | 260 Hz flat | 0ms / 30ms / 0 / 10ms | none | Clean ping; neutral |
| Puck-asteroid collision | noise + sine | noise filtered 300 Hz + 150 Hz sine | 0ms / 100ms / 0 / 40ms | BiquadFilter lowpass 400 Hz | Rocky crunch with low resonance |
| Goal scored (player) | sawtooth + sine | 523 Hz → 784 Hz → 1047 Hz arpeggio | 10ms / 150ms each / 0.2 / 120ms | BiquadFilter highpass 300 Hz | Triumphant ascending 3-note sting |
| Goal scored (CPU) | sine | 440 Hz → 220 Hz → 110 Hz slide | 10ms / 200ms each / 0 / 150ms | BiquadFilter lowpass 600 Hz | Descending loss sound; somber |
| Match point | sine | 55 Hz pulse + 110 Hz harmonic | 5ms / 400ms / 0.6 / 200ms | BiquadFilter lowpass 200 Hz | Deep sub-bass pulse; tension |
| Game start | sawtooth | 110 → 165 → 220 → 330 Hz | 5ms / 80ms each / 0 / 40ms | none | Space opera 4-note launch signal |
| Asteroid pass (near miss) | sine | 80 Hz fade-in/out | 100ms ramp in / sustain 200ms / 80ms ramp out | BiquadFilter lowpass 150 Hz | Very low Doppler rumble; ambient |
| Win (game over) | square + triangle | 659 → 784 → 880 → 1047 Hz | 5ms / 200ms each / 0.3 / 180ms | BiquadFilter bandpass 900 Hz Q=1 | 4-note victory fanfare |

### Music / Ambience Generative Approach

A zero-gravity ambient drone constructed from four layered OscillatorNodes:

- **Drone 1:** sine at 55 Hz (A1), gain 0.04, continuous. Provides the low-end "space" foundation.
- **Drone 2:** sine at 82.5 Hz (E2), gain 0.025, slowly modulated by a LFO at 0.04 Hz (±6 Hz pitch wobble using `detune` AudioParam), creating a slow beating effect.
- **High shimmer:** triangle at 1760 Hz (A6), gain 0.008, modulated by LFO at 0.07 Hz (±20 Hz) for a distant shimmer.
- **Beat pulse:** A short sine blip at 110 Hz, gain 0.06, triggered every 1.5 seconds (40 BPM very slow pulse). Envelope: 10ms / 200ms / 0 / 300ms.

All four pass through a master gain and a BiquadFilter lowpass at 3000 Hz. The result is an evolving, non-repeating space ambient texture.

As rally intensity increases (puck speed > 5), the beat pulse interval compresses from 1.5s → 0.75s, increasing urgency. At match point (one score from winning), the high shimmer gain doubles (0.008 → 0.016) and the beat pulse moves to 0.5s interval.

Ship thrust has its own isolated noise node (not part of the ambient) that starts/stops cleanly with the thrust key.

## Implementation Priority

- **High:** Ship thruster particle system (both ships), puck motion trail (with speed-scaled alpha), irregular polygon asteroid rendering with rotation, goal scored particles + screen flash, puck-ship collision sound, goal scored sounds (player vs CPU)
- **Medium:** Starfield background, goal zone tinted band treatment, half-court team-color tinting, puck-asteroid rock-chip particles, asteroid crater detailing, ship brake particles, ambient drone music, engine hiss during thrust
- **Low:** Nebula wist ellipses, match-point banner, dynamic puck glow radius scaling, gold particle shimmer at match point, asteroid Doppler rumble, master ambient filter, LFO pitch modulation on drones
