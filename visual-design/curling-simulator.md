# Curling Simulator — Visual & Sound Design

## Current Aesthetic
A clean overhead curling simulation with a well-structured ice sheet. The house uses concentric rings in red/blue/white. The ice surface is rendered with gradient approximation in pale blues (`#c8dce6` to `#c0d4de`) and 120 subtle pebble dots. Stones are drawn with multi-layered circles giving a granite look — red for player, yellow for CPU. A power bar with gradient fill sits on the right edge. The scoreboard and sweep broom animation are functional. The overall look is polished but cold and clinical — it reads like a sports app more than an arcade game.

## Aesthetic Assessment
**Score: 3/5**

Mechanically faithful and visually clear, but the palette is timid and there's no drama. The ice feels flat, stones lack character, and the sweep effect is barely visible. The neon border (`#4cf`) suggests ambition toward an arcade aesthetic that isn't fully realized.

## Visual Redesign Plan

### Background & Environment
Transform the sheet into a dramatic "arena ice" — imagine a packed Olympic venue at night. The background outside the sheet is deep dark blue-grey (`#0d0d1a`), representing the arena shadow. The ice itself gets a strong cinematic treatment:

- **Ice surface**: Iridescent layered look — base coat pale blue-white, overlaid with thin diagonal scratch lines simulating skate marks, and a central glow bloom directly under the house (bright white with falloff). Pebble texture becomes more pronounced — varied dot sizes, some slightly raised-looking via a 1px white highlight offset.
- **House rings**: The rings get stronger contrast — outer blue `#1a4a9a`, white gap `#f0f8ff`, red `#cc2222` — all with a thin luminous edge on the inner face.
- **Arena surround**: Faint crowd silhouettes fill the space left/right of the sheet using simple dark polygon humps. Overhead spotlight polygons shine down onto the sheet from top corners.
- **Lane lines and hog lines**: More visible, given neon-red glow treatment (`#ff4444` with bloom) to reinforce their importance.

### Color Palette
- Primary (player stone): `#cc2222`
- Secondary (CPU stone): `#ccaa11`
- Ice base: `#daeaf5`
- Ice deep: `#b8d4e8`
- House outer: `#1a4a9a`
- House mid red: `#cc2222`
- House button: `#f8f8ff`
- Hog line: `#ff4444`
- Arena surround: `#0d0d1a`
- Neon accent: `#44ccff`
- Glow/bloom: `#ffffff`

### Entity Redesigns
**Stones**: Reworked to look like polished granite. The main body uses a radial gradient approximation — three concentric circles with the outer being darker (`#8a1818` for red, `#8a7a00` for yellow), middle being the main color, and a small bright center highlight. The handle becomes a distinct cruciform metal fitting in gunmetal grey with a bright specular dot. During sliding, the stone casts a faint oval shadow offset slightly in the direction of travel. Active stone gets a pulsing halo ring.

**Broom animation**: When sweeping, two crossed broom lines near the stone are replaced by an actual animated broom head — a filled rectangle that rapidly oscillates left-right across the stone's path. Ice shavings particle effect (tiny white rectangles) scatter from the broom contact point.

**Power bar**: Moved to left side, made wider and taller. The gradient uses cleaner color stops — deep teal at low power, yellow at optimal, red at redline. A prominent triangular notch marks the "sweet zone." The power bar housing gets a riveted metal panel aesthetic.

### Particle & Effect System
- **Stone collision**: Shards of ice (white/pale blue polygons, 6–10 pieces) scatter radially, decelerate, and fade over 30 frames.
- **Stone going out of play**: Distant splash of red/gold fragments.
- **Sweep effect**: Ice crystal dust — tiny white circles (r=1–3) spawned in a swath 15px wide ahead of the stone, drift sideways with the sweep direction and fade.
- **Scoring moment (end complete)**: Golden star burst from the house button — 8 beams of light that expand and fade.
- **Hogged stone**: Stone fragments with a small "poof" of ice dust as it's removed.

### UI Polish
- Scoreboard at top gets a proper TV-style graphic — dark panel with team color headers, round numbers in a clean monospace style, total score highlighted in `#44ccff`.
- Stone count tracker at bottom: stones rendered as mini stone icons (small circles) rather than plain colored dots.
- Aim guide line gets arrowhead tip and range rings at 1/3 and 2/3 distance.
- End-complete overlay is a full dramatic banner with the scoring team's color flooding the screen at low opacity.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Stone release / launch | Smooth whoosh: bandpass noise 600–2000 Hz, quick fade | 200ms | Like a granite whisper |
| Stone sliding | Continuous rumble: sawtooth LFO 30 Hz + ice texture noise 800 Hz | Looping, gain ~ speed | Doppler pitch shift as stone slows |
| Stone collision | Hard knock: sine 120 Hz sharp attack, exponential decay + high noise crack | 180ms | Deep granite thud |
| Sweep broom | Brush noise: filtered noise 1.5–4 kHz, rapid tremolo at 8 Hz | Looping while sweeping | Scratchy, rhythmic |
| Stone in-house bounce off wall | Low thud: sine 80 Hz + short noise | 150ms | Dampened |
| Stone out of play (hogged) | Descending tone: sine 300→100 Hz | 400ms | Disappointed fall |
| Score point | Celebration arpeggio: sine tones C5 E5 G5 C6 | 60ms each | Bright fanfare |
| Blank end | Neutral two-note: sine 440 Hz then 330 Hz | 200ms each | Anticlimactic |
| Cursor/aim move | Soft tick: sine 880 Hz 20ms, very quiet | 20ms | UI feedback |
| Game end win | Full ascending run: C4 E4 G4 C5 E5 G5 C6, reverb | 800ms total | Triumphant |

### Music/Ambience
An ambient Nordic-winter pad: three stacked sawtooth oscillators detuned by ±5 cents, tuned to a D minor 7 chord (D3, F3, A3, C4), with slow attack (2s) and slow release. Volume pulses with a 0.1 Hz LFO (very gentle breathing effect). Quiet crowd ambience simulated as bandpass noise (`#0a0a1a` frequency 800 Hz) at very low gain. When a stone is sliding, the pad gains brightness with a filter cutoff increase. Everything cuts to near-silence on stone collision for dramatic impact.

## Implementation Priority
- High: Stone granite radial look + pulsing halo on active stone, ice collision particle shards, sweep ice-dust particles, improved scoreboard
- Medium: Arena dark surround with spotlight beams, animated broom head, power bar metal aesthetic, scoring banner overlay
- Low: Crowd silhouettes, stone sliding Doppler sound, stone skate-mark trail on ice, stone shadow during travel
