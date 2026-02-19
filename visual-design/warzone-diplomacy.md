# Warzone Diplomacy — Visual & Sound Design

## Current Aesthetic

A 600×500 world map with 24 polygon territories distributed across 5 named continents. Territories are filled with the owning player's color at 50% alpha, outlined in their full color. Army counts float in small dark circles. Adjacency lines are very faint white. Attack orders are dashed yellow arrows. The menu state shows 30 animated red dots and 8 pulsing hexagon outlines. A legend in the bottom-left tracks player names and territory counts. The overall look is clean strategy-game UI but lacks cartographic beauty — it reads as a game board rather than a living war map.

## Aesthetic Assessment
**Score: 2.5/5**

The territory polygon approach is good. The dashed arrow system for attack orders reads clearly. The player color system works. What's missing is atmosphere — the map needs to feel like a real strategic theater, with topographic suggestion, tension, drama in combat resolution, and visual differentiation between continent regions.

## Visual Redesign Plan

### Background & Environment

Background: Replace flat black with `#06080f` deep ocean. The overall canvas suggests an old war table map.

Continent regions: Each continent gets a subtle topographic fill. Instead of just an ellipse outline, draw the region with a layered approach:
- A large faint ellipse polygon in the continent's base color at 12% opacity (the landmass).
- Inside, draw 8–12 small irregular dots (2–3px fillCircles) at pseudo-random positions in the continent at 8% opacity — suggesting terrain elevation features.
- A second slightly smaller ellipse at 8% opacity creates depth.

Ocean fill: Between territory polygons and the canvas edges, the space reads as ocean. Add 6 faint horizontal lines across the canvas at `#0a1220` with 1px height spaced every 25px — subtle ocean waves.

Grid/graticule: Draw very faint lines at `#0c1428` at 60px spacing (longitude/latitude-style lines) across the entire canvas at 0.5px — a classic war map aesthetic.

Border glow on contested territories: Any territory adjacent to an enemy territory has a slightly brighter stroke (1.5× stroke width, +0.2 glow) on the enemy-facing side edges. Approximated by doubling the strokePoly glow on contested territories.

### Color Palette
- Background ocean: `#06080f`
- Continent Nordheim: `#2a1a10` (cold amber)
- Continent Oceania: `#101a2a` (deep blue)
- Continent Verdania: `#0f2010` (forest green)
- Continent Shadowlands: `#1a0f2a` (deep purple)
- Continent Aurelia: `#2a1a00` (rich gold-brown)
- Player 0 (you): `#4488ff`
- Player 1 (Krov): `#e55555`
- Player 2 (Vex): `#33bb33`
- Player 3 (Nara): `#dd44dd`
- Player 4 (Zhin): `#ffaa00`
- Neutral territory: `#444455`
- Glow/bloom: per-player color

### Entity Redesigns

**Territory polygons** — Upgrade the fill/stroke system:
- Fill: player color at 55% opacity (slight increase for readability).
- Inside the polygon, draw a subtle inner highlight: a smaller polygon (scale each vertex 80% toward the centroid) in the player color at 15% opacity — creates a soft interior glow suggesting ownership.
- Stroke: player color at full opacity, 2px for player-owned, 1.5px for others.
- Contested (adjacent to enemy): add a secondary dashed stroke using alternating fillRect segments along the border — alternating the player color and red `#ff2244`, 4px on/4px off. Approximated by drawing the strokePoly twice with slight scale differences.
- Neutral territories: `#444455` fill with `#555566` stroke, no glow.

**Army circles** — Redesign for clarity and drama:
- The dark circle background: replace flat `#1a1a2e` with a radial gradient approximation — center circle darker than edge. Achieved by drawing a large circle then a smaller darker circle centered on it.
- Army number: slightly larger font (13px instead of 11px), player color instead of white.
- On reinforcement hover: the circle glows in `#66ff66` and shows "+N" text above in green.
- When armies exceed 10: circle radius expands to 14px and a subtle outer ring appears (strokePoly at radius+3).

**Attack arrows** — The dashed yellow arrows are good. Enhance them:
- Arrow shaft: change from uniform dashes to a gradient-fade pattern — bright yellow at source, fading to orange near the arrowhead.
- Arrowhead: make the triangle slightly larger (10px vs 8px) and fill it with the same fade color.
- Add a slight bounce animation: each arrow's length oscillates ±3px at 2Hz, suggesting the order is "live" and active.
- Add tiny chevron tick marks along the shaft (3 short perpendicular lines evenly spaced) to suggest movement direction.

**Alliance visualization**: When two players are allied, draw a glowing dotted line connecting their largest territories — two dots dash-pattern, in a blend of their two colors. Updates each turn. Very subtle at 25% opacity.

**Betrayal flash**: When a betrayal is committed, a brief red flash `#ff0000` fills both involved territories for 200ms, then their alliance line disappears with a breaking animation (the dotted line draws itself backward to nothing over 400ms).

### Particle & Effect System

Combat resolution: For each attack animation (resolveNextAttack at 350ms intervals):
- On capture: 8 particles burst from the captured territory's center in the attacker's color. Small stars (4px) radiate outward, gravity-fall, life 500ms.
- On failed attack: 4 gray `#888888` particles fall downward from the defender territory center. The defender territory briefly pulses with a shield-like ring (strokePoly expanding then contracting).
- Army loss indicator: "-N" floating text rises and fades from the territory center over 400ms in red `#ff4444`.

