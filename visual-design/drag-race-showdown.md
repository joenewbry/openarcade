# Drag Race Showdown — Visual & Sound Design

## Current Aesthetic
A quarter-mile drag racing game on a 600x400 canvas. The background has a city skyline silhouette in layered dark polygons. Two horizontal lanes occupy the lower half — the AI on top (blue `#00aaff`), the player on bottom (pink `#ff0066`). Each car is represented by a simple filled rectangle with wheel-arch cutouts. A traffic light countdown (Christmas tree) triggers the race. Tachometer/speedometer panels sit beside each lane. RPM-based gear shifting with nitro boost mechanic. Exhaust particles and a nitro flame cone emit from the rear. Progress is shown by position on the strip. The overall look is functional — the neon colors pop against dark — but the cars are rectangles, the track has no sense of speed, and the race doesn't feel physically dramatic.

## Aesthetic Assessment
**Score: 3/5**

The color contrast between player pink and AI blue works well. The traffic light is clear and the tachometer panels are readable. But the cars are plain rectangles, the track surface has no texture or motion blur, and the sense of acceleration and raw speed that makes drag racing thrilling is absent. Exhaust particles are minimal, the finish line has no celebration, and the backgrounds don't blur as the cars approach top speed.

## Visual Redesign Plan

### Background & Environment
Transform into a dramatic drag strip night race:

**Sky**: Deep night sky — a gradient from black `#000000` at top to very dark navy `#050510` at horizon. Stars rendered as small white dots with a few larger twinkling ones. A distant crescent moon in upper-right corner.

**City skyline**: The existing layered silhouette gets more detail — varying building heights, some buildings with lit windows (small yellow rectangles at random positions), billboard outlines on a few buildings. Three parallax layers: far (barely visible `#0a0a14`), mid (`#111118`), near (`#181820`). At race start, the skyline briefly blurs (fade to slightly lighter) as speed sensation kicks in.

**Track surface**: The drag strip transforms from a plain rectangle to a detailed surface:
- Dark tarmac `#111112` base with a subtle diagonal hash pattern suggesting asphalt texture
- Bright white start/finish line at the very left
- Centerline: bright yellow dashes between the two lanes
- **Lane distance markers**: Short perpendicular white lines every 1/8 mile (calculated as screen x-positions) — these rush toward the camera as the cars accelerate
- **Motion blur lines**: At speed above 60%, thin horizontal white/grey lines (alpha 20–40%, length 8–30px) scroll rightward at high speed across both lanes — the classic speed blur effect. Density increases with speed.
- **Rubber marks**: Dark brown-black skid streak marks left by previous races — these are static, giving history to the strip.

**Starting area**: Countdown tree (Christmas tree) is a tall narrow panel with actual staged circles — two round yellows in a column, then green below. The staging beams (two pairs of small horizontal lines) are visible at the very start of the lane.

### Color Palette
- Sky: `#000005`
- City far: `#0a0a14`
- City mid: `#111118`
- City near: `#181820`
- Building window: `#ffee88` at 60%
- Track tarmac: `#111112`
- Lane divider: `#ffdd00`
- Start/finish line: `#ffffff`
- Distance marker: `#888888`
- Player car: `#ff0066`
- Player car dark: `#cc0044`
- Player car window: `#88ddff` at 60%
- AI car: `#00aaff`
- AI car dark: `#0077cc`
- Nitro flame: `#44aaff`
- Nitro core: `#ffffff`
- Exhaust: `#aaaaaa`
- Tachometer: `#1a1a2a`
- Tach needle: `#ff4422`
- RPM green zone: `#22cc44`
- RPM red zone: `#ff2200`
- Finish flash: `#ffffff`
- Win gold: `#ffd700`

### Entity Redesigns
**Cars**: Full car silhouettes replacing rectangles:
- **Player car (pink)**: A low-slung muscle car profile — long hood, short cabin, wide rear haunches. The body is a multi-polygon shape: hood polygon, cabin polygon (with slanted windshield line), trunk polygon, and a prominent rear spoiler rectangle. Wheels are thick black circles with bright hub dots. The car body is main pink `#ff0066` with a darker underside `#cc0044` for depth. A neon light strip runs the length of the underside (thin bright pink line). The driver silhouette is a dark rectangle inside the cabin.
- **AI car (blue)**: Similar silhouette but slightly different proportions — a wider, lower-profile body. Same treatment in blue tones.
- Headlights: bright white circles at the front with a forward cone of faint white at 15% alpha illuminating the track ahead.
- Taillights: red circles at the rear. During braking (race end), they brighten dramatically.

**Nitro boost**: When nitro activates, dramatic multi-layered exhaust:
- A wide white-hot core cone extends 40px from the rear
- A blue-purple mid-cone (`#4466ff`) extends 60px
- Outer flickering orange-white (`#ffaa44`) extends 80px with jagged edges (sine noise on the outline)
- The entire car briefly brightens (glow increases) during nitro

