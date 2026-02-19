# Golf It — Visual & Sound Design

## Current Aesthetic

Mini-golf with a dark navy background (`#0a0a18`), green fairways (`#1a3a1a`), slate walls (`#556`), and semi-transparent blue water hazards. The ball is white with a trail. Flags are red. Windmill arms are brown (`#a86`). Bumpers are dark red with pink outline. Aiming line is dashed. Power bar fills green. Scorecard uses a dark panel. Overall functional but visually flat — the dark-on-dark fairway lacks contrast and glow, and the water/windmill effects are minimal.

## Aesthetic Assessment

**Score: 2/5**

The course elements are distinguishable but lack depth, glow, or atmosphere. The fairway blends into the background. Water has no shimmer. The ball has a basic trail. There is no ambient lighting or environmental storytelling. It reads more like a wireframe than a polished arcade game.

## Visual Redesign Plan

### Background & Environment

Replace the flat `#0a0a18` background with a layered starfield or subtle hex-tile pattern in deep indigo `#080818`. Add a soft radial vignette darkening corners. The fairway should glow faintly green from within — use a gradient fill `#0d2a0d` → `#1a3a1a` with a subtle inner glow outline `rgba(100,255,80,0.15)`. Course edges should have a neon-green trim line `#4f4` with a 4px glow.

For each hole, add a unique atmospheric accent:
- Windmill holes: soft amber spotlight `rgba(255,160,60,0.08)` cast beneath the windmill
- Water holes: animated caustic shimmer pattern on water surface
- Bumper holes: pulsing red halo beneath bumpers

### Color Palette

- Primary (theme/green): `#8fff44`
- Secondary (wall/structure): `#667788`
- Background deep: `#080818`
- Fairway surface: `#162a16`
- Fairway glow: `#2a5a2a`
- Water base: `#0d2255`
- Water shimmer: `#2266ff`
- Flag red: `#ff3344`
- Windmill: `#cc9944`
- Bumper: `#ff2233`
- Bumper glow: `#ff8888`
- Power bar fill: `#44ff88`
- Ball: `#ffffff`
- Ball trail: `rgba(200,255,180,0.6)`

### Entity Redesigns

**Ball:** Pure white `#ffffff` with a 6px radial glow `rgba(255,255,255,0.6)`. Trail should be 8 segments fading from `rgba(180,255,140,0.8)` → transparent, each segment slightly smaller. On collision impact, burst 6 small spark particles outward.

**Hole/Cup:** Dark interior `#0a0a0a` with a bright neon-green rim `#4f4` and a pulsing outer glow ring. The flag pole should be a slim neon-white line; the flag a bright red `#ff3344` triangle with a white outline.

**Walls:** Fill `#1a2233`, top edge `#4488aa` with 2px glow. Corner junctions get a small bright dot accent.

**Water:** Animated base `#0d1a44`. Overlay scrolling diagonal caustic lines `rgba(80,160,255,0.12)`. Surface has 3 animated sine-wave highlight lines in `rgba(100,180,255,0.3)`. Splash on ball entry: 8 water droplet particles arc outward in blue-white.

**Windmill:** Arms `#cc9944` with bright tip dots `#ffee88`. Rotation leaves a faint motion blur trail `rgba(200,150,60,0.15)`. Hub is a bright gold circle.

**Bumpers:** Base `#220011`, fill `#cc1122`, rim `#ff4455` with constant radial glow. On ball hit, flash white `#ffffff` for 3 frames then return to red.

**Power Bar:** Dark track `#0a0a18`, border `#334`, fill gradient `#00ff44` → `#ffff00` → `#ff2200` based on power. Pulsing at max power. Label text in `#8fff44`.

**Aiming Line:** Dashed `rgba(255,255,255,0.4)`, dash spacing increases with distance. Terminal dot at aim point pulses gently.

### Particle & Effect System

- **Ball trail:** 8 fading ghost-circles per frame, green-white gradient
- **Ball impact spark:** 6 particles, velocity 100–200px/s, life 0.3s, color `#ffffaa`
- **Hole-in burst:** 12 star particles + screen flash `rgba(100,255,80,0.3)` on hole completion
- **Water splash:** 8 arc particles `#88aaff`, 1 ripple ring expanding outward
- **Water sink:** Ball shrinks to zero over 0.5s with ripple rings
- **Bumper hit flash:** Bumper fills `#ffffff` for 3 frames, emits 4 spark particles
- **Power bar pulse:** CSS-style glow oscillation at max power
- **Windmill shadow:** Soft rotating shadow cast onto fairway beneath windmill

### UI Polish

- Scorecard: dark glass panel `rgba(10,15,30,0.92)` with neon-green header bar `#4f4`, per-hole scores in colored cells (birdie=blue, par=white, bogey=red)
- Hole number display: large neon numeral with glow, top-left
- Player indicator: colored dot with name, animated when their turn
- Course name text in `#8fff44` at start of each hole
- Transition between holes: radial wipe with green light sweep

## Sound Design Plan

*(Web Audio API only)*

### Sound Events & Synthesis

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Ball hit (soft) | Sine oscillator, quick attack | 300Hz → 180Hz, gain 0.4 | 0.15s | Light tap feel |
| Ball hit (power) | Sawtooth + lowpass filter | 200Hz → 100Hz, cutoff 800Hz, gain 0.6 | 0.25s | Punchy thwack |
| Ball roll | White noise, bandpass filter | center 400Hz, Q 2, gain 0.08 | Looped while rolling | Faint rumble |
| Wall bounce | Triangle oscillator, sharp | 500Hz → 300Hz, gain 0.3 | 0.1s | Crisp click |
| Water splash | White noise burst, lowpass | cutoff 300Hz, gain 0.5 | 0.4s | Wet slap |
| Ball sinking | Sine glide down | 400Hz → 80Hz, gain 0.3 | 0.8s | Glug feel |
| Hole-in-one | Major arpeggio | C5-E5-G5-C6, 0.08s each, sine | 0.5s | Triumphant fanfare |
| Bumper bounce | Triangle, fast decay | 600Hz → 400Hz, gain 0.5 | 0.15s | Boing |
| Power bar fill | Rising sine tone | 200Hz → 600Hz proportional to power, gain 0.15 | Continuous while aiming | Subtle charge-up |
| Score card open | Whoosh | White noise sweep, gain 0.3 | 0.3s | UI swipe |
| Birdie | Two-tone chime | E5 then G5, sine, gain 0.4 | 0.4s | Pleasant reward |
| Bogey | Descending minor | G4 then E4, sine, gain 0.3 | 0.4s | Mild disappointment |
| Windmill hit | Hollow knock | 250Hz triangle, gain 0.4 | 0.2s | Wooden thud |
| Round complete | Ascending chord sweep | C4-E4-G4-B4-C5 arpeggio | 1.2s | Victory fanfare |

### Music/Ambience

Generative ambient loop using two detuned sine oscillators (110Hz and 113Hz) for a slow gentle beating. Layer a soft pad using triangle wave at 55Hz with slow LFO on gain (0.1 → 0.25, rate 0.2Hz). Add occasional high soft pings (triangle, 880Hz, gain 0.05, random 5–15s interval) for a zen golf-course atmosphere. The whole mix stays under gain 0.3 to not compete with SFX.

## Implementation Priority

- High: Ball glow and trail, fairway edge neon outline, hole completion burst, water splash/sink animations
- Medium: Windmill motion blur trail, bumper hit flash + glow, power bar gradient + pulse, full sound event set
- Low: Per-hole atmospheric spotlight, caustic water overlay, scorecard cell color coding, ambient music loop
