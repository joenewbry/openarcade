# Sandbox Physics — Visual & Sound Design

## Current Aesthetic

Split-screen canvas (600×500), left half player, right half AI opponent. Dark navy background (`#111122`). Physics objects are colored filled rectangles (wood `#c97`, metal `#99a`, rubber `#e74`), circles (ball `#ff5`, egg `#ffe`), and wheels (`#555`). Connections are shown as dashed lines (hinges), bezier curves (ropes), and sine-wave segments (springs). Rockets are orange-red rectangles. A 30-second build timer counts down in the top center. Challenge goals are described in text. A divider line runs down the center. Material palette buttons run at the bottom. Score and round indicators are simple text.

## Aesthetic Assessment
**Score: 2/5**

Functional but extremely spartan. The split screen is clear, but the physics objects look like colored boxes with no visual identity. The material palette has no tactile feel. There's no visual excitement when structures succeed or fail — no explosions, no drama. The AI side looks identical to the player side which makes it hard to read the competition.

## Visual Redesign Plan

### Background & Environment

Give each half-screen a distinct identity. The **player side** has a dark workshop aesthetic: a subtle grid of faint blue lines (engineering graph paper feel) at 20px intervals, a thin bright blue border along the left and top edges. The **AI side** gets a slightly warmer dark background with faint amber grid lines, and an amber/orange border — a visual signal that "that's the enemy." The center divider becomes a bright pulsing line (alternating blue and amber) with VS text in the middle.

Add a ground plane at the bottom of each half — a solid dark grey ledge with a subtle texture (horizontal line pattern). The ground has a faint reflection of objects resting on it.

Add ambient depth: each half has a very subtle vignette darkening the extreme corners.

### Color Palette
- Player side accent: `#2288ff`
- AI side accent: `#ff8822`
- Background: `#0a0a18`
- Grid lines: `#0d1225`
- Ground plane: `#1a1a28`
- Wood: `#cc8844`
- Metal: `#8899aa`
- Rubber: `#ee5533`
- Spring: `#44ccee`
- Rocket: `#ff6622`
- Ball: `#ffee44`
- Egg: `#fff8e0`

### Entity Redesigns

**Wood blocks:** Instead of flat colored rectangles, draw wood with visible grain — 3–5 horizontal lighter streaks across the block face. Add a slightly darker border (1px inset stroke). At the corners, a subtle bevel (lighter 1px line on top/left, darker on bottom/right) gives a 3D chip of wood feel.

**Metal blocks:** Silver/steel look with a reflective sheen — a diagonal lighter stripe across the top-left quarter. A darker inset border. Slightly cooler color than wood. When a metal block is hit hard, draw a brief bright spark (white flash point at impact).

**Rubber blocks:** Deep red-orange with a slight gloss dot highlight in the top-left corner. A subtle bumpy outline (draw the rect path with slight noise on the stroke) to suggest rubber texture. When compressed or bouncing, briefly squash/stretch the visual by ±5% (draw it slightly taller on bounce frames).

**Wheels:** Dark grey circle with 4–6 spoke lines radiating from center to rim. A slightly lighter rim ring. When spinning, add a motion blur circle (concentric faint rings). The axle connection point pulses faintly.

**Springs:** Replace the simple sine wave with a proper coil spring — alternating light and dark bands drawn as thick arcs to simulate depth. The spring compressed state is visually distinct (bands closer together, deeper color). When extended, bands separate and lighten.

**Ropes:** Draw as a thick bezier with a braided look — a slightly lighter color centerline over a darker wider base path. Under tension, add a faint vibration shimmer (offset the rope centerline by ±1px each frame).

**Rockets:** Sleek cone + cylinder body. Add fin polygons at the rear. When firing, draw a long animated exhaust plume — alternating yellow/orange/red concentric cone shapes that flicker in size each frame.