**Tachometer panels**: Redesigned as professional racing gauges:
- Dark `#1a1a2a` circular panel with a graduated arc of tick marks
- Color zones: green `#22cc44` (0–70% RPM), yellow `#ffcc00` (70–90%), red `#ff2200` (90–100%)
- A bright needle (red with white tip) sweeps the arc
- Digital RPM readout in the center in monospace white digits
- Gear indicator: large bright number (1–5) below the RPM readout
- "NITRO" indicator below: a blue bar that depletes during boost, refills between runs

### Particle & Effect System
- **Tire burnout (launch)**: Thick white smoke plumes billow from rear tires at race start — 20+ white circles spawning per frame, expanding and drifting upward while fading over 60 frames.
- **Normal exhaust**: 3–5 grey circles per frame emit from exhaust pipes, drift backward, and fade in 20 frames.
- **Nitro exhaust**: Dense blue-white particle stream — 8–10 bright blue-white circles per frame, longer trail (30 frames), slight upward drift.
- **Gear shift flash**: A brief "SHIFT!" text flashes in bright yellow at the tachometer when the perfect shift window is hit. A white ring expands from the gear indicator.
- **Finish line crossing**: The car crossing the finish line triggers a massive multi-element celebration: confetti burst (30 colored rectangles scatter with gravity), a large "FINISH!" banner sweeps in from above, and a burst of golden stars radiates from the winning car.
- **Win state**: A wide golden glow halo pulses around the winning car. "WINNER!" text appears in large gold letters with a shadow.
- **Track distance markers rushing**: As speed increases, the distance marker lines scroll faster — near maximum speed they become a blur streak.

### UI Polish
- Race strip progress indicator: a top-down thumbnail of the quarter-mile with two tiny car markers showing relative position — cleaner than the current implementation.
- Speed indicator in mph: a large digital readout above the tachometer in bright cyan `#44ffff`.
- "REACTION TIME" displayed at the start line after the tree drops — shows the launch timing in milliseconds.
- "PERFECT SHIFT!" text appears in green when a shift is executed in the optimal RPM window.
- Results screen: styled as an official drag racing time slip — white paper background with black ink data: Reaction Time, 60-ft, 330-ft, 1/8 mile, 1/4 mile — each stat filling in sequentially.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Engine idle | Sawtooth 80 Hz with slow LFO tremolo 0.5 Hz | Continuous | Low rumble at start |
| Engine rev (increasing) | Sawtooth, pitch rises with RPM: 80→400 Hz | Continuous | Higher pitch = higher RPM |
| Gear shift | Sharp RPM drop: pitch drops 30% instantly | 100ms | Engine settles into new gear |
| Tire burnout / launch | White noise burst, lowpass 800 Hz, heavy gain | 1500ms | Screaming rubber |
| Nitro activate | Whoosh: sine 200→800 Hz sweep + noise swell | 300ms | Power surge |
| Nitro sustain | Dual sawtooth 100+104 Hz (beating) + noise | Continuous while active | Nitro roar |
| Perfect shift | Bright ding: sine 1047 Hz (C6), short | 80ms | Reward tone |
| Missed shift | Buzzer: square 200 Hz | 100ms | Wrong timing |
| Finish line cross | Airhorn: square 233 Hz (Bb) | 800ms | Loud triumph |
| Win fanfare | Rising: sine C4 E4 G4 B4 C5, fast | 400ms | Victory |
| Loss sound | Flat tone: square 196 Hz (G3), descending | 300ms | Disappointment |
| Countdown amber | Tick: sine 440 Hz | 80ms per light | Anticipation |
| Countdown green | GO! klaxon: square 880 Hz | 200ms | Launch! |

### Music/Ambience
A driving electronic race soundtrack:

1. **Pre-race tension**: While on the starting line, a slow pulsing bass drone — two sawtooth oscillators at 55 Hz and 57.5 Hz (creating a 2.5 Hz beat frequency), giving a deep, vibrating tension. Very low gain, felt more than heard.
2. **Race music**: When the green light drops, a high-energy rhythm kicks in — a square wave percussion pattern: kick (sine 60 Hz, 50ms) at 140 BPM quarter notes, snare (noise burst 300 Hz, 60ms) on beats 2 and 4. A sawtooth melody layer plays a repeating 4-bar phrase in G minor — simple but driving.
3. **Engine-music integration**: The engine sawtooth is so dominant during the race that music volume drops to 20% — the engine sound IS the music texture.
4. **Finish approach**: As the car enters the final 1/8 mile (distance marker), the music tempo increases by 10% and the bass drone rises a semitone — building excitement.
5. **Post-race results**: Music drops to a quiet pad — same G minor chord but slow and sustained, while the time slip results appear.

## Implementation Priority
- High: Car as multi-polygon silhouette (hood/cabin/trunk shape), nitro multi-layer flame cone, motion blur speed lines on track, tire burnout smoke particle burst
- Medium: Christmas tree countdown with proper staged-light circles, city skyline parallax layers with lit windows, tachometer arc with color zones + digital readout, finish line celebration confetti
- Low: Rubber skid marks on track surface, reaction time display, results time-slip screen styling, headlight forward cone illumination
