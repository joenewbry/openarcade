# Trading Card MMO — Visual & Sound Design

## Current Aesthetic

Dark navy background `#1a1a2e` throughout all screens. Cards are plain rectangles with rarity-colored borders (Common=gray, Rare=blue, Epic=purple, Legendary=gold). Card art is entirely absent — a large Unicode icon (sword/sparkle/shield) stands in. Stats shown as plain text. Legendary cards get a gold glow, Epic get purple — these effects are the visual highlight of the current build. Buttons are unstyled rectangles. The pack opening screen shows mystery `?` cards then flips to revealed cards with glow. UI is functional and readable but feels like a prototype wireframe.

## Aesthetic Assessment
**Score: 1.5/5**

The rarity glow system works and the color language is clear. Everything else lacks craft — no card art space, no visual hierarchy beyond color, no screen transitions, no tactile feel to the UI.

## Visual Redesign Plan

### Background & Environment

All screens: Replace the flat `#1a1a2e` with a subtle animated gradient — a very slow movement of two dark color stops (`#0d0d1f` to `#1a1228`) cycling over 8 seconds. Add a sparse starfield: ~60 tiny `#ffffff` dots at fixed positions with a slight twinkle (sine-driven opacity 0.1–0.4, each with a unique phase offset).

Menu screen: Behind the title and buttons, draw 3 semi-transparent floating card shapes that slowly drift and rotate — each drawn as a filled polygon rect with a colored rarity border, no text, drifting at 0.5px/s with random angles. They represent the card world existing behind the player.

Battle screen: The two sides of the field get subtle tinted zones — player side has a faint blue-tinted fillRect at 5% opacity; AI side has red at 5% opacity. A glowing center divider line pulses slowly.

### Color Palette
- Primary accent: `#ee44aa`
- Gold / Legendary: `#ffd700`
- Rare blue: `#4488ff`
- Epic purple: `#aa44ff`
- Background deep: `#0d0d1f`, `#1a1228`
- Card face: `#1e1e38`
- Card face (highlighted): `#2a2a4e`
- Glow/bloom: `#ffd700` (legendary), `#aa44ff` (epic)

### Entity Redesigns

**Cards** — The card face gets a proper art zone: a 60% height rectangle inside the card border filled with a unique color per card TYPE (Creature=dark forest green `#0d2a0d`, Spell=deep indigo `#0d0d2a`, Equipment=dark bronze `#2a1a00`). The card name is rendered at the top in the rarity color. The Unicode icon is centered in the art zone at 2× current size. Stats move to the bottom third behind a slightly lighter horizontal band.

Legendary cards: Gold shimmer effect — draw 3 angled thin `#ffd700` lines across the card's art zone that slowly scroll diagonally from top-left to bottom-right, each at 10% opacity. The border pulses with a slow breathe (glow strength 0.5→1.0→0.5 over 2s).

Epic cards: Purple with a rotating outer ring of small dots around the card border, 12 dots, rotating at 30°/s.

Rare cards: Blue border with a brief flash every 4s (glow spike to 1.0 for 100ms).

**HP bars** (battle): Replace plain fillRect bars with a segmented bar — draw individual small rects (each segment = 1 HP) so damage is shown as segments going dark. Max 20 segments.

**Mana orbs**: Replace "Mana: X/Y" text with a row of circular orbs. Filled orbs are drawn as glowing circles in blue (`#4488ff`), empty as dark circles `#222244`. Arranged horizontally in the mana display zone.

**Deck pile**: Shown as a stack of 3 staggered card back silhouettes (offset by 2px each) rather than a number.

### Particle & Effect System

Card play: When a card is played to the field, a brief burst of 8 particles in the card's rarity color radiates outward from the card's center. Life 300ms, size 3–6px, velocity 2–4px/frame, fade by alpha.

Spell cast: A ring expands from center of field (strokePoly circle growing from radius 0 to 60 over 200ms) in the spell's rarity color.

Attack: When one creature attacks another, a quick flash fills the defender card with `#ff4444` at 40% opacity for 60ms, then fades. A small cluster of 5 impact particles appears at the defender.

