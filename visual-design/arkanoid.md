# Arkanoid — Visual & Sound Design

## Current Aesthetic
The game uses a subtle blue grid background (`rgba(15,52,96,0.3)`), 10 rainbow row colors (`#f44`, `#f80`, `#fa0`, `#ff0`, `#8f0`, `#0f0`, `#0f8`, `#0ff`, `#08f`, `#88f`), a cyan paddle `#4fb` (red `#f44` when laser active), a white ball with glow, and colored rectangular power-ups. Canvas is 480×600.

## Aesthetic Assessment
The rainbow brick wall is colorful and readable, and the power-up coloring system works. The glowing ball is a nice touch. But the bricks are flat rectangles with no depth — they look like colored tiles rather than physical objects. The background grid is too subtle to add visual interest. The paddle is plain. The original Arkanoid had a distinctive sci-fi space station feel — the bricks were panels on an alien structure, and the Vaus spaceship paddle had a distinct identity. That sci-fi atmosphere is completely absent here.
**Score: 2/5**

## Visual Redesign Plan

### Background & Environment
Replace the flat grid with a space/sci-fi backdrop. Background: deep space `#020408` base. A faint star field (60 tiny white dots at random positions, opacity 0.1–0.5, fixed). Horizontal scan lines running across the entire background at `rgba(0,40,80,0.08)` (thin lines every 8px), suggesting a digital display or alien hull. The play field border is a bright circuit-board frame: outer edge `#001a33`, inner edge with bright segments of `#0066ff` and `#00ffcc` at the corners — like a technological containment field. Subtle vertical edge glow: a `rgba(0,100,200,0.08)` gradient on left and right sides.

### Color Palette
- Background: `#020408` deep space
- Star field: white at varied opacity
- Brick row 1 (bottom): `#ff2244` — rising sun red with `#ff6688` highlight
- Brick row 2: `#ff6600` with `#ffaa44` highlight
- Brick row 3: `#ffaa00` with `#ffdd44` highlight
- Brick row 4: `#ccee00` with `#eeff44` highlight
- Brick row 5: `#44dd00` with `#88ff44` highlight
- Brick row 6: `#00cc44` with `#44ff88` highlight
- Brick row 7: `#00ccaa` with `#44ffdd` highlight
- Brick row 8: `#00aaff` with `#44ccff` highlight
- Brick row 9: `#4455ff` with `#8899ff` highlight
- Brick row 10: `#cc44ff` with `#ee88ff` highlight
- Ball: `#ffffff` fill, `#88ccff` glow
- Paddle: `#00ddff` hull, `#ffffff` cockpit highlight, `#002244` underside
- Paddle (laser): `#ff4422` fill, `#ff8866` highlight
- Border frame: `#0066ff` corners, `#00ffcc` accent

### Entity Redesigns
**Bricks**: Three-layer depth effect — a dark underside face (bottom and right edges of brick, 3px wide, in brick color at 40% brightness), the main face fill (brick color), and a bright highlight top-left bevel (top and left edges, 2px wide, in brick color at 180% brightness). A tiny dark shadow pixel at the bottom-right corner completes the 3D look. This makes each brick look like a raised panel. Special bricks (multi-hit) get a bright silver border and a visible internal pattern: diagonal hash lines in `rgba(255,255,255,0.15)`.

**Paddle (Vaus)**: Redesign as a spaceship silhouette — a flattened oval with tapered nose (slightly pointed left and right), a raised cockpit bubble at center (small bright circle `#ffffff`), and two small thruster nozzles at the rear. Body color `#00ddff`, underside slightly darker `#0088aa`, cockpit bright white with a cyan glow. When laser is active, two thin red emitters extend from the front edges.

**Ball**: Bright white `#ffffff` core circle with a wide cyan glow halo (`#88ccff`, radius 1.5× ball radius). When the ball moves fast (>5px/frame), leave 4 motion-trail ghost images at decreasing opacity behind it. Ball surface has a tiny highlight crescent at top-left.

**Power-ups**: Instead of plain colored rectangles, each power-up type has a distinct icon:
- Expand: wide left-right arrows
- Laser: twin red bullet icons
- Multi-ball: 3 small circles
- Catch: hand/magnet icon
- Slow: downward arrow
- Life: heart shape
All on dark blue background `#001a44` with colored icon in the power-up's color. They fall with a gentle rotation (1°/frame) and a slow pulse glow.

