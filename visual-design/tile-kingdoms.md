# Tile Kingdoms — Visual & Sound Design

## Current Aesthetic

A Carcassonne-style tile placement game on a 600x600 canvas with 40px tiles. Tiles contain features: field (`#2a4a20`), city (`#c99660`), road (`#999999`), monastery (`#996644`). Meeples are small colored circles placed on tiles to claim features. An AI opponent plays alternating turns. Placed tiles form a growing patchwork map. Current tile preview shows in the top-left. Score numbers displayed in DOM. Tile edges use line drawing to show feature boundaries.

## Aesthetic Assessment
**Score: 2/5**

The tile placement mechanic is clear and well-structured. But the tiles look like colored rectangles with simple fills — nothing that evokes a medieval kingdom being built. Cities look like tan squares, fields look like dark green squares, roads are gray bands. There is no texture, no architectural detail, no sense that these are tiles from an ancient map. The meeple circles are indistinct. A good Carcassonne-style game should feel like building a medieval world, one hand-drawn map tile at a time.

## Visual Redesign Plan

### Background & Environment

The canvas background should look like a medieval map table — a rich dark oak wood texture: `#2a1a0a` base with thin horizontal `#1a0e06` grain lines at 3-4px intervals, and occasional knot whorls (small ellipses in a slightly lighter brown). This establishes the game as tiles being laid on a table.

The placed tile area (the growing map) should have a soft vignette fading to the wood table at the edges. Unplaced areas of the grid should show subtle grid lines (`#1e0e04`, 1px, very low opacity) suggesting where tiles could go.

In the corners of the canvas, draw decorative medieval map ornaments: a simple compass rose in the bottom-right (concentric octagonal polygon with N/S/E/W markers), a small heraldic shield outline in the top-right showing the game score.

### Color Palette
- Primary: `#c99660` (city stone/sandstone), `#2a4a20` (field green)
- Secondary: `#8a7a6a` (road gray/cobblestone), `#996644` (monastery wood-brown)
- Background: `#2a1a0a` (wood table), `#1a0e06` (wood grain)
- Glow/bloom: `#ffd700` (completed features), `#ff6600` (player meeple highlight), `#4488ff` (AI meeple highlight)

### Entity Redesigns

**Field tiles:** A patchwork of subtle greens — base fill `#2a4a20` with overlapping slightly-lighter diamond shapes `#336628` drawn across the tile to suggest cultivated strips (medieval field patterns). Add tiny dot clusters suggesting crops or texture. A faint brown soil line `#5a3a20` borders the field edge where it meets roads or city walls.

**City tiles:** Rendered with architectural character. Base fill of warm sandstone `#c99660`. Draw crenellated battlements along the city edge (small rectangular merlons — alternate filled and gap rectangles) where city borders the tile edge. Inside the city, draw a small tower silhouette (rectangle with a pointed triangular roof) or arched gateway (semicircle arch on two pillars). City segments that complete should get a slightly warmer color shift and a gold shimmer.

**Road tiles:** Roads drawn as a slightly concave corridor — the center strip `#9a8a7a` (cobblestone), with slightly darker `#7a6a5a` borders on each side (road gutters). Add tiny dashed center-line marks (short 2px tick marks every 8px along the road) for a cobblestone pattern effect. Road ends connect cleanly to the tile edge midpoints.

**Monastery tiles:** A centered building with clear religious character. Dark brown `#774422` body rectangle with a lighter peaked roof `#996644` triangle. A small cross symbol on the roof peak (two overlapping small rectangles). The tile field around the monastery is gentle grass `#3a5a28`. Completed monasteries get a golden glow ring.

**Meeples:** Replace generic circles with proper meeple shapes — the classic Carcassonne head-and-body silhouette. Draw as a connected polygon: a circle for the head, a trapezoidal torso below, and two small leg rectangles. Player meeples `#ff4400` (warm orange-red), AI meeples `#4488cc` (blue). Placed meeples on field tiles are horizontal (lying claim to territory), on cities are upright, on roads stand along the road direction, on monasteries kneel (slightly smaller).

**Current tile preview:** Draw the preview tile at 2x scale in the top-left panel with a glowing border `setGlow('#ffd700', 8)`. Below it, show a rotation arrow indicator.

