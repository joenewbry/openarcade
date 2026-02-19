# Settlers Online — Visual & Sound Design

## Current Aesthetic

Catan-style hex board (600×550 canvas, 19 hexagons, hex size 38). Terrain types use solid fills: forest (`#2d5a27`), hills (`#c4633a`), mountain (`#7a7a7a`), field (`#d4aa4a`), pasture (`#4a9a4a`), desert (`#c8b47a`). Harbor hexes are cyan. Each hex has a colored number chip. Port labels are text strings. Player settlements are colored pentagon house shapes; cities are L-shaped polygons. Roads are colored rectangles between hex vertices. The right panel (162px) contains dice display, resource counts, build/trade buttons, and a VP counter. A message log scrolls at the bottom of the panel. Overall: functional but entirely flat with no depth, texture, or visual polish.

## Aesthetic Assessment
**Score: 2/5**

The hex board is recognizable as Catan but completely flat. Terrain hexes are solid color fills with no texture or identity. Buildings are minimal polygons. The UI panel is rows of text and plain buttons. The harbor tokens are just colored circles. With rich terrain variety this game should feel like a living landscape — but it currently reads as a programmer's mockup.

## Visual Redesign Plan

### Background & Environment

Replace the flat background behind the board with a **deep ocean** texture: a rich dark blue-teal (`#041830`) with subtle wave ripple lines (faint sinusoidal horizontal curves at 40px intervals, very low opacity). The ocean extends to the canvas edges, making the board feel like an island cluster in a sea.

Each terrain hex gets a visual texture overlay drawn with procedural strokes:
- **Forest:** Jagged tree silhouettes — 3–5 small triangle tree shapes (dark green) scattered across the hex
- **Hills:** Rolling hill contour lines — 2–3 arc strokes in a slightly lighter brown
- **Mountain:** Angular peak lines — 2 inverted V shapes suggesting mountain ridges
- **Fields/Wheat:** Thin vertical stroke lines across the hex in a slightly lighter wheat color (crop rows)
- **Pasture:** Scattered small oval dots (sheep-like blobs) in 2–3 positions
- **Desert:** Sand dune curves — 2–3 gentle S-curve strokes in sand color
- **Ocean/Harbor:** Gentle wave arc lines

The board edge gets a thick ocean border with white foam accents (small white curve strokes at the shoreline of each coastal hex).

### Color Palette
- Forest: `#1a4a1a` / texture `#2a6a2a`
- Hills: `#aa4422` / texture `#cc6644`
- Mountain: `#555566` / texture `#778899`
- Fields: `#cc9922` / texture `#ddbb44`
- Pasture: `#338833` / texture `#55aa55`
- Desert: `#bb9944` / texture `#ddcc77`
- Ocean: `#041830`
- Harbor token: `#aaddff`
- UI panel background: `#0a1020`
- UI accent: `#ffaa44`

### Entity Redesigns

**Hexagon tiles:** Each hex gets a proper border — a thick stroke in a slightly darker shade of the terrain color, plus a thin bright inner stroke (1px) for definition. Number chip redesign: instead of plain colored circles, draw a wooden disc (light tan circle with a darker ring border) with the number in dark ink. The robber is a dark humanoid shape (circle head on a rectangle body) placed prominently on the desert/blocked hex.

**Settlements:** Redesign from pentagon to a proper house silhouette: a square base with a triangular peaked roof. The roof color is a slightly lighter variant of the player color. Add a tiny chimney rectangle. A small window (lighter colored rectangle) on the front face. The whole house sits slightly elevated above the hex vertex, making it feel planted in the landscape.

**Cities:** An expanded building — wider base, with a taller tower section on one side. The tower has a crenellation top (alternating rect notches). A small flag on the tower top in the player's color. The city feels significantly larger and grander than the settlement.

**Roads:** Instead of thin rectangles, draw roads as rounded-end capsule shapes with a subtle wood-plank texture (2–3 horizontal line strokes across the road segment). The road color is the player's color at 80% saturation.

**Harbors:** Harbor hexes get a wooden pier drawing — a dock shape extending from the hex edge toward the ocean, with vertical post lines dropping into the water. A small boat silhouette (upside-down triangle hull with a rectangular sail) sits near the harbor.

**Number chips:** The number value gets a pulsing glow on the chip when the dice match — the chip background flashes brighter and the number becomes bold-white for 2 seconds after a matching roll.

**Dice:** Replace text dice display with visual dice faces — two white cubes drawn with fillRect, dots (small black circles) arranged per the rolled value. The dice faces briefly animate when rolling (rapid random number cycling for 0.5s, then settle).

### Particle & Effect System