**Ball:** Yellow circle with a subtle specular highlight (white ellipse top-left). When rolling, add a spin indicator (a small dot on the circumference that rotates with the ball's angular velocity). High-speed trails (3 fading ghost copies offset in movement direction).

**Egg:** Cream-colored ellipse (slightly taller than wide). Subtle brown speckle dots on the surface. On crack/death, draw shattering lines radiating outward, with yolk splash (orange blob particles).

**Hinges:** Replace dashed line with a visible pin-and-plate joint: a small dark rectangle (the plate) at each end, connected by a line, with a bright circle (the pin) at the pivot point. The pin circle pulses gently.

### Particle & Effect System

- **Collision impact:** Material-appropriate spark: wood→brown sawdust puff (expanding grey-brown dots), metal→white sparks (bright lines shooting out), rubber→red-orange bounce flash circle.
- **Structure success (challenge passed):** Green burst from the goal target — 12 sparkle stars expand outward. "SUCCESS" text in bright green floats up from center.
- **Structure failure:** Red shatter effect — object's pieces fly apart, each piece tumbles as a rotating rectangle.
- **Rocket ignition:** Orange exhaust cone expands rapidly behind rocket over 10 frames.
- **Rocket crash:** Large orange explosion circle, 8 metal fragment rectangles fly outward rotating.
- **Egg crack:** Yellow yolk splash particles at impact point.
- **Round transition:** White horizontal wipe sweeps across both halves simultaneously. Round number in large text appears center then fades.
- **Timer under 10s:** The timer text pulses red, getting slightly larger each second.
- **Build phase start:** Blueprint grid materializes (fades in from 0 to dim over 20 frames).

### UI Polish

- Material palette: Give each material a proper icon button with a dark panel background, neon border in the player's color, and a small label below. Active material gets a bright full border glow. Hovering shows a tooltip with material properties (mass, bounce, friction).
- Timer: Large centered countdown with a circular progress ring that depletes. Color shifts green→amber→red as time runs out.
- Challenge description: Floating card at the top of each half with rounded corners and a dim panel background, showing the challenge icon glyph and goal text.
- Score display: Side-by-side score panels at top, player in blue, AI in orange. Score numbers animate up with a counter tick on point gain.
- Round indicator: "Round X / 5" badge centered at top between the two panels, with a progress pip row below it.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Wood collision | White noise, lowpass 600 Hz | Gain 0.3, decay 0.12s | 0.12s | Thud |
| Metal collision | White noise + OscillatorNode sine 800 Hz | Sharp decay 0.08s | 0.08s | Clang |
| Rubber bounce | OscillatorNode, sine | 300→500 Hz fast sweep | 0.08s | Boing |
| Spring stretch | OscillatorNode, triangle | 200→400 Hz over 0.3s | 0.3s | Twang |
| Spring compress | OscillatorNode, triangle | 400→200 Hz over 0.1s | 0.1s | Squish |
| Rope tension | OscillatorNode, sawtooth | 150 Hz, amplitude mod at 8 Hz | 0.2s | Creaking |
| Hinge squeak | OscillatorNode, sine | 600 Hz, short burst | 0.05s | Squeak |
| Rocket ignite | White noise bandpass 400 Hz + OscillatorNode 80 Hz | Ramp up 0.2s | Loop | Engine roar |
| Rocket off | Ramp down over 0.3s | 80 Hz sine fade | 0.3s | Engine stop |
| Explosion | White noise all-band + OscillatorNode square 60 Hz | 0.5s decay | 0.5s | Boom |
| Egg crack | White noise burst 2kHz bandpass | 0.06s | 0.06s | Crack snap |
| Challenge success | OscillatorNode, sine | 523→659→784 Hz, 80ms each | 0.3s | Success chime |
| Challenge fail | OscillatorNode, sawtooth | 330→165 Hz | 0.4s | Failure descend |
| Round start | Three-note fanfare | 440+660+880 Hz simultaneous, 0.4s | 0.4s | Alert |
| Build timer tick | OscillatorNode, sine | 880 Hz, 20ms | 0.02s | Every second under 10 |
| Place object | OscillatorNode, triangle | 440 Hz, 40ms | 0.04s | Soft click |
| Delete object | OscillatorNode, sine | 220 Hz, 40ms | 0.04s | Low pop |
| Game over (win) | Ascending arpeggio | 523→659→784→1047 Hz 100ms each | 0.5s | Victory |
| Game over (lose) | Descending chord | 440→330→220→165 Hz 100ms each | 0.5s | Defeat |

### Music/Ambience

A workshop/tinkerer vibe: gentle mechanical ambient loop at 90 BPM. Bass: sine oscillator, 55 Hz, low gain 0.04, steady. Rhythm layer: filtered noise bursts (highpass 3kHz, 20ms) every quarter note simulating light tapping. Melody: triangle oscillator playing a slow major pentatonic phrase (C4→E4→G4→A4→C5), one note every 2 beats, with a soft decay. The melody loops every 8 bars. During the active build phase, add a hi-hat layer (filtered noise, 8kHz, 30ms, every 8th note) to increase energy. During AI's turn (right screen), the music shifts slightly warmer (frequency center raised by a semitone). On challenge success, a brief bright arpeggio stabs on top. On failure, the music dips in volume for 1 second.

## Implementation Priority
- High: Material grain/texture visuals (wood grain, metal sheen, rubber gloss); collision spark effects per material type; rocket exhaust plume animation; success/fail particle bursts; build timer color ramp
- Medium: Spring coil depth rendering; rope braided visual; hinge pin-and-plate joint design; challenge description card UI; per-half background color identity (blue vs amber)
- Low: Wheel spoke spin blur; egg crack yolk particles; blueprint grid fade-in on round start; workshop ambient music loop; rubber squash/stretch animation
