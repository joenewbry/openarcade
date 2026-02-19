# Wizard Card Game — Visual & Sound Design

## Current Aesthetic

A card trick-taking game with 600x450 canvas. Cards are plain rectangles: cream (`#f8f4e8`) for normal, lavender (`#ddc0ff`) for Wizard, mint (`#c0ffd8`) for Jester. Card backs are dark blue (`#333366`) with diagonal cross-hatch. UI uses hot pink (`#ff66aa`) as accent. The table is essentially just the engine's dark background with cards floating in space — no table surface, no atmosphere.

## Aesthetic Assessment
**Score: 1/5**

Cards have zero personality. The layout is purely functional: bare rectangles, no border rounding, no table felt, no shadows. The pink accent color clashes with the blue-grey engine background. The Wizard and Jester cards look almost identical to normal cards. This desperately needs a rich fantasy tavern / arcane academy atmosphere.

## Visual Redesign Plan

### Background & Environment

The game takes place on a **mystical card table** in a wizard's study. Draw a deep green felt surface as the background: a large rounded rectangle in dark forest green (`#0d2b14`) covering most of the canvas. The felt should have subtle crosshatch texture lines (very dark, low alpha diagonals). Around the edges: a walnut wood border (warm brown `#4a2c0a` rectangles forming a frame) with decorative corner rosette details.

Above the table, draw a dim ambient "candlelight" effect: a soft radial bloom centered at canvas midpoint, slightly warm amber, very low alpha. Add 2–3 floating candles (simple geometric: cylinder body + teardrop flame) at the upper corners to establish the setting.

In the background, silhouette bookshelves or scroll racks (simple dark rectangular shapes with thin vertical dividers) behind a frosted vignette overlay.

### Color Palette
- Primary: `#d4a843` (arcane gold)
- Secondary: `#7a3fa8` (wizard purple)
- Background: `#0d2b14`, `#071a0c` (dark felt)
- Table frame: `#4a2c0a`, `#6b3f12`
- Glow/bloom: `#d4a843`, `#c060ff`
- Card face: `#f5edd8` (aged parchment)
- Card back: `#1e1040`

### Entity Redesigns

**Card face — normal suit cards:** Aged parchment background (`#f5edd8`). Rank in upper-left and lower-right corners (rotated). Large suit symbol centered. Red suits: deep crimson `#8b0000`. Black suits: `#1a1a1a`. Add a thin gold inner border (`#c8a830`). Very subtle parchment grain: a few faint diagonal lines.

**Card face — Wizard:** Rich purple parchment (`#2d0a4e` background fading to `#4a1878`). Large gold star symbol (⭐ or drawn 5-point star polygon) glowing in center. "WIZARD" in arcane styled gold text. Outer border of small connected diamond runes. Faint magic particle shimmer orbiting the card (when in hand, 2–3 tiny floating particles orbit it).

**Card face — Jester:** Deep black background (`#0a0a14`) with iridescent green diagonal stripe motif. Jester diamond symbol (♦) in bright teal `#00e5cc`. "JESTER" in silver. A small jester-hat silhouette drawn in the corner using polygon points.

**Card backs:** Deep midnight blue (`#1e1040`) with a golden geometric mandala pattern: a central circle, inner octagon (stroke), outer star polygon (stroke), all in `#c8a830` at 0.6 alpha. This makes face-down cards feel mysterious and distinct.

**Bid buttons:** Replace plain pink rectangles with arcane rune-circle buttons. Dark purple fill with a carved rune look: inner circle stroke in gold, number centered in gold. On hover: the outer ring glows brighter and the fill lightens.

**Trump indicator:** Draw it as a decorative card display stand — a small easel shape (two angled lines with horizontal bar) holding the trump card, with "TRUMP" label in gold above.

**Trick area center:** A glowing arcane circle inscribed on the felt — a faint circle stroke with runes at cardinal points (drawn as Unicode symbols at very low alpha). Cards played in the trick area appear within this circle.

### Particle & Effect System

