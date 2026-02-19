# Splendor Online — Visual & Sound Design

## Current Aesthetic

A functional card-game UI built on the WebGL engine. Cards are rendered as octagon-approximated rounded rects in muted tier-colored backgrounds (dark blue-grey, purple-grey, bronze-grey). Gem tokens are colored circles with letter labels. Noble tiles are small purple rectangles. Player bars use flat semi-transparent fills. The overall palette is dark navy/slate with functional gem colors. Text-heavy and legible but visually flat — no sense of luxury, wealth, or Renaissance jewel trading.

## Aesthetic Assessment
**Score: 1.5/5**

The layout is workable but the visuals convey no atmosphere. Gem tokens look like labeled buttons. Cards have no depth or tactile weight. Nothing communicates the theme of opulent gemstone commerce.

## Visual Redesign Plan

### Background & Environment

A deep velvet background suggesting a draped gaming table. Radial vignette from center — rich burgundy-to-near-black gradient faked with stacked filled rects at varying alpha. Subtle animated dust motes (small white particles floating upward, very slow). Gold filigree border lines along the canvas edges with corner ornaments drawn as diamond-cross poly shapes. A faint hexagonal tile pattern at 3% opacity across the board area.

### Color Palette
- Primary (gems/UI): `#f0c040` (gold accent)
- Ruby: `#e8203a`
- Sapphire: `#1a6ee8`
- Emerald: `#18b84a`
- Diamond: `#e8eeff`
- Onyx: `#2a2a3a`
- Gold wildcard: `#f5a623`
- Background deep: `#12080e`, `#1e0e1a`
- Glow/bloom: `#f0c040`, `#e8203a`

### Entity Redesigns

**Gem Tokens**: Draw as multi-layered circles — outer dark ring, colored fill, inner bright highlight spot (small circle offset top-left at 30% lighter). Add a subtle gemstone facet effect by drawing 6-point star poly at 10% opacity inside. Animate a slow rotating shimmer highlight using sin(time) to shift a bright arc around the token. Selected gems get a gold pulsing outer ring.

**Cards**: Three distinct tier frames. Tier I: thin silver border with slight blue tint. Tier II: thicker gold border, slight warm glow. Tier III: ornate double border — outer gold, inner black gap, inner gold. The tier fill colors become richer: deep navy `#0d1428`, deep amethyst `#1a0d28`, deep bronze `#28180a`. Bonus gem shown as a faceted gem shape (6-point poly) in the top-right corner rather than a plain circle. Prestige points shown as golden stars (small 5-point polygons). Cost gems shown as small faceted circles along the bottom. Affordable cards get a soft gold bloom glow.

**Noble Tiles**: Dark walnut-brown frame (`#3a2010`) with ornate golden border lines. Noble portrait area filled with a unique procedural pattern (chevron, diamond, or stripe) per noble using their requirement gem colors at low alpha. "+3" shown as three gold star shapes.

**Player Bars**: Replace flat rects with subtle leather-texture suggestion — horizontal stripe lines at 5% opacity. Player bar uses blue-silver tones; AI bar uses crimson-maroon. Gem counts shown in mini token circles rather than plain text.

### Particle & Effect System

- **Gem pickup sparkle**: When gems are selected, emit 6-8 tiny facet shards (thin diamond polys) that radiate outward and fade. Color matches gem.
- **Card purchase**: Burst of 10-12 particles in the card's bonus gem color, plus a brief bright white flash on the card.
- **Noble arrival**: Sweep of golden particles raining down from above (vertical velocity, gravity-affected) with a warm flash.
- **AI turn indicator**: Slow gold pulse ring expanding from AI bar while AI thinks.
- **Turn transition**: Soft color wash — blue tint fades in for player turn, red tint for AI turn, 20-frame crossfade.

### UI Polish

- **Deck count badges**: Show remaining deck count as a stacked-card 3D perspective illusion (3 offset rectangles) rather than plain text.
- **Hover states**: Cards lift slightly (offset shadow by drawing a dark rect 2px below-right) and brighten their border glow.
- **Confirm/Cancel buttons**: Pill-shaped with beveled appearance. Confirm in emerald green with inner highlight; Cancel in ruby red.
- **Score display**: Large numerals with gold drop shadow. Score increase pulses (brief scale-up).
- **Message overlay**: Messages appear in a gold-bordered parchment-colored banner centered on screen, fade in/out with alpha.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Gem picked up | OscillatorNode sine, quick attack | 880Hz → 1047Hz glide | 180ms | Bright gem ping; pitch shifts up per gem added |
| Gem confirmed | Chord of 3 sine oscs | 523, 659, 784 Hz | 300ms | Warm major triad, soft envelope |
| Card purchased | Layered sine + triangle | 440Hz fundamental, harmonics | 400ms | Rich "ka-ching" feel; add subtle coin rattle via noise burst |
| Card reserved | Triangle osc | 330Hz, gentle attack | 200ms | Softer, reserved |
| Noble attracted | Fanfare: 3 sine tones in sequence | 523→659→784Hz | 600ms | Ascending arpeggio, each note 200ms |
| Cannot afford | Sawtooth, detuned | 220Hz, distortion via wave shaping | 150ms | Brief buzz/denial |
| Gem discard | Sine descend | 660→440Hz | 200ms | Dropping feel |
| AI turn | Very soft sine pulse | 220Hz, 20% gain | 100ms | Barely audible, just presence |
| Game win | Sine chord arpeggio | 523→659→784→1047Hz | 1000ms | Triumphant ascending arpeggio |
| Game loss | Sine descend | 523→392→330Hz | 800ms | Descending minor feel |

### Music/Ambience

A generative ambient loop: three sine oscillators at very low volume (gain ~0.02) tuned to a major sixth chord (C3, E3, G3 = 131, 165, 196 Hz), slowly amplitude-modulated by independent LFOs at 0.05–0.12 Hz creating a breathing, tavern-in-the-background feel. Add a very subtle reverb by summing a delayed copy (0.3s delay, gain 0.15) of the ambient output. No melody — just warm resonant drone that suggests wealth and quiet commerce.

## Implementation Priority
- High: Gem token layered circles with shimmer, card tier borders with glow, noble tile redesign, purchase/pickup sounds
- Medium: Background velvet texture with vignette, particle effects for purchases/nobles, ambient drone, message parchment banner
- Low: Dust motes, stacked deck card illusion, animated rotating gem highlight, score pulse animation
