# Frogger — Visual & Sound Design

## Current Aesthetic
A 480×560 canvas with a `#1a1a2e` background. River sections are flat `#0a1e3a` with subtle animated sine-wave lines in `#0f2848`. Road is `#1a1a28` with dashed `#333340` lane dividers. Safe zones (median, sidewalk, start) are flat `#1a3a1e`. The frog is a `#4e8` green circle with white eyes and dark pupils. Vehicles are colored rectangles with a windshield tint and yellow headlight dots and a matching glow. Logs are brown `#6a3a1a` rectangles with wood-grain lines and a bark highlight strip. Turtles are green circles with a cross-shell pattern; they fade as they dive. Lily pads at the home row are `#1a4a2a` circles. The timer bar runs along the bottom. Lives and level text display in the HUD.

## Aesthetic Assessment
**Score: 3/5**

The wave animation in the river and the vehicle headlights are nice details. The core shapes are recognizable. However, the environments are uniformly flat colored bands, the frog is just a circle, and there is no sense of environmental depth or charm. The art style is functional but not compelling.

## Visual Redesign Plan

### Background & Environment
Each zone gets its own distinct visual layer:
- **Home row**: Deep dark river (`#050e1a`) with lily pads that glow softly. In the dark areas between lily pads, faint blue bioluminescent ripple rings emanate slowly outward from each pad.
- **River**: Flowing water with a dark blue-teal color (`#082035`). The wave lines become more prominent: 3 layers of sine waves at slightly different speeds and opacities (pale blue `#1e4a6a` at 30%, 20%, 10% alpha). Small sparkle dots appear at wave crests (6 random bright pixels per frame that cycle).
- **Median (safe zone)**: A paved island with a yellow center-line dashed stripe and short grass blades along both edges.
- **Road**: Dark asphalt `#101018` with visible lane paint. Yellow dashes on lane dividers replaced by long-form white lane lines (realistic highway style). Road surface has subtle horizontal streak marks suggesting tire tracks.
- **Sidewalk/Start**: Textured concrete — lighter `#202030` with faint grid-crack lines and yellow edge curb stripe.

### Color Palette
- Sky/water deep: `#050e1a`
- River mid: `#082035`
- River highlight: `#1e4a6a`
- Road: `#101018`
- Road marking white: `#cccccc`
- Safe zone: `#162a14`
- Median stripe: `#cccc00`
- Lily pad base: `#1a5025`
- Lily pad glow: `#33cc55`
- Log body: `#7a4220`
- Log highlight: `#a06030`
- Turtle shell: `#1a8850`
- Frog body: `#33cc66`
- Frog belly: `#aaffcc`
- Vehicle glow colors: per lane (red `#ff3333`, yellow `#ffee22`, orange `#ff8800`, magenta `#ff44ff`, blue `#8888ff`)
- Background: `#0a0a18`

### Entity Redesigns

**Frog** — More character: oval body (wider than tall) rather than a perfect circle. Legs suggested by two short curved lines extending forward and back. Eyes are bulging white circles positioned at the top front of the body, much larger than current. Dark pupils with tiny specular dots. When jumping, the body stretches vertically (scale Y up by 20%); when landing, squashes (scale Y down by 20%) for 3 frames. A small shadow ellipse on the ground beneath adds depth.

**Vehicles** — Each lane's vehicle type gets a distinct silhouette:
- Cars: rounded-corner rectangle, two circular headlight dots front, tail-light strip rear. Cab window tint in center.
- Trucks: elongated rectangle with a distinct cab section (slightly different color) at one end, cargo box at other. Cab has window, cargo has horizontal panel lines.
- All vehicles: lane-appropriate glow aura (color from lane def), brightest at front headlights.

**Logs** — More bark texture: main rectangle in warm brown with 4–6 dark irregular oval knot marks along the length. A brighter highlight stripe along the top edge. End caps are circular cross-sections visible at each end (dark ring with growth-ring arcs inside). Subtle green moss patches near the ends.

