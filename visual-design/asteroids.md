# Asteroids — Visual & Sound Design

## Current Aesthetic
The game uses pure red `#f44` for everything — ship outline, asteroid outlines, bullets, particles. The ship is a classic 4-vertex polygon with a thrust flame in `#f80`. Asteroids have random jagged polygon outlines. The aesthetic is a pure vector look on black. Canvas is 480×480.

## Aesthetic Assessment
The monochrome red vector look is bold and distinctive — it's a strong design choice that sets this apart from the common "everything is different colors" approach. The jagged asteroid polygons are satisfying. But a single-color game has to execute that constraint flawlessly: the ship, bullets, and asteroids all blending into the same red creates targeting confusion during dense moments, and the lack of any visual depth makes the "space" feel like a flat colored page rather than the void. The original Atari Asteroids vector display had a certain phosphor glow and luminosity that made it feel alive. That quality is absent.
**Score: 3/5**

## Visual Redesign Plan

### Background & Environment
Commit fully to the vector CRT display aesthetic. Background: pure black `#000000`. Add a subtle CRT phosphor glow effect to all drawn lines: render every line twice — once in the main color, once in the same color at 40% opacity and 2px wider, creating a bloom/glow around each vector. This simulates the electron-beam phosphor afterglow of the original Atari vector display.

Add a subtle scanline effect: thin horizontal lines at every 4px across the entire canvas in `rgba(0,0,0,0.15)` — barely visible but suggesting a monitor screen. A very faint vignette: darker corners (radial gradient from transparent center to `rgba(0,0,0,0.3)` at corners).

Star field suggestion: 30–40 single-pixel white dots at random positions, opacity 0.1–0.4, very dim — not competing with the vector art but adding depth to the void.

### Color Palette
Keep the red-dominant palette but add luminosity variation to create depth and hierarchy:

- Ship: `#ff6644` (warm orange-red, slightly brighter than asteroids) with `#ff8866` on highlight edges
- Thrust flame: `#ffaa44` → `#ff6600` gradient suggestion
- Bullets: `#ffdd44` (bright yellow — contrast with ship and asteroids) with `#ffff88` glow
- Large asteroids: `#cc3322` (darker red — less urgent)
- Medium asteroids: `#dd4433` (medium red)
- Small asteroids: `#ff5544` (brighter red — more dangerous, more visible)
- Particle debris: `#ff8866` (orange-red, warmer than asteroids)
- UFO saucer: `#44ffcc` (cyan-green — jarring alien contrast to red palette)
- UFO bullets: `#44ffcc` matching UFO
- Screen phosphor glow: color of element at 40% opacity, 2px wider
- Background: `#000000`
- Stars: `rgba(255,255,255,0.15)` to `rgba(255,255,255,0.4)`

### Entity Redesigns
**Ship**: Maintain the classic triangle-with-notch silhouette (4 vertices). Upgrade: draw with a 2px bright line (`#ff6644`) plus the glow pass. Add a second inner detail: a smaller triangle inside the ship at 40% scale, suggesting the cockpit — drawn in dim `rgba(255,100,80,0.4)`. Thrust flame: when active, 3–5 flame particles per frame from the exhaust vertex in `#ffaa44` to `#ff4400`, fading over 8 frames. Each frame the flame flickers in length (random ±3px).

**Asteroids**: Keep the random jagged polygon outlines (8–12 vertices). Add the glow pass. Large asteroids get 2–3 internal detail lines — random chord lines inside the asteroid polygon at `rgba(200,50,40,0.3)` — suggesting craters or surface features. Rotate slightly each frame (large: 0.3°/frame, medium: 0.6°/frame, small: 1.0°/frame).

**Bullets**: Change from circles/points to short glowing rods — 2×8px rectangles oriented along the velocity direction. Color: bright yellow `#ffdd44` with a glow pass. Leave a 3-segment fading trail behind (each segment at 50% opacity previous).

**UFO**: The classic saucer shape — an ellipse body with a dome on top and flat underside, drawn as a polygon. In alien cyan `#44ffcc` to stand out dramatically from the red palette. The UFO slowly bobs up and down (±3px at 0.5Hz).

