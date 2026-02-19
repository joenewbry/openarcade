# Tanks — Visual & Sound Design

## Current Aesthetic

A dark gradient sky (near-black to very dark navy) above sinusoidal procedural terrain filled with `#16213e`. Terrain has a dark blue-glow edge line. Player tank is bright green (`#af4`), enemy tank is red (`#f44`). The turret is a partial arc polygon. Projectile trails are faint dashed cyan-white lines. Explosions use yellow/orange particles. A wind indicator arrow sits at the top center. HP bars are simple rectangles below tank name.

## Aesthetic Assessment
**Score: 2/5**

The foundation is solid — procedural terrain, arc-based explosion particles, wind indicator. But the tanks are primitive colored rectangles with minimal detail. The terrain is a flat fill with no texture. The sky is a gradient but very dark and lifeless. There's no sense of scale, drama, or battlefield atmosphere.

## Visual Redesign Plan

### Background & Environment

The sky should cycle through time-of-day states. Starting at dusk (orange-red horizon gradient, dark blue zenith), moving toward night over the course of a round. Add 30-50 stars as tiny white dots that appear as the sky darkens. Draw a distant mountain silhouette layer between sky and terrain using a darker polygon — several overlapping ridge shapes at 30% opacity for depth.

The terrain itself needs texture. Overlay a subtle noise pattern of short horizontal tick marks (1px wide, 3px long, 15% opacity) scattered across the terrain fill to suggest rocky ground. The terrain edge should be a brighter green-gray line (`#7a9a5a` for grass-topped, `#8a8a7a` for rocky) with occasional small tufts.

Craters should leave visible circular depressions with darker fill and a rim highlight — drawn as a dark filled circle with a slightly lighter ring around the edge.

### Color Palette
- Primary: `#af4` (player green), `#f44` (enemy red)
- Secondary: `#ffaa00` (explosion orange), `#00ffee` (trail cyan)
- Background: `#0a0818`, `#1a0a2e` (night sky), `#1e3a1e` (terrain)
- Glow/bloom: `#af4`, `#f44`, `#ffaa00`

### Entity Redesigns

**Tanks:** The body should be a proper tank silhouette. Draw five components:
1. Hull — a trapezoid (wider at base) in the tank color
2. Turret ring — a circle at hull center, slightly lighter than hull
3. Turret dome — a semicircle polygon on the ring
4. Barrel — a thick line extending from dome, with a rectangular muzzle cap
5. Treads — two thin rounded rectangles below the hull with segmented marks (short perpendicular lines every 5px)

Add a glint highlight: a small bright rectangle on the upper-left of the hull dome.

**Projectile:** Replace the simple white circle with a stretched oval (ellipse approximated as a narrow polygon aligned to the velocity vector). Add a bright white core with a yellow outer glow.

**Trail:** Instead of dashed lines, render the trail as a series of fading circles decreasing in size and opacity from muzzle to current position. The trail should start white-yellow and fade to transparent.

**Explosion:** Multi-ring effect. Frame 0-4: bright white core circle expanding rapidly. Frame 5-10: orange ring expanding outward. Frame 11-20: smoke puffs — 8 dark gray slow-moving particles drifting upward and fading. The particle system should include some "burning ember" particles that glow orange and fade slower.

### Particle & Effect System

- **Muzzle flash:** 3-frame bright ellipse at the barrel tip aligned to firing direction
- **Dirt splash on terrain hit:** 6-8 brown particles arcing outward from impact, gravity-affected
- **Tank hit:** Metal sparks — 10-15 thin bright yellow particles shooting outward
- **Tank destruction:** Large explosion (2x crater radius) with black smoke column: series of dark circles rising upward with slow fade
- **Wind gusts:** Occasional faint horizontal streaks (very transparent) drifting across the background

### UI Polish

- Wind indicator: Replace the plain arrow with a styled compass rose. Draw concentric rings around the center point. The wind arrow should be filled with a gradient from white at base to yellow at tip. Add "W" and "E" labels.
- HP bars: Give them a beveled metal casing look — dark outer border, colored fill, white specular strip on top.
- Angle/Power display: Draw these inside a targeting HUD panel in the bottom-left — a dark translucent rectangle with rounded corners and colored borders. The power bar should pulse green when charged to a good level.
- "YOUR TURN" / "ENEMY TURN" indicator: Appear with a slide-down animation from the top of the screen.
- Round number: Display in stylized military stencil aesthetic (all caps, slightly larger font).

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Aiming (angle change) | Short sine tick | 660 Hz | 30ms | Each degree step |
| Power adjustment | Saw ramp | 200→400 Hz proportional to power | 40ms | Continuous while held |
| Fire | Low boom | Sine 80 Hz + noise burst | 300ms | Rapid envelope decay |
| Projectile in flight | High whistle | Sine 2000→800 Hz sweep | Per-flight duration | Doppler effect |
| Terrain impact | Noise thud | Lowpass noise 200 Hz | 200ms | Dirt explosion |
| Tank hit | Metallic clang | Triangle 440 Hz + noise | 250ms | Impact |
| Explosion (big) | Sine 60 Hz + noise broadband | Attack 0, decay 500ms | 500ms | Rumble with crackle |
| Enemy turn thinking | Subtle mechanical hum | Sawtooth 110 Hz, slow tremolo | 1000ms | Fades when firing |
| Wind ambient | Filtered noise, highpass 1kHz | Gain proportional to wind | Continuous | Softly audible |
| Round start | Staccato chord | 261+329+392 Hz, 100ms each | 300ms | Brief fanfare |
| Victory jingle | Arpeggio | 261, 329, 392, 523, 659 Hz | 600ms | Ascending major |
| Game over | Descending sine | 392, 329, 261, 196 Hz | 800ms | Somber fall |

### Music/Ambience

A low-frequency atmospheric pad: two oscillators at 55 Hz and 58.3 Hz (minor second apart) for a slightly tense, unresolved feel. Very quiet (gain 0.03), with a slow 0.2 Hz amplitude LFO creating a "breathing" battlefield tension. Wind noise layer (white noise filtered through a bandpass at 800 Hz, gain 0.02) suggests open terrain.

## Implementation Priority
- High: Multi-part tank rendering with proper silhouette, explosion multi-ring effect, projectile trail circles
- Medium: Terrain texture overlay, muzzle flash, dirt splash particles, fire/explosion sounds
- Low: Sky day-night cycle, mountain silhouette, wind ambient, smoke column on death
