# Coop Dungeon Crawler — Visual & Sound Design Plan

## Current Aesthetic

The game has a top-down dungeon with warm stone wall colors (`#2a2520`, `#322e28`), floor colors (`#4a4238`), corridor=`#3a342c`, door=`#a84` (amber). Three player classes: Warrior=`#48f`, Mage=`#c4f`, Rogue=`#4f4`. Monsters are circles with colored fills and text labels. Loot is glowing circles. A minimap (100x70) is present. The game operates on a procedural dungeon map (80x60 tiles). The warm stone tones are the right instinct but the execution is too plain — all entities are undifferentiated circles, walls are flat rectangles, and there is no atmosphere (no torchlight, no shadows, no dungeon mystery).

## Aesthetic Assessment: 2.5 / 5

The warm palette for stone is correct. Camera scrolling and minimap are well-implemented. But a dungeon crawler lives and dies on atmosphere — torchlight, flickering shadows, ominous darkness just beyond your sight. Entities being plain circles removes all the fantasy RPG personality. This needs stone texture, torchlight, and character designs that evoke warrior/mage/rogue archetypes.

---

## Visual Redesign Plan

### Background & Environment

- **Wall tiles**: replace flat `#2a2520` rectangles with **textured stone blocks**:
  - Fill: `#2c2822` base warm grey-brown.
  - Top-left corner: 1px highlight line in `#3e3630` (faux top-light).
  - Bottom-right corner: 1px shadow in `#1e1a18`.
  - Random mortar crack lines: 1–2 thin dark lines (`#201c1a`, 1px) across random wall tiles (seeded per tile position). These should be subtle and sparse.
  - Occasional brick seam: a horizontal 1px line at y=TILE/2 on some wall tiles in `#251f1c`.
- **Floor tiles**: replace flat `#4a4238` with varied floor:
  - Base: `#4a4238`.
  - Every 3rd tile: slightly lighter `#524a40` — subtle tile variation.
  - Occasional crack: very faint 1px line in `#3a3028`.
  - Floor tiles nearest walls: slightly darker `#403830` (edge shadow from walls).
- **Torchlight system** — the key atmospheric element:
  - Render a **dynamic torchlight radial gradient** centered on each player, radius ~180px.
  - Inside radius: floor tiles are their normal warm colors.
  - Outside radius: dark overlay `rgba(0,0,0,0.85)` covers everything — the unknown dark.
  - Players carry their light with them — the gradient moves with the camera/player.
  - Walls just outside the lit radius: barely visible silhouettes at 0.2 alpha.
  - Flicker: the torchlight radius oscillates ±8px at 4–8Hz random frequency — subtle candle flicker.
- **Corridors**: `#3a342c` fill + wall tile borders on both sides, making them feel like narrow passages.
- **Doors**: amber `#a84` rect with a visible frame — 2px border in `#8a6030`, with a small iron-hinge detail (2 dark rectangles on one side).
- **Stairs/exit**: spiral staircase icon: concentric arc polygons in `#6a5040` with a bright center `#ffd070` (light from below).

### Color Palette

| Role | Old | New |
|---|---|---|
| Wall base | `#2a2520` | `#2c2822` |
| Wall highlight | `#322e28` | `#3e3630` (1px edge) |
| Wall shadow | none | `#1e1a18` (1px edge) |
| Floor base | `#4a4238` | `#4a4238` |
| Floor variant | `#524a3e` | `#524a40` |
| Corridor | `#3a342c` | `#3a342c` + edge darken |
| Door | `#a84` | `#b8802a` warmer amber |
| Torchlight zone | none | `rgba(255,180,60,0.05)` inner warmth tint |
| Darkness | none | `rgba(0,0,0,0.85)` beyond torch range |
| Warrior player | `#48f` | `#4488ff` with `setGlow('#4488ff', 10)` |
| Mage player | `#c4f` | `#cc44ff` with `setGlow('#cc44ff', 12)` |
| Rogue player | `#4f4` | `#44ff44` with `setGlow('#44ff44', 8)` |
| Monster (goblin) | plain circle | `#6a8a30` dark green |
| Monster (orc) | plain circle | `#4a8a30` deeper green |
| Monster (skeleton) | plain circle | `#c8c0a8` bone off-white |
| Monster (boss) | plain circle | `#cc2222` with stronger glow |
| HP bar (player) | none | `#44ee44` friendly green |
| HP bar (enemy) | none | `#ee4444` enemy red |
| Loot (common) | glow circle | `#d4a030` gold glow |
| Loot (rare) | glow circle | `#4488ff` blue glow |
| Loot (epic) | glow circle | `#cc44ff` purple glow |
| Minimap bg | dark | `#0c0806` |
| Score text | white | `#f0d890` warm parchment |

