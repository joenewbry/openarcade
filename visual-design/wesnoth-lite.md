# Wesnoth-Lite — Visual & Sound Design

## Current Aesthetic

A 12×10 offset hex grid on a dark `#1a1a2e` background. Terrain cells are flat colored hexagons — grass=`#4a7a3a`, forest=`#2d5a1e`, hills=`#8a7a5a`, water=`#2a4a8a`, village=`#aa8844`, castle=`#888888`. Terrain icons are Unicode characters (house for village, club for forest, triangle for hills, tilde for water, rook for castle). Units are circles (blue for player, red for AI) with a symbol letter. HP bars beneath units. Move highlights: blue hex overlay. Attack highlights: red hex overlay. Recruit highlights: orange hex overlay. Day/night changes the terrain color palette. Floating damage numbers appear on combat. The game is functionally complete and readable, but visually it's exactly what you'd expect from a first-pass implementation.

## Aesthetic Assessment
**Score: 2/5**

The hex grid is the right choice. The day/night color palette system is a genuinely smart feature. The Unicode terrain icons are charming. The foundations are solid, but the terrain lacks texture, units lack personality, and the overall atmosphere is flat. A proper Wesnoth aesthetic should feel like a hand-painted fantasy campaign map.

## Visual Redesign Plan

### Background & Environment

Background: Replace `#1a1a2e` with a deep parchment-dark tone `#0c0a08` (warm near-black) for day, `#06060f` for night — subtly warm versus cold.

Hex cell terrain upgrades — each terrain type gets layered rendering:

**Grass**: Fill with `#3d6a2e`, then draw 8 tiny 1×2px vertical green lines `#4a8038` scattered within the hex (fixed positions relative to center) — blades of grass texture. Night variant: `#1a2e15`.

**Forest**: Fill with `#1f4018`, then draw 3 small tree silhouettes as simple triangle polygons `#2d5a1e` centered at staggered positions within the hex. Night: `#0d1a0a`.

**Hills**: Fill with `#7a6a4a`, then draw 2 small triangle "mountain" shapes `#8a7a5a` at the upper portion of the hex. Night: `#2d2618`.

**Water**: Fill with `#1a3a7a`. Draw 2 horizontal sine-wave-like lines across the middle of the hex in `#2a4a9a` (approximated by a 5-point polyline at ±3px from center). Animate by slowly oscillating the y offset (sine at 0.5Hz). Night: `#0e1e4a`.

**Village**: Fill with `#8a6830`, draw a small house silhouette — a 3×4px rectangle topped by a triangle `#cc9944`. Color shifts based on owner (player=blue glow, AI=red glow, neutral=amber). Night: `#3a2a14`.

**Castle**: Fill with `#606060`, draw small battlements — two 2×2px squares side by side at the top of the hex with a gap between, in `#888888`. The player's castle gets a faint blue ambient glow. Night: `#2a2a2a`.

Hex border styling: Replace uniform `#333` borders with terrain-aware borders — grass-to-water borders get a brighter `#4488ff22` tint, forest-to-grass gets `#44882222`. All borders at 0.8px. Creates a naturalistic blending feel.

### Color Palette
- Background (day): `#0c0a08`
- Background (night): `#06060f`
- Background (dusk/dawn): `#0a080c`
- Grass day: `#3d6a2e`
- Forest day: `#1f4018`
- Hills day: `#7a6a4a`
- Water day: `#1a3a7a`
- Village day: `#8a6830`
- Castle day: `#606060`
- Player color: `#4488ff`
- Player glow: `#66aaff`
- AI color: `#ff4433`
- AI glow: `#ff6655`
- Selected hex: `#6699ff`
- Move range: `#4466ff`
- Attack range: `#ff4422`
- Recruit: `#ffaa22`

### Entity Redesigns

**Units** — Move beyond single-color circles:
- Each unit is drawn as a stacked composition: base circle (radius 9px) in owner color, then a darker inner circle (radius 6px) in `owner_color * 0.6` — creates a shield/badge look.
- The symbol letter inside is replaced with a small symbolic icon drawn from lines and shapes:
  - Swordsman (S): A cross shape — a vertical 1×6px rect and horizontal 6×1px rect, centered.
  - Archer (A): A small arc (6-point strokePoly) with a line through it — a bow shape.
  - Cavalry (C): A diamond (4 points) — a simplified horse head silhouette.
  - Mage (M): A star polygon (5-pointed, radius 5px).
  - Leader (L): A crown shape — three small triangles on top of a rectangle.
  All drawn in white `#ffffff` at 12px size within the unit circle.
