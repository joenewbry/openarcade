# Hex Empire — Visual & Sound Design

## Current Aesthetic

Turn-based hex-grid strategy with a `#1a1a2e` background, neutral territories in `#333333`, player hexes in `#4488ff` (blue), and AI hexes in `#ff9900` (orange). A 9×9 grid of flat-top hexagons with star icons for capitals and army count text in each hex. Pulsing attack/reinforce overlays in red and green. The aesthetic is extremely minimal — the hex borders and fills are flat, there are no terrain types, no elevation, no ambient effects, and the UI is sparse.

## Aesthetic Assessment

**Score: 2/5**

Functional and readable but visually very bare. The flat color hexes have no depth, the background is a plain dark rectangle, and there is no sense of a living world. The pulsing overlays are a good start but the overall impression is of a prototype. This game has significant visual upside — hex grids can look stunning with the right treatment.

## Visual Redesign Plan

### Background & Environment

Replace the plain `#1a1a2e` background with a subtle hex-tile watermark pattern — draw a faint offset hex grid at 200% scale beneath the game grid in `rgba(40,50,80,0.08)` to suggest infinite strategic space. Add a very faint radial gradient: center `#1a1a2e` → edge `#0a0a18`.

Hex tiles should have visual depth:
- **Fill:** Slightly gradient from top `#color+10%` to bottom `#color-10%`
- **Inner bevel:** Thin lighter inner edge on top-left of each hex (simulating light from upper-left)
- **Outer border:** Darker shade of fill color, 1.5px
- **Contested glow:** When a hex changes hands, brief ownership flash with team color bloom

Neutral hexes: `#2a2a3a` (slightly blue-grey, not pure grey), with `#3a3a4a` border. Gives them a "fog of war" feel.

### Color Palette

- Background: `#0e0e1e`
- Background hex watermark: `rgba(40,50,90,0.07)`
- Neutral hex fill: `#2a2a3a`
- Neutral hex border: `#3a3a50`
- Player fill: `#1a44aa`
- Player fill bright: `#4488ff`
- Player glow: `#66aaff`
- AI fill: `#993300`
- AI fill bright: `#ff9900`
- AI glow: `#ffbb44`
- Capital star: `#ffe066`
- Attack overlay: `rgba(255,50,50,0.35)`
- Reinforce overlay: `rgba(50,255,100,0.25)`
- Army text: `#ffffff`
- UI panel: `rgba(10,12,24,0.92)`
- UI accent: `#4488ff`

### Entity Redesigns

**Hex Tiles:**
- Player hexes: Deep blue base `#1a44aa`, bright blue top accent `#4488ff`, inner highlight line along top-left edges, soft blue outer glow `rgba(68,136,255,0.25)` when selected
- AI hexes: Deep orange-red base `#993300`, bright orange `#ff9900`, warm outer glow `rgba(255,153,0,0.25)` when attacking
- Neutral hexes: Dark slate `#2a2a3a` with subtle `#3a3a50` border — recessive, not competing with owned tiles
- Capitalize the capital hex: larger star icon `#ffe066` with 8px glow, pulsing at 0.8Hz

**Star Icon (capital):** Draw as a 5-point star shape (not unicode) in gold `#ffe066` with a bright center dot and a soft outer glow. Animate a slow spin (0.5 rpm) to make capitals feel important.

**Army Count:** White `#ffffff` text, bold, center-aligned. Shadow `rgba(0,0,0,0.5)` behind it. Large armies (10+) shown in yellow `#ffe066` to indicate strength.

**Attack/Reinforce Overlays:** Instead of simple fill overlay, draw animated pulsing rings:
- Attack: Red ring `#ff3344` expands from center of target hex, 2 rings, life 0.5s, repeat every 0.6s
- Reinforce: Green ring `#33ff66` similar treatment
- This is more readable and more dramatic than a flat fill overlay

