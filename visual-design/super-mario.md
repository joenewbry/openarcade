# Super Mario — Visual & Sound Design

## Current Aesthetic

A side-scrolling platformer on a 512x400 canvas with a 32px tile size. The player is an orange-red rectangle (`#f42`) with simple head, body, and cap features. Goombas are brown rectangles with basic features. The shell enemy is green. Ground tiles are grey-brown rectangles. Platforms are green rectangles. Pipes are dark green. Coins are gold circles. Question blocks are yellow-gold rectangles. The sky is a flat blue `#5af`. The overall look is placeholder-level — the Mario aesthetic is communicated entirely through shape and color but lacks the warmth, detail, and charm of the source material.

## Aesthetic Assessment
**Score: 2/5**

The level structure is solid — ground, platforms, pipes, coins, question blocks, and a goal flag. The mechanics are correct. But every element is a plain colored rectangle and the world lacks any environmental warmth. Mario games are famous for their charm and readability — this needs personality in every tile and character.

## Visual Redesign Plan

### Background & Environment

**Sky**: Replace the flat blue with a proper sky gradient suggestion — the upper third of the canvas draws a lighter sky blue `#87ceeb`, transitioning to slightly warmer mid-blue `#5a9fd4` lower. Small white cloud shapes (3 overlapping circles of slightly different sizes) drift slowly leftward at 0.2px/frame against the sky — 3-4 clouds visible at any time, wrapping around. Clouds are drawn in pure white with a subtle bottom shadow (slightly grey lower circle arc).

**Background hills**: Behind the main layer, draw simple rolling green hills (large filled ellipses at the horizon line) in a muted light green `#6aba4a` — classic SMB background silhouette style. These parallax-scroll at 30% of the camera movement speed.

**Ground tiles**: Replace flat grey-brown rects with proper brick tiles. Each ground tile draws: a warm brown base `#c88040`, two horizontal mortar lines (1px darker `#9a6020`) and two vertical mortar lines creating a 2x2 brick pattern within the tile. The top edge of ground gets a single bright highlight line `#e4a870` — the visible top face in sunlight. The very bottom edge gets a dark shadow line `#7a4010`.

**Platform tiles**: Green platforms are redesigned as wooden-plank platforms. A warm oak brown `#b87030` base with two thin horizontal grain lines and bright top edge `#d4903a`. Ends get small darker vertical lines suggesting cut wood.

**Sky/background**: Stars for night levels are seeded randomly but stored — tiny 1px dots in near-white `#fffde8` scattered in the upper half.

### Color Palette
- Sky: `#87ceeb`, `#5a9fd4`
- Clouds: `#ffffff`, `#f0f0f0`
- Ground tile: `#c88040`, `#9a6020`
- Platform: `#b87030`, `#d4903a`
- Player cap/shirt: `#e03020` (proper Mario red)
- Player overalls: `#2244bb` (Mario blue)
- Player skin: `#f4a862`
- Goomba: `#9a6020` (brown)
- Goomba eyes/brows: `#3a1008`
- Shell: `#22aa44`
- Pipe: `#22882a`, `#44bb44`
- Coin: `#ffd700`, `#ffb800`
- Question block: `#e8a020`, `#c88000`
- Brick block: `#b85c1a`
- Flag pole: `#888888`
- Flag: `#22bb44`
- Glow/bloom: `#ffd700`, `#ffffff`

### Entity Redesigns

**Player (Mario)**: A proper Mario silhouette drawn with multiple colored rects and circles:
- Feet: Two small dark blue rects (shoes `#1a1a5a`) at the bottom.
- Body: Blue overalls `#2244bb` — main body rect.
- Shirt: Red shirt `#e03020` visible above overalls, and as arm sections.
- Head: Skin-tone circle `#f4a862` slightly larger than current.
- Cap: Red rect (`#e03020`) above head with a small brim rect extending forward.
- Mustache: A small dark horizontal rect `#5a2010` below the nose position.
- Eyes: One small white circle with black pupil.
- When running: Legs alternate position (two small colored rects swapping left/right).
- When jumping: Arms raised (arm line angle changes), legs tucked (rects moved closer).

**Goombas**: Proper mushroom-enemy silhouette:
- Brown oval body (fillCircle slightly wider than tall).
- Two large angry white eyebrows (thick angled rects `#ffffff`) — the iconic scowl.
- Two small black dots for pupils beneath the brows.
- Two small foot rects (`#7a4010`) at the bottom — tiny legs.
- When squished: Body flattens to a thin wide rect (immediate, not animated), turns darker.

**Shell enemy**: Green turtle shell with a cross-pattern on top:
- Main body: Dark green circle `#22aa44`.
- Shell overlay: Lighter green hexagon approximation `#44cc66` drawn inside.
- Cross dividing lines on shell: Dark green `#1a7a30`.
- Eyes peeking out: Two small white circles with black pupils visible at the front.