Player eliminated: Their territories briefly flash `#333333` (going neutral color) one by one in sequence over 1s. Each territory gets a small puff of 3 gray particles on transition.

Territory captured (player takes one): Territory briefly floods with player blue `#4488ff` at 60% opacity, then transitions to normal 55% fill over 300ms.

Continent bonus achieved: Brief golden outline appears on all continent territories simultaneously (strokePoly in `#ffd700`, 2px, 400ms), then fades. A small "+N" bonus indicator floats up from the continent center.

### UI Polish

**Legend redesign**: The bottom-left legend gets a more polished card:
- Dark background `#06080f` with a golden `#ffd700` top border strip (2px).
- Player rows: a small "flag" polygon (3-point triangle) in their color instead of a dot.
- Territory count shown as a mini bar (10px wide proportional to territory count out of 24).
- Eliminated players: row background goes to `#0a0a0a`, text grayed, a thin strikethrough line.

**Tooltip redesign**: Territory hover tooltip becomes a styled war report card:
- Header bar in the territory owner's color.
- Info lines using a slightly different text color for values vs labels.
- A small "terrain icon" drawn as a symbol (dots for hills, parallel lines for water, tree-like shape for forest — all approximated from basic drawing primitives) based on the territory name.

**Turn phase banner**: During "Resolving..." phase, show a pulsing status line across the top of the canvas: a 20px tall fillRect at `#1a0000` with scrolling text "COMBAT IN PROGRESS" (simulated by redrawing text at an x position that increments each frame, wrapping at canvas width).

**Continent name labels**: In addition to the faint text already there, add a larger semi-transparent continent name watermark at 4% opacity — a large 20px text in the continent's color, centered on the continent.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Territory capture | Triumphant short: sine 523→659Hz | Gain 0.3→0 | 200ms | Conquest sting |
| Attack failed | Dull thud: noise through lowpass 300Hz | Gain 0.35→0 | 200ms | Repelled |
| Reinforcement placed | Soft march-step: sine 220Hz | Gain 0.15→0 | 80ms | Army arrives |
| Alliance formed | Warm chord: 329+415+523Hz | Sines, gain 0.2→0 | 400ms | Diplomatic warmth |
| Betrayal | Sharp dissonant stab: saw 400Hz + 415Hz (dissonant) | Gain 0.5→0 | 350ms | Trust broken |
| Player eliminated | Long descending: saw 300→80Hz | Gain 0.5→0 | 700ms | Faction falls |
| Turn submitted | Button click + brief fanfare: 440→523Hz | Gain 0.25→0 | 180ms | Orders sent |
| Victory total | Grand fanfare: 523+659+784+1047Hz | Gain 0→0.5→0 | 1500ms | Total conquest |
| Defeat | Slow descent: 329→247→196Hz sine | Gain 0.4→0 | 900ms | Eliminated |
| Order undo | Descending two-note: 523→392Hz | Gain 0.15→0 | 150ms | Order cancelled |
| Continent bonus | Ascending flourish: 523→659→784→1047Hz rapid | 60ms each, gain 0.3 | 240ms | Bonus income |
| Dice roll (per attack) | Quick rattling: 4 short noise bursts 20ms each | Gain 0.15→0 | 100ms total | Dice sounds |

### Music/Ambience

An epic strategy game requires a suitably grand ambient soundtrack. Built purely from Web Audio:

**Main theme loop** (16-bar structure, ~60 BPM):
- Bass pedal: sine osc at 55Hz (G1), gain 0.07, continuous.
- Mid sustain: triangle oscs at 196Hz (G3) and 247Hz (B3), gain 0.04 each, with a slow 0.2Hz amplitude LFO creating a breathing pad.
- Rhythmic pulse: every 1000ms, a short triangle 392Hz (G4) note at gain 0.05 for 300ms — a subtle melodic pulse suggesting military march.
- High accent: every 4000ms, a brief sine arpeggio 523→659→784Hz (C5→E5→G5), 100ms each note, gain 0.06 — a flourish accent that gives the loop structure.

**Combat phase** (during resolveNextAttack period):
- Add a low percussion pattern: noise burst through lowpass 200Hz every 800ms, gain 0.1→0, 100ms — a war drum.
- Raise bass gain to 0.10.
- Add dissonant upper note: sine at 415Hz (slightly flat of 440Hz), gain 0.03, played alongside mid sustains — creates tension.

**Diplomacy phase** (between turns, planning phase):
- Base theme continues at lower overall volume (−30%).
- The flourish accents become gentler and more frequent (every 2000ms).

**Victory/defeat stings**: Override ambient music with a dedicated 2-second sting, then silence for 3s before ambient resumes on next game.

## Implementation Priority
- High: Territory inner highlight polygon, attack arrow gradient-fade + chevrons, combat particle effects (capture burst, failed attack), all primary sound events
- Medium: Continent topographic fill layers, alliance dotted connecting line, army circle improvements, territory capture flood-fill animation, betrayal flash
- Low: Ocean wave lines, graticule grid overlay, territory hover flag icon, combat status scrolling banner, full ambient music loop, dice sound on each attack
