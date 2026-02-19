# Doodle Jump — Visual & Sound Design

## Current Aesthetic
A vertical platformer on a 400x600 canvas. The player is a small orange blob with two white dot eyes (`#fa0`). Three platform types: normal green (`#3c3`), moving blue (`#48f`), and breakable brown (`#a63`). Background is solid near-black. The camera scrolls upward as the player bounces higher. Screen wraps horizontally. Monsters appear as simple red shapes. Springs boost the player extra high. The aesthetic is functional but visually thin — the background is a void, platforms are plain colored rectangles, and the doodler character has no personality or visual weight. There's none of the sketchy hand-drawn charm of the original Doodle Jump.

## Aesthetic Assessment
**Score: 2/5**

The jumping mechanic works but the world feels empty and sterile. The "doodle" aesthetic — graph-paper backgrounds, hand-drawn shapes, sketchy lines — is entirely absent. The platforms are flat rectangles with no personality, the character is a blob without expressiveness, and the environment has no sense of altitude or ascent. At higher altitudes, nothing changes visually.

## Visual Redesign Plan

### Background & Environment
Fully embrace the hand-drawn notebook aesthetic:

**Base surface**: The background becomes graph paper — a pale off-white `#f8f4ee` with a fine grid of thin blue lines `#c8d8e8` at 20px spacing, both horizontal and vertical. The grid gives the "doodle notebook" feel immediately.

**Altitude zones**: As the player ascends, the background world changes in distinct themed zones, each 2000 altitude units tall:
- **Ground zone (0–2000)**: Normal graph paper with small doodle decorations — a sun drawing in one corner, a smiling cloud sketch, small flower doodles between platforms. Warm cream-white.
- **Sky zone (2000–4000)**: Graph paper tints light blue `#eef4ff`. Stars begin appearing as hand-drawn star doodles (5-pointed star outlines). Cloud sketches become denser.
- **Space zone (4000–6000)**: Background shifts to dark blue `#0a0a1a` with white dot grid lines instead of blue. Planet doodles (circle outlines with ring sketches) appear. The Doodler gains a space helmet doodle.
- **Deep space zone (6000+)**: Near-black with faint white grid. Alien face doodles appear in the margins. The background has a slight purple tint.

**Parallax elements**: Small doodle drawings (stars, clouds, birds) scroll at 30% of camera speed in the background layer, reinforcing depth.

### Color Palette
- Background paper: `#f8f4ee`
- Grid line blue: `#c8d8e8`
- Grid line dark (space): `#2a2a4a`
- Doodler body: `#ffaa00`
- Doodler eyes: `#ffffff`
- Doodler pupils: `#222222`
- Doodler nose: `#cc7700`
- Platform normal: `#44cc44`
- Platform moving: `#4488ff`
- Platform breakable: `#cc6633`
- Platform broken: `#886644`
- Spring: `#ff4444`
- Monster: `#aa3333`
- Monster eye: `#ffffff`
- Score/UI ink: `#334455`
- Zone sky tint: `#eef4ff`
- Zone space tint: `#0a0a1a`
- Doodle decoration: `#aabbcc` (light blue ink)

### Entity Redesigns
**Doodler (Player)**: The round blob gets a proper Doodle Jump treatment. The body is a rounded irregular amoeba shape rather than a perfect circle — slightly asymmetric, as if hand-drawn. Four directional nose tip (a small pointed protrusion in the direction of travel). Two large circular eyes with black pupils that roll left/right as the player moves horizontally. While airborne going up: eyes widen, a smile appears below the nose. At apex: neutral expression. Falling: eyes scrunch shut, small sweat drop appears. Death (off-screen fall): the doodler shrinks and stretches into a teardrop before vanishing.

**Normal Platform**: A green filled rounded-rectangle with a hand-drawn look — the edges are slightly rough (±1px variance on the outline). The platform has small green "legs" hanging below (like a notebook drawing of a platform). Happy face (two dots and a curve) appears very small in the center.

**Moving Platform**: Blue, same treatment, with small directional arrows drawn on it indicating its travel direction. When it reverses, the arrow flips.

**Breakable Platform**: Brown with visible crack lines drawn across it. As the player lands, the cracks deepen (2-stage crack sprite). On the second landing, it breaks — splitting animation.

**Spring**: A red coil spring on top of a platform — drawn as a zigzag rectangle outline. When compressed by the player landing on it, it squashes to half height. Release: it springs back with extra height and a "BOING" text bubble.

**Monsters**: Each monster type has a distinct hand-drawn look:
- Basic monster: A round red creature with two horn nubs, angry eyebrows, and a wide mouth with teeth.
- Floating monsters: Tentacled blobs that float in a sine-wave pattern.
- UFO monster: A classic flying saucer outline with a beam below.
When shot (player shoots by aiming nose direction), the monster gets a cross (X) drawn over its face before it breaks apart.

