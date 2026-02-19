# Poker Arena — Visual & Sound Design

## Current Aesthetic

A 600x500 canvas with a classic green felt table (`#1b6e1b`), gold accents (`#c9a84c`), and a dark background (`#0d1520`). Cards are white rounded rectangles with rank and suit text in red or black. AI players are arranged as ellipse positions around the table. The community cards fan out in the center. A raise slider, action buttons (fold/check/call/raise), and a pot display make up the HUD. AI personalities (Ace/Blaze/Chill/Dice/Echo) have distinct betting styles.

## Aesthetic Assessment
**Score: 3.5/5**

One of the better-executed games. The table layout, card rendering, and personality system give it genuine character. The green felt + gold aesthetic is classic and appropriate. However, the table itself is flat (no depth or material quality), the player positions are abstract ellipse points rather than figures, cards lack tactile feel, and there's no visual drama around big moments — winning hands, bluffs revealed, all-ins. The game looks like a prototype of something that could be stunning.

## Visual Redesign Plan

### Background & Environment

Transform the environment into a high-stakes casino atmosphere. The background around the table becomes very dark — deep charcoal-black (`#080c14`) with a faint smoke/atmosphere depth. Subtle spotlight light from above centers on the table, creating a soft radial brightness on the felt surface.

The table becomes a proper casino poker table — an oval with a thick padded rail border. The rail is rendered as a deep burgundy/green velvet edge — a wide ring around the table with a rounded top edge highlighted slightly lighter. The felt surface gets a rich texture: very subtle repeating diamond or herringbone pattern at 4% opacity, giving depth without distraction. The table edge has a dark wood trim ring between the rail and the background. Gold number markings appear on the rail edge (subtle).

A dealer button chip (`D`) sits at a visible position on the table. The pot amount displays in the center of the table as a stack of chip icons rather than plain text.

### Color Palette
- Table felt: `#145214`, `#1a6a1a`
- Table felt highlight: `#1e7a1e`
- Table rail: `#6a2020`, `#5a1818`
- Rail highlight: `#8a3030`
- Wood trim: `#3a2010`, `#4a2818`
- Background: `#080c14`, `#0d1020`
- Spotlight glow: `#ffffff` at 5% opacity center
- Card face: `#f8f4ec`
- Card back: `#1a3a8a`
- Card back pattern: `#142e70`
- Card red suits: `#cc2222`
- Card black suits: `#1a1a1a`
- Gold accent: `#c9a84c`, `#ffd700`
- Chip colors: `#ff4444` (red), `#4488ff` (blue), `#44cc44` (green), `#111` (black), `#ffffff` (white)
- Player avatar: Unique per personality (see below)
- Button highlight: `#ffcc44`
- Pot display: `#ffdd66`

### Entity Redesigns

**Cards:** Significantly enhanced from plain rectangles. Each card has:
- A slightly cream white face (`#f8f4ec`) with a subtle paper grain suggestion
- Rounded corners (already present — enhance with a very slight drop shadow under each card)
- Rank in upper-left and lower-right corners (large, bold)
- Suit symbol in the center of the card — larger and more decorative
- Hearts and diamonds in deep red (`#cc2222`), spades and clubs in near-black (`#1a1a1a`)
- A thin gold border line inside the card edge (1px inset frame)
- Card backs in deep blue with a classic repeating diamond pattern

Card animations: When dealt, cards slide from the dealer position to their destination with a slight rotation arc. When revealed at showdown, cards flip with a brief horizontal scale-squish animation. Winning hand cards glow gold briefly.

**Player positions:** Instead of just coordinate dots, each player position becomes a small avatar zone — a semicircle or arc shape at the table edge in a warm wood tone. The avatar displays:
- A unique color/icon per AI personality
  - Ace: Blue professional suit icon, `#4488ff`
  - Blaze: Red aggressive icon with fire styling, `#ff4444`
  - Chill: Teal laid-back icon, `#44ccaa`
  - Dice: Purple gambler icon, `#9944dd`
  - Echo: Gold cautious icon, `#ffaa22`
- Player name in styled text above
- Stack size displayed as a chip stack icon with a number

