# Kart Racer — Visual & Sound Design

## Current Aesthetic

Top-down kart racing with three distinct tracks: Mushroom Circuit (grass `#2a5e2a`), Shell Speedway (dirt `#3a3a1e`), Rainbow Road (space `#1a1a3e`). Track surface `#555`, red/white border stripes, a checkerboard start/finish line, and a center dashed white line. Karts are colored polygons with `#8cf` windshields and dark wheels. Item boxes are rotating gold squares with `?` text. Drift sparks cycle blue → orange → magenta. A minimap sits bottom-left. The aesthetic has solid readability but lacks environmental richness — the grass, dirt, and space backdrops are flat fills.

## Aesthetic Assessment

**Score: 3/5**

The three-track concept with distinct environments is a major strength. The drift spark color progression is a particularly nice touch. Track borders and rumble strips are clear. However each track background is a flat single color with no texture or depth, kart silhouettes are very simple polygons, item boxes lack excitement, and the minimap is plain. The game can be dramatically elevated with environment-specific texture layers and enhanced kart detail.

## Visual Redesign Plan

### Background & Environment

**Track 1 — Mushroom Circuit:**
- Grass: Rich green gradient `#1e4a1e` (far, darker) → `#2e6a2e` (close, lighter), with subtle diagonal texture lines `rgba(30,90,30,0.15)` suggesting grass blades
- Add 4–6 decorative mushroom shapes off-track (large round caps in `#cc4422` with white dots `#ffffff`, stem `#eeddbb`) — purely decorative
- Track shadows: slight darker border just inside track edge `rgba(0,0,0,0.15)` — depth suggestion
- Background sky (if visible): `#88bbff` gradient

**Track 2 — Shell Speedway:**
- Dirt: Warm tan gradient `#2e2810` → `#3a3318`, with subtle horizontal scratch lines `rgba(80,70,30,0.12)` suggesting tire marks
- Off-track sand dunes: subtle bump highlights `rgba(80,70,40,0.08)`
- Tire marks on track surface: faint dark `rgba(0,0,0,0.1)` curved lines near corners where karts drift

**Track 3 — Rainbow Road:**
- Space backdrop: `#080818` with 50 stars `rgba(180,200,255,0.5)`, 1–2px, scattered
- Nebula wisps: faint colored cloud shapes — `rgba(100,40,160,0.06)` purple, `rgba(40,80,200,0.06)` blue — slowly drifting
- Rainbow Road itself: the track surface has a subtle rainbow shimmer — draw 6 thin translucent color bands (red/orange/yellow/green/blue/violet, each `rgba(255,X,X,0.06)`) along the track surface, animated to drift slowly along the track direction
- Edge: track has no curbs — falling off the edge glows bright white, suggesting the void

**All tracks:**
- Track surface: Not just `#555` — use `#444455` (slightly blue-grey) with a subtle noise texture `rgba(0,0,0,0.05)` dot pattern. Adds perceived asphalt quality.
- Center line: dashed `rgba(255,255,255,0.5)` — brighter and cleaner
- Rumble strip red: `#dd2200`, white: `#eeeeee`, alternating every 8px
- Start/finish: true checkerboard pattern, black `#111111` and white `#eeeeee`, 6×2 grid across track width

### Color Palette

- Track surface: `#444455`
- Track border red: `#dd2200`
- Track border white: `#eeeeee`
- Mushroom Circuit grass: `#256825`
- Shell Speedway dirt: `#3a3318`
- Rainbow Road space: `#080818`
- Item box gold: `#ffcc00`
- Item box glow: `rgba(255,200,50,0.4)`
- Drift spark blue: `#4488ff`
- Drift spark orange: `#ffaa00`
- Drift spark magenta: `#ff44ff`
- Boost flame orange: `#ff8800`
- Boost flame yellow: `#ffee00`
- Windshield: `#88ccff`
- Wheel dark: `#111122`
- Shadow: `rgba(0,0,0,0.25)`

### Entity Redesigns

**Karts:**
- Body: Main color polygon as currently, but add:
  - Windshield: bright `#88ccff` with a white specular streak `#ffffff`
  - Hood stripe: slightly darker shade center stripe along body
  - Front bumper: small bright rectangle in body color, slightly lighter
  - Shadow beneath kart: `rgba(0,0,0,0.25)` ellipse offset 2px down-right
- Wheels: `#111122` small circles, now with a bright highlight dot `#333344` at the edge (spinning wheel feel)
- Kart number: small white numeral on the kart body
- On boost mushroom: kart body briefly flashes white, exhaust becomes larger

**Item Boxes:**
- Outer border: `#ffcc00` square, 2px bright border, 6px glow `rgba(255,200,50,0.4)`
- Interior: gradient from `#332200` center to `#886600` edge
- `?` symbol: bright white `#ffffff` with slight drop shadow
- Rotation animation: box spins on its vertical axis (horizontal scale compression: 1.0 → 0.2 → 1.0, cycle 1.5s)
- Vertical bob: ±3px up-down, 1Hz
- On collect: burst of 8 colored sparkle particles + `?` text flies upward
- Replace if collected after 8 seconds: flash-in animation

**Items:**
- Shell: Green `#44ee44` with dark `#117711` swirl lines, rounded triangle shape
- Banana: Yellow `#ffee00` crescent shape with brown `#cc7700` ends
- Mushroom: Red `#cc3311` cap with white dots, tan stem `#ccaa77`
- Star: Gold `#ffcc00` 5-point star shape with radial glow, when active: kart glows gold outline