**Explosion**: Replaced by the particle system described below.

### Particle & Effect System
**Asteroid break**: When a large asteroid splits, emit 12 particles in `#ff8866` — line segments (2×8px) flying outward at 3–6px/frame, rotating, fading over 30 frames. 3 of the particles are slower and larger (3×12px), suggesting larger debris. The fragment asteroids appear with a brief scale-up from 50% to 100% over 4 frames.

**Small asteroid death**: 8 tiny particles burst outward, fading over 20 frames. A brief bright flash circle (6px, 3 frames) at the impact point.

**Ship death**: 16 particles in `#ff6644` radiate outward, mixed line-segment and dot sizes. The ship lingers for 2 frames with a bright white flash (`#ffffff`) before disappearing. Screen briefly dims to 60% for 8 frames — the CRT going dark.

**UFO explosion**: Bright cyan particle burst (12 particles in `#44ffcc`) plus a bright ring expansion (ring grows from 0 to 40px radius over 15 frames, then fades).

**Thrust flicker**: Thrust flame randomly varies length by ±30% each frame, and occasionally skips a frame (10% chance) — the unsteady nature of rocket thrust.

**Hyperspace jump**: Ship disappears with a bright flash (white circle expanding to 30px over 5 frames), reappears elsewhere with same flash inward (contracting from 30px to 0 over 5 frames).

### UI Polish
Score in top-left — vector-style font suggestion (angular, thin strokes) in white. Lives shown as tiny ship silhouettes (4-vertex polygon, 12px tall) to the right. High score at top-center. Level number as a dim watermark in the background center. Wave advance: a brief flash of the wave number at screen center, white text, fades over 45 frames. Extra life milestone: a bright brief burst around the score counter.

---

## Sound Design Plan
*(All sounds implemented via Web Audio API — zero external files)*

### Sound Events & Synthesis

| Event | Synthesis type | Frequency/params | Duration | Notes |
|-------|---------------|-----------------|----------|-------|
| Ship thrust | Noise + lowpass 300Hz | Continuous rumble, low gain | continuous | Classic rocket motor |
| Player shoot | Oscillator (square) | 880→440Hz sweep | 50ms | Classic space-gun zap |
| Large asteroid hit | Noise + lowpass 200Hz | Deep boom | 300ms | Massive rock impact |
| Medium asteroid hit | Noise + lowpass 350Hz | Mid boom | 200ms | Medium rock impact |
| Small asteroid hit | Noise + bandpass 600Hz | Sharp crack | 100ms | Small rock destruction |
| UFO appear | Oscillator (sine) + LFO | 110Hz, 8Hz LFO amplitude | 400ms | Classic UFO sound |
| UFO shoot | Oscillator (sawtooth) | 660→330Hz | 60ms | Alien weapon |
| UFO death | Noise + bandpass 300Hz | Longer boom | 500ms | Satisfying alien death |
| Player death | Noise bloom + sine fall | Noise burst + 220→55Hz | 1000ms | Dramatic death sequence |
| Extra life | Sine arpeggio | 440→550→660Hz | 200ms | Classic achievement chime |
| Hyperspace | Oscillator (sawtooth) | Random 200–800Hz, rapid sweep | 150ms | Teleport whoosh |
| Level clear | Sine chord | 330+440+550Hz | 300ms | Wave complete tone |

### Music/Ambience
The iconic Asteroids heartbeat: two alternating low sine tones — 55Hz for 150ms, then 44Hz for 150ms, repeating. This tempo increases as the number of remaining asteroids decreases (from 1 beat per second when many remain, to 3 beats per second when nearly cleared). This creates mounting tension as the wave thins out. The tones are at gain 0.15 — prominent enough to feel like a heartbeat. No other ambient music — the minimalism is part of the aesthetic.

## Implementation Priority
- High: Phosphor glow pass on all vector lines, bullet color change to yellow (distinguishing from red asteroids), asteroid rotation
- Medium: Ship cockpit inner detail, asteroid internal crater lines, UFO cyan color contrast
- Low: CRT scanline effect, vignette corners, star field, hyperspace flash animation