- Selected unit: The outer circle gets a bright pulsing glow ring (strokePoly at radius+3px, width 2px, glow 0.9, oscillating 0.5→1.0 at 1Hz) and a full hex highlight underneath.
- Moved (spent) units: Apply a dark overlay circle `#00000066` on top — visually dims the unit to show it has acted.
- Low HP (≤30%): The unit circle gets a red tint overlay `#ff000033` and pulses slightly (radius ±0.5px at 2Hz) to signal danger.

**HP bars** — Redesign as a more visual element:
- Position the HP bar above the unit (not below), arcing slightly over the top of the unit circle.
- Full HP = `#44cc44`, half HP = `#cccc44`, low HP = `#cc4444`.
- At full HP the bar has a small highlight dot at center-right — a polished specular look.

**Floating damage numbers** — Enhance the existing system:
- Numbers grow slightly as they rise: start at 11px, reach 15px at peak height (frame 30 of 60), then shrink back to 11px as they fade.
- Color: red for damage to player units, orange for AI damage. On a killing blow, the number is larger (18px) and briefly turns white before going red.
- On miss (if added): a "MISS" text in `#aaaaaa` floats up instead.

**Recruit menu** — Redesign as a proper medieval panel:
- Background: `#14100cee` (dark parchment tone) with a gold `#aa8844` border (2px, all four edges).
- Title bar: `#1e1808` with the gold text "RECRUIT UNITS" at center.
- Each unit row: alternating `#1a160e` and `#14120a` row backgrounds. A small unit icon (the polygon icon described above) on the left. Stat line in `#ccbbaa`. Cost shown with a small gold coin icon (circle 4px `#ffd700`).
- Rows that can't be afforded: dim to `#666655` text, row background `#0e0c0a`.

### Particle & Effect System

Combat hit: On damage, 6–8 particles shoot outward from the defender hex center in the attacker's color, mixed with white `#ffffff`. Gravity pull downward at 0.1px/frame². Life 400ms. Size 3px.

Kill: 16 particles in the killer's color burst outward. The killed unit circle briefly flashes white (1 frame fillCircle `#ffffff`), then a smoke dissolve — 4 dark gray particles `#666666` drift upward slowly.

Village capture (unit moves onto unowned village): Brief golden ring expands from the village hex center (strokePoly circle, radius 0→20 in 300ms, `#ffd700`). The village icon color shifts from neutral to owner color with a brief crossfade animation (2 frames of blended color).

Day/night transition: When dayNight changes, all terrain cells transition their fill color over 10 frames — draw each frame interpolating between the old and new color values (linear interpolation in RGB space). Smooth atmospheric change instead of a hard cut.

Castle capture (AI or player leader enters enemy castle): A dramatic burst of 20 particles in the new owner's color + a brief text "CASTLE SEIZED!" floating up from the hex in the owner's color, 24px, fading over 1500ms.

### UI Polish

**Day/night indicator** — Redesign as an analog clock-style moon/sun cycle:
- Draw a small 24px circle at bottom-right. The top half fills with `#ffd700` (sun) and bottom half with `#334488` (moon). The dividing line rotates based on the current cycle position (0=full day, π=full night).
- The current phase label draws beside it in the appropriate warm or cool color.

**End Turn button** — The plain rectangle gets an upgrade:
- Background: `#1a2a1a` with a cyan `#4488ff` border glow.
- On hover (detected by tracking mouse position): border brightens to full `#66aaff` glow, background shifts to `#1e321e`.
- A small right-pointing arrow icon (3-point triangle polygon) appears to the right of the text on hover.

**Phase banner** — The "Your Turn" / "AI thinking" text in the DOM element gets a matching styled treatment:
- During player turn: draw a subtle blue `#4488ff11` fillRect across the canvas top (30px tall) as a status strip. The DOM text appears over it.
- During AI turn: orange `#ff880011` strip instead, pulsing slowly.