**Turtles** — Three per group rather than a fixed polygon. Each turtle: rounded hexagonal shell top (6-sided filled poly in dark green with a slight golden-line pattern drawn as thin radial lines). Head pokes out the front edge as a small circle. Diving animation: turtles rotate/shrink as they submerge, with small bubbles rising.

**Lily pads** — Filled circles in forest green with a V-shaped notch cut into one side (drawn as a polygon). A white flower sits at the center of each empty pad. When occupied by the frog, the pad tilts slightly and the flower is replaced by the frog icon.

### Particle & Effect System
- **Frog death**: 8 dark-green debris fragments scatter and fade over 30 frames (existing X animation replaced by debris).
- **Frog on log/turtle (riding)**: Tiny water splash drops lift off the log edges periodically — 2 water drops per second, upward arc, 10-frame lifetime, `#4a9ab8` color.
- **Frog jumps from road**: Small dust cloud beneath — 3 grey puff circles, expand and fade over 15 frames.
- **Lily pad landing**: Ripple ring from pad center — circle outline expanding from 0 to 20px over 20 frames.
- **Home filled**: Golden star burst from the pad center — 8 gold particles radiating outward.
- **Turtle diving**: 4 small blue bubble circles rising from the turtle's position, moving up 0.5px/frame, over 30 frames.
- **Vehicle headlights**: Faint cone of light forward from each headlight — semi-transparent triangle poly extending 3 cells ahead.

### UI Polish
- Timer bar redesigned: a wider bar at the top of the screen (rather than bottom) that visually represents the frog's remaining safety window. Color transitions green → yellow → red.
- Lives shown as small frog icons (simple circles with eye bumps).
- Score animates on change — brief scale-up then returns to normal.
- Level indicator pulses on level change.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Frog jump | Spring boing | 300→600 Hz sine sweep, fast attack | 120 ms | Cartoonish spring |
| Frog land | Short plop | 200 Hz sine, 60 ms | 60 ms | Soft landing |
| Home reached | Triumphant blip | C5–E5–G5, short triangle | 300 ms | Goal achieved |
| All homes filled | Fanfare | C5–E5–G5–C6, arpegio sawtooth | 600 ms | Round clear |
| Frog in water (death) | Splash + glug | White noise burst + 100 Hz descending | 400 ms | Drowning |
| Frog hit by car | Impact crunch | Noise burst 200 Hz, sharp | 200 ms | Road kill |
| Timer running low | Ticking | 60 Hz click, 2 per second, rising pitch | Looped | Countdown urgency |
| Timer expired | Low alarm | 150 Hz sawtooth, 3 rapid pulses | 300 ms | Time up |
| Level up | Rising whoosh | White noise 500→4000 Hz sweep | 400 ms | Level transition |
| Turtle dive warning | Gurgle | Bandpass noise 300 Hz, LFO 6 Hz | 200 ms | Turtle sinking |
| Log ride (ambient) | Soft water | Bandpass noise 100 Hz, very low gain | Looped | While on log |
| Road ambience | Distant traffic | Bandpass noise 80 Hz, 0.02 gain | Looped | In road zone |

### Music/Ambience
Playful retro melody in a loop: A cheerful 4-bar melody in G major played on a bright square wave (mild low-pass filter, 2 kHz cutoff) at 140 BPM. Accompaniment: a bass line on a fat triangle wave, and a simple 2-note chord stab on offbeats using a soft sawtooth. The melody shifts to a minor key variation during the death animation, then back on respawn. Overall gain: 0.1.

## Implementation Priority
- High: Frog stretch/squash jump animation, vehicle lane-specific silhouettes, lily pad polygon with flower, frog death debris particles, river sparkle dots, all sound events
- Medium: Log bark texture with knot marks and end caps, turtle hexagonal shell redesign, sky gradient per zone, road lane marking upgrade, timer bar relocation to top
- Low: Bioluminescent lily pad ripples, vehicle headlight cone, bubble rising particles, ambient music, dust cloud jump particles