- **Settlement built:** Small golden sparkle burst from the placement vertex — 6 star shapes radiate outward and fade over 30 frames.
- **City upgrade:** Larger burst than settlement — 10 golden stars plus the settlement shape briefly expands before the city shape materializes.
- **Road built:** A glowing line sweeps from one end of the road to the other over 15 frames (progress animation).
- **Resource gain from dice:** Small icons of the resource type float up from each hex that produced, drifting toward the player's resource display.
- **Robber placed:** Dark smoke puff rises from the blocked hex, and a shadow radiates briefly across the hex.
- **Trade completed:** Two resource icons swap with a crossing animation between the panels.
- **Dice roll:** Dice shake/rattle animation (quick position jitter for 0.5s), then the matching hex number chips flash.
- **VP milestone:** When a player hits 5, 7, 9 VP, a brief crown icon appears above their color indicator with a golden sparkle.
- **Win condition:** Confetti shower from the top of the canvas — 30 multi-colored small squares rain down.

### UI Polish

- Resource display: Each resource type gets a small icon (wheat stalk, ore chunk, log, brick, wool tuft) drawn beside the count. Counts animate up/down with a brief green/red flash on change.
- Build buttons: Pill-shaped with neon amber border, settlement/city/road icons drawn inside. Greyed out (dim, dashed border) when player can't afford. Bright on affordability.
- Trade panel: Card-style layout with a source resource on left, arrow, target resource on right. Port ratio shown as fraction (2:1, 3:1, 4:1) in larger text.
- Player panels: Each player gets a color-coded mini panel with their color bar, VP count, and resource count total. The current player's panel is highlighted with a brighter border and subtle glow.
- Message log: Dark scrolling panel with timestamped messages. Resource gain messages in the resource color. Build messages in the player's color. Dice results in white. Important events (robber, largest army) in amber.
- Largest Army / Longest Road badges: Small shield-shaped badges that animate from grey to gold when claimed, with a brief glow.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Dice roll | White noise burst | Highpass 2kHz, gain 0.2, 0.3s decay | 0.3s | Dice rattle |
| Dice settle | OscillatorNode, triangle | 300 Hz, 40ms | 0.04s | Click |
| Settlement built | OscillatorNode, sine | 523→659→784 Hz, 60ms each | 0.2s | Build chime |
| City built | OscillatorNode, sine chord | 523+659+784+1047 Hz, 0.4s | 0.4s | Grander chord |
| Road built | OscillatorNode, triangle | 440 Hz, 80ms | 0.08s | Short pop |
| Resource gained | OscillatorNode, sine | 880 Hz, 40ms | 0.04s | Subtle ping |
| Robber placed | OscillatorNode, sawtooth | 200→100 Hz | 0.3s | Ominous low sweep |
| Robber steal | White noise lowpass 400 Hz | 0.2s | 0.2s | Snatch sound |
| Trade completed | OscillatorNode, triangle | 440→523 Hz | 0.15s | Exchange blip |
| Can't afford | OscillatorNode, sawtooth | 200 Hz 2× pulse | 0.2s | Negative buzz |
| Largest Army claim | OscillatorNode, sine | 659→784→880 Hz | 0.3s | Brass-like fanfare |
| Longest Road claim | OscillatorNode, sine | 523→659→784 Hz | 0.3s | Rising fanfare |
| Dev card play | OscillatorNode, square | 440 Hz LFO tremolo 8 Hz | 0.3s | Magic shimmer |
| Turn end | OscillatorNode, triangle | 330 Hz, 60ms | 0.06s | Soft chime |
| Turn start | OscillatorNode, sine | 440 Hz, 60ms | 0.06s | Brighter chime |
| Victory | Ascending fanfare | 523→659→784→1047→1318 Hz 80ms each | 0.5s | Triumph sting |
| Game over (lose) | Descending notes | 523→440→330→220 Hz 100ms each | 0.5s | Defeat |

### Music/Ambience

A medieval trading port theme: 100 BPM, gentle. Bass: triangle oscillator, 110 Hz, walking a root-fourth-fifth pattern, one note per beat, low gain 0.05. Melody: a recorder-like flute tone (sine with subtle amplitude modulation at 6 Hz to simulate breath) playing a simple diatonic melody in D major (D4→E4→F#4→A4 cycling), 2 notes per bar. Rhythm: light hand drum simulation (filtered noise 200Hz bandpass, 40ms burst) on beats 1 and 3. Harmonic pad: triangle oscillators at 293+440+587 Hz (D major chord) droning softly with a slow LFO tremolo at 0.3 Hz for a gentle swell. During the robber phase or conflict events, music briefly shifts to a minor key (replace the A4 flute note with Ab4, shift the pad to 293+349+440 Hz D minor chord) then returns to major on resolution. On win, the melody plays a full ascending phrase twice as a fanfare.

## Implementation Priority
- High: Terrain hex texture overlays (tree silhouettes, hill contour lines, crop rows, etc.); proper settlement house silhouette with peaked roof; number chip flash on dice match; dice face animation with dot arrangement; resource icon floating on production
- Medium: City crenellation tower design; harbor dock-and-boat drawing; ocean wave ripple background; road rounded capsule with plank texture; player panel current-turn highlight with glow border
- Low: Robber humanoid shape; trade panel card layout; Largest Army/Longest Road badge animation; confetti win shower; medieval ambient music loop