**Territory border:** Where player territory meets AI territory, draw a bright edge line in a mixed gradient `#4488ff` on player side → `#ff9900` on AI side, 2px, with glow — the front line.

### Particle & Effect System

- **Hex capture flash:** When territory changes hands, fill flashes white `rgba(255,255,255,0.6)` for 2 frames then transitions to new owner color over 0.4s
- **Capital capture burst:** 12 star-shaped particles in gold `#ffe066` explode outward from capital
- **Army march:** When attack is selected, show small arrow particles streaming from source to target hex, team color, life 0.3s
- **Attack ring pulse:** Expanding ring animation on target hex during attack declaration
- **Victory screen:** Screen-wide particle explosion in player color, 40 particles
- **Defeat screen:** Dark vignette grows from edges inward over 1s

### UI Polish

- Panel left/right: Dark glass `rgba(10,12,24,0.92)` with `#4488ff` (player) or `#ff9900` (AI) accent top border
- Turn indicator: Top-center, bold text "YOUR TURN" in blue `#4488ff` with glow, or "AI THINKING..." in orange `#ff9900` with pulsing dots animation
- Army count in panel: Large numerals in team color with subtle glow
- Hex tooltip: On hover, small popup above hex showing territory, army count, distance to capital — dark panel `rgba(10,12,24,0.9)`, white text, 8px border-radius
- Win/loss overlay: Full screen takeover, dramatic typography, large team-color headline

## Sound Design Plan

*(Web Audio API only)*

### Sound Events & Synthesis

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Hex select | Short blip | 440Hz triangle, gain 0.3 | 0.06s | UI click |
| Hex hover | Softer blip | 330Hz triangle, gain 0.15 | 0.04s | Subtle feedback |
| Attack declare | Low war drum | White noise, lowpass 200Hz, gain 0.7 | 0.3s | Boom |
| Attack success | Rising tone | 300Hz → 500Hz triangle, gain 0.4 | 0.25s | Conquest |
| Attack fail | Descending tone | 400Hz → 200Hz, gain 0.3 | 0.2s | Repelled |
| Capital capture | Fanfare | C4-E4-G4-C5 arpeggio, sine, gain 0.5 | 0.6s | Major event |
| Reinforce | Soft positive blip | 500Hz → 600Hz sine, gain 0.3 | 0.15s | Army boost |
| AI turn start | Low rumble | 80Hz triangle, gain 0.25 | 0.5s | AI moving |
| Territory lost | Dissonant chord | 220Hz + 233Hz sine (minor 2nd), gain 0.4 | 0.4s | Bad news |
| Victory | Triumphant arpeggio | C4-E4-G4-B4-C5, sine, gain 0.6 | 1.0s | Win fanfare |
| Defeat | Descending chord | G3-E3-C3-A2, sine, gain 0.4 | 1.2s | Loss sting |
| Turn end | Neutral click | 350Hz triangle, gain 0.2 | 0.08s | End of turn |

### Music/Ambience

Strategic, measured ambient score:
- War drum pattern: periodic white noise bursts (lowpass 300Hz, gain 0.08) at 90BPM, every 4th beat slightly louder — subtle rhythmic tension
- Low string pad: triangle wave cluster 110Hz/130Hz/165Hz (minor chord), gain 0.1, slow 3s attack, constant sustain — dark strategic mood
- Occasional brass-like accent: sawtooth at 220Hz, gain 0.12, 0.5s note every 8 bars — punctuates the silence
- AI turn: raise drum pattern gain by 50% while AI is processing
- Late game (few territories remaining): raise overall mix gain 20%, add slight distortion to pad — tension escalation

## Implementation Priority

- High: Hex depth gradients (inner bevel + gradient fill), territory border front-line glow, hex capture flash, rotating capital star, all combat sounds
- Medium: Background watermark hex pattern, pulsing ring attack/reinforce animation, army march particles, turn indicator animation, ambient drum loop
- Low: Hex tooltip popup, victory/defeat particle explosion, late-game tension music adjustment, army count color scaling
