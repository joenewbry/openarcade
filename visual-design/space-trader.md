# Space Trader — Visual & Sound Design

## Current Aesthetic

600x500 turn-based galactic trading game. The map view shows 12 star systems connected by trade lanes on a dark near-black `#0a0a1e` background with 200 twinkling star particles and faint nebula circles (large dim `#aa88ff` and `#ff88aa` blobs). Star systems are colored circles per faction (Federation `#4488ff`, Syndicate `#ff8844`, Frontier `#88ff44`), with production-good color dots beside them. Reachable systems are highlighted; lanes are faint purple lines with dashed highlighting for reachable paths. The player ship is `#aa88ff`. Trade and ship screens use the same starfield background with text panels and button rectangles. The combat screen shows a raw text stat comparison with three action buttons. The overall look is sparse but functional — clearly a strategy game with minimal visual identity.

## Aesthetic Assessment
**Score: 2.5/5**

The star map layout is effective and the faction color coding is clear. The weakness is everywhere else: the trade screen is a plain text table, the ship screen has ASCII art that looks like a placeholder, and the combat screen has zero spectacle despite being a critical high-stakes moment. The nebula effects are too subtle to read as anything. The galaxy needs to feel alive — star systems should feel like places, not colored dots. With a richer map and dramatically better combat, this game could genuinely evoke the Elite feel it references.

## Visual Redesign Plan

### Background & Environment

**Star map background:** Layer the current twinkling star field into 3 depths — 100 tiny `0.5px` far stars at 30% opacity, 70 medium `1px` mid stars twinkling, 30 larger `1.5-2px` near stars with subtle blue/amber color tints. Use slow differential drift on the layers for depth impression.

**Nebula clouds:** Replace the barely-visible current nebulae with proper layered clouds — use 5-8 overlapping large circles at 4-6% alpha in distinct region colors: cool violet `#5522bb` in the upper region (Federation space), warm amber `#aa4400` in the Syndicate quadrant, and teal `#004433` in the Frontier zone. Make faction territory visually legible from the colors alone.

**Faction territory tinting:** Each system's surrounding space subtly glows in its faction color — a large very-dim circle (radius 80px, alpha 2-3%) behind each system in faction color, creating a soft territorial wash.

**Trade lane visualization:** Replace plain lines with more evocative routes — use a slow animated dashed pattern that appears to flow along the lane direction (shift dash offset over time), suggesting active hyperspace lanes. Lane width slightly varies — busier routes look thicker.

**System hover effect:** When hovering a system, a soft corona ring pulses outward. The tooltip panel gains a subtle glow border in faction color.

### Color Palette
- Player ship: `#cc99ff`
- Federation: `#4488ff`
- Syndicate: `#ff6622`
- Frontier: `#44ff88`
- Background deep: `#06060e`, `#0a0a1e`
- Nebula Federation: `#220844`
- Nebula Syndicate: `#2a1000`
- Nebula Frontier: `#002215`
- Lane active: `#aa88ff`
- Lane dim: `#554466`
- Goods — Food: `#88ff88`, Tech: `#88ccff`, Minerals: `#ffaa88`, Luxuries: `#ff88ff`, Weapons: `#ff8888`
- Glow/bloom: `#aa88ff`, faction colors

### Entity Redesigns

**Star systems:** Replace plain filled circles with proper star icons — each system has a layered draw: outer soft glow halo (faction color, large radius low opacity), a bright point-star center (4-8 thin white lines radiating from center at varying lengths), and a colored core circle. System size should vary slightly by economic importance (high-production systems slightly larger).

**Player ship indicator on map:** Instead of just a dot, draw a small stylized ship silhouette in `#cc99ff` at the player's current system — 4 vertices suggesting a swept-wing form, with a faint glow corona beneath it.

**Trade screen:** Replace the plain text table with a market board aesthetic. Each good row gets a colored left-border stripe in its good color, a subtle gradient row background (alternating very dark shades), and price trend arrows (up/down triangles) beside each price based on the production/consumption relationship.

**Ship screen (replace ASCII art):** Draw an actual vector ship polygon — a proper 8-vertex delta-wing form in `#cc99ff` with engine glow at the rear. Show upgrade stats as glowing bar segments that light up as the stat increases. The cargo manifest gets rendered as actual cargo bay visualization — colored rectangles representing cargo units stacked in a hold graphic.