**Gold display** — Both gold counts rendered with coin icons (small gold circles) prefix before the number. Player gold shown in `#ffd700`, AI gold shown in `#ff8844` (copper — enemy gold is less valuable to you).

**Income indicator** — Below the gold count, show the income rate as "+N/turn" in a smaller dimmer color (`#88aa66` for player, `#aa6644` for AI).

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Unit selected | Short ping: sine 880Hz | Gain 0.15→0 | 60ms | Selection click |
| Unit moves | Soft step: noise lowpass 400Hz | Gain 0.12→0 | 80ms | Movement |
| Melee attack | Impact thud: noise lowpass 500Hz + sine 180Hz | Gain 0.4→0 | 150ms | Sword hit |
| Ranged attack | Whoosh: noise highpass 800→3000Hz sweep | Gain 0.25→0 | 120ms | Arrow shot |
| Unit killed (player) | Descending pain cry: saw 400→120Hz | Gain 0.5→0 | 400ms | Unit falls |
| Unit killed (AI) | Shorter descend: saw 350→100Hz | Gain 0.3→0 | 300ms | Enemy falls |
| Village captured | Light chime: 659→784→1047Hz | Sine, gain 0.25→0, 80ms each | 240ms | Territory secured |
| Recruit purchased | Coin drop: sine 880→660Hz | Gain 0.2→0 | 200ms | Gold spent |
| Turn start (player) | Gentle fanfare: 523→659→784Hz | Triangle, gain 0.2→0, 100ms each | 300ms | Your turn |
| AI turn start | Low horn: sawtooth 110Hz | Gain 0.2→0, lowpass filter 400Hz | 400ms | Enemy moves |
| Day transition | Rising shimmer: 880→1047→1318Hz | Sine, gain 0.15→0 | 350ms | Dawn arrives |
| Night transition | Descending: 440→330→220Hz | Sine, gain 0.15→0 | 350ms | Dusk falls |
| Victory | Full triumph: 523+659+784+1047Hz chord | Gain 0→0.5→0 | 2000ms | Enemy leader falls |
| Defeat | Somber fall: 440→329→261→196Hz | Sine arpegg down, gain 0.4→0 | 1200ms | Your leader falls |
| End turn button | Soft confirm: 659→784Hz | Sine, gain 0.15→0 | 120ms | Turn ends |

### Music/Ambience

A fantasy tactics atmosphere. Three distinct states:

**Day (peaceful)**: A gentle melodic loop.
- Background drone: triangle osc at 130Hz (C3), gain 0.05.
- Mid melody: sine osc playing a simple pentatonic loop: 261→329→392→523→392→329→261Hz (C4→E4→G4→C5→G4→E4→C4), each note held 600ms, gain 0.04.
- High shimmer: sine 1046Hz (C6) with 0.3Hz LFO amplitude modulation, gain 0.018.
- Combined effect: light, hopeful fantasy.

**Night (mysterious/tense)**: Different ambient character.
- Background drone: sine at 110Hz (A2), gain 0.06.
- Mid: triangle osc at 146Hz (D3) and 174Hz (F3) — a minor third interval, held continuously, gain 0.03 each.
- Pulse: every 1500ms, a brief triangle 220Hz note at gain 0.04 for 400ms — a lone herald note.
- Combined: tense, unsettling, minor mood.

**Combat phase** (during AI turn setTimeout):
- Raise percussion: noise burst through lowpass 200Hz every 600ms, gain 0.1→0, 80ms — war drum.
- Add a fast ostinato: triangle osc arpeggio 196→220→247Hz cycling every 300ms, gain 0.025.
- Fade out after AI turn completes.

Day/night transition sounds are triggered at cycle changes. The ambient music smoothly crossfades between day and night modes over 2s using gradual gain adjustment.

## Implementation Priority
- High: Terrain texture details (grass blades, tree shapes, water waves), unit icon polygon designs replacing letter symbols, combat particle hit burst, day/night color transition animation, all combat sounds
- Medium: Village owner glow shifts, HP bar redesign as arc, recruit menu parchment styling, kill unit flash + smoke, floating damage number growth animation, turn start sounds
- Low: Castle battlements detail, village capture golden ring, castle seizure dramatic burst, analog day/night clock indicator, end turn button hover state, ambient music day/night system
