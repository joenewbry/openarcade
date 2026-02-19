# Slot Racer — Visual & Sound Design

## Current Aesthetic

500×500 canvas with track layouts: oval, figure-8, and tight circuit. Player car is purple (`#a6f`), CPU car is red (`#f44`). Track is dark grey with lighter grey lane centerlines. Cars are filled polygon shapes with a windshield rectangle. Skid marks appear on sharp curves as semi-transparent grey arcs. Speed indicator bar color-codes from green through amber to red. A lap counter and position indicator show at top. When a car flies off the track, a tumbling animation plays. Track changes every 3 laps.

## Aesthetic Assessment
**Score: 2/5**

The slot car racing concept is charming but visually underdeveloped. The track is a plain grey path with no surface character. Cars are basic polygons. There's no sense of speed or danger. The track layouts change but look nearly identical visually — there's no environmental variety between circuits. The UI is bare text. With the right visual treatment this could feel like a fun neon miniature track game.

## Visual Redesign Plan

### Background & Environment

Transform each track into a **distinct racing venue** with a unique environment feel:
- **Oval track:** Classic racing oval atmosphere — a bright grass green interior fill (`#1a3a10`) inside the oval loop, stadium grandstand marks (alternating light/dark horizontal stripes) drawn on the outer edge suggesting bleachers. Bright orange/white checker pattern at the start/finish line crossing.
- **Figure-8:** An indoor arena feel — dark concrete floor (`#1a1a22`) with a neon grid of glowing lines. The crossover point gets a bright yellow X warning marking.
- **Tight circuit:** A city street circuit — dark asphalt with building silhouettes drawn behind the outer track edges (simple dark rectangles of varying heights suggesting a skyline). Orange barrier stripes along the outer walls.

All tracks share: a subtle track surface texture (thin horizontal line hatching across the track at 3% opacity), bright white starting grid boxes (2 rectangles side-by-side at the start line), and a finish line checker pattern.

### Color Palette
- Player car: `#cc88ff` (brighter purple)
- CPU car: `#ff4444`
- Track surface: `#1c1c2a`
- Track edge: `#333344`
- Oval grass: `#1a3a10`
- Track markings: `#ffffff`
- Start/finish checker: `#ffffff` / `#000000`
- Glow/neon: player color per car

### Entity Redesigns

**Player car (purple):** Upgrade from basic polygon to a proper slot car silhouette. A sleek low-profile body — narrow front, wider rear haunches. Two small headlight rectangles at the front glowing with a soft white-purple halo. Two round wheel circles on each side (viewed top-down). A dark windshield rectangle angled slightly. A small spoiler fin at the rear. The car body has a highlight stripe running the length (thin lighter rectangle along the centerline). When at high speed, add motion blur — 3 fading ghost copies shifted in the direction of travel.

**CPU car (red):** Mirror slot car design with red colorway. Slightly more aggressive body shape (sharper front nose). Headlights glow red-orange. At high speed, red motion blur copies.

**Track surface:** The track gets proper edge markings — a thin white line along both inner and outer edges of the track path. At sharp corners, add large painted numbers (braking zone markers) in white, partially faded. Skid marks become more detailed: dark rubber arc streaks with a slightly transparent, slightly offset second arc suggesting tire width.

**Lane guidance:** Draw a subtle centerline dash pattern (short dashes, every 30px along the track centerline) in a slightly lighter grey — like real road lane markers.

**Start line:** A proper grid — two white boxes per row, with the car initials or number suggested inside. A hanging traffic light gantry shape drawn above the track at the start line (a horizontal bar with 3 circles for the lights).

**Checkered flag finish line:** Alternating black and white squares (4×4 grid across the track width) at the finish position. When a car crosses, a brief checkered flag wave animation (the pattern ripples slightly).

**Crash/fly-off:** When a car flies off the track, it tumbles visually (rotate the car polygon rapidly) and a tire smoke puff effect — expanding grey circles — emanates from the exit point.

### Particle & Effect System

- **Skid marks:** Generated dynamically on sharp curves. Dark rubber smear arcs that persist on the track (accumulating over the race). Fade slowly over time.
- **Speed burst at straight:** When on a straight section at max speed, brief horizontal speed lines shoot behind the car (3–4 white thin streaks).
- **Crash off-track:** Tumbling car + 3 grey smoke puff circles expanding from the exit point. The car briefly flashes white before disappearing and respawning.
- **Lap completed:** Brief green flash along the start/finish line. A "LAP X" text pops up above the car and floats upward.
- **Track change transition:** Between track layouts, a white horizontal wipe sweeps across the canvas. The new track fades in behind it.
- **Position change (overtake):** A brief golden flash on the car that overtook. "OVERTAKE!" text pops up.
- **Final lap warning:** The lap counter flashes amber, and a "FINAL LAP" banner appears briefly at the top.
- **Race finish:** Checkered flag animation at the finish line. Winner car does a brief victory spin animation.

