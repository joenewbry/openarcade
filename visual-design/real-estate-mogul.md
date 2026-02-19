# Real Estate Mogul — Visual & Sound Design

## Current Aesthetic

A 600×500 board game with a 5×4 property grid. Four property types: residential (`#4a9`), commercial (`#49f`), industrial (`#a86`), luxury (`#d4a`). Four players: you (orange `#f90`) and three AIs (blue `#4af`, red `#f55`, green `#5d5`). A market event system with 15 events. Buy/develop/sell actions. AI uses ROI-based decision making over 20 rounds. A sidebar shows player balances and current round. The aesthetic is a functional board game UI without any of the glitz of a real estate themed experience.

## Aesthetic Assessment
**Score: 2/5**

The property grid is legible and the four-player color coding works. However, the properties look like flat colored squares with no character. The board has no texture or depth. There's no sense of the Monopoly-inspired excitement of property empire building. Player icons are minimal. Market events display as plain text. The UI lacks the money-themed richness the game deserves.

## Visual Redesign Plan

### Background & Environment

A premium mahogany board game table. The canvas background: a rich dark wood grain texture. Simulate wood grain with horizontal semi-transparent streaks: base fill `#1a0e06`, then overlay 30–40 thin horizontal rectangles (2px tall, full width, alpha 0.06–0.12) at y-positions spaced 8–12px apart using a pseudo-random variation based on y-coordinate. Some wider streaks (4px) appear every 20px at slightly more alpha, creating a convincing plank pattern.

**Board border:** A thick (12px) decorative border around the entire canvas — gradient from dark gold (`#8a6a20`) to bright gold (`#d4a400`) to dark gold again, simulating a gilded frame. Four small corner ornaments: small diamond shapes in solid gold (`#d4a400`) at each canvas corner.

**Property grid area:** The 5×4 grid sits on a slightly lighter felt-green inset panel (`#0d2010`) with a subtle crosshatch pattern (thin lines `#0f2412` at 15% alpha, 45° angle, 6px spacing) — a board-game felt surface.

**Sidebar background:** The right sidebar (player info, round counter, actions) renders on a dark slate panel (`#0a0a14`) with a thin bright border (`#d4a400` at 40% alpha) separating it from the board.

### Color Palette
- Residential: `#22bb77` (forest green)
- Commercial: `#2288ff` (bright blue)
- Industrial: `#bb8833` (amber-brown)
- Luxury: `#cc44aa` (magenta-pink)
- Empty property: `#1a1a0a` (near-black)
- Background (wood): `#1a0e06`
- Board felt: `#0d2010`
- Gold accent: `#d4a400`, `#ffdd44`
- Player colors: orange `#ff9900`, blue `#44aaff`, red `#ff4444`, green `#44cc44`
- Money green: `#00dd66`
- Debt red: `#ff3333`

### Entity Redesigns

**Property tiles:** Each property becomes a miniature architectural rendering from above:
- **Residential:** Dark green base with a small house icon centered — a square body (6×5px) in `#334433` topped with a triangle roof in `#552222`. A tiny chimney. Window dots (1×1px white). Surrounded by a thin "yard" margin in a lighter green.
- **Commercial:** Blue base with a small building icon — a rectangular glass tower (6×8px) in `#334466` with a grid of 2×2 window dots in `#aaccff`. A rooftop detail (small flat rectangle).
- **Industrial:** Amber-brown base with a factory icon — a squat wide building (`#443322`) with a small chimney circle. When developed, the chimney emits 2 tiny smoke particles per second (grey, size 1px, drifting upward, lifetime 30 frames).
- **Luxury:** Magenta base with a mansion icon — a wider building (`#553344`) with two flanking wing shapes and an ornate peaked center roof.
- **Owner indicator:** Each owned property shows the owner's color as a thin 2px border on all four sides, plus a small 6×6px flag in the corner with the owner's color.
- **Development level (1–3 stars):** Small star icons (`★`) at the bottom-center of each tile, in gold, one per development level. At level 3, the stars pulse in gold.

**Player tokens:** Replace plain colored squares with styled player tokens. For "YOU": an orange crown icon (5-pointed stylized crown, `#ff9900`, 10px tall) with a dark outline and a 1px gold highlight. AI players get suited playing card icons (a simplified ♦, ♠, ♣ icon in their respective colors, each distinct). Each token sits on the current player turn indicator with a drop shadow.

**Market event cards:** When an event fires, display a pop-up card at the center of the board — a rectangle (160×80px) with a rounded corner (8px), gold border, a bold event title in white, a brief description in `#aabbcc`, and an icon (simplified emoji-style glyph) representing the event type (e.g., `↑` for boom, `↓` for bust, `$` for tax). The card slides in from the top over 20 frames, stays for 60 frames, then slides back out.

**Transaction animations:** When a property is bought, developed, or sold:
- A coin shower: 6–10 small yellow circles (4px radius, `#ffdd44`) fall from the property tile downward to the buyer's balance display, following a curved arc, lifetime 40 frames.
- The affected tile briefly scales up to 1.15× over 6 frames then back.