### Particle & Effect System

- **Tile placement:** A brief "settle" animation — the tile scales from 110% to 100% over 8 frames with a slight bounce (scale to 98% at frame 6 then back to 100%). Dust puff particles (4 small `#c8a880` circles) emerge from the tile edges.
- **Feature completed (city/road/monastery):** Burst of gold sparkles — 12 star particles radiate from the feature center, rising and fading over 30 frames. The completed feature tiles shift to a slightly warmer golden tint briefly.
- **Meeple placed:** The meeple scales in from 0 to 100% over 10 frames with a bounce (goes to 115% at frame 7 then settles). A brief ring expands from the placement point.
- **Score award:** Points float up from the completed feature — large bold numbers in gold `#ffd700` rising and fading over 40 frames. The score counter in the HUD pulses bright.
- **Tile rotation:** The preview tile rotates with a smooth 90-degree spin animation over 8 frames (not instant snap).
- **Illegal placement:** The preview tile flashes red `#ff2200` twice (4 frames each) and emits a small X mark particle at the placement attempt point.

### UI Polish

- **Score panels:** Draw as heraldic shields — a shield-shaped polygon for each player containing their meeple color, score number, and remaining meeple count (shown as tiny meeple silhouettes). Player shield in warm red, AI shield in blue.
- **Remaining meeples:** Show as a row of tiny meeple silhouettes beside the score. Claimed meeples are dimmed/outlined only.
- **Tile stack counter:** Draw as a fanned stack of cards in the top area — a few slightly offset rectangles suggesting a pile, with the count shown on the top card.
- **Turn indicator:** "YOUR TURN" / "AI THINKING" banner slides down from top. AI thinking state shows a slow pulsing ellipsis (...) below the banner.
- **End game overlay:** The wood table background gets a spread of gold light. Both shields animate to display final scores. Winning player's shield grows and gets a golden crown ornament at the top.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Tile pickup | Card lift | Triangle 400 Hz | 40ms | Light grab |
| Tile rotate | Soft click | Sine 500 Hz | 30ms | Rotation tick |
| Tile place (valid) | Thud | Lowpass noise 180 Hz | 80ms | Tile on table |
| Tile place (illegal) | Buzzer | Sawtooth 120 Hz, fast | 100ms | Invalid action |
| Meeple place | Soft click | Sine 660 Hz | 50ms | Small piece place |
| Road complete | Coin jingle | Sine 880+1100 Hz | 150ms | Achievement tone |
| City complete | Brass tone | Sawtooth 392+523 Hz | 250ms | Triumphant pop |
| Monastery complete | Bell chime | Sine 523+784 Hz | 300ms | Church bell |
| Score awarded | Rising ping | Sine 660→880 Hz | 100ms | Points reward |
| AI turn thinking | Subtle hum | Sawtooth 110 Hz, quiet | 1000ms | AI processing |
| AI place tile | Thud | Same as valid place, quiet | 80ms | AI tile sound |
| Game over (win) | Major chord | Sine 523+659+784+1047 Hz | 600ms | Victory chord |
| Game over (lose) | Minor chord | Sine 440+523+659 Hz (minor) | 600ms | Defeat tone |

### Music/Ambience

A gentle medieval lute-style ambience using pure synthesis: a triangle wave arpeggio playing notes in G major (G3, B3, D4, G4 = 196, 246, 293, 392 Hz), each held for 400ms with a slow attack and decay, cycling continuously at gain 0.025. This creates a plucked instrument feel without samples. A soft sustained bass drone at G2 (98 Hz) on a sine oscillator at gain 0.015 provides harmonic grounding. Occasional distant church bell synthesis (sine 523 Hz, 400ms with very slow decay, gain 0.04) sounds randomly every 30-60 seconds. The overall feel is peaceful, contemplative kingdom building — a quiet room with a lute player in the corner.

## Implementation Priority
- High: City battlements drawing (crenellated edge rendering), road cobblestone center-line texture, meeple proper silhouette shape, tile placement settle animation
- Medium: Field cultivated strip pattern, monastery cross/building interior detail, feature complete gold sparkle burst, score float animation
- Low: Wood table grain background, compass rose decoration, tile stack visual, end game gold light spread