### Entity Redesigns

**Warrior**
- Body: still circle-based for simplicity, but layered:
  - Outer circle: `#2244aa` dark armor.
  - Inner circle (r-4): `#4488ff` bright fill — the "visor" glow.
  - Shoulder pauldrons: two small circle stubs at 10 o'clock and 2 o'clock positions in `#2244aa`.
  - Shield: small hexagon polygon attached to left side, `#3366cc`.
  - Direction indicator: forward-pointing sword (thin rect + triangle tip) in `#c0c8e0` silver.
  - Glow: `setGlow('#4488ff', 10)`.

**Mage**
- Body: central circle `#8822cc` with `#cc44ff` inner glow.
- Robe hem: 6 small petal polygons around base of circle (skirt suggestion) in `#6622aa`.
- Hat: triangle polygon above the circle, `#6622aa` with bright star tip.
- Staff: thin vertical line extending upward from body top (2px, `#aa8844`), with orb circle at top in `#ee88ff` with strong glow `setGlow('#ee88ff', 12)`.
- Glow: `setGlow('#cc44ff', 12)`.

**Rogue**
- Body: circle in `#224422` dark with `#44ff44` bright center.
- Cloak edge: thin dark arc around back half of circle `#1a2a1a` (shadow suggesting cloak).
- Daggers: two small thin rectangles at 45deg angles, crossing over body (X pattern) in `#a0a0a8` silver.
- Movement trail: when moving, 2 ghost copies behind (0.2/0.1 alpha), suggesting speed.
- Glow: `setGlow('#44ff44', 8)`.

**Monsters**
- Replace text labels with visual monster designs (still circle-based but more character):
  - Goblin: small circle, `#6a8a30` green. Two small pointy ear polygons above. Tiny red dot eyes.
  - Orc: larger circle, `#4a7030`. Thick brow polygon. Small tusk points below (two tiny white triangles).
  - Skeleton: bone-white circle `#c8c0a8`. Eye socket holes: two dark ellipses. Jaw: small dark arc at bottom.
  - Boss: large circle `#cc2222` with spiky crown polygon above. Strong `setGlow('#ff2222', 16)`.
  - All monsters: HP bar below entity (3px height, red/dark red).

**Loot**
- Not just glowing circles — redesign:
  - Common (gold): small diamond polygon (square rotated 45deg) in `#d4a030` with `setGlow('#ffd700', 8)`.
  - Rare (blue): 6-pointed star polygon in `#4488ff` with `setGlow('#4488ff', 10)`.
  - Epic (purple): 8-pointed star in `#cc44ff` with `setGlow('#cc44ff', 14)`.
  - Loot bobs: y-position oscillates ±3px at 2Hz — items float/hover.

**Torch (environmental prop)**
- Wall-mounted torches in corridors: small rectangle base `#5a4030` against wall, with flame polygon above (3-4 point organic shape) in `#ff8822`, innerflame `#ffd070`.
- Torch emits its own small torchlight: local radial gradient adds +20% brightness at r=40.
- Flame flickers: polygon point positions oscillate slightly.

### Particle & Effect System

| Effect | Description |
|---|---|
| Attack melee | Arc line sweep from attacker toward target in attacker's class color, 100ms |
| Attack ranged (Mage) | Bright orb projectile travels from Mage to target: `#ee88ff`, r=4, with 4 trailing particles |
| Rogue stab | Dagger-flash: brief bright `#44ff44` line at target, 50ms |
| Monster hit | Target circle briefly flashes white, 2 frames, then dark-red for 4 frames |
| Monster death | Circle shrinks to 0 with outward particle burst (6 particles in monster color), 300ms |
| Player hit | Camera shakes ±2px for 3 frames, player flashes red `#ff4444` |
| Loot spawn | Item drops with brief sparkle burst (4 particles of loot color radiating outward) |
| Loot collect | Item scales to 1.5x then disappears (0.15s), score text "+ITEM" rises |
| Door open | Brief dust puff particles from door edges (4 particles in `#c49a6c`), 300ms |
| Level up | Player emits large expanding ring in class color (r: 20→80, fade 0.8s) + "LEVEL UP!" text |
| Heal effect | Green cross (+) symbol appears above healed player, fades 0.5s |
| Torch flicker | Random torch flame polygon point offset ±2px each frame |

### UI Polish