**Chips:** Replace the plain pot number text with a visual chip stack display. Chips are drawn as small circles (8px radius) with a colored band around the edge and a white center highlight. Stacks of different chip denominations create the pot total visually. When a bet is placed, chips animate sliding from the player position toward the center pot.

**Action buttons:** The fold/check/call/raise buttons get a premium button treatment — dark pill shapes with a gold border, text in gold or team color. Hover state brightens the border. The raise slider becomes more prominent — a custom-styled track with chip icons at each end.

### Particle & Effect System

- **Card deal:** Each card slides from dealer with a very brief paper-whoosh particle (2 small white particles trail the card during flight)
- **Chip bet:** Chips slide from player position to center pot — animated as moving chip circle icons
- **Win pot:** Winning chips and cards briefly glow gold, then the pot chip stack animates flying toward the winner position — chip icons scatter and converge
- **Big hand reveal (Royal Flush, etc.):** All 5 winning cards flash sequentially with a gold starburst, then a dramatic text banner appears
- **Fold:** Cards flip face-down and slide off the table edge with a brief shadow fade
- **All-in:** Red "ALL IN" text pulses at the player position + a tense red border ring appears around the table briefly
- **Bluff caught:** On showdown, if an aggressive player loses, a "BLUFFED!" label flashes at their position for 2 seconds
- **New round:** The felt surface gets a quick subtle ripple sweep (brightness wave) as cards are cleared

### UI Polish

The bottom HUD becomes a premium player information tray: a dark curved panel with a wood-grain border, showing hole cards in a slightly raised display, stack size as gold numerals, and action options. The call/raise amounts display in prominent gold. A hand strength indicator subtly shows during play (only for the human player) — a small meter going from "Weak" to "Strong" based on current hand. The community card area has visible labeled sections: "FLOP / TURN / RIVER" in subtle gold text below each card zone. The pot chip stack at center is the visual centerpiece.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Card deal | Soft shuffle swish | Noise burst, bandpass 1.5kHz, fast decay | 60ms | Per card dealt — light and crisp |
| Card flip (reveal) | Thicker snap | Noise + 300Hz click | 80ms | Heavier for reveal moment |
| Chip bet | Chip rattle | Multiple noise clicks, 800Hz, staggered | 150ms | Stack of chips sliding |
| Chip win (pot collect) | Chip cascade | Rapid sequence of chip clicks, rising in speed | 600ms | Coins piling up feel |
| Fold | Soft card slide | Low noise, very quiet | 100ms | Understated, no fanfare |
| Check | Button click | Square 500Hz, very fast | 40ms | Neutral decision |
| Call | Moderate thud | Noise + 200Hz | 80ms | Committing weight |
| Raise | Bold thunk | Noise + 150Hz + brief echo | 150ms | More assertive than call |
| All-in | Dramatic drop | Silence + noise burst + 60Hz sine | 400ms | Tense, dramatic moment |
| Win hand (small) | Soft chime | Sine 880Hz + 1320Hz | 300ms | Light reward tone |
| Win hand (big/royal flush) | Full fanfare | C-E-G-C ascending + flourish | 1.5s | Rare and celebratory |
| Bust out / broke | Deflated tone | Descending sine 400→150Hz, slow | 500ms | Graceful defeat |
| Ambient table | Quiet casino | Very faint crowd murmur, bandpass 200–800Hz | Looping | Subtle background presence |

### Music/Ambience

A sophisticated jazz lounge atmosphere: a walking bass line (sine wave low notes in alternating patterns, 100 BPM), light hi-hat rhythm (very high noise bursts at 8th notes, very quiet), and an occasional piano-style lead melody (triangle wave, mid-register, minimal, 4-bar phrases). The music is very low volume (10-15%) and feels like background ambience at an upscale casino. During big moments (all-in, showdown, big wins), the music momentarily fades to near-silence for 1-2 seconds, then fades back in — creating dramatic quiet-before-the-storm tension.

## Implementation Priority
- High: Card visual enhancement (cream face, suit icon center, gold inner border, drop shadow), chip visual elements, win pot animation (chips flying to winner), card deal slide animation
- Medium: Table rail 3D bevel and felt texture, player avatar zones with personality colors, chip bet slide animation, all-in dramatic sound
- Low: Spotlight radial glow on table, bluff-caught label, hand strength indicator, casino ambient music loop, card flip animation on reveal
