# Galaga — Visual & Sound Design

## Current Aesthetic
A 480×600 canvas with a black background and 80 scrolling star particles (small white dots at varying speeds). Enemies use filled polygon shapes: bees are small pointed diamonds in yellow-green (`#8f8`), butterflies are wider winged hexagons in teal (`#4cf`), boss enemies are larger multi-point polygons in pink-magenta (`#f48`). All enemies have animated wing details (alternating fill on left/right wing polygons each frame). The player ship is a narrow pointed polygon in pink-magenta (`#f48`). The tractor beam is a yellow trapezoid. Bullets are 3×8px colored rects. Stars scroll at 3 discrete speeds. The formation sways horizontally. The overall look is a clean but entirely flat vector-on-black presentation with no depth, atmosphere, or differentiation between lanes.

## Aesthetic Assessment
**Score: 3/5**

The polygon enemy shapes are well-structured and recognizable, and the wing animation adds life. However, the background is a plain starfield, enemies lack glow or texture, the player has no engine trail, and there is no sense of depth or environment. A visual polish pass could make this genuinely cinematic.

## Visual Redesign Plan

### Background & Environment
Deep **space nebula** backdrop: instead of plain black, the background has three overlapping soft nebula clouds — large radial gradient ellipses (200–350px) in deep purple (`#1a004a` at 12%), blue (`#001a4a` at 10%), and magenta (`#3a0030` at 8%). These are static. Over them, the 80 star particles are restructured into 3 layers: 40 tiny 1px stars at full white (far layer, slow), 25 medium 1.5px stars with slight blue tint (mid layer), and 15 bright 2px stars with a warm white glow (near layer, fast). Occasionally (once per 300 frames) a shooting star streak crosses the upper quarter of the screen — a thin diagonal line that persists for 8 frames and fades.

At the bottom of the screen, a faint horizontal glow band (`#2a2a6a` at 30%) suggests the edge of a space station or planetary atmosphere below the player.

### Color Palette
- Background void: `#000008`
- Nebula purple: `#1a004a`
- Nebula blue: `#001a4a`
- Nebula magenta: `#3a0030`
- Star near: `#ffffff`
- Star mid: `#aaccff`
- Star far: `#888899`
- Bee body: `#aaff44`
- Bee accent: `#66dd00`
- Butterfly body: `#44ddff`
- Butterfly accent: `#00aacc`
- Boss body: `#ff44aa`
- Boss accent: `#ff0077`
- Boss eye: `#ffff00`
- Player ship: `#ee44bb`
- Player engine: `#8844ff`
- Tractor beam: `#ffee44`
- Player bullet: `#ffffff`
- Enemy bullet: `#ff6633`
- Explosion: `#ff8800`
- Captured ship: `#888888`
- Background glow: `#2a2a6a`

### Entity Redesigns

**Player ship** — More articulate silhouette: a sleek arrowhead main body (pointed at top) with two angled wing panels flaring back-left and back-right (wider angle than current). A narrow cockpit window stripe in light blue sits in the center. At the engine base, a persistent thrust flame: a small teardrop polygon in bright blue-violet (`#8844ff`) that flickers each frame (±2px height variation using `Math.sin`). When moving left/right, the ship tilts 8 degrees in the movement direction. A faint engine glow ring (`setGlow('#8844ff', 0.5)`) pulses at low intensity.

**Bee enemies** — Redesigned as more menacing insects: the diamond body gains two overlapping wing polygons (parallelograms extending left-right) that alternate full/half opacity each frame for the wing-beat illusion. The body has a yellow-green body center with a darker stripe across the middle. A single bright red compound-eye dot sits at the top. On dive: the wing-beat speeds up (every other frame instead of every 4).

**Butterfly enemies** — Wide, elegant winged shapes: two trapezoidal wing panels per side (4 total polygons) with a teal-blue outer wing and a lighter cyan inner wing. The body is a narrow vertical rect between the wings. Wing panels animate with a smooth sine-based opacity cycle (`Math.sin(frame * 0.1)`). A small antenna pair extends as two short lines from the top of the body.

**Boss enemies** — The flagship of the formation: a large hexagonal core (8-sided polygon) in deep magenta with a bright pink-red glow ring. Two side wings sweep back, each decorated with a colored stripe. Two large compound eye circles (yellow with a dark pupil) frame the center. When damaged or diving, the eye pupils shift direction. A golden crown polygon sits above (for the "boss" designation).

**Tractor beam** — More dramatic: the trapezoid is filled with a pulsing golden-yellow gradient (alternating bright/dim stripes moving downward, like energy scanning downward). The beam edges have a bright yellow glow. Small particles (golden dots, 3px) fall downward within the beam at 2px/frame speed, suggesting the pulling force. The boss enemy above the beam gains a glow ring (`setGlow('#ffee44', 0.8)`) while the beam is active.