### Particle & Effect System
- **Landing puff**: On each platform landing, 4 small dust circles (matching platform color) puff outward and fade in 8 frames.
- **Platform break**: The breakable platform snaps into 4 irregular polygon pieces that scatter downward and fade over 20 frames. A brief crack-sound graphical "CRACK!" text bubble appears.
- **Spring launch**: A zigzag energy burst (lightning bolt shape) emits upward from the spring contact point. A "BOING!" text bubble appears in bold hand-drawn letters.
- **Monster kill**: An X-mark flash over the monster, then it fragments into 6 pieces that scatter with gravity. A star burst of 8 small stars radiates.
- **Height milestone**: Every 1000 altitude units, a big hand-drawn "WOW!" or "AMAZING!" text pops from the score counter and fades. The screen briefly flashes the zone color.
- **Fall death**: As the doodler falls off the bottom of the screen, a sad-face appears and the camera pans down to show the fall. A dashed "FELL!" text bubble appears.
- **Zone transition**: When entering a new altitude zone, a brief overlay matches the new zone's palette — a swipe of color across the screen at 30% alpha.

### UI Polish
- Score rendered as if written in blue ball-point ink — a slightly rough hand-drawn font feel (achieve with slight letter variations). Top-center of screen.
- High score shown as a dashed pencil-line marker at the corresponding altitude on screen — when the player reaches it, the marker turns gold and "NEW RECORD!" appears in an excited hand-drawn font.
- Lives shown as small doodler face icons in the top-left corner.
- Platform indicators: a small exclamation mark "!" appears above moving platforms when they're about to reverse.
- On death screen: the score appears large on graph paper with a hand-drawn frame, and a sad doodler face appears with a single tear drop.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Normal bounce | Triangle 440 → 520 Hz, spring feel | 80ms | Bouncy and bright |
| Spring bounce | Triangle 440 → 800 Hz, extra high sweep | 120ms | Mega-boing |
| Breakable land (first) | Lower triangle 300 Hz + soft crack noise | 60ms | Warning creak |
| Platform break | Sharp crack: noise burst + triangle 200→100 Hz | 150ms | Wood snap |
| Monster shoot | Square 800 Hz, fast decay | 40ms | Quick zap |
| Monster die | Descending sine 500 → 200 Hz + noise | 200ms | Satisfying squish |
| Zone enter | Ascending three-note: triangle C5 E5 G5 | 300ms | Zone ding |
| Score milestone | Happy arpeggio: sine C5 E5 G5 C6 | 200ms | Achievement |
| Spring (compress) | Low creak: triangle 150 Hz, 40ms | 40ms | Spring loading |
| Player death (fall) | Descending whistle: sine 800→100 Hz, slow | 800ms | Falling away |
| High score beat | Triumphant chord: sine C4+E4+G4 together | 400ms | Milestone moment |
| UFO monster buzz | Square wave 200 Hz with slow tremolo | Looping | Alien hum |

### Music/Ambience
A light, playful procedural composition matching the hand-drawn cartoon mood:

1. **Bounce rhythm**: Each bounce triggers a brief triangle tone at 440 Hz (20ms). When bouncing fast (many platforms per second), these accumulate into a rhythmic pitter-patter — an emergent melody of bounces.
2. **Background pad**: Four stacked sine waves at C4, E4, G4, C5, very low gain (0.05), with an LFO tremolo at 0.4 Hz creating a gentle floating feel. This is the "paper notebook world" ambient tone.
3. **Zone music shift**: Each altitude zone brings a different pad chord:
   - Ground: C major (C4 E4 G4) — warm, cheerful
   - Sky: A minor (A4 C5 E5) — light, dreamy
   - Space: E minor (E3 G3 B3) — mysterious, cool
   - Deep space: B minor (B2 D3 F#3) — tense, exciting
4. **Height urgency**: As altitude climbs, the bounce rhythm tones increase in pitch by 1 semitone per 500 units — the world gets higher-pitched as you ascend.
5. **Death**: All music stops. Silence except for the falling sound effect, then the game-over screen appears in quiet.

## Implementation Priority
- High: Graph paper background grid, doodler directional nose + expressive eyes, platform hand-drawn rounded look + landing puff, spring squash-and-release animation
- Medium: Altitude zone background color transitions, monster designs (horns, angry face), "BOING!" text bubble on spring launch, platform break particle fragments
- Low: Zone doodle decorations (sun, clouds, star sketches), parallax doodle scrolling layer, high-score altitude marker line, zone transition color swipe
