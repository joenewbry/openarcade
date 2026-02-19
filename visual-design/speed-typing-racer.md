# Speed Typing Racer — Visual & Sound Design

## Current Aesthetic

600x400 typing-based racing game. The upper portion is a racing track — a dark `#111125` rectangle with 4 lanes divided by dashed lines and solid blue `#4488ff` edge lines. Cars are 8-vertex polygons with color-coded windshields and headlights. A checkered finish line is rendered as alternating 4px squares. Exhaust particles stream from the rear of each car. Below the track is a text panel with a blue-bordered box showing the passage, with typed characters in green `#33aa66`, cursor highlighted in blue, untyped in grey `#666677`, and errors in red. WPM, accuracy, and position stats appear above the text. The countdown uses a large scaled number with blue glow. The finish screen overlays results on a dimmed background. The game is functional and the key visual metaphor (typing speed = car speed) reads clearly.

## Aesthetic Assessment
**Score: 3/5**

The split-screen metaphor works well — track above, text below — and the character coloring system (green/white/grey/red) is immediately readable. The weakness is the track: it's a rectangle with no sense of a real racing environment. Cars have reasonable polygon shapes but share generic silhouettes. The exhaust particle trail is the best visual element, giving cars a sense of momentum. The text panel is utilitarian but sterile — there's no excitement in the presentation. A typing game should make every correct keystroke feel satisfying and rewarding. The visual feedback loop needs dramatic improvement.

## Visual Redesign Plan

### Background & Environment

**Track section:** Transform the flat dark rectangle into a proper racing environment:
- A dark tarmac surface with a subtle asphalt texture: alternating very slightly different dark shades in horizontal bands (2px strips of `#111125` and `#13132a`) suggesting road surface grain
- Lane dividers: The dashed center lines become properly tapered, brighter when the cars near them
- Track side rumble strips: 3-4px wide alternating red/white stripes on both outer edges (beyond the track boundary)
- Road edge: Raised curbing suggestion — a thin bright white line at each edge, then a row of alternating red/white 8px blocks
- Crowd and venue: A thin horizontal band at the very top (6-8px) with a crowd silhouette — tiny colored rectangles at random heights at 20% opacity, like packed bleachers

**Sky above track:** A gradient strip behind the crowd — dark blue at top fading to the track color, with 3-4 light source circles at high opacity suggesting stadium floodlights shining down from above.

**Text panel:** The typing arena should feel like a teleprompter or digital read-out, not a plain text box:
- Background: deep dark `#080818` with a very subtle scanline texture (1px horizontal lines at 2% opacity alternating)
- Panel border: glowing blue-purple gradient outline, not plain lines
- A faint "PASSAGE X / 12" watermark behind the text at 4% opacity

**Finish line:** Upgrade from 4px squares to a proper checkered pattern spanning the full track height — larger 8px checks, with a brief waving animation (the pattern slides upward by 1px per frame) making it look like a real finish banner.

### Color Palette
- Player car: `#4488ff` (blue)
- CPU-1: `#ff5555` (red)
- CPU-2: `#55ff55` (green)
- CPU-3: `#ffbb22` (amber)
- Track surface: `#0e0e22`, `#11112a`
- Track edge stripe: `#ffffff`
- Rumble strip: `#ff3333`, `#ffffff`
- Text panel BG: `#080818`
- Typed correct: `#33cc77`
- Typed cursor: `#4488ff`
- Not yet typed: `#55556a`
- Current char highlight: `#4488ffaa`
- Error highlight: `#ff333355`
- Glow/bloom: `#4488ff`, car colors

### Entity Redesigns