- **Minimap** (top-right corner): dark `#0c0806` background. Wall tiles as `#2c2822` dots. Floor as `#4a4238`. Player dots in class colors with glow. Enemy dots as small red dots. Loot dots as small gold dots. Viewport rectangle: white dashed outline. Border: 1px `#6a5030` warm stone color.
- **HUD bar** (bottom of screen): dark panel `#1a1208` with 2px `#5a4030` top edge. Shows for each player: class icon (small), name, HP bar (green), MP bar (blue for Mage), level number.
- **Ability cooldown**: small circular progress rings next to each player's abilities. Fill color = class color. Empty = dark grey.
- **Damage numbers**: damage dealt floats up from target in bright color (player color for player attacks, red for enemy attacks). Bold, 12px, fades over 1s.
- **Floor indicator**: "Floor 3" small text in top-left corner, `#f0d890` parchment.
- **Wave/room cleared**: "ROOM CLEARED!" text slides in from top, parchment color, holds 2s.

---

## Sound Design Plan

### Sound Synthesis Table

| Event | Oscillator | Frequency | Envelope | Filter/Effect | Character |
|---|---|---|---|---|---|
| Warrior sword attack | noise + sine | — + 220Hz | A:0 D:0.15 | lowpass 600Hz | heavy sword swing |
| Mage spell cast | sine | 880→1320Hz glide | A:0.01 D:0.25 | reverb | arcane whoosh |
| Rogue dagger stab | noise | — | A:0 D:0.06 | highpass 800Hz | sharp swift cut |
| Monster hit | noise | — | A:0 D:0.1 | lowpass 500Hz | impact thud |
| Monster death | sawtooth | 330→110Hz | A:0 D:0.3 | lowpass 400Hz | dying groan |
| Player hit | noise + sine | — + 180Hz | A:0 D:0.15 | lowpass 600Hz | grunt impact |
| Loot collect | triangle | 660Hz + 880Hz simultaneous | A:0 D:0.2 | reverb | item chime |
| Door open | noise | — | A:0.02 D:0.4 | lowpass 300Hz | creaking wood |
| Level up | sine arpeggio | C4 E4 G4 C5 E5 G5 | A:0 D:0.1 per | reverb | ascending fanfare |
| Potion use | sine | 440→660Hz bubble | A:0.01 D:0.15 | tremolo 8Hz | magical bubble |
| Boss enter room | sawtooth chord | 110+165+220Hz | A:0.02 D:1.0 S:0.6 R:0.5 | lowpass 800Hz, reverb | ominous boss sting |
| Key found | triangle | 880Hz shimmer | A:0 D:0.3 | reverb | discovery chime |
| Footstep (stone) | noise | — | A:0 D:0.05 | bandpass 400Hz Q=3 | stone step |

### Music / Ambience

- **Ambient base**: constant low dungeon ambience — filtered white noise (lowpass 200Hz, gain 0.02) for dungeon rumble. Occasional drip: sine at 440→330Hz, D:0.15, random every 5–15s. Occasional distant echo: same drip but reverb/delay.
- **Game music**: slow, dark, atmospheric loop in D minor at 80 BPM:
  - Drone: sawtooth oscillator at 55Hz (D1), very low gain 0.04, sustained.
  - Harmony: stacked fifths — sine oscillators at 110Hz (D2) and 165Hz (A2), gain 0.03 each.
  - Melody: sparse triangle oscillator walking through D minor arpeggio (D3-F3-A3-C4), each note held 2–4 beats, random sequence. Gain 0.02.
  - Percussion: very low kick (noise+55Hz, D:0.2) every 3 beats (triplet feel). Occasional bone-rattling effect (noise bandpass 2000Hz, D:0.08) on off-beats.
- **Combat mode**: when monsters are nearby/attacking, music adds an urgent element — hi-hat pattern (noise highpass 5000Hz, D:0.03) every beat, tempo suggestion speeds up 10%.
- **Boss music**: entirely different stinger — heavy sawtooth chord, dissonant (D+Eb, tritone), with slow 2Hz tremolo. Replaces ambience for boss room.
- **Room cleared**: brief 4-note ascending motif (D-F-A-D) on triangle oscillators, reverb, 0.5s.
- **Master gain**: 0.35.

---

## Implementation Priority

**High**
- Torchlight system (radial darkness overlay with flicker)
- Wall stone texture (mortar lines, edge highlights/shadows)
- Floor tile variation (alternate tiles, edge darkening)
- Player class redesigns (pauldrons, staff, cloak details)
- Monster visual character (ears, tusks, skulls etc.)
- Loot item shape redesigns (diamonds, stars) with bobbing

**Medium**
- Damage number floaters
- Monster death shrink+burst particles
- Melee attack arc sweep effect
- Mage projectile orb with trail
- Door creak sound
- Ambient dungeon drip sounds
- Dungeon ambience loop

**Low**
- Environmental torch props with flame flicker
- Room cleared notification slide-in
- Boss room music stinger
- Level up fanfare
- Minimap loot/enemy dot colors
- Ability cooldown circle rings