**Combat screen:** Full dramatic rework. Instead of a text comparison table:
- Dark red `#1a0000` tinted background behind everything
- Both ships drawn as large vector polygons facing each other across a dividing void
- Weapon/shield stats shown as glowing bar meters beneath each ship
- Action buttons get dramatic styling — FIGHT button pulses red, FLEE button is yellow, BRIBE is cyan

### Particle & Effect System

- **Hyperspace jump:** When traveling, the player's system icon briefly shoots a streak toward the destination, then reappears there with a ring flash
- **Trade complete:** Small upward-floating credit number in gold `#ffcc44` that rises and fades — "+120 cr" appearing at the trade button
- **Market shortage event:** Affected system briefly flashes orange, then a "!" marker appears beside it
- **Combat hit (player loses):** Screen-edge red flash, ship polygon on player's side shakes/tilts briefly
- **Combat victory:** Gold particles shower from the enemy ship icon, brief white flash
- **Turn end:** All AI ship indicators animate along their current route — small trail dots from system to system
- **Allied reputation gained:** Small star particles burst from the system in that faction's color

### UI Polish

- Turn counter: large and prominent, with a color-coded urgency — turns 1-15 neutral, 16-25 amber, 26-30 red (clock running out)
- Credits display: glowing `#ffcc44` number with a brief pulse animation on each change
- Faction reputation bars: colored segments that glow in faction color; allied shows a star icon
- Leaderboard on map screen: small floating panel in bottom-right showing all trader positions with wealth, updating every turn
- "Best route" tip in trade view: highlighted in warm amber instead of muted grey

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Hyperspace jump | Rising whoosh | Sine 200→1200 Hz sweep + brief white noise burst | 400ms | Satisfying travel feel |
| Trade buy | Soft register blip | Sine 440 Hz + 880 Hz, fast attack | 80ms | Cash register click |
| Trade sell | Higher register blip | Sine 660 Hz + 1320 Hz, fast attack | 80ms | Slightly higher than buy |
| Profit gained (large) | Ascending chime | 440→554→659 Hz sine, staggered 40ms | 300ms | For good trade completions |
| Market surge event | Alert ping | 880 Hz sine, 3 rapid pulses at 0.1s interval | 400ms | System shortage event |
| Market crash | Descending blip | 660→440→220 Hz sine | 300ms | Price crash event |
| Turn end | Clock tick | 200 Hz square wave, very short | 30ms | Subtle rhythmic turn marker |
| Combat start | Alarm klaxon | Sawtooth 220 Hz + 330 Hz, pulsed at 4Hz | 600ms | Combat alert |
| Combat victory | Fanfare hit | 523, 659, 784 Hz sine, staggered | 500ms | Victory chord |
| Combat defeat | Lose tone | 440→330→220 Hz sawtooth, slow | 600ms | |
| Flee success | Whoosh escape | White noise + 400→1200 Hz sine | 300ms | |
| Bribe | Coin jingle | 4 rapid 880 Hz sine pings | 200ms | Light and quick |
| Reputation gained | Positive blip | 660 Hz sine, soft bell envelope | 200ms | |
| Reputation lost | Negative buzz | 220 Hz square, 80ms | 80ms | |
| Game end (rank 1) | Victory fanfare | 523, 659, 784, 1047 Hz sine, ascending | 800ms | |

### Music/Ambience

A slow cosmic ambient piece suggesting interstellar travel and commerce. Base layer: a very quiet drone at 55 Hz (low A) sawtooth filtered through a low-pass at 150 Hz, barely audible at 3% volume — the hum of a ship in deep space. A mid layer: sparse plucked tones (sine wave at 200-800 Hz with fast attack, slow decay — simulating a synthesized koto) playing a slow pentatonic melody, one note every 4-8 seconds. The melodic pattern shifts subtly in key as turns progress — starting neutral, moving to minor as the game approaches the final turns. In Federation space (faction 0 systems), add a barely-audible high shimmer: 3200 Hz sine at near-zero volume, suggesting advanced civilization. No rhythm — the piece should feel like deep space silence with occasional ghostly notes.

## Implementation Priority
- High: Star system glow/corona rendering, combat screen ship polygons and red background, trade price trend arrows, hyperspace jump sound
- Medium: Faction nebula zone coloring, ship screen vector polygon (replacing ASCII art), trade profit float-up animation, turn urgency color coding
- Low: Animated flowing trade lane dashes, AI ship movement animation on map, 3-layer star parallax, cargo bay visualization graphic
