# Stock Market Sim — Visual & Sound Design

## Current Aesthetic

A trading dashboard with multiple panels: price chart, portfolio leaderboard, trading desk, news feed, order book, and news ticker. All panels use `#14142880` fills with `#333333` borders. Text is small and dense. The chart draws a glowing price line with a colored fill underneath. The waiting state shows animated sine waves in dim green. The overall aesthetic is functional but clinical — it looks like a boring trading terminal rather than something exciting to interact with.

## Aesthetic Assessment
**Score: 2/5**

The layout is logical and the chart glow is a nice touch. But the uniform dark panels with thin grey borders, tiny text, and lack of visual hierarchy make it hard to read at a glance. It needs the energy of a live trading floor — flashing numbers, urgent color, and the visceral feeling of money moving.

## Visual Redesign Plan

### Background & Environment

**Canvas background**: Deep dark charcoal-navy `#09090f` as base. A subtle circuit-board-like pattern: horizontal and vertical thin lines at random positions at 3% opacity in green, forming a sparse tech grid. Animated: very slowly drift upward (scroll by 0.1px/frame), so the grid feels alive.

**Panel redesigns**: Panels get glass-morphism treatment — `#10101a` base with a 1px bright border on top edge (lighter highlight) and 1px dark shadow on bottom/right. Panel title bars get a full-width colored highlight bar at top (4px tall) in the panel's thematic color: chart = stock color, leaderboard = gold, trading desk = bright green, news = amber.

**Waiting/overlay background**: The animated sine waves become a proper market visualization — multiple overlapping sine wave lines in stock colors, creating a moving multi-stock chart background. Looks like live markets at a glance.

### Color Palette
- Gain: `#22dd44`
- Loss: `#ff3333`
- Neutral/cash: `#aaaaaa`
- Player accent: `#22cc44`
- Background: `#09090f`, `#0d0d16`
- Panel border: `#2a2a3a`
- Gold/leaderboard: `#f0c040`
- Amber/news: `#ffaa00`
- Tech tickers: `#44aaff`
- Glow/bloom: `#22dd44`, `#ff3333`, `#f0c040`

### Entity Redesigns

**Price Chart**: Multiple improvements. Grid lines get subtle labels on the right side instead of left. The price fill polygon becomes a gradient-like effect (multiple thin filled polys stacked with decreasing alpha toward the bottom). The current price point gets a bright circle marker that pulses. Add OHLC bar representations as subtle thin vertical lines behind the main line for a richer look. When price drops, the fill color shifts to a low-alpha red instead of stock color.

**Leaderboard**: Each player entry is a bold ranked card. First place gets a gold shimmer border (animated via sin). Performance bars become wider and more readable with percentage text inside the bar. Add a miniature sparkline (3-step price history) for each player's portfolio as a tiny chart next to their name.

**Trading Desk**: The stock selector tabs become richer — each tab shows a mini ticker price change (`+2.1%` or `-0.8%`) in gain/loss color below the ticker name. Buttons (BUY/SELL/SHORT/COVER) are larger, more button-like with clear disabled states (entirely dark with strikethrough text). The END TURN button pulses green when it's the player's action phase.

**News Feed**: Breaking news gets an animated "BREAKING" badge — a small red rectangle with white text that flashes at 1Hz. The insider tip text appears with a typewriter reveal effect (characters appear one at a time over 20 frames).

**Market Moving overlay**: The "MARKET MOVING..." text gets a proper full-screen overlay with animated bar chart columns rising and falling — 8 vertical bars in various stock colors animating up/down sinusoidally.

### Particle & Effect System

- **Price up**: When a stock's price rises, a small upward-pointing green triangle floats up from the price display and fades out over 30 frames.
- **Price down**: Red downward triangle floats downward.
- **Milestone gain**: When player's portfolio crosses a round thousand, a brief gold particle burst from the score display — 10 small diamond shapes radiating outward.
- **Trade execution**: When BUY/SELL/SHORT/COVER completes, the button briefly flashes white and a small ripple circle expands from the button center.
- **News headline**: New news items slide in from the right edge of the news panel over 15 frames.
- **End turn**: The "END TURN" button press triggers a brief green sweep that wipes across the canvas left-to-right before the market resolves.

### UI Polish

- **Tick-tape HUD**: The bottom news ticker becomes a true scrolling marquee — text positions shift left by 1px each frame, wrapping around. Color coded by gain/loss of mentioned stocks.
- **Portfolio value counter**: Large animated number in the header that rolls up/down digit by digit when changing (like a slot machine).
- **Round indicator**: Displayed as a progress bar across the top of the canvas — shows rounds remaining visually.
- **Stock status icons**: Tiny up/down arrow glyphs next to each ticker, colored and sized by magnitude of change.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Buy order executed | Ascending arpeggio | 440→550→660Hz, sine | 300ms | Satisfying purchase |
| Sell order | Sine + slight detune | 660→550→440Hz | 300ms | Completion sound |
| Price up tick | Very short sine pip | 880Hz | 60ms | Subtle tick-up |
| Price down tick | Very short sine pip | 660Hz | 60ms | Subtle tick-down |
| Market event fires | Alarm stab | Sawtooth 440+220Hz | 200ms | Breaking news alert |
| Gain milestone | Bell-like sine | 1047Hz with decay | 400ms | Reward chime |
| End turn button | Mechanical click | Noise burst at 3000Hz | 50ms | Confirm click |
| Market resolving | Low drone | Sine 110Hz, swells and fades | 1200ms | Tension during resolution |
| Game win | Ascending scale + chord | C4→E4→G4→C5 + full chord | 800ms | Success fanfare |
| Game loss | Descending slow | C4→B3→A3→G3 | 800ms | Market close failure |
| Insider tip reveal | Whisper-like noise | Narrow bandpass 1500Hz | 300ms | Secretive hiss |

### Music/Ambience

A tense trading floor ambiance. Three layers:
- **Background chatter**: White noise through multiple narrow bandpass filters (800Hz, 1200Hz, 1800Hz) at very low gain (0.008 each) to suggest voices without clarity.
- **Keyboard clatter**: Periodic brief noise bursts (30ms) through highpass filter (5000Hz) at 3-8 second random intervals — typing sounds.
- **Tension drone**: Two sine oscillators (110Hz and 165Hz) that gain intensity during "market resolving" phase. Normally at gain 0.01, swells to 0.04 during resolution.
- No melody — pure atmosphere. Feels like a live trading room.

## Implementation Priority
- High: Gain/loss color price tick animations (triangles), market resolving overlay with bar charts, buy/sell sounds, news ticker scrolling
- Medium: Panel glass-morphism treatment, chart gradient fill + current price marker, leaderboard sparklines, portfolio counter animation
- Low: Circuit board background pattern, typewriter news reveal, ticker-tape bottom scrolling, sector milestone burst particles
