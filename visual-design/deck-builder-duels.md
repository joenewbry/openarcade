# Deck Builder Duels — Visual & Sound Design

## Current Aesthetic
A Dominion-style deck builder with a dark navy background (`#1a1a2e`). Cards use rounded rectangle polygon shapes with color-coded type bars at the top: gold for treasure, green for victory, blue for action, red for attack, teal for defense. The hand area has a glowing purple divider. The market view organizes cards by category. Cards show cost, name, effect text, and supply count. The AI info line is small grey text. Overall: functional, readable, but visually sparse — the card art is pure geometry with no illustrations, and there's no visual drama or personality.

## Aesthetic Assessment
**Score: 2/5**

The layout is well-organized and the color coding works, but it looks like a wireframe prototype. Cards need illustration character. The background is featureless. Nothing feels "alive" — no animation between turns, no satisfying visual feedback on card plays.

## Visual Redesign Plan

### Background & Environment
A dark tavern/dungeon arcane table. The background becomes a deep walnut-brown wood texture simulated with diagonal fill-rect hatch lines in `#1a1008` over `#120d06`. Scattered rune markings glow faintly at the corners. The play area (center section) has a felt-green rectangle for the "table surface." A flickering candlelight effect: the overall brightness slightly oscillates (0.95–1.0 multiplier on overlay alpha) at 0.3 Hz using a sine wave.

The hand area sits on a velvet-black strip at the bottom with gold filigree border. The market is accessed through an archway illusion (two vertical polygon columns with an arc header at the top).

### Color Palette
- Primary accent: `#c084fc`
- Treasure gold: `#ffd700`
- Victory green: `#40c878`
- Action blue: `#5599ff`
- Attack red: `#ff5555`
- Defense teal: `#44ccaa`
- Background deep: `#120d06`
- Wood texture: `#1a1008`
- Table felt: `#0d2210`
- Card background: `#1e1830`
- Card highlight: `#2a2448`
- Glow/bloom: `#d4a0ff`

### Entity Redesigns
**Cards**: Each card now has a distinct illustration zone (the middle third) filled with a small symbolic icon made from basic shapes:
- Copper: three overlapping circles in `#b87333` (coin stack)
- Silver: a bar/ingot shape in silver-grey
- Gold: stacked golden bars with a star highlight
- Estate: a house polygon silhouette
- Duchy: a castle battlement outline
- Province: a crown polygon
- Smithy: crossed hammer and anvil shapes
- Village: a cluster of three house outlines
- Militia: a sword polygon pointing down
- Witch: a pointed hat with stars
- Moat: a U-shaped water arc
- Curse: a skull shape from circles and triangles

Cards hover-lift 8px when hovered with an amplified glow halo. Played cards "fly" to the play area with a brief scale-up then scale-down animation tracked frame by frame.

**Hand**: Cards fan out with slight rotation (±15° for edge cards) when the hand count is high. Each card's baseline sits on the felt strip, tips poking up.

**Supply market**: Each card slot shows a faint card-back silhouette for the stack depth. Empty slots are visibly depleted — dusty, darkened, X'd out with a diagonal line.

### Particle & Effect System
- **Card play (action/attack)**: A radial burst of 8 motes in the card's type color expands from the play zone where the card lands, fading over 20 frames.
- **Buy card**: Golden coin particle arc from the coin counter to the supply slot — 5–8 coin circles arc and land with a "clink."
- **Witch (curse attack)**: Purple skulls (two-circle + triangle shapes) fly from attacker's side to opponent's deck zone.
- **Militia attack**: Small sword shapes fan out toward opponent's side.
- **Match end win**: Full-screen confetti in the player's color scheme — 30 small rectangles scatter with gravity.
- **Chain combo (buy multiple same turn)**: Silver sparkle burst.
- **Province buy**: Screen-edge golden flash — the ultimate acquisition.

### UI Polish
- Turn counter rendered with a parchment-style panel — aged yellow background with dark ink text.
- Action/coin/buy counters are prominently styled as glowing tokens with their value centered inside circles.
- Log panel gets a scroll-parchment look — slightly off-white background with ragged edges (simulated with short line segments).
- AI turn: an animated "thinking" indicator — three dots that pulse in sequence.
- Card tooltip on hover: a larger ghost version of the card appears to the side of the hand for readability.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Play action card | Magic whoosh: sine sweep 400→800 Hz | 150ms | Arcane energy |
| Play treasure card | Coin clink: sine 1046 Hz + 1318 Hz, short decay | 120ms | Gold ring |
| Buy card | Register ka-ching: ascending two-tone sine 880 + 1100 Hz | 200ms | Satisfying purchase |
| Buy Province | Fanfare: 4-note ascending sine C5 E5 G5 C6, reverb | 400ms | Momentous |
| Militia attack | Sword slash: noise burst 2–8 kHz, downward sweep | 180ms | Aggressive |
| Witch curse | Eerie descending: sine 600→200 Hz with tremolo | 350ms | Dark magic |
| Moat block | Shield block: square 300 Hz, hard attack | 100ms | Deflect |
| Draw cards | Paper shuffle: short noise burst 600 Hz lowpass | 80ms | Papery |
| End turn | Soft bell: sine 660 Hz, long decay | 400ms | Turn transition |
| Game win | Full chord: sine C4 E4 G4 C5 all together, fade | 1200ms | Triumphant |
| Game loss | Descending minor: sine A4 F4 D4, slow | 1000ms | Somber |
| Card hover | Soft tick: sine 1200 Hz, 15ms | 15ms | UI response |

### Music/Ambience
A medieval-tavern ambient loop: three oscillators in a G minor chord (G2, Bb2, D3) with slow attack and long sustain, approximating a lute-like sound using triangle waves. A subtle 0.5 Hz tremolo on all oscillators creates candlelight flicker feel. Background tavern murmur: bandpass noise at 600 Hz, very low gain. When it's the AI's turn, the music subtly drops a semitone and a minor-second dissonance is added to increase tension. Victory transitions to a major key version of the pad.

## Implementation Priority
- High: Card illustration icons (symbolic shapes), card hover lift + glow, coin particle arc on buy, card play burst
- Medium: Wood/felt background texture, hand fan layout, Province buy fanfare, log parchment styling
- Low: Witch/militia attack animations, match-end confetti, supply stack depth silhouettes, tavern ambient music