**Drift Sparks:**
- Current blue → orange → magenta is perfect. Enhance: each spark is a short bright line (not just a dot), oriented along drift direction, 3–5 sparks per frame, life 0.3s
- Boost activation at max drift: small ring of sparks expands outward from kart, strong magenta glow flash

**Minimap:**
- Dark panel `rgba(0,0,10,0.8)`, thin `#446699` border
- Track drawn in `#445566`
- Kart dots: team/player color, 3px with 2px glow
- Own kart: slightly larger 4px dot with brighter glow
- Add scale indicator or "MAP" label in `#446699`

### Particle & Effect System

- **Drift sparks:** 4–5 per frame, bright line segments, cycle blue → orange → magenta over drift duration
- **Boost exhaust:** 6 particles per frame from kart rear, orange-yellow gradient, life 0.25s
- **Item collect burst:** 8 colored sparkles + item-type colored flash on kart
- **Star power glow:** Kart outline glows rainbow colors cycling while star power active
- **Banana hit:** 4 yellow peel particles fly out, kart spin visual (rotate ±360° over 1s)
- **Shell hit:** Impact sparks 6 white particles + shell fragment 3 shards
- **Lap completion flash:** Full track briefly brightens `rgba(255,255,200,0.15)` for 0.2s
- **Position change popup:** "+1" / "-1" position text floats above kart on overtake
- **Rainbow Road edge glow:** Track edges glow with scrolling rainbow effect

### UI Polish

- Position indicator: Large "1st" / "2nd" / "3rd" text top-left, color-coded (gold/silver/bronze)
- Lap counter: "LAP 2/3" top-center, white with subtle glow
- Item slot: Bottom-center, dark rounded square showing current item with glow border
- Speed-o-meter: Simple arc gauge bottom-right, needle sweeps from 0 to max, fill in kart color
- Race results: Podium screen with colored position blocks, kart icons, time display
- Track name banner: Appears at race start with track name in theme color, slides up and fades

## Sound Design Plan

*(Web Audio API only)*

### Sound Events & Synthesis

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Engine idle | Triangle + LFO | 80Hz triangle, AM LFO at 12Hz, gain 0.12 | Looped | Kart idle burble |
| Engine accelerate | Pitch sweep | 80Hz → 160Hz over 2s, gain 0.18 | Continuous | Acceleration |
| Engine max speed | Steady high | 180Hz triangle, gain 0.2 | Looped | Top speed |
| Drift | White noise + bandpass | center 600Hz, Q 2, gain 0.25 | While drifting | Tire screech |
| Drift boost | Pitch spike | 800Hz sine, gain 0.5 | 0.3s | Mini-turbo pop |
| Item collect | Twinkle | 880Hz → 1100Hz triangle arpeggio | 0.2s | Pickup |
| Item use (shell) | Low launch | 200Hz → 400Hz sawtooth, gain 0.4 | 0.25s | Shell fire |
| Shell hit | Clang | 400Hz triangle, gain 0.6 | 0.3s | Impact |
| Banana slip | Comic slide | 300Hz → 100Hz sine, gain 0.4 | 0.5s | Slip sound |
| Star power | Ascending power | 200Hz → 800Hz sine sweep, gain 0.5 | 0.5s | Activate |
| Star power active | Arpeggio loop | C4-E4-G4-B4, triangle, gain 0.1 | Looped | Power music |
| Lap complete | Fanfare | G4-B4-D5 arpeggio, sine, gain 0.5 | 0.4s | Lap ding |
| Race start countdown | Beep | 440Hz sine, gain 0.6 | 0.15s | 3-2-1 beeps |
| Race start GO | Higher beep | 880Hz sine, gain 0.7 | 0.25s | GO! |
| Race finish 1st | Triumphant | C5-E5-G5-C6 arpeggio then chord, sine | 1.5s | Victory |
| Race finish (other) | Mild fanfare | C4-E4-G4, sine, gain 0.4 | 0.8s | Finish |
| Off-track | Rumble | White noise, lowpass 200Hz, gain 0.15 | While off-track | Rough terrain |

### Music/Ambience

Upbeat racing synth per-track:
- **Mushroom Circuit:** Bright, bouncy — triangle lead at 523Hz, simple 8-note melody, 140BPM. Bass square 130Hz, quarter note groove. Hi-hat every 1/8 note. Light and fun.
- **Shell Speedway:** Slightly harder rock feel — sawtooth lead, 150BPM, heavier bass, kick drum on 1/3. Same melody transposed up a 4th for intensity.
- **Rainbow Road:** Dreamy synthwave — detuned sawtooth pair (440Hz + 443Hz) with slow LFO, 130BPM, reverb simulation (delay node 0.08s feedback 0.3), pad underneath (triangle chord 110/138/165Hz). Ethereal and grand.
- Engine sounds layer over music at lower volume so music remains audible

## Implementation Priority

- High: Track environment textures (grass/dirt/space with depth layers), kart shadow + windshield detail, drift spark lines, item collect burst, all engine/drift/item sounds
- Medium: Item box rotation animation + bob + collect burst, star power rainbow outline, minimap kart dots, race position popup text, ambient music loops per track
- Low: Decorative mushrooms on track 1, tire mark traces on track 2, Rainbow Road rainbow shimmer, position indicator gold/silver/bronze colors, speed gauge UI
