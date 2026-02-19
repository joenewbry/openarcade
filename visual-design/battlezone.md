# Battlezone — Visual & Sound Design

## Current Aesthetic
A vector-art first-person tank combat game rendered in classic green monochrome (`#4e8` / `#6fa`). The sky is near-black (`#0a0a1a`), the ground is slightly lighter. Mountains on the horizon are drawn as a green polyline. The ground is a perspective grid of green lines that recede into the distance. Tanks are wireframe green polygons drawn in 3D perspective. Bullets are small glowing green circles. The HUD shows a green compass strip, a circular radar in the top-right, and a stylized cockpit frame at the bottom. Explosion particles are small green squares. The look is an accurate and loving recreation of the 1980 Atari Battlezone vector display.

## Aesthetic Assessment
This is authentically Battlezone and the vector monochrome aesthetic is intentional and correct. It captures the original perfectly. The radar, cockpit frame, mountain range, and grid all fit. However the particle system uses the wrong color (green) — real Battlezone explosions were bright multi-color flashes. The cockpit frame could be more dramatic. Stars barely twinkle.
**Score: 4/5**

## Visual Redesign Plan

### Background & Environment
Keep the pure vector aesthetic but intensify it. The sky zone: true black with 60 tiny white stars that have genuine twinkle (oscillating between 1-3px, varying brightness). Mountains become more dramatic — taller, jagged peaks with a glowing phosphor green color that has a slight bloom effect. Add a moon: a simple circle outline in dim green on the horizon right side.

The ground grid: keep the perspective recession but add a subtle scanline CRT effect — every other raster row of the grid slightly dimmer, giving a true phosphor-screen appearance. The horizon line glows brighter than now.

The sky gradient: pure black at the very top transitioning to a near-black dark greenish-black (`#000a03`) at the horizon — the color of a phosphor screen's ambient glow.

### Color Palette
- Primary vector green: `#4aff80`
- Dim vector green: `#1a6630`
- Bright/active: `#80ffaa`
- Background sky: `#000000`
- Horizon ambience: `#000a03`
- Enemy red bullets: `#ff3333`
- Radar blip: `#ff4444`
- HUD amber accents: `#ff9900`

### Entity Redesigns
**Player tank (cockpit view):** The existing cockpit frame lines get thicker and more dramatically angled — wider at the bottom corners, more like a real tank viewport. Add subtle vibration shake when firing (1-2px random offset for 3 frames).

**Enemy tanks:** The current wireframe polygon tank is good. Enhance it: add a second inner wireframe slightly smaller (double-line effect common on vector hardware). Enemy barrels should extend further and have a bright tip dot. Higher-HP enemies get a second turret line for visual distinction.

**Obstacles (rocks/buildings):** Current boxes are good. Add a faint fill using very sparse dot grid (every 4px a dim pixel) to give the impression of solid volume without breaking the wireframe aesthetic.

**Bullets:** Player bullets — bright green circle with a trailing line (3-4px tail showing direction of travel). Enemy bullets — bright red/orange circle with similar trail.

### Particle & Effect System
**Explosion:** Current green particles are wrong. Enemies explode with: 1) a bright white flash (full-screen brief white rect at 0.15 alpha for 2 frames), 2) 8 straight lines radiating outward (vector explosion "starburst" — classic vector game look), fading over 20 frames. 3) 3 smaller secondary bursts at ±15px offset, delayed 4 frames. Colors: white → yellow → orange, all fading.

**Player hit:** Screen flash red at 0.3 alpha for 3 frames. Cockpit frame glows red briefly.

**Bullet impact on obstacle:** 4 small green line segments spray outward (like sparks).

### UI Polish
Compass strip at bottom: add tick marks for N/NE/E etc. with slightly brighter glow on the current direction indicator. Radar: add a slow sweep line (like a real radar sweep) rotating around the center, leaving a short afterglow trail. The score display gets a CRT-style "SCORE" label in the classic Atari font style. Add a round count / wave indicator in top-left.

## Sound Design Plan
*(Web Audio API only — no external files)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Player fire | Square wave blast | 180Hz square, fast attack, exponential decay | 0.3s | Classic tank cannon thud |
| Player bullet travel | Pitched whine | 800→200Hz sawtooth sweep while alive | per bullet | Ricochet whine feel |
| Enemy fire | Lower square | 120Hz square, similar envelope | 0.3s | Deeper than player |
| Enemy bullet near-miss | Doppler whine | 1200→400Hz sine sweep | 0.2s | Whoosh past the player |
| Enemy explosion | Layered noise | White noise 0.1s + 80Hz sine 0.4s decay | 0.6s | Boom + rumble |
| Player hit | Impact + alarm | Noise burst + 440Hz alarm beep x2 | 0.5s | Danger alert |
| Engine idle | Continuous rumble | 30Hz sine at very low amplitude | continuous | Tank engine ambience |
| Move/turn | Engine rev | 30→50Hz sine ramp on input | continuous | Engine pitch rises |

### Music/Ambience
No music — Battlezone is pure sound effects. A very low continuous engine hum (20-30Hz sine, barely audible, 0.03 amplitude) plays at all times. This is the tank idling. When moving, the frequency rises to 45Hz. A second ambient layer: distant artillery — occasional (every 15-30s) muffled boom (filtered noise at 60-80Hz, 0.3s decay) plays to suggest a wider battlefield.

## Implementation Priority
- High: Starburst vector explosion effect, radar sweep line with afterglow, screen flash on hit
- Medium: Trailing lines on bullets, double-line wireframe on enemies, CRT scanline dim effect on ground grid
- Low: Moon on horizon, obstacle dot-fill volume effect, cockpit shake on fire
