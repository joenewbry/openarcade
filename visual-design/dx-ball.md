# DX-Ball — Visual & Sound Design

## Current Aesthetic
Neon bricks on a dark navy canvas with a subtle `#16213e` grid. Bricks are row-colored in a 10-hue neon palette (`#f44`, `#fa6`, `#ff4`, `#4f4`, `#4cf`, `#48f`, `#a4f`, etc.) with glow applied. The paddle changes color by powerup state (orange/cyan/red). Ball is white with orange glow; fireball adds a red trail. Powerups are labeled boxes in green/red. Particles are square pixel shards with gravity. Screen shake on explosions. Timer bars for active powerups. Lives shown as small dots. Combo multiplier in bottom-right.

## Aesthetic Assessment
**Score: 3/5**

The color variety is good and the glow reads well, but the grid background is flat, the bricks are plain solid rectangles, the ball has no character, and the powerup boxes look utilitarian. With a theme this abstract, there is huge room to add depth, sheen, and atmosphere.

## Visual Redesign Plan

### Background & Environment
A deep space nebula scrolling slowly behind the playfield — two overlapping low-opacity radial hazes (`#0d0624` core, purple-blue outer) with ~200 tiny parallax stars (three speed layers, sizes 1–3). A subtle vertical vignette darkens the play edges. Grid lines replaced with ultra-faint hexagonal grid (`rgba(80,0,200,0.06)`) that pulses gently in sync with the music beat.

### Color Palette
- Primary: `#c84bff` (plasma purple)
- Secondary: `#00e8ff` (electric cyan)
- Accent warm: `#ff6b1a` (fireball amber)
- Background deep: `#07010f`
- Background mid: `#130a28`
- Glow/bloom: `#b030ff`, `#00d4ff`
- Danger red: `#ff2244`

### Entity Redesigns

**Bricks** — Replace flat rects with beveled panels: a 2px inner highlight on top/left edges (`rgba(255,255,255,0.25)`) and a shadow bottom/right edge (`rgba(0,0,0,0.5)`). Each brick has a subtle inner gradient from its row color to 30% darker. Triple-hit bricks show a cracked texture (3 diagonal lines drawn in dark). Explosive bricks pulse red with a warning-chevron symbol instead of `*`. On destroy, bricks shatter into 6–10 triangular shards that spin and fade.

**Paddle** — Pill shape with rounded ends (drawn as rect + two semicircles). Default state: metallic cyan with a white highlight stripe across the top 20%. Fireball state: deep amber with animated ember particles drifting backward. Catch state: pulsing cyan with a magnet-field arc drawn above it.

**Ball** — Render as a glowing plasma sphere: inner bright white core circle, outer radial glow ring (3–4px stroke at 40% alpha), and a chromatic tail of 6 fading ghost-circles in `purple → cyan → white` when in motion. Fireball state: the ball becomes a flaming orange-red comet with a 12-frame animated fire trail using orange/yellow/white circles.

**Powerups** — Replace labeled boxes with glowing capsules. Good powerups float downward with a soft green shimmer aura; bad ones pulse red. Each type gets a distinct icon drawn from simple shapes: WIDE = horizontal bar, x3 = three dots, FIRE = triangle flame, GRAB = arc magnet.

### Particle & Effect System
- **Brick destruction**: 8–12 triangular shards per brick, random spin, gravity 0.08, lifetime 40 frames, fade to alpha 0.
- **Explosive chain**: Expanding shockwave ring (strokePoly circle growing from 0 to 60px over 20 frames, color `#ff6b1a`, fading). Then a second brighter ring at half radius in white.
- **Combo milestone** (every 3 hits): Radial burst of 20 tiny star sparks in current row color, lifetime 25 frames.
- **Paddle deflect**: 4–6 white sparks upward from contact point.
- **Ball trail**: 8 ghost positions at 85% spacing, each at 12% alpha, blurred by glow.

### UI Polish
- Score counter uses large pixel-art-style font with a `#c84bff` glow; new high score triggers a golden flash animation.
- Level transition: current screen tiles fly apart (scale + rotate) revealing a starfield level name text.
- Lives shown as small gem-shaped diamonds with color matching the ball.
- Timer bars are rounded capsules with an inner glow fill, not raw lines.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Ball hits brick (normal) | Square wave + white noise burst | 440 Hz square, Q=8 bandpass noise at 2 kHz | 80 ms | Pitch varies by row: higher rows = higher note |
| Ball hits double brick | Same + 1 octave down detuned | 220 Hz + 217 Hz (3 Hz beat) | 120 ms | Slight reverb tail |
| Ball hits triple brick | Distorted saw wave | 180 Hz, waveshaper drive | 140 ms | Heavy, satisfying |
| Brick explodes (explosive) | Noise burst + sub boom | White noise at 1 kHz, sine sub at 60 Hz | 400 ms | Screen shake sync |
| Ball hits paddle | FM synthesis click | Carrier 300 Hz, mod 600 Hz, ratio 2 | 60 ms | Bright ping |
| Powerup collect (good) | Rising arpeggio | C4–E4–G4–C5 sawtooth, 80ms per note | 320 ms | Warm major chord |
| Powerup collect (bad) | Descending chromatic | G4–F#4–F4, square wave | 200 ms | Dissonant drop |
| Ball lost / life lost | Low filtered noise sweep | White noise HPF 800→200 Hz sweep | 600 ms | Sorrowful down-sweep |
| Level clear | 4-note fanfare | C5–E5–G5–C6, detuned synth | 800 ms | Triumphant, spacey |
| Combo x multiplier tick | Short blip, pitch rising | 600 + (combo×50) Hz, sine | 40 ms | Gets higher as combo climbs |
| Fireball active | Continuous crackle | Bandpass noise 800 Hz, LFO tremolo 8 Hz | Looped | Stop on expiry |

### Music/Ambience
A generative ambient pulse: a single root drone (40 Hz sine at very low volume, `gainNode.gain = 0.05`) combined with a slow arpeggio sequencer that cycles C–G–D–A–F in Dorian mode at 90 BPM, using triangle waves with heavy reverb (convolver with a 1.5s impulse). The arpeggio tempo doubles when the ball speed is at maximum, creating a natural tension response to gameplay.

## Implementation Priority
- High: Beveled brick panels with shard destruction particles, ball glow trail system, explosive shockwave ring, Web Audio brick-hit tones
- Medium: Nebula star background, paddle redesign (pill + state colors), powerup capsule icons, combo spark burst, ambient drone music
- Low: Hexagonal grid pulse, level transition tile-fly animation, golden score flash, chromatic ball comet tail