**Captured ship** — Rendered in desaturated grey with a dark tint overlay, no engine glow, slightly smaller. When being held in the tractor beam it gently bobs ±4px vertically. When recaptured/freed, it flashes white for 10 frames before rejoining the player as a second ship.

**Formation** — Enemy rows now have a subtle Z-depth effect: rows at the back are rendered at 90% scale and 85% alpha, creating the illusion of 3D depth.

### Particle & Effect System
- **Enemy explosion**: 10 orange-red ember particles scatter from the enemy center — each a 3–5px circle with random velocity (3–6 px/frame), gravity 0.08, lifetime 25 frames. A 2-frame white flash at full opacity replaces the enemy sprite. `setGlow('#ff8800', 1.0)` during the flash.
- **Player engine trail**: 6 small blue-violet dots (2px each) trail behind the ship, decreasing in alpha from 60% to 5%, spaced 6px apart.
- **Player death**: 12 magenta shards (thin triangles, 8–14px long) scatter radially with high velocity; 8 white sparks also scatter; 4-frame bright white bloom at death position.
- **Bullet impact on barrier/miss**: tiny white spark dot (1 frame).
- **Formation bomb drop**: enemy briefly brightens (1.3x scale for 2 frames) when it fires.
- **Tractor beam capture flash**: 6-frame gold pulse ring expanding from 0 to 40px around the captured ship.
- **Shooting star**: 80px diagonal line, white at leading point fading to transparent, moves 12px/frame for 8 frames.

### UI Polish
- Score and hi-score use large bold white text with a subtle blue text-shadow glow.
- Lives rendered as small player-ship silhouette icons (not generic rects).
- Stage/round number shown briefly as a large centered fade-in text at level start.
- Bonus stage (if implemented): all enemies on screen briefly highlight gold before the "challenge stage" text appears.
- "Galaga" title on the start screen renders with each letter in a different enemy color (G=bee green, A=butterfly teal, L=boss magenta, etc.).

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Player shoot | Sharp zap | 1200 Hz square, fast decay | 80 ms | Laser bolt |
| Enemy shoot | Lower zap | 700 Hz square, slightly longer | 100 ms | Enemy fire |
| Enemy explosion (small) | Noise burst | White noise BPF 600 Hz, fast decay | 120 ms | Bug squash |
| Enemy explosion (boss) | Heavy thud + noise | 80 Hz sine + white noise, 300 ms | 300 ms | Big kill |
| Player death | Descending whine | 800→100 Hz sine sweep | 500 ms | Ship destroyed |
| Tractor beam on | Sci-fi drone | 160 Hz triangle + LFO 3 Hz AM modulation | Looped | Beam active |
| Captured ship freed | Bright ping | 1047 Hz sine, 200 ms decay | 250 ms | Liberation chime |
| Double ship active | Short power-up | G4–B4 sine arpegio, 80 ms each | 200 ms | Second ship |
| Stage clear | Fanfare | C5–E5–G5–C6 sawtooth, 80 ms each | 400 ms | All enemies clear |
| Formation swoop dive | Descending whoosh | White noise swept 2000→400 Hz | 300 ms | Enemy dive |
| Level start | Ascending tone | 220→880 Hz triangle sweep | 400 ms | Here we go |
| Bonus points | Bright trill | 1200 Hz × 1400 Hz alternating, 4× | 200 ms | Extra score |

### Music/Ambience
Classic arcade space tension: a looping 8-bar pattern at 130 BPM. A bass line plays root notes on a sawtooth oscillator (slight detune, LPF 400 Hz) every 2 beats. A rhythmic hi-hat is synthesized as white noise gated at 130 BPM (gain 0.05, HPF 8 kHz). Over the bass, a two-note lead melody on a square wave plays a repeating arpeggio figure in minor key. The tempo subtly increases 2% per level (up to 160 BPM max). During the tractor beam, the background music ducks to 50% gain and a slow tremolo LFO (4 Hz) is applied. Overall gain: 0.1.

## Implementation Priority
- High: Enemy explosion ember particles, player engine trail dots, player death shards, tractor beam particle stream, boss glow ring, all sound events
- Medium: Nebula background gradient ellipses, multi-layer star parallax, ship thrust flame flicker, captured-ship tractor beam visual upgrade, formation Z-depth scale
- Low: Shooting star effect, bee/butterfly wing redesign with multi-polygon panels, boss compound eyes, ambient space music, UI ship-icon lives