**Cars:** Upgrade each car to feel like a distinct racing vehicle. Keep the 8-vertex polygon base, but add more detail at the small scale:
- Slightly more pronounced aerodynamic wedge shape — nose lower than the body, roofline taper
- A small rear spoiler suggestion: a 2px horizontal line with small vertical end plates
- Team-colored accent stripe running along the side body (1px bright line in the car's color)
- Animated wheel arches: small dark ovals at the four wheel positions that rotate while moving
- Headlights: Bright forward-facing glow cones (two small triangle fans in white at very low alpha) projecting ahead of each car

**Exhaust trail:** Current particles are functional. Upgrade: make exhaust particles vary in size (some large and wispy, some small and tight) and use color graduation — directly behind the car, particles are dark grey/black; they lighten to the car's color at mid-distance, then fade to transparent. Boost effect: when a player is typing fast (WPM > 60), the exhaust trail briefly flashes golden with extra particles.

**Position indicator cars:** The tiny track progress is the core visual. When a car passes another car, add a brief red "overtake flash" — a short-lived colored streak connecting the two positions.

**Text panel characters:** Each character should have more visual weight:
- Already-typed correct characters: subtle bright-green underline segment beneath each character in addition to the color
- Current position cursor: blinking underline that pulses (full brightness → 40% → full, at 4Hz) rather than just appearing/disappearing
- Error state: the red background on the current character should pulse in intensity — not static, but throbbing to demand attention

### Particle & Effect System

- **Correct keystroke:** A tiny green spark particle bursts from the cursor position (1-2 small particles) — subtle but present
- **Wrong keystroke:** Brief red flash of the current character, plus a short screen-edge red vignette (1 frame, very subtle)
- **Long correct streak (20+ chars without error):** Small golden "combo" particle at cursor position every 5th character
- **Car overtaken position:** Screen briefly flashes the overtaking car's color at 5% opacity on the relevant side (left = player overtook CPU, right = CPU overtook player)
- **Finish line crossed (player):** Confetti explosion of player-color `#4488ff` + white particles scattering across the track section
- **WPM personal best:** Golden floating "+PB!" text rises from the WPM display area
- **CPU errors (inError state):** The CPU car briefly swerves (draws at a slight ±2px lateral offset for 3 frames) suggesting a mistype stumble

### UI Polish

- WPM display: Large and prominent, colored by current performance (below 30 = grey, 30-50 = white, 50-70 = green, 70+ = gold) with a brief scale-up animation on each 10-WPM milestone
- Accuracy display: Turns orange below 90%, red below 80%
- Position indicator: Color-coded "1st/2nd/3rd/4th" with team color alongside
- Countdown numbers: Each number (3, 2, 1) has a different color — 3 is red, 2 is amber, 1 is green, "GO!" is full white with a screen flash
- Race progress bar: A thin line below the track showing overall passage completion (independent of car positions) — fills from left to right as player types
- Results screen: Each placing gets a distinct medal icon — 1st gets a stylized gold crown drawn as a polygon, 2nd silver, 3rd bronze, rendered in their car colors

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Correct keystroke | Soft tick | Sine 800 Hz, very short | 20ms | Satisfying mechanical click feel |
| Wrong keystroke | Error buzz | Square 200 Hz, very short | 30ms | Jarring but brief |
| WPM milestone (every 10 WPM) | Rising chime | Sine 440→660 Hz sweep | 100ms | Achievement ping |
| Correct streak bonus (20+ chars) | Shimmer | 3 sine tones at 880, 1320, 1760 Hz, staggered 20ms | 150ms | Combo reward |
| Car engine (player) | Continuous hum | Sawtooth 120 Hz, filtered at 400 Hz | Continuous | Volume and pitch scale with WPM |
| Car engine (CPU) | Faint hum | Sawtooth 100 Hz, lower volume | Continuous | Background ambience |
| Car overtake | Doppler whoosh | Sine 600→300 Hz sweep | 150ms | Passing sound |
| Countdown 3 | Low beep | Sine 440 Hz | 100ms | |
| Countdown 2 | Mid beep | Sine 554 Hz | 100ms | |
| Countdown 1 | High beep | Sine 659 Hz | 100ms | |
| GO! | Air horn | Sawtooth 110 Hz | 400ms | Race start signal |
| Finish (player 1st) | Victory fanfare | 523, 659, 784 Hz sine staggered | 600ms | Triumphant |
| Finish (player 2nd/3rd) | Completion tone | 440, 554 Hz sine | 400ms | Acknowledged |
| Finish (player 4th) | Descending tone | 440→330→220 Hz sine | 400ms | Mild disappointment |
| Personal best | Rising arpeggio | 440, 554, 659, 880 Hz sine, fast | 500ms | Achievement sound |

### Music/Ambience

An upbeat electronic piece at 140 BPM that matches the energy of competitive typing. Built from oscillators only:

- **Waiting/pre-race:** A single pulsing drone at 55 Hz (low A) at low volume — engine idling feel, just a hint of anticipation.
- **Countdown:** The drone rises in pitch slightly each second (55→65→75 Hz) and increases in volume, creating a natural buildup without any extra work needed.
- **Race active:** Two voice structure. Bass: 4/4 kick pattern as a gated sawtooth at 55 Hz with very fast attack/release — punchy and rhythmic. Lead: square wave melody in A major pentatonic (220, 261, 330, 440 Hz) playing 8th-note arpeggiation that ascends and descends. The tempo of the music subtly tracks the player's WPM — faster typing pushes the BPM from 140 toward 160; slower typing lets it settle back. This creates a subconscious feedback loop between typing speed and music energy. A high-frequency shimmer pad: filtered noise at 4000-6000 Hz at 3% volume, suggesting the sound of fast keystrokes.
- **Final passage stretch (last 20% of text):** Music adds a high-pitched triangle wave at 1760 Hz playing a simple ascending pattern every 4 beats — urgency indicator.
- **After finish:** Immediate fade to the engine idle drone, then silence after 2 seconds.

## Implementation Priority
- High: Keystroke sounds (correct tick, error buzz), engine hum scaling with WPM, correct-streak particle burst, countdown sound sequence
- Medium: Track rumble strips and crowd silhouette band, car overtake Doppler whoosh, WPM color coding by performance level, wrong keystroke screen-edge vignette
- Low: Car animated wheel arches, exhaust gradient color graduation, results medal polygon icons, music BPM-tracking system
