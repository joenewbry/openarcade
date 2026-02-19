# Super Sprint — Visual & Sound Design

## Current Aesthetic

A top-down racing game on a 600x600 canvas. Three tracks (Oval, Figure-8, Grand Prix) are defined as waypoint arrays with an 80px track width. The track surface is a flat dark grey. Track borders are drawn as offset polylines in lighter grey. The player car is a muted olive-green (`#ae4`). AI cars are red and blue. Oil slicks are dark circles. Wrench pickups are orange circles. A minimap sits in the corner. The overall aesthetic is functional but sterile — the track has no road texture, cars have no detail, and the racing excitement doesn't come through visually.

## Aesthetic Assessment
**Score: 2/5**

The core track layouts are interesting (especially Figure-8) and the minimap is a nice touch. But the flat grey track surface, plain colored cars, and lack of environmental context make it feel like a prototype. Racing games need speed sensation, car personality, and track character.

## Visual Redesign Plan

### Background & Environment

**Canvas background**: Deep asphalt-black `#0a0a0a` with a very subtle worn concrete texture — random 1px dots at 3% alpha in slightly lighter grey across the whole canvas. This is the out-of-track area (grass/dirt).

**Out-of-track area**: Draw the area outside the track as a grass/terrain surface. A warm dark green `#0a2a0a` fill behind everything. Small random darker green rect patches (`#081a08`) at various positions suggest grass clumps and terrain variation.

**Track surface**: Replace flat grey with animated road-asphalt texture. The track is composed of the two offset polylines forming its borders. Fill the track band between them with: dark asphalt base `#1e1e22`, then draw subtle alternating dark bands (1-2px wide, slightly lighter `#262628`, scrolling around the track over time — a tire-mark/wear texture illusion). Add a center dashed white line down the track center (short dashed polyline segments at intervals).

**Track borders (curbs)**: The outer and inner track boundary lines become classic racing curbs — alternating red/white stripes rather than plain grey lines. Draw the border poly in 3px width, alternating red `#dd2020` and white `#ffffff` segments every 15px along the line length.

**Runoff zones**: At corners, add a subtly lighter patch of grey `#2a2a2a` suggesting tire-worn runoff area.

**Start/finish line**: A checkered line across the track at the starting point — alternating black/white rectangles forming the classic start stripe. A "START/FINISH" label in small white text above it.

### Color Palette
- Track surface: `#1e1e22`, `#262628`
- Track curb: `#dd2020` / `#ffffff` alternating
- Grass: `#0a2a0a`, `#081a08`
- Player car: `#22dd44` (bright racing green)
- AI car 1: `#ee3333` (racing red)
- AI car 2: `#4488ff` (racing blue)
- Oil slick: `#223322` with rainbow sheen overlay
- Wrench: `#ffaa00` (bright amber)
- Minimap track: `#555566`
- Speed trail: player/AI color at low alpha
- Glow/bloom: `#22dd44`, `#ffd700`, `#ffffff`

### Entity Redesigns

**Player car**: A proper top-down racing car silhouette:
- Elongated body shape — use a narrow rectangle with slightly tapered front end (polygon with narrower leading edge).
- Racing green body `#22dd44` with a darker `#1aaa33` hood panel and a bright highlight line down the center.
- Four black wheel rectangles at the four corners, slightly wider than tall.
- A small cockpit rect in the center in dark tinted glass `#334433`.
- A rear spoiler: thin horizontal rect across the back of the car in darker metal `#1a2a1a`.
- Front aero: a thin rect across the nose.
- When boosting/fast: Two small white exhaust flare dots at the rear.

**AI cars**: Each AI car gets a distinct personality:
- Red AI: Aggressive wedge shape — pointier front polygon, low wide body. Darker red `#cc1111` with orange highlights `#ff6622` on the nose.
- Blue AI: Sleek elongated shape — longer than wide, aerodynamic. Deep blue `#2255cc` with silver `#aabbcc` side stripes.
- Both have the same wheel, cockpit, and spoiler treatment as the player.

**Oil slicks**: Rainbow iridescent puddle effect — draw 3 overlapping ellipses of very low alpha in violet `#8800ee12`, cyan `#00eeff12`, and yellow `#eeff0012` on top of the base dark oval. The hue slowly rotates using sin(frameCount * 0.02) to shift which overlay is most visible.

**Wrench pickups**: Distinct wrench shape drawn with polygons:
- Handle: a thin narrow rect.
- Head: a hex-nut shape (6-sided polygon) at the end.
- All in bright amber `#ffaa00` with a golden inner fill `#ffcc40`. Bobs up and down ±3px with a glow ring pulsing around it.

