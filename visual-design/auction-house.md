# Auction House — Visual & Sound Design

## Current Aesthetic
The game uses a dark navy `#1a1a2e` background, gold `#fa0` accents for bids and score, panel blue `#16213e`, and per-category line-art icons for items (art frame, vase, diamond, book, bottle, sculpture, watch, map, coin, music note). Player panels have colored borders by faction. Canvas is 600×500.

## Aesthetic Assessment
The dark auction-house atmosphere has a promising foundation — the gold-on-dark palette suggests wealth and tension. The line-art item icons show creative effort. But the overall layout feels like a spreadsheet: panels of text and numbers without the visual drama of a high-stakes auction room. The item being auctioned is not visually prominent enough. There's no sense of theater — no auctioneer, no crowd, no spotlight on the item. The gold accents are the best element but they're not dramatized. This game could feel like a tense Sotheby's room.
**Score: 2/5**

## Visual Redesign Plan

### Background & Environment
Set the scene inside a grand auction hall. Background: very dark `#0a0a14` with a subtle wood-grain wallpaper texture — thin horizontal lines at irregular spacing in `rgba(60,40,20,0.15)` suggesting paneling. A spotlight effect: a radial gradient centered on the item display area, from `rgba(255,220,100,0.12)` at center to transparent at edges — the auctioneer's spotlight. The top of the canvas gets a subtle "chandelier" suggestion: a horizontal row of small bright dots in `#ffee88` at `y=20px`, equally spaced, low opacity.

Bottom status bar: rich dark wood tone `#1a1008` with a gold separator line at top. Player panels have dark `#14141e` backgrounds with their faction-color border glowing subtly.

### Color Palette
- Background: `#0a0a14`
- Wood paneling texture: `rgba(60,40,20,0.15)` lines
- Spotlight glow: `rgba(255,220,100,0.12)`
- Panel background: `#14141e`
- Panel border (accent): faction color per player
- Item display backdrop: `#16101e` with gold border `#cc9922`
- Primary gold (price, highest bid): `#ffcc22`
- Secondary gold (labels): `#cc9900`
- Positive (winning): `#44ff88`
- Negative (outbid): `#ff4444`
- Timer bar: `#ffaa00` → `#ff4400` as time runs out
- Item icon: `#e8d080` warm parchment tone
- Sold banner: `#ff2244` with `#ffffff` text
- Player 1: `#4488ff` border
- Player 2: `#ff4422` border
- Player 3: `#44dd44` border
- Player 4: `#cc44ff` border

### Entity Redesigns
**Item display area**: The focal point of the screen. A centered display box with a rich dark background `#16101e`, ornate gold border (4px, with corner flourishes drawn as small L-shaped lines in `#cc9922`), and the item icon rendered large (60–80px tall) in `#e8d080`. Below the icon: the item name in large white text and the current bid in large bright gold. A subtle drop shadow under the display box suggests depth.

**Item icons** (redesign all to be more detailed):
- Art frame: a rectangle border with a small landscape inside (horizon line + sun circle)
- Vase: a proper silhouette — wider middle, narrower neck, flared lip
- Diamond: classic 8-facet gem shape with interior lines
- Book: open book with spine detail and page lines
- Bottle: wine bottle silhouette with label rectangle
- Sculpture: abstract bust profile
- Watch: circle with hour/minute hands
- Map: rolled scroll with visible edge
- Coin: circle with inner circle and rays
- Music note: proper eighth note with stem and flag

**Bid history**: A scrolling list on the right side — each entry shows player color dot + player name + bid amount, newest at top. Entries slide in from the right when new bids arrive.

**Hammer icon**: The auctioneer's gavel — a small brown rectangle with a round head. Animates downward when "SOLD" triggers (drops 10px over 4 frames, bounces back over 6 frames).

**Timer arc**: Around the item display, a circular arc fills clockwise as time runs out. Changes color from `#ffaa00` (lots of time) to `#ff4400` (running out) to `#ff0000` (last 20%).