### UI Polish

- Speed bar: Replace plain color rect with a proper **tachometer gauge** — a semicircular arc with tick marks at intervals. A needle sweeps from 0 to max. Color gradient along the arc: green→amber→red. Digital speed readout in the center of the arc.
- Lap counter: "LAP 3 / 10" displayed with a proper lap badge shape — a pill with a checkered flag icon to the left. Current lap number is large, total small.
- Position indicator: "P1" or "P2" in a badge at the top — large, bold, with the player's color background. Flashes green on taking the lead.
- Race timer: A countdown or race-elapsed timer in monospace digits at the top center.
- Track name banner: When the track changes, the track name (OVAL SPEEDWAY, FIGURE-8 ARENA, CITY CIRCUIT) slides in from the left as a styled banner, holds for 2 seconds, then slides out.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Engine idle | OscillatorNode, sawtooth | 80 Hz, gain 0.03 | Loop | Always playing |
| Engine at speed | OscillatorNode, sawtooth | 80 + speed×60 Hz | Loop | Pitch scales with speed |
| Acceleration | 80→300 Hz ramp over 0.8s | sawtooth | 0.8s | Rev up |
| Braking | 300→60 Hz drop + noise burst | bandpass 400 Hz | 0.3s | Brake squeal |
| Skid | White noise bandpass 600 Hz | Continuous while skidding, gain 0.15 | Loop | Tire screech |
| Crash off-track | White noise burst lowpass 300 Hz | 0.3s | 0.3s | Impact thud |
| Respawn | OscillatorNode, sine | 440→880 Hz sweep | 0.2s | Respawn chime |
| Lap completed | OscillatorNode, triangle | 659→784→1047 Hz, 80ms each | 0.3s | Lap bell |
| Overtake | OscillatorNode, sine | 880 Hz, 0.1s | 0.1s | Pip |
| Final lap | OscillatorNode, square | 440+660 Hz simultaneous | 0.3s | Alert sting |
| Race finish (win) | Ascending fanfare | 523→659→784→1047 Hz 80ms each | 0.4s | Victory |
| Race finish (lose) | Descending notes | 440→330→220 Hz 100ms each | 0.35s | Defeat |
| Track change | OscillatorNode, triangle | 330→440→523 Hz | 0.3s | Transition chime |
| Start countdown beep | OscillatorNode, sine | 440 Hz, 60ms | 0.06s | Each beep |
| Start GO beep | OscillatorNode, sine | 880 Hz, 0.1s | 0.1s | Higher pitched GO |
| CPU overtakes player | OscillatorNode, sawtooth | 220 Hz descend | 0.2s | Tension sting |

### Music/Ambience

A high-energy racing synthwave loop at 150 BPM. Kick drum: filtered noise, 50Hz lowpass, 30ms, every beat. Snare: white noise 150Hz bandpass, beats 2+4. Hi-hat: 8kHz filtered noise, 15ms, every 8th note with alternating closed (full) and open (longer, 40ms). Bass: sawtooth oscillator, playing a driving riff on the root note (55 Hz E, cycling through E-A-B-A progression), one note per beat. Lead: a square wave playing a simple repeating 4-note melody (440→493→523→440 Hz) over 2 bars at quarter-note intervals, giving a catchy racing theme. During the final 3 laps, tempo increases to 165 BPM and a second melody layer plays in a higher octave (880→987→1047→880 Hz). On crash, music volume ducks by 50% for 1 second, then recovers. On finish, music cuts to a brief silence then the fanfare plays.

## Implementation Priority
- High: Track environment fills (grass for oval, concrete grid for figure-8, city silhouette for circuit); car motion blur ghost copies at high speed; proper tachometer gauge semicircle needle; start/finish checker grid pattern; engine pitch modulation audio loop
- Medium: Car headlight glow halos; skid mark accumulation with slow fade; lap completed green flash + text popup; track-specific barrier/wall markings; traffic light gantry at start line
- Low: Grandstand bleacher stripes (oval); building silhouette backdrop (city circuit); final lap banner; track change wipe transition with name banner; synthwave racing music loop