**Skid marks**: When a car slides (velocity direction differs from facing), draw thin dark marks behind the car — two thin dark lines (one per rear wheel position) that fade over 40 frames. Color: very dark grey `#1a1a1a`.

### Particle & Effect System

- **Tire smoke**: Continuous low-intensity grey particles (`#888888`, alpha 0.3, radius 3-4) emitted from rear wheels when the car drifts or brakes hard. Each particle drifts outward and fades.
- **Car collision**: When two cars collide, a brief spark burst — 6 bright yellow spark particles radiate from the contact point, each leaving a short 2-frame trail.
- **Oil slick hit**: Car that hits an oil slick emits a circular spray of small dark particles in an arc behind it, plus 3 wider grey smoke puffs.
- **Wrench collect**: A brief golden burst — 8 small diamond particles radiate, plus a "+1 HP" or repair indicator floats upward in amber text.
- **Lap complete**: A brief flash of the player car's color across the top of the screen, and a "+1 LAP" text floats from the car in white.
- **Race win**: Checkered flag wave animation — the start/finish line checkered pattern pulses and a golden particle burst emits. "WINNER!" blooms from center in large golden text.

### UI Polish

**Minimap redesign**: The corner minimap gets a proper styled treatment:
- Dark panel background with a thin light border.
- Track drawn as a white-grey polyline on dark.
- Car positions shown as small colored dots (player = green, AI = red/blue).
- A small checkered flag icon marks start/finish on the minimap.
- "MAP" label in small white text.

**Speed indicator**: A circular speedometer arc drawn in the bottom corner — a partial arc (270 degrees) with tick marks at intervals. A needle line rotates based on current speed. Outer arc in white, filled arc portion in green up to current speed, red above 80% of max. Speed value in large text at center.

**Position indicator**: "P1", "P2", etc. displayed prominently in the HUD with the player's current race position, using large colored text. Flashes bright when position changes.

**Lap counter**: "LAP X/3" with clean white text in a dark HUD panel.

**Race start**: "3... 2... 1... GO!" countdown in large numbers that slam down from above, each in a different color. "GO!" is especially bright and large.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Engine (continuous) | Sawtooth oscillator | 80→160Hz, scales with speed | Continuous | Low growl pitch-shifted with speed |
| Gear shift / speed boost | Brief pitch jump | Engine +40Hz for 100ms | 100ms | Gear change feel |
| Car collision | Crunch + impact | Noise burst + sine 100Hz | 300ms | Metal impact |
| Oil slick hit | Wet spin | Noise filtered 200Hz + pitch drop | 400ms | Skidding out |
| Wrench collect | Repair chime | Ascending sine 440→660Hz | 200ms | Positive pickup |
| Lap complete | Brief fanfare | 784→1047Hz two-tone sine | 300ms | Lap sting |
| Race win | Full fanfare | C4→E4→G4→C5 + chord | 800ms | Victory fanfare |
| Race lose | Descend | 440→330→220Hz sine | 500ms | Defeat fall |
| Countdown beep | Sine pip | 440Hz | 80ms each | 3 beeps, last at 880Hz |
| Tire squeal | Noise highpass | 3000Hz, varying gain | Duration of drift | Tire screech |

### Music/Ambience

A driving electronic racing loop at 140 BPM:
- **Bass**: Square wave oscillator at 110Hz with punchy gain envelope (5ms attack, 80ms decay, 0.15 peak, 0.04 sustain). Repeating bass pattern: C2→C2→G2→F2 (110, 110, 165, 175Hz) cycling every 4 beats. Gain 0.1.
- **Lead synth**: Sawtooth at 440Hz through resonant bandpass (800Hz center, Q=3) with gain 0.04. A simple repeating motif — 4 notes cycling at 8th-note intervals. The bandpass filter sweeps (LFO at 0.25Hz between 600-1200Hz) giving it movement and energy.
- **Hi-hat**: Narrow highpass noise (7000Hz cutoff) at every 8th note — alternating gain 0.04 (beat) and 0.02 (offbeat). Creates rhythmic drive.
- **Crash**: A broader noise burst (all frequencies, gain 0.08) on beats 1 and 3 of every bar — the kick drum equivalent.
- **Speed intensity**: As the player's speed increases above 70%, gradually raise the lead synth gain from 0.04 to 0.07 and the bass gain from 0.1 to 0.15 — the music feels more intense when racing fast.
- Loop length: 8 bars (about 3.4 seconds at 140 BPM), repeating seamlessly.

## Implementation Priority
- High: Engine sound (speed-reactive), car collision crunch sound, track curb red/white stripes, car silhouette redesign with wheels/cockpit
- Medium: Tire smoke particles, skid marks, oil slick rainbow sheen, racing music loop
- Low: Speedometer arc HUD, minimap styled panel, start/finish checkered line, wrench polygon shape