**Card played:** When a card lands in the trick area, a brief sparkle burst (6 tiny gold particles radiate outward). If it's a Wizard card: purple lightning arc effect — 3–4 zigzag line strokes from the card center fading quickly.

**Trick won:** Winner's card glows bright gold for 20 frames. 8 star particles scatter upward from the winning card. Floating text "+trick!" rises in gold.

**Round score result:** Positive score: green confetti burst (particles in varying greens/golds). Negative: red particles droop downward like embers falling.

**Bid selection hover:** The hovered bid button emits a slow golden pulse — a circle stroke expands and fades around it every 60 frames.

**Card hover in hand:** Selected card lifts (-8px already implemented) + gains a white-gold inner glow on border. A faint magic shimmer (1 particle per 10 frames) floats off the top.

### UI Polish

**Score panel (DOM):** Style as parchment scroll widgets — warm cream backgrounds with brown borders. Font should feel calligraphic (already handled via CSS).

**Turn message overlay:** The `#1a1a2eb0` dark rectangle becomes a translucent parchment strip with gold borders. Text in `#d4a843`. Add a small wax seal circle on one end.

**"Your Bid:" prompt:** Enlarged, in gold with a faint glow. Surrounded by decorative horizontal rule lines (thin gold strokes extending left and right from the text).

**Suit selection (pick-trump):** Each suit choice rendered as a larger ornate button with the suit symbol in its heraldic color inside a decorative border.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Card dealt | Short percussive noise + click: BiquadFilter highpass at 2000 Hz, noise buffer | Gain 0→0.6→0 over 60ms | 80ms | Crisp card-slap sound |
| Card played to trick | Soft thud: OscillatorNode sine 120 Hz, short envelope | 120 Hz, gain 0→0.4→0 over 80ms | 100ms | Satisfying placement |
| Trick won by player | Ascending chord: triangle waves at C5+E5+G5+C6 | 523+659+784+1046 Hz, 60ms stagger | 400ms | Triumphant arpeggio |
| Trick won by AI | Descending minor: triangle waves A4+F4+D4 | 440+349+294 Hz | 300ms | Soft defeat sting |
| Wizard card played | Rising magical sweep: OscillatorNode sawtooth, frequency ramp 200→800 Hz, chorus via detune | Ramp over 200ms + reverb sim (delay node) | 400ms | Arcane whoosh |
| Jester card played | Descending comedic glide: sine wave 600→150 Hz glide | Portamento 200ms | 250ms | "Wah-wah" clown tone |
| Bid selected | Short bright click: triangle 1200 Hz, 30ms | 1200 Hz, quick decay | 40ms | Affirmative pip |
| Round score positive | Bright fanfare: C-E-G-C arpeggio on sawtooth + lowpass | 262+330+392+524 Hz, 80ms per note | 320ms | Victory mini-jingle |
| Round score negative | Flat bwah: detune 2 sawtooth oscillators slightly apart, 80 Hz | 80+84 Hz, 300ms | 400ms | Cartoon failure |
| Game over win | Full chord stab: four oscillators, major 7th | 262+330+392+494 Hz together | 800ms | Grand resolution |
| Trump suit picked | Regal horn-like tone: square wave 330 Hz through lowpass 1000 Hz | 330 Hz, 250ms sustain | 400ms | Proclamation |

### Music/Ambience

A quietly looping tavern/study ambience: three low triangle oscillators forming a Dm chord (D3+F3+A3: 147+175+220 Hz) with very slow LFO amplitude modulation (0.1 Hz sine) — creates gentle chord breathing. Gain around 0.05. Occasional random "flicker" — a very brief triangle tone at 800 Hz, gain 0.02, random interval 8–20 seconds — simulates a distant torch or quill scratch. No drums; the mood is contemplative and arcane.

## Implementation Priority
- High: Green felt table background with wood frame, card face redesign (parchment texture, gold border), card back mandala pattern, Wizard/Jester card visual differentiation
- Medium: Trick area arcane circle, card played sparkle effects, trick-won glow animation, sound effects for card play/trick result
- Low: Ambient candle decorations, particle shimmer on Wizard cards in hand, full ambient audio loop, confetti on positive round scores
