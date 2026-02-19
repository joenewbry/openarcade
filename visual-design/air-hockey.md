# Air Hockey — Visual & Sound Design

## Current Aesthetic
The game renders on a dark table (`#141428`) with wall borders in `#0f3460`, a cyan `#6cf` player mallet, red `#f66` CPU mallet, and a white puck with a subtle glow. The puck leaves a fading trail of circles. Score is displayed as large dim background numbers. Canvas is 400×600.

## Aesthetic Assessment
The color coding is clean and the puck trail gives satisfying motion feedback. But the table itself is generic — it could be any arena. Real air hockey tables have a distinctive look: the bright centerline, goal slots, and the reflective white surface that makes it feel like an actual physical object. The mallets look like plain circles with no depth. There's no sense of the air cushion, no surface reflectivity, no crowd noise ambience. The scoring is functional but not exciting.
**Score: 2/5**

## Visual Redesign Plan

### Background & Environment
Redesign the table surface to feel like a real air hockey table. Base surface: bright white `#e8f0ff` with a very slight blue tint, contrasting sharply with any dark UI chrome. Table border: solid red `#cc2200` frame (8px thick) with rounded corners and a subtle inner shadow. Center line: bold white `#ffffff` line at the midpoint with a center circle (radius 30px, unfilled, 2px stroke). Air holes: a faint grid of tiny circles (2px radius, `rgba(180,200,220,0.3)`) across the entire surface at 20px intervals — hundreds of them — suggesting the air cushion. Goal slots: recessed rectangles at the top and bottom center, with a dark background (`#1a0a00`) and subtle depth shadow lines.

Table surround (the chrome frame visible beyond the play area): a 16px border in metallic silver `#aabbc0` with a highlight gradient suggesting the chrome railing.

### Color Palette
- Table surface: `#ddeeff` with `#f0f8ff` highlight zone near center
- Table border/rail: `#cc2200` (red sport table classic)
- Chrome frame: `#aabbc0`, highlight `#ddeeff`
- Center line: `#ffffff`
- Goal slot: `#1a0a00`
- Player mallet (blue): `#1155ff` fill, `#4488ff` highlight ring, `#002288` base
- CPU mallet (red): `#dd2200` fill, `#ff5533` highlight ring, `#880000` base
- Puck: `#111111` with `#333344` highlight crescent
- Puck trail: `rgba(80,80,100,0.3)` fading
- Score digits: `rgba(0,0,0,0.15)` watermark on each half

### Entity Redesigns
**Player mallet**: Three-layer circle — a large outer ring in dark blue (`#002288`, radius+6), the main fill in `#1155ff`, and a bright crescent highlight in `#88aaff` at the top-left (partial arc, 220°–320°). A thin shadow offset 3px down-right at `rgba(0,0,0,0.3)` gives lift. The handle nub at the center: a small circle (8px) in `#ffffff`.

**CPU mallet**: Same structure in reds. Outer ring `#880000`, fill `#dd2200`, highlight `#ff8866`, center nub `#ffffff`.

**Puck**: Dark `#111111` circle with a bright crescent highlight at top-left (`rgba(255,255,255,0.6)`), a subtle edge shadow at bottom-right, and a tiny circular air-hole visible at center (`#222233`). Puck thickness is suggested by a thin dark ellipse drawn 3px offset below and right.

**Puck trail**: Instead of circles, use elongated ellipses oriented along the puck's travel direction, fading from `rgba(60,60,90,0.5)` to transparent over 8 trail segments. Trail width narrows toward the tail end.

**Puck shadow**: A dark ellipse directly beneath the puck, at `rgba(0,0,0,0.25)`, slightly larger than the puck, stays fixed while puck moves — gives air-gap feel.

**Goal flash**: When a goal is scored, the goal slot floods with the scoring player's color in a bright flash that fades over 20 frames, and the score number scales from 2.0 to 1.0 over 15 frames.

### Particle & Effect System
**Puck-mallet collision**: 6 small sparks at the collision point — bright white `#ffffff` sparkles (2×2px), radiating outward at 2–4px/frame velocity, fading over 10 frames.

**Wall bounce**: 4 sparks at bounce point in the wall's color (`#cc2200`), same behavior.

**Goal scored**: 16 particles burst from the goal slot in the scoring team's color, arcing upward. Score text zooms in (scale 0 → 1.5 → 1.0) over 20 frames. Table surface briefly flashes in the scorer's color at `rgba` tint.

**Puck speed indicator**: When puck exceeds ~8px/frame velocity, add a short bright glow trail: the last 3 trail segments are brighter (`rgba(140,140,200,0.6)`) and slightly larger.

**Mallet drag**: When the player drags the mallet quickly, 3-5 motion blur ghost images at decreasing opacity trail behind it.

### UI Polish
Score display: large numerals centered on each half of the table, in `rgba(0,0,0,0.12)` (watermark style) — dim enough to not distract but visible at a glance. When a goal is scored, the updated numeral animates in with a scale bounce. "GOAL!" text appears at center in the scoring player's color, 40px bold, for 60 frames. Game timer or first-to-7 indicator at the very top of the chrome rail. Optional: player name label on each mallet when both are visible.

---

## Sound Design Plan
*(All sounds implemented via Web Audio API — zero external files)*

### Sound Events & Synthesis

| Event | Synthesis type | Frequency/params | Duration | Notes |
|-------|---------------|-----------------|----------|-------|
| Puck-mallet hit | Noise burst + bandpass 1200Hz | Sharp click | 60ms | Plastic impact sound |
| Puck-wall bounce | Noise burst + bandpass 800Hz | Mid click | 50ms | Slightly softer than mallet hit |
| Goal scored | Noise bloom + sine chord | Low boom + 220+330Hz chord | 500ms | Dramatic scoring sound |
| Game start | Sine sweep | 440→880Hz | 200ms | Air hockey table startup whistle |
| Puck high speed | Noise + highpass 3kHz | Faint hiss | continuous | Subtle air rushing sound, low gain |
| Player wins | Sine fanfare | 440→550→660→880Hz, 80ms ea | 400ms | Victory chime |
| CPU wins | Sine descent | 440→330→220Hz, 150ms ea | 450ms | Defeat sound |
| Puck spawn | Sine ping | 660Hz | 80ms | Light placement sound |
| Near miss (puck near goal) | Oscillator (triangle) | 880Hz flutter | 100ms | Tension burst |

### Music/Ambience
The air hockey table's ambient sound: a constant low-frequency air hiss simulated with a noise generator filtered through a highpass at 400Hz and lowpass at 1200Hz, gain 0.04 — the background hum of the air cushion system. This loops continuously and is the auditory foundation of the game. Over it, a very faint rhythmic crowd ambience: amplitude-modulated noise at 0.8Hz (suggests murmuring crowd). Both layers together create the feeling of being in an arcade with a real air hockey table running.

## Implementation Priority
- High: Table surface redesign (air hole grid, red rail border, goal slots), mallet 3D highlight rendering, puck crescent highlight
- Medium: Spark collision particles, goal scored flash/animation, puck speed trail enhancement
- Low: Mallet drag ghost images, puck shadow ellipse, crowd ambience layer
