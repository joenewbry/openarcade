# Restaurant Tycoon — Visual & Sound Design

## Current Aesthetic

Dark navy UI (`#1a1a2e` background, `#12122a` panels) with a street-view of four restaurants rendered as simple rectangular buildings. The theme color is crimson red (`#e64646`). Buildings have colored glowing name signs, three rectangular windows, star ratings using asterisk characters, and a colored door. Customer animations are tiny grey rectangles bobbing toward buildings. Phase tabs (Menu/Staff/Upgrades/Results) separate rounds. Buttons are flat filled rectangles with a semi-transparent fill. The overall look is minimal but functional — a dark cyberpunk city block.

## Aesthetic Assessment
**Score: 2/5**

Buildings are rectangles with no depth or charm. Customers are 6×8 grey blobs. The street has no atmosphere — no sky gradient, no lighting, no foot traffic texture. The UI panels are basic. The premise (competitive restaurant street) has huge visual potential that is almost entirely untapped.

## Visual Redesign Plan

### Background & Environment

Draw a proper isometric-perspective street. Replace the flat two-color sky with a layered dusk gradient from deep purple (`#1a0a2e`) at top to amber-orange (`#2e1a0a`) at horizon, with a thin glowing sun sliver. Add parallax clouds (sparse white polygons drifting right). The road gets lane markings, manhole covers, and sidewalk tiles. Add distant city silhouette shapes behind the four buildings. Animate streetlamps that turn on as rounds progress (warm orange point glow at the top of each lamp post).

### Color Palette
- Primary (player accent): `#e64646`
- Secondary (UI chrome): `#ffaa44`
- Background sky top: `#1a0a2e`
- Background horizon: `#2e1a0a`
- Road: `#1c1c28`
- Sidewalk: `#2a2a3e`
- Panel fill: `#0d0d1e`
- Glow/bloom: `#ff8844`

### Entity Redesigns

**Buildings:** Each restaurant gets a layered facade. Ground floor: arched doorway with a glowing sign above it using the restaurant's color. Upper floors: 2–3 floors of windows (warm yellow glow when customers present, dim when empty). Awning polygons overhang the sidewalk. Add depth by rendering a dark side face. Neon sign characters glow and pulse on the frame.

**Customers:** Replace grey rectangles with tiny stylized people: a circle head (2px), a small torso rect, two leg lines. Animate a walking cycle (legs alternate). Use different clothing colors (sample from a palette per restaurant color). Add a crowd idle shuffle animation — customers who have arrived bob in place. When results show, overflow customers spill onto the sidewalk.

**Stars:** Replace asterisk strings with filled star polygons (`★`) in gold with a subtle drop shadow.

**Phase Tabs:** Styled as neon-lit physical tabs with rounded tops. Active tab has a glow underline. Inactive tabs are dim with dotted borders.

**Buttons:** Pill-shaped with a 2px neon border, subtle inner glow on hover. Color matches the action (green for positive, red for remove, amber for next).

**Event Log:** Floating notification cards that slide in from the right, with an icon glyph and the event name, then fade out.

### Particle & Effect System

- **Placement/Buy:** Coins spray upward from buttons (small yellow squares spin-fading).
- **Revenue burst:** On results phase, green "+$X" floats up from each building proportional to revenue.
- **Event:** Red or gold flash ring radiates from the center building.
- **Round advance:** A brief white flash wipe transitions between phases.
- **Customer rush:** On Results, a stream of customer sprites walks from off-screen left/right toward the leading restaurant.

### UI Polish

- Money counter: large amber monospace font in top-left, ticks up with a brief green flash on gain.
- Round indicator: circular progress ring in top-right that fills through all 15 rounds.
- Rating stars: animate to the new value (stars pop in one by one with a sparkle).
- Stat bars: gradient fill from red to green, animated fill transitions.
- Standings table: row highlight pulses for the current leader.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Button click | OscillatorNode, sine | 880 Hz, fast attack 0ms, decay 60ms | 0.06s | Crisp UI tap |
| Purchase item | OscillatorNode, triangle | 660→1320 Hz sweep up | 0.15s | Cash register blip |
| Price up | OscillatorNode, sine | 440→528 Hz | 0.12s | Rising note |
| Price down | OscillatorNode, sine | 528→330 Hz | 0.12s | Falling note |
| Round simulate | Burst noise | BiquadFilter highpass 2kHz, gain decay | 0.4s | Busy restaurant ambience swell |
| Revenue gained | OscillatorNode, sine chord | 523+659+784 Hz (C major), staggered 30ms | 0.35s | Positive chime |
| Revenue lost | OscillatorNode, sawtooth | 200→100 Hz | 0.3s | Low rumble |
| Event trigger | OscillatorNode, square | 300 Hz pulse 3× | 0.4s | Alert sting |
| Food Critic good | Arp up | 440→554→659→880 Hz, 80ms each | 0.35s | Success fanfare |
| Food Critic bad | Slide down | 440→220 Hz sawtooth | 0.5s | Wah wah |
| Festival | OscillatorNode, sine + tremolo | 880 Hz, LFO 8Hz on gain | 0.6s | Festive shimmer |
| Customer walkin | Soft click | OscillatorNode 120 Hz triangle, 20ms | 0.02s | Footstep substitute |
| Round win | Chord + reverb | 523+659+784+1047 Hz | 0.8s | Victory |
| Game over (1st) | Ascending fanfare | 523→659→784→1047 stagger 100ms | 1.0s | Triumph |
| Game over (lost) | Descending notes | 523→440→330→220 Hz | 0.7s | Defeat |

### Music/Ambience

During the Menu/Staff/Upgrade phases, play a looping generative jazz riff: a bass oscillator (sine, 80–120 Hz) walking quarter notes, a chord oscillator (triangle, 3 notes, 400–600 Hz) strumming on beats 2 and 4, and a hi-hat (filtered white noise, 6kHz bandpass, 30ms bursts every 250ms). Tempo 120 BPM. During Results phase, silence the music and let the revenue sounds carry the moment.

## Implementation Priority
- High: Building facade redesign with proper floors and neon signs; customer sprite with walking animation; floating revenue popups (+$X); button pill shape with glow border; money/happiness ticker animations
- Medium: Sky gradient and parallax dusk atmosphere; streetlamp glow effect; phase transition flash wipe; event notification cards; crowd particle rush on results
- Low: Isometric sidewalk tiles; distant city silhouette; generative jazz loop; star polygon animation