**Pipes**: Properly detailed pipe cross-section:
- Main body: Two vertical rects in slightly different greens — outer `#22882a` left/right strips, inner `#2a9a34` center — creating a curved pipe suggestion.
- Pipe cap: A wider rect at the top in the brighter green `#44bb44` with a bright highlight line on the top edge.

**Coins**: Spinning coin effect — alternate between full circle and thin ellipse every 8 frames (fillCircle radius vs fillRect narrow) in gold `#ffd700` with bright inner circle `#ffe840`. A small golden glow radiates from each coin.

**Question blocks**: Warm yellow-gold `#e8a020` with a dark `?` glyph drawn from small rects (two short verticals + horizontal + dot below). The block has a bright top edge `#ffe060` and dark bottom edge `#b86800`. When struck, animates upward 4px and back down over 10 frames.

**Brick blocks**: Terracotta red-brown `#b85c1a` with grid lines suggesting individual bricks. When destroyed, shatters into 4 spinning chunk particles.

**Flag/goal**: Flag pole is a thin grey rect extending from ground to top. The flag itself is a filled triangle (or polygon) in green `#22bb44` that waves — oscillating its right edge position ±4px using sin(time). A golden star at the pole top.

### Particle & Effect System

- **Coin collect**: 6 gold star particles burst from the coin position. A "+1" float text rises upward in gold and fades over 30 frames.
- **Brick break**: 4 brick-colored chunk polygons (irregular quadrilaterals) fly outward with gravity — spin as they travel, fade after 25 frames.
- **Question block hit**: A brief upward circle pulse from the block. The block bobs.
- **Enemy stomp**: An impact burst of 6 brown particles when Mario lands on a goomba. The goomba flattens.
- **Jump**: A small white circular puff at Mario's feet when he jumps from the ground.
- **Flag reach**: Golden sparkle burst at the flag — 15 star particles scatter, then cascade of coins animates across the screen.
- **Player death**: Mario spops upward (jump animation upward at speed, then falls offscreen) with a fading spin.
- **Powerup spawn**: A question block item spawns with an expanding circle ring and a brief white flash.

### UI Polish

- **Lives display**: Tiny Mario head icons (simplified — red circle with red rect cap) repeated for each life remaining. Arranged horizontally in the top-left.
- **Score**: Classic arcade style — displayed in clean white text against a dark rect backdrop, with the score number updating in a brief flash when changed.
- **Coin counter**: A small gold coin icon followed by "x N" count — coin icon is a small yellow circle.
- **World/level indicator**: "WORLD X-X" displayed in classic white block lettering.
- **Level complete screen**: A full overlay with "COURSE CLEAR!" text in gold, and the score tallied with a brief each-digit-increment animation.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Jump | Sine sweep up | 330→660Hz | 100ms | Classic hop feel |
| Coin collect | High arpeggio | 880→1047Hz, sine | 120ms | Bright jingle |
| Enemy stomp | Low thud | Triangle 220Hz + noise burst | 80ms | Meaty stomp |
| Brick break | Crunch | Noise burst bandpass 600Hz | 150ms | Stone crumble |
| Question block hit | Thud pop | Sine 300Hz, punchy | 80ms | Block bounce |
| Player death | Descend sweep | 440→110Hz glide, sine | 500ms | Classic death fall |
| Powerup collect | Ascending arpeggio | 523, 659, 784, 1047Hz | 400ms | Fanfare pickup |
| Flag reach | Victory sting | 784→1047→1319→1568Hz | 600ms | Level complete call |
| Level complete | Full jingle | Multi-note ascending chord progression | 1200ms | Triumphant clear |
| Shell kick | Impact pop | Sawtooth 300Hz + noise | 80ms | Shell impact |

### Music/Ambience

A chip-tune inspired platformer loop approximated via Web Audio:
- **Bass line**: Square oscillator at 110Hz in a simple repeating bass pattern — notes cycling through C2→G2→A2→F2 (110, 165, 220, 175Hz) with 0.25s per note, envelope gating (quick attack 5ms, decay 100ms) for a bouncy feel. Gain 0.08.
- **Lead melody**: Sawtooth at 440Hz (A4 base) filtered through a bandpass (1000Hz center, Q=2) giving it a chip-tune buzz. A simple 4-bar repeating melody — four notes per bar at the tempo. Gain 0.04.
- **Percussion**: Narrow bandpass noise (6000Hz, Q=6) in a 4/4 pattern — kick on 1, snare on 3, hi-hat on every eighth note at 0.6, 0.3, 0.15 gain respectively. At 120 BPM.
- **Underground feel**: When player is below a certain y threshold (inside pipes), shift the lead filter cutoff down (600Hz) and add a slight reverb-delay echo (second oscillator copy at 80ms delay, 30% gain).
- The loop plays at consistent low volume, duck during sound effects.

## Implementation Priority
- High: Mario character redesign (red/blue silhouette), ground tile brick pattern, coin spin animation, jump/coin sounds
- Medium: Goomba redesign (angry brows, squish animation), pipe cap detail, cloud background, brick break particles
- Low: Parallax hills, lives head icons, flag wave animation, underground sound variant
