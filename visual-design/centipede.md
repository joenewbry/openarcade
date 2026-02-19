# Centipede — Visual & Sound Design Plan

## Current Aesthetic

The game has a green arrow/ship player (`#6f8`) on a dark grid (`#16213e` grid lines). The centipede has a red head (`#f44`) and green body segments (`#6f8`). Mushrooms are organic dome shapes with color based on HP (green gradient). The spider is magenta (`#f0f`) as an ellipse with 8 legs drawn as lines. The flea is a yellow ellipse (`#ff0`). There is a player zone separator line at `#0f3460`. The palette is coherent neon-arcade but everything shares the same flat rendering style — the garden/nature theme of the original Centipede is completely absent.

## Aesthetic Assessment: 2 / 5

The neon style works for abstract arcade, but Centipede's charm comes from the tension of a tiny garden world being invaded. Mushrooms should feel organic and earthy. The centipede should feel sinister and articulated. The spider should feel erratic and creepy. Currently all entities feel like the same type of shape — circles and ellipses. There is no environmental theming.

---

## Visual Redesign Plan

### Background & Environment

- **Background**: replace flat dark with a **garden night scene**. Deep dark green `#060e08` base — like looking down on a dark lawn at night.
- **Grass texture suggestion**: scattered horizontal 1px dashes in `#0a1a0a` at very low contrast, spaced irregularly across the background, suggesting grass blades viewed from above.
- **Star field**: 40 tiny 1px white/pale-green dots scattered in the top half of the screen (the open sky area above the mushroom field).
- **Player zone floor**: the bottom zone where the player operates has a slightly lighter ground: `#081208` base, with subtle dirt texture marks (small clusters of 2px dots in `#0c160c`).
- **Grid lines**: remove the plain grid. Instead, very faint concentric rings from the center of the board suggest radar/sonar — drawn in `#0a1a0a` at 0.15 alpha.
- **Centipede entry area** (top zone): a dark vine/root border across the very top — scribbled line polygon in dark `#142814` suggesting the edge of the garden.

### Color Palette

| Role | Old | New |
|---|---|---|
| Background | dark navy (engine) | `#060e08` dark garden green |
| Grass markings | none | `#0a1a0a` subtle dashes |
| Grid/radar rings | `#16213e` blue grid | `#0a1a0a` organic rings |
| Player ship | `#6f8` green | `#44ff88` bright insectoid green with `setGlow` |
| Centipede head | `#f44` red | `#ff3322` deep red with yellow eyes |
| Centipede body | `#6f8` green | gradient: `#2a8a44` (darker, more natural) |
| Mushroom healthy | green | `#8b4513` brown stem, `#cc5500` red cap (classic toadstool) |
| Mushroom damaged | darker | `#7a3c0c` darker, cracks visible |
| Spider | `#f0f` magenta | `#cc44aa` dark pink-purple, menacing |
| Flea | `#ff0` yellow | `#ddcc00` dull yellow, small |
| Bullet/shot | white | `#ccffcc` pale green laser |
| Player zone line | `#0f3460` | `#1a3a1a` dark green horizontal mark |
| Score text | white | `#aaffaa` pale green |

### Entity Redesigns

**Player ship (garden defender)**
- Redesign from abstract arrow to a **stylized garden gnome or insect-bot**. Keep the upward-pointing triangle as the core shape but elaborate:
- Two small "wings" — flat triangular extensions left and right of center.
- A bright "eye" — single filled circle in `#ccffcc` at the tip.
- Turret barrel: thin rectangle extending upward from center.
- Color: `#44ff88` body, `#2a6644` darker wing shade, `#ccffcc` eye.
- Glow: `setGlow('#44ff88', 10)` — the player glows like a firefly.
- Shot: thin vertical rectangle (1px wide, 8px tall) in `#ccffcc` rather than a circle.

**Centipede**
- Each segment: no longer a simple circle. Redesign as a **segmented caterpillar-like body**:
  - Main circle in body color.
  - Two small "feet" stubs drawn as tiny rectangles on each side (rotated to perpendicular to travel direction).
  - Small antennae on the head: 2 thin angled lines with tiny dot ends in `#ffff66`.
  - Head has two visible "eyes" — small bright yellow filled circles.
  - Head color: `#ff3322` deep red. Body segments: gradient from `#2a8a44` near head to `#3a9a54` at tail.
  - Inter-segment gap: 1px dark gap between circles for articulation.
  - Glow on head: `setGlow('#ff3322', 8)`.
  - Glow on body: subtle `setGlow('#2a8a44', 4)`.

**Mushrooms**
- Completely redesigned as **toadstool mushrooms** rather than abstract domes:
  - Stem: narrow rectangle in `#c8a87a` tan.
  - Cap: wide semicircle polygon (dome) in `#cc3300` red-orange (classic fly agaric).
  - White spots: 3 small white circles on the cap.
  - Damaged state: cap color shifts to `#7a2200`, some spots removed, a crack line drawn.
  - Destroyed: stub of stem remains, then fades.
  - Glow: very faint `setGlow('#cc3300', 3)` — mushrooms glow slightly in the dark.

**Spider**
- Body: two overlapping ellipses (thorax + abdomen) in `#cc44aa`.
- 8 legs: 4 per side, drawn as thin bent lines (two segments each, angled like a real spider leg).
- Eyes: 4 tiny bright dot eyes across the front.
- Movement: legs animate based on position change — each leg endpoint oscillates sinusoidally.
- Glow: `setGlow('#cc44aa', 10)` — spiders pulse menacingly.
- Charge animation: when moving toward player, glow intensifies.