### Particle & Effect System
**Brick break**: 8 particle shards in the brick's color — angular 4-8px trapezoid shapes (use a 4-vertex polygon drawn as a quad), flying outward from impact point at 2–5px/frame, rotating as they go, fading over 25 frames. Plus a brief bright flash at impact point (8px white circle, 3 frames).

**Ball-brick impact**: Small `+points` text floats up from the break point in yellow, drifts 20px up over 30 frames, fades in last 10 frames.

**Power-up catch**: 12 small particles in power-up color burst from the paddle's catch point, fading over 20 frames. Power-up name text appears above paddle for 40 frames.

**Laser beam**: Thin bright red line from paddle emitter to first hit target, with a brighter spot at the impact end. The beam has a 3-frame animation as it fires (grows from paddle to impact point).

**Multi-ball spawn**: When multi-ball power-up activates, each new ball appears with a brief scale-up from 0 to 1.2 to 1.0 over 8 frames.

**Ball loss**: When ball falls off screen, a brief sad downward pulse on the paddle (scale to 0.9 in Y axis and back over 6 frames).

**Level clear**: Bricks flash in rainbow sequence (top to bottom, each row flashing its color) then disappear over 30 frames. Bright full-screen white flash at end.

### UI Polish
Score in top-left, sharp white with cyan shadow. Lives shown as tiny Vaus ship silhouettes (4 vertices each) to the right of score. Level number at top-center. High score at top-right. Ball speed indicator: a tiny arrow below the score in the ball color, with arrow length proportional to speed. When score passes a milestone, a brief "+BONUS" appears at center and fades. Border frame corner lights flash when points are scored.

---

## Sound Design Plan
*(All sounds implemented via Web Audio API — zero external files)*

### Sound Events & Synthesis

| Event | Synthesis type | Frequency/params | Duration | Notes |
|-------|---------------|-----------------|----------|-------|
| Ball-paddle hit | Oscillator (sine) | 440Hz → 660Hz sweep | 50ms | Springy bounce sound |
| Ball-brick hit | Oscillator (square) | 880Hz brief | 40ms | Solid impact click |
| Ball-wall bounce | Oscillator (sine) | 330Hz brief | 35ms | Duller than brick hit |
| Brick break (normal) | Noise + bandpass 600Hz | Short crack | 80ms | Satisfying break |
| Brick break (multi-hit) | Noise + bandpass 400Hz | Deeper crack | 100ms | Heavier hit |
| Power-up fall | Oscillator (sine) | 220Hz low hum, continuous | ongoing | Very subtle while falling |
| Power-up collect | Sine arpeggio | 440→660→880Hz, 40ms ea | 150ms | Bright power-up sound |
| Laser fire | Oscillator (sawtooth) | 1200→800Hz sweep | 60ms | Sci-fi laser zap |
| Laser hit brick | Noise + bandpass 800Hz | Crisp crack | 50ms | Cleaner than bounce break |
| Ball lost | Sine descent | 440→220→110Hz, 150ms ea | 450ms | Falling tone |
| Extra life | Sine fanfare | 523→659→784Hz | 300ms | Joyful chime |
| Level clear | Sine arpeggio | Full ascending 5-note run | 500ms | Victory |
| Game over | Sine sad chord | 330+220Hz minor, decay | 800ms | Somber ending |

### Music/Ambience
Sci-fi space station ambient: a low sawtooth oscillator at 44Hz (sub-bass rumble) suggests the power systems of a space structure. Over it, an LFO-modulated sine at 110Hz sweeps in amplitude (0.1Hz LFO rate) — the hum of engines or life support. A slow arpeggiated motif in triangle oscillator (220→165→196→220Hz, one note every 1.5 seconds) adds a mysterious sci-fi melodic suggestion. The overall gain is 0.05 — present as atmosphere, never distracting from the gameplay rhythm of bouncing sounds.

## Implementation Priority
- High: Brick 3D bevel effect, paddle Vaus spaceship redesign, brick break angular shard particles
- Medium: Space background with star field and scan lines, ball motion trail, power-up icon designs
- Low: Border frame glow, circuit board corner accents, ball-loss paddle pulse animation
