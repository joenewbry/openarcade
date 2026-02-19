# Naval Commander — Visual & Sound Design

## Current Aesthetic

Dark ocean base (#0a1628) with translucent wave lines for water texture. Island blobs as layered circles in dark green. Sea lanes as colored lines (blue for player connections, red for AI, dashed for neutral). Ports as dark circles with colored stroke rings, labeled with name and income. Fleets as small labeled boxes with ship symbols. End Turn button and gold/turn UI in the top strip. The overall look is a clean strategy game — functional but feels like a dev mockup rather than a finished game.

## Aesthetic Assessment
**Score: 2/5**

The ocean waves are a good start but too subtle to read. Island shapes are blobby and characterless. Ports look like placeholder circles. Fleets lack any nautical identity. The color scheme (muted blue/red) is fine for strategy but the aesthetic has no drama or personality. A naval war game should feel epic.

## Visual Redesign Plan

### Background & Environment

Transform the ocean into a dramatic nautical chart meets vintage war room aesthetic.

**Ocean base:** Replace the flat wave lines with a proper ocean feel. Base color `#071420`. Draw 40-50 slowly animated "wave ripples" — each is a short arc (not full circle) 20-60px wide in `#0e2a44` at very low opacity (0.15-0.25), scattered across the map. These drift slowly across the canvas (0.05px/frame with wrap). Also add "depth variation" — darker patches (`#040d17`) in clusters of 3-5 overlapping ellipses to suggest deep water areas.

**Coastlines:** Each island gets a proper coastal look. Multiple layers:
1. Island body in dark jungle green (`#1a3a1a`)
2. Beach ring: a thin lighter ring 2-4px wide around each island in sandy `#6a5a30` (approximated as a slightly larger circle drawn first)
3. Interior detail: a small lighter patch in the center of each island (`#233a23`)
4. Glow: `#2a5a2a` at 0.2

**Cartographic grid:** Faint latitude/longitude grid lines across the entire map — horizontal and vertical lines every 50px in `#ffffff05`. Makes it feel like a war map.

**Compass rose:** Draw a small compass rose in one corner (16-point star polygon shape) in gold (`#aa8833`) at low opacity (0.3). Non-interactive, purely decorative.

### Color Palette
- Ocean deep: `#071420`
- Ocean mid: `#0e2235`
- Island: `#1a3a1a`
- Beach: `#6a5a30`
- Player color: `#4499ff` (bright blue)
- AI color: `#ff4444` (threat red)
- Neutral: `#aaaaaa`
- Sea lane player: `#4499ff88`
- Sea lane AI: `#ff444455`
- Sea lane neutral: `#666677`
- Gold UI: `#ccaa44`
- Glow/bloom: `#4499ff`, `#ff4444`

### Entity Redesigns

**Ports:** Complete redesign. Instead of plain circles, draw miniature port illustrations:
- An anchor symbol (circle with vertical line and horizontal bar + two arcing flukes, drawn with drawLine calls) centered on the port location
- A colored outer ring indicating ownership (player blue / AI red / neutral gray), glow 0.5 when selected
- Port name in a small banner below, styled like a nautical chart label (small, serifless)
- Income shown as a gold coin symbol (+Ng)
- Neutral ports with garrison show a shield icon

**Sea lanes:** Styled as proper chart routes. Player-controlled routes: thick blue line with a subtle animated white "ship wake" effect — small perpendicular dashes that animate along the line direction. AI routes: same but in red. Neutral dashed routes get a dotted pattern with occasional navigation marker triangles along the line.

**Fleets:** Replace plain boxes with proper fleet markers:
- A ship silhouette (simple warship profile: hull rectangle, two turret circles, superstructure rect, bow wedge using fillPoly)
- Color coded by owner
- Ship count shown as small flags (tiny rects in the owner's color) on a mast
- Moving fleets have a "wake" trail — a V-shape of white foam behind them
- Fleet power shown as a small cannon icon + number rather than "PWR:N"

**Frigate/Destroyer/Battleship symbols:** Each ship type gets a distinct profile:
- Frigate (F): Small, nimble-looking — narrow hull, one turret
- Destroyer (D): Medium, sleeker — elongated hull, two turrets
- Battleship (B): Large, imposing — wide hull, three turrets, large superstructure

**Combat animations:** When combat resolves, add a brief explosion animation at the battle port — 3 orange flash circles that expand and fade over 30 frames. Ship sinking: the fleet marker tips to 45° then descends off-screen over 20 frames.

**Build panel:** Styled as a naval command console — dark background with amber/gold text, each ship type shown with its miniature silhouette. Cost displayed as a gold coin icon + number.

### Particle & Effect System

**Port captured:** When a port changes ownership, a brief flag-raising animation — the port's ring color fades from old to new over 20 frames, and 8 colored particles radiate outward in the capturing player's color.

**Fleet movement:** Moving fleets leave a brief wake trail — 5 previous positions drawn at decreasing opacity.

**Combat result:** Win: bright flash at port + player-colored particles. Loss: brief red flash + darker explosion particles. Draw: mixed color burst.

**Wave animation:** The ambient wave ripples drift continuously, giving the ocean a living quality.

**Income collection:** At turn end, a brief "+Ng" text floats upward from each owned port, fading over 20 frames.

### UI Polish

- End Turn button redesigned as a large anchor icon with "END TURN" text, styled as a naval command stamp.
- Turn counter displayed as "TURN N / 20" in gold with a ship's wheel icon.
- Gold count shown with a coin pile icon.
- Combat log styled as a scrolling naval dispatch — text on a slightly darker background panel with an old-map texture suggestion.
- Intel panel ("AI: N ports") styled as a reconnaissance report.
- Phase indicator: "COMMAND PHASE" or "BATTLE PHASE" banner appears briefly when phase changes.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Fleet selected | Low piano note | 220Hz sine, gentle attack | 150ms | Soft selection click. |
| Fleet moved (confirm) | Foghorn-like tone | 110Hz with harmonics (2nd + 3rd) | 400ms | Low nautical "honk". |
| Combat won | Triumphant short jingle | G-B-D-G ascending | 500ms | Fanfare for victory. |
| Combat lost | Sad descending tones | G-E-C-G descending | 500ms | Loss sound. |
| Port captured | Church bell tone | 440Hz sine, long decay 2s | 2000ms | Ceremonial. |
| Ship built | Metallic ring | 660Hz + 990Hz sine, 200ms | 200ms | Forge/construction sound. |
| Income collected | Coin tones | Multiple quick 880Hz pings | 200ms | Gold coins sound. |
| Turn end | Deep gong | 80Hz sine + 160Hz, slow decay | 1500ms | "Battle phase begins." |
| Ocean ambient | Layered sine waves | 40-80Hz range, slow modulation | Loop | Gentle ocean sound. Volume 0.02. |
| Not enough gold | Buzzer | 220Hz sawtooth, quick | 100ms | Error/can't afford. |

### Music/Ambience

A solemn naval war room ambient: three slow-moving sine waves at 55Hz, 82Hz, and 110Hz (a bass power chord), slightly detuned to drift slowly in and out of phase. Volume 0.02-0.03. This gives an ominous, powerful foundation. When AI is taking its turn, a slightly higher tremolo (220Hz, volume 0.015) is added suggesting urgency. During combat resolution, a brief drum-roll effect (rapid low-frequency noise bursts, 8Hz rate, 0.5s) precedes the victory/defeat jingle.

## Implementation Priority
- High: Port anchor icon redesign, fleet ship silhouette with wake trail, combat flash animation at ports, ocean drift wave animation
- Medium: Sea lane animated wake for player routes, ship type distinct profiles (F/D/B), port captured color-transition animation, compass rose decoration
- Low: Income float-up text animation, naval command console build panel styling, cartographic grid overlay, combat log dispatch styling