**Flea**
- Small dark oval `#ddcc00` with tiny legs (4 pairs, very short).
- Dropping trail: faint dotted line of small circles behind flea's path.
- Leaves mushrooms on contact: mushroom spawn particle.

### Particle & Effect System

| Effect | Description |
|---|---|
| Player bullet trail | 3 ghost copies of bullet behind it, at 0.4/0.2/0.1 alpha, pale green |
| Mushroom hit | 2 small brown/red chips fly outward, then fall (gravity), 300ms |
| Mushroom destroyed | Stem fragment + cap shards (4 polygons) burst outward, 500ms |
| Segment killed | 4 green sparks burst from segment position, fade 300ms, then mushroom spawns |
| Spider killed | 8 radiating lines (leg-like) burst outward in `#cc44aa`, 400ms |
| Flea killed | Yellow burst, 6 particles, 200ms |
| Player death | Ship explodes: 6 wing/fuselage fragments spin outward, green sparks, 600ms |
| Level clear | Firefly-like particles (10 yellow-green dots) drift up from bottom, 2s |
| Mushroom restore | Green sparkle sweeps from bottom to top of mushroom (power-up effect) |

### UI Polish

- **Score**: top-left, `#aaffaa` text, large. Prefix: small text "SCORE" in dim `#558855`.
- **Lives**: bottom-left, small player ship icons in `#44ff88`.
- **High score**: top-center, `#ccffcc`.
- **Round indicator**: "ROUND 3" at start of each wave, pale green text slides up from bottom, held 1.5s.
- **HUD bar**: thin 2px `#1a3a1a` line separates score from game area at very top.
- The game field should feel like a window into a dark garden world.

---

## Sound Design Plan

### Sound Synthesis Table

| Event | Oscillator | Frequency | Envelope | Filter/Effect | Character |
|---|---|---|---|---|---|
| Player shoot | sine | 880→1200Hz, 0.04s glide | A:0 D:0.06 | none | quick laser zap |
| Mushroom hit | noise | — | A:0 D:0.04 | bandpass 600Hz Q=3 | dull thud |
| Mushroom destroyed | noise + sine | — + 120Hz | A:0 D:0.15 | lowpass 400Hz | earthy pop |
| Segment hit | sine | 660→440Hz | A:0 D:0.08 | none | insect squeal |
| Segment killed | noise + sine | — + 200→80Hz | A:0 D:0.12 | lowpass 500Hz | satisfying squish |
| Centipede turn | triangle | 330Hz brief | A:0 D:0.04 | none | click |
| Spider appear | sawtooth | 220→440→220Hz triangle wave | A:0.01 D:0.3 | lowpass 800Hz, tremolo 8Hz | creepy approach |
| Spider killed | sawtooth | 440→110Hz | A:0 D:0.25 | lowpass 600Hz | squash |
| Flea drop | triangle | 880Hz repeating each 0.15s | A:0 D:0.1 | none | rapid dripping |
| Flea killed | sine | 660→330Hz | A:0 D:0.12 | none | tiny pop |
| Player death | sawtooth | 440→55Hz | A:0 D:0.5 | lowpass sweep | descending wail |
| Level complete | sine arpeggio | C5 E5 G5 C6 | A:0 D:0.08 per | reverb | bright victory |
| Speed up warning | sawtooth | 110Hz | A:0.01 D:0 S:1.0 R:0.2 | none | low buzz gets louder |

### Music / Ambience

- **Ambient base**: a constant low cricket-chorus sound — white noise filtered to bandpass at 3000–5000Hz at very low gain 0.02, with a slow 2Hz LFO on the gain to simulate chirping rhythm. This sounds like a garden at night.
- **Centipede movement bass**: as the centipede moves, a low sawtooth pulse (80Hz, gain 0.03) triggers every time the centipede turns or enters the player zone. Faster turns = faster pulses = rising tension.
- **Danger proximity**: as the centipede's head approaches the bottom of the screen, a low bass drone (55Hz, sawtooth, lowpass 200Hz) fades in, reaching full gain 0.06 when centipede is in the player zone.
- **Music**: sparse rhythm loop — just kick (noise+60Hz, D:0.1, every 0.5s at 120 BPM) and a simple two-note bass (E2-A2 alternating every bar). The simplicity lets sound effects breathe.
- **Spider appearance stinger**: when spider enters, a dissonant two-note shriek (sawtooth at 440Hz + 466Hz simultaneously) for 0.2s, gain 0.2.
- **Master gain**: 0.35.

---

## Implementation Priority

**High**
- Mushroom redesign as toadstool (cap + stem + spots)
- Centipede segment articulation (feet stubs, head eyes/antennae)
- Spider leg system (8 bent-line legs with animation)
- Background dark garden green with grass hints
- Player shoot laser beam (thin rect instead of circle)
- Segment kill mushroom-spawn particle

**Medium**
- Player ship redesign (wing extensions, firefly glow)
- Mushroom damage states (cracked texture)
- Spider proximity danger audio (bass drone)
- Cricket ambient sound
- Level clear firefly particles
- Flea dropping trail

**Low**
- Radar ring background detail
- Vine border at top of screen
- All sound effects from synthesis table
- Centipede turn click sound
- Round indicator slide-up banner