### Particle & Effect System
**Winning bid**: When a new highest bid is placed, golden particles (8, star shapes) burst from the bid amount display, fading over 20 frames. The player's panel briefly glows brighter.

**Sold!**: A dramatic sequence — the item display flashes white, "SOLD!" text slams in at 2× scale and animates down to 1× over 8 frames in bold red `#ff2244`. 12 confetti particles (small colored squares in the winner's faction color) fall from the top of the item display. The gavel animates down.

**Outbid**: The outbid player's panel flashes red `rgba(255,50,50,0.3)` for 4 frames. A "-OUTBID-" label briefly appears above their panel in red, fading over 30 frames.

**Spotlight pulse**: The spotlight glow subtly brightens (opacity 0.12 → 0.20) when a new bid is placed, then settles back over 20 frames — the room's attention focuses on the action.

**New item reveal**: When a new item comes up for auction, it scales from 0 to 1.2 to 1.0 over 15 frames with a bright highlight ring expanding outward.

### UI Polish
Top header: auction house name in serif-style white text with a gold underline separator. Item category label in smaller gold text below. Current bid LARGE and prominent — this is the most important number in the game. Timer as both the arc and a numeric countdown in the upper-right of the item display. Player panels at the bottom showing score, current funds, and a "BID" button (or keyboard shortcut reminder). Position rankings as small ordinal numbers (1st, 2nd, etc.) next to each player's score. Round counter "Item 3 of 10" in small text at the top-right.

---

## Sound Design Plan
*(All sounds implemented via Web Audio API — zero external files)*

### Sound Events & Synthesis

| Event | Synthesis type | Frequency/params | Duration | Notes |
|-------|---------------|-----------------|----------|-------|
| New bid placed | Oscillator (sine) | 440Hz brief | 80ms | Clean auction house chime |
| Outbid (player) | Oscillator (sine) descend | 330→220Hz | 120ms | Disappointed downward tone |
| Highest bidder (player) | Oscillator (sine) ascend | 440→550Hz | 100ms | Upward confirmation |
| Timer warning (low) | Oscillator (square) | 880Hz pulse, 2/sec | 800ms | Urgent ticking |
| Gavel down (sold) | Noise + lowpass 150Hz | Sharp thud | 200ms | Wooden gavel bang |
| Item sold (win) | Sine fanfare | 440→550→660→880Hz, 60ms ea | 300ms | Winning chime |
| Item sold (lose) | Sine descent | 330→220→165Hz, 100ms ea | 350ms | Lost item sound |
| New item reveal | Sine sweep up | 220→880Hz | 300ms | Rising reveal |
| Round start | Sine chord | 220+330+440Hz | 400ms | Anticipation chord |
| Score leader | Sine arpeggio | 523→659→784Hz | 250ms | Leading notification |
| Game over (win) | Sine fanfare full | 440→550→660→880→1047Hz | 500ms | Victory fanfare |
| Game over (lose) | Sine minor chord | 220+262+330Hz, decay | 600ms | Defeat |

### Music/Ambience
Grand auction hall ambience: low strings suggested by a triangle oscillator at 110Hz with slow vibrato (LFO 5Hz, depth ±3Hz) at gain 0.04, creating a tense, hushed expectation. Layer a subtle crowd murmur: bandpass-filtered noise (300–600Hz, gain 0.02) with very slow amplitude modulation (0.3Hz) — dozens of quiet voices. A slow ticking element: a brief noise burst (bandpass 1200Hz, 20ms decay, gain 0.08) every 1 second — the room's metronome counting down. When auction is active, the ticking accelerates to match the timer. The ambience creates the hush of a room waiting for the next bid.

## Implementation Priority
- High: Spotlight radial gradient on item, item display box with gold border, item icon redesigns
- Medium: Sold animation (scale bounce + confetti), timer arc color gradient, bid history scroll panel
- Low: Wood paneling texture, chandelier dot row, spotlight pulse on new bid, outbid flash