**Round indicator:** An ornate round counter in the top-center. "ROUND 4 / 20" in gold text on a dark oval badge with a decorative border.

### Particle & Effect System

- **Property purchase:** Coin shower (6–10 coins arc from center board to buyer's balance), plus a brief gold ring flash from the property tile (expanding circle, gold, alpha 0.7→0 over 12 frames).
- **Rent collected:** A small green "+$X" float-up text from the paying player's token, in `#00dd66`, rising 20px and fading over 30 frames.
- **Market boom event:** Brief golden shimmer across all properties (all tiles tint to `rgba(255,215,0,0.1)` for 15 frames).
- **Market crash event:** All tiles briefly tint red (`rgba(255,0,0,0.08)` for 15 frames).
- **Player bankruptcy:** The bankrupt player's properties lose their color (all tiles they own tint to grey over 30 frames). The player's sidebar entry fades and shows a large "BANKRUPT" stamp in red.
- **Game end / winner:** 40 confetti particles in mixed gold/player-color rain from the top, lifetime 80 frames. A winner announcement card slides in with the winning player's icon, name, and final balance.

### UI Polish

- **Balance display:** Each player's balance shown in a styled ledger row — dark background, player color left border (4px), player icon (8×8px), name, and balance in large monospaced digits. Positive balance: `#00dd66`. Negative: `#ff3333`. On balance change, the digit rolls (old → new over 8 frames using a vertical scroll animation).
- **Action buttons:** "Buy" / "Develop" / "Sell" / "Pass" buttons rendered as card-like panels with slight 3D depth (top-left highlight, bottom-right shadow, gold border). On hover (if mouse-based), the button scales up 1.05×. Active/pressed: scales down 0.97×, border brightens.
- **Turn indicator:** A glowing arrow pointing to the active player's sidebar row. The arrow pulses in the player's color (alpha 0.6→1.0→0.6 over 60 frames).
- **AI "thinking" animation:** When an AI is taking its turn, show 3 animated dots ("●●●") in the AI's color after its name, each dot cycling opacity in sequence (a ripple effect, 400ms per cycle).
- **Property tooltip:** On property hover, a small card appears at cursor showing property name, type icon, current owner, development level, and current rent value — dark background, gold border, 12px rounded corners.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Property purchased | OscNode (sine) cash register | 880 + 1108 Hz pair, fast decay | 200 ms | Classic "cha-ching" feel |
| Rent collected (you pay) | OscNode (sine) descend | 440 → 330 Hz | 150 ms | Money leaving |
| Rent collected (you receive) | OscNode (sine) ascend | 440 → 660 Hz | 150 ms | Money arriving |
| Property developed | OscNode (triangle) build | 330, 392, 523 Hz sequence, 60ms each | 200 ms | Construction sound |
| Property sold | OscNode (sine) | 660 → 440 Hz | 150 ms | Transaction tone |
| Market boom event | OscNode (sine) ascending | 523, 659, 784, 1047 Hz | 300 ms | Upbeat fanfare |
| Market crash event | OscNode (triangle) descend | 523, 440, 330, 220 Hz | 400 ms | Ominous drop |
| Bankruptcy | OscNode (sine) sad descend | 440, 330, 262, 196 Hz | 600 ms | Defeat |
| Round start | OscNode (sine) chime | 784 + 1047 Hz | 200 ms | New round bell |
| Win game | Ascending fanfare | 262, 330, 392, 523, 659, 784, 1047 Hz | 700 ms | Full scale triumph |
| Button click | OscNode (sine) very short | 1320 Hz, 0.04 vol | 25 ms | UI click |
| AI turn notification | OscNode (triangle) soft | 660 Hz, 0.04 vol | 60 ms | Quiet AI action tone |

### Music/Ambience

Sophisticated lounge atmosphere befitting a high-stakes real estate game. A 60 BPM jazz-inflected pulse: a deep double-bass-imitating tone — `55 Hz` sawtooth through `BiquadFilter` lowpass at 200 Hz, 0.06 vol, playing a two-bar walking bassline pattern (`55, 65, 73, 82 Hz` in sequence, quarter-note rhythm). Layer over this a soft brushed-snare substitute: filtered white noise (500 Hz bandpass, 40ms, 0.03 vol) on beats 2 and 4. Very quietly, a piano-imitating tone: short sine bursts (`523, 659, 392 Hz` in a looping 3-note voicing, eighth-note rhythm, 0.02 vol), staggered with slight timing variation (±30ms) for a live-played feel. When a market boom fires, briefly raise the tempo to 80 BPM for 4 bars then settle back. When a crash fires, lower to 45 BPM for 4 bars — the music mirrors the market mood.

## Implementation Priority
- High: Property tile architectural icons (house/tower/factory/mansion), balance display with roll animation, coin shower on purchase
- Medium: Wood grain canvas background, market event card slide-in animation, gold ring flash on property tile
- Low: Industrial chimney smoke particles, property tooltip on hover, confetti winner celebration, jazz ambience loop, action button 3D depth