Victory: Confetti explosion — 40 particles in mixed colors (`#ffd700`, `#ee44aa`, `#4488ff`, `#aa44ff`) burst from screen center, each with strong upward velocity and gravity, life 800ms.

Pack reveal: When a card is revealed, a brief blinding white flash (fillRect 80% opacity) for 40ms transitions to the revealed card with its rarity glow at full intensity for 500ms before normalizing.

Legendary pack reveal: Gold light radiates from the card as a large-radius glow (4 nested glowing strokePoly rects, each offset +3px and decreasing opacity). Screen flashes gold.

### UI Polish

**Menu buttons**: Each button gets a left-side icon bar — a 4px vertical rect in the button's color. On hover, the button background brightens and a subtle horizontal shimmer line sweeps across it over 200ms.

**Battle log**: Style as a teletype terminal — monospaced appearance using existing text renderer, alternating `#444466` and `#222244` row backgrounds, newest line highlighted brighter for 1s.

**Turn indicator**: Render as a large semi-transparent letter "YOUR TURN" / "AI TURN" watermarked in the center of the battle field at 8% opacity, then fade out.

**Booster pack screen**: The mystery card back uses a custom design — a star constellation pattern drawn as connected dots over a deep blue fill, all within the card border. The "?" is replaced by a glowing question mark at 1.5× size.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Card draw | Triangle osc, quick flick | 660→880Hz sweep, gain 0.15→0 | 80ms | Paper card sound |
| Card play (Creature) | Square osc thud + noise burst | 220Hz + noise lowpass 400Hz | 200ms | Thump onto table |
| Spell cast | Sine sweep ascending | 440→1320Hz, gain 0.3→0 | 300ms | Magical whoosh |
| Equipment equip | Metallic: saw osc + highpass 2kHz | 880Hz saw, gain 0.2→0 | 150ms | Clank of metal |
| Creature attack | Noise punch through lowpass 600Hz | Gain 0.4→0 | 120ms | Impact hit |
| Creature destroyed | Descending saw 400→80Hz | 400→80Hz, gain 0.3→0 | 350ms | Breaking apart |
| Turn end | Two-tone chime: 523+659Hz | Both sines, gain 0.2→0 | 200ms | Gentle bell |
| Victory | Rising major arpeggio 261→329→392→523Hz | 100ms each, gain 0.4 | 500ms total | Triumphant fanfare |
| Defeat | Descending minor 392→329→261→196Hz | 100ms each, gain 0.35 | 500ms total | Somber fall |
| Pack open | Rising tension sweep | Noise + lowpass 200→3000Hz sweep, 0.3 gain | 600ms | Card pack tear |
| Legendary reveal | Choir-like: 3 sines 261+329+392Hz with vibrato | Vibrato 5Hz depth 10Hz, gain 0.5→0 | 1000ms | Epic moment |
| Gold gain | Two high pings: 1760→2093Hz | 50ms each, gain 0.1 | 100ms | Coins |
| Button hover | Very short sine 1200Hz | Gain 0.05→0 | 30ms | Subtle tick |
| Alliance/trade | Warm sine chord 329+415+523Hz | gain 0.2→0 | 400ms | Diplomatic warmth |

### Music/Ambience

Menu: A soft fantasy loop built from Web Audio. Three oscillators: a slow bass pad at 55Hz (sine, gain 0.06), a mid chord of 164+196Hz (triangle, gain 0.04 each), and a high shimmer at 880Hz (sine with amplitude LFO at 0.3Hz, gain 0.02). This plays continuously in a loop using a 16-beat pattern controlled by a setInterval scheduler. The effect is a gentle mystical hum with floating harmonics.

Battle: The ambient level rises — bass at 0.08, mid pads increase to 0.06, and a 4Hz tension pulse is applied to gain. During AI turn, a slightly dissonant note (170Hz, detuned from the root) fades in at 0.03 gain to signal opponent activity.

## Implementation Priority
- High: Card art zone with type-based fill, mana orb display, HP segment bar, pack reveal flash, attack impact flash
- Medium: Animated background starfield, legendary shimmer scroll, card play particles, all primary sound events
- Low: Floating card background animation, rotating epic ring, battle zone tint, ambient music system, teletype battle log
