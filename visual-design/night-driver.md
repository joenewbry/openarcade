# Night Driver — Visual & Sound Design

## Current Aesthetic

480x560 canvas with pseudo-3D road perspective. Dark road with white glowing edge posts, stars in the upper half. Horizon glow in purple-pink (#cc44aa). Oncoming cars rendered as headlight pairs (white circles with yellow inner dots). Player headlight beams as trapezoid polygons on the road surface. Dashboard at bottom: steering wheel circle (drawRing), speed bar that shifts green→red, gear indicator. Off-road flash warning in red. Minimal but functional driving atmosphere.

## Aesthetic Assessment

**Score: 2.5/5**

The pseudo-3D perspective is solid — the road narrows correctly, edge posts recede with proper scaling. The horizon glow gives a moody feel. But the stars are flat dots, the road itself is a single dark tone without personality, the oncoming headlights are too simple, and the dashboard is placeholder-level. The purple-pink horizon color is evocative but underused. A true night-drive aesthetic should feel like speeding through darkness with only your headlights keeping you alive.

## Visual Redesign Plan

### Background & Environment

Transform into a cinematic 1970s night racing aesthetic — the feel of headlights cutting through total darkness on a desert highway.

**Sky:** True black upper half (`#000000`). Stars upgraded: 80 stars at varying sizes (0.5px to 2px) in two layers — distant white (`#ffffff`, tiny, 60 stars) and slightly larger warm-white (`#fffaea`, 20 stars). A faint Milky Way band: a wide translucent diagonal smear (`#ffffff08`) of soft ellipses across the upper-right sky. No moon — total darkness is the theme.

**Horizon glow:** Widen and deepen the horizon glow. Two layers: a wide, very low saturation amber/red glow at the actual horizon line (`#331108` at 0.3 opacity, tall rect) suggesting distant city lights, and above it the purple-pink sky glow (`#cc44aa` at 0.12 opacity, narrower) as atmospheric scatter from unseen lights. Together they create a layered dusk-on-the-horizon depth.

**Road surface:** Give the road a realistic wet-asphalt look. The base road color shifts from near-black at the horizon (`#080808`) to dark gray at the player's feet (`#161616`). Draw subtle center-line dashes using the existing road perspective math — white dashes (`#cccccc`) that stretch and scale with distance. Add a very faint lane shimmer: 2-3 thin horizontal strips across the mid-road area in `#ffffff04` — suggests headlight reflection on wet surface.

**Road edge posts:** Current white glowing posts are fine but upgrade: each post is a thin white rect with a bright orange reflector cap (tiny rect at the top in `#ff8800`). The glow is now warm white (`#ffffcc`). Posts alternate: left side standard, right side slightly taller — realistic highway markers.

**Guard rails (new):** Behind the edge posts at the far horizon, draw a thin horizontal line in `#222222` with occasional bright white fleck pixels — the far guardrail reflecting in the darkness.

**Roadside environment:** At medium perspective depth (not near horizon, not near player), add occasional roadside details: dark silhouette rectangles of varying heights (`#111111`) suggesting distant buildings or rock formations. Billboard shapes (horizontal rect on a post) every 400-500 world units with faint colored light from them suggesting illuminated signs. Cacti silhouettes (simple cross shapes: vertical rect + horizontal rect) on the desert shoulder.

### Color Palette
- Sky: `#000000`
- Stars: `#ffffff`, `#fffaea`
- Horizon ambient: `#331108`, `#220a3a`
- Road near: `#161616`
- Road far: `#080808`
- Road center line: `#cccccc`
- Edge post: `#ffffff` with cap `#ff8800`
- Oncoming headlights: `#fffaf0` (warm white) + `#ffcc44` (yellow inner)
- Player headlights: `#ffffee` at 0.85 glow
- Dashboard: `#0a0a12`
- Speed bar safe: `#00cc44`
- Speed bar danger: `#ff2200`
- Glow/bloom: `#ffffff`, `#ff8800`, `#cc44aa`

### Entity Redesigns

**Player headlights:** The trapezoid beam gets a gradient treatment. Draw 3 overlapping trapezoids, each slightly narrower and brighter than the last, going from outer (`#ffffff10`) to middle (`#ffffff22`) to inner-center (`#ffffff44`). At the near-player end, add two bright circular light sources (the actual headlight fixtures) in warm white (`#fffaf0`) with a strong glow.

**Oncoming cars:** Complete redesign. Instead of two white dots, each oncoming car has:
- Two bright warm-white headlights (circles, `#fffaf0`, glow 1.0 at distance, scaling with perspective)
- A faint car body silhouette: a very dark rectangle visible between and around the headlights
- Slightly different headlight spacing and color per car type (some cars have cooler/bluer lights `#aaccff`, some warmer `#ffee88`) for variety

**Passed cars (tail lights):** When an oncoming car passes the player, it's briefly visible from behind — two bright red tail lights (`#ff2200`) instead of headlights. This transition happens in one frame and adds realism.

**Speed gauge redesign:** Replace the simple bar with a proper analog speedometer aesthetic. The bar itself becomes an arc (use existing fillRect but arranged as a curved bar — approximate with 12 small rects arranged along a semicircle path). Speed needle: a thin line from center to the arc, rotating with speed. Tick marks along the arc in white. RPM-style red zone for the upper third.

**Steering wheel:** Make it feel more tactile. The ring stays but add 3 spokes (lines from center to ring at 120° intervals). A center hub circle in dark gray. The wheel rotates with steering input (already does — enhance the visual response).

**Dashboard:** The dashboard area gets an amber backlit instrument cluster feel. The background is near-black (`#0a0a0c`) with a faint warm amber glow at the gauge area (`#ff880008` overlay). Add an odometer-style digital display showing speed in large green digits (approximated as small colored rects in a 7-segment style).

### Particle & Effect System

**Off-road scrape:** When the car goes off-road (currently a red screen flash), add: sparks from the car edges — 8-10 orange/white particles (`#ff8800`, `#ffffff`) spraying to the left or right depending on which edge was hit, arcing outward. The red screen tint remains but is reduced to 0.15 opacity — the sparks carry the impact feel.

**Engine exhaust:** At low speed or idle, faint dark smoke particles (`#1a1a1a` at 0.3 opacity, 2-3px circles) drift up from the rear of the car, immediately swept backward by perspective. At high speed these disappear.

**Headlight dust:** Tiny floating dust motes (6-8 very small circles, `#ffffff`, 0.2-0.4 opacity) drift through the headlight beams each frame, slowly moving upward and sideways — gives the headlight beams volumetric density.

**Speed impact (new top speed):** When the player hits maximum speed, a brief motion blur effect — 3 horizontal speed lines (`#ffffff15`) briefly appear at the road edges and then fade over 8 frames.

**City lights on horizon:** Every 60 frames, a distant light on the horizon briefly brightens and dims — a building light or passing radio tower, drawn as a tiny colored dot (`#ffaa44` or `#ff4444`) flickering at the horizon line.

### UI Polish

- **Speed readout:** Styled as amber 7-segment digits in the dashboard area.
- **Gear indicator:** Styled as an automotive gear selector diagram (P-R-N-D markings in small text) with the current gear highlighted in amber.
- **Distance/score counter:** Styled as a mechanical odometer (white digits on dark background, monospaced).
- **Near-miss indicator:** When an oncoming car passes very close (within N pixels), a brief yellow flash on the windshield (`#ffff0018` overlay, 3 frames) — adrenaline feedback.
- **Off-road warning:** Red dashboard warning light (small circle, `#ff2200`) blinks on the instrument panel when off-road.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Engine idle | Low rumble | 80Hz + 160Hz sine, slight tremolo at 3Hz | Loop | Deep motor sound at rest. |
| Engine accelerating | Rising rumble | 80→180Hz over acceleration, 4th harmonic | Loop | RPM rises with speed. |
| Engine full throttle | High drone | 200Hz saw, 3rd+4th harmonics | Loop | Loud road-car roar at top speed. |
| Tires on road | White noise layer | Bandpass noise 300-800Hz, low volume | Loop | Tire/road contact. Scales with speed. |
| Off-road gravel | Noise burst | Wider bandpass noise 200-2000Hz | Loop when off-road | Gravel scrape sound. |
| Oncoming car pass | Doppler whoosh | 800→200Hz sine sweep over 300ms | 300ms | Car passing at speed. |
| Near miss | Adrenaline horn + tire squeal | 1200Hz brief horn + 400Hz noise | 200ms | Close call warning. |
| Crash / severe off-road | Heavy scrape + thud | Low noise burst 80Hz + metal noise | 600ms | Impact sound. |
| Speed line (new top speed) | Wind roar | Highpass noise 2000Hz+ | 200ms | Wind at maximum speed. |
| Game over | Engine dying | 200→60Hz sine descending over 1.5s | 1500ms | Car slowing to stop. |
| Checkpoint / distance marker | Brief beep | 880Hz sine, 60ms | 60ms | Milestone marker. |

### Music/Ambience

A classic synthwave driving ambient: two OscillatorNodes in a minor chord — 110Hz (A2 sine, volume 0.025) and 165Hz (E3 sine, volume 0.015) — detuned slightly (2-3 cents apart each) to create a slow beating. A sub-bass pulse at 55Hz (volume 0.01) that throbs at 0.5Hz (the heartbeat of the engine). On top, a very quiet high-frequency shimmer: 880Hz triangle wave at 0.005 volume, tremolo at 4Hz — like distant radio static. This creates the lonely, fast, cinematic night-drive atmosphere without distracting from the tire and engine loop sounds. When off-road, the shimmer drops and a low dissonant tone (73Hz — slightly flat A) briefly adds urgency before the player returns to the road.

## Implementation Priority
- High: Road center-line dashes with perspective scaling, oncoming car silhouette body (not just headlights), headlight beam gradient (3 overlapping trapezoids), off-road spark particles
- Medium: Dashboard analog speedometer arc design, dust motes in headlight beams, roadside silhouette objects, Milky Way sky band
- Low: Near-miss flash overlay, engine exhaust smoke particles, city horizon light twinkle, odometer-style distance display, tail light flash on car pass
