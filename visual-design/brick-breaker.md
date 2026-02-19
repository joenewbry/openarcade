# Brick Breaker — Visual & Sound Design

## Current Aesthetic
A roguelike Brick Breaker built on the standard breakout template but with a pink/magenta theme (`#e48`). Bricks come in four types by HP: normal (pink `#e48`), tough (orange `#f80`), hard (red `#f44`), and gold (`#ff0`). HP counts are drawn as dark text on multi-hit bricks. The paddle is solid pink with yellow stripe when sticky. Balls are white circles (pink glow normally, red+glow for fireball). Lives shown as small pink circles bottom-right. A room multiplier shows bottom-left. Active power-up names list top-right. The power-up selection screen is a dark overlay with three dark card panels, colored borders per power-up, icon text, name, and description. The background is the engine default (black).

## Aesthetic Assessment
The roguelike progression mechanic (power-up choice between rooms) is the game's core differentiation. The power-up cards are functional but plain. The brick color coding by HP tier is clear. The overall aesthetic lacks visual weight and excitement — a roguelike should feel like a dungeon run with escalating stakes, and this currently feels like a spreadsheet.
**Score: 2/5**

## Visual Redesign Plan

### Background & Environment
Lean into the dungeon/roguelike theme:

**Per-room backgrounds:** Each room pattern has a distinct subtle background tint. The base is dark stone texture: near-black with a faint regular stone-block grid visible (every 48px a very faint darker line horizontally and vertically at 8% opacity). As rooms advance, the background gradually darkens and gains a reddish tint — the dungeon goes deeper.

**Room number indicator:** A faint large room number is watermarked in the background center at 5% opacity (e.g., "ROOM 7"), creating a sense of place.

**Depth gradient:** Apply a subtle vignette — the canvas corners are slightly darker, drawing the eye to the brick zone.

**Brick area glow:** The region containing the bricks has a faint ambient glow color (mixed from all the brick colors on screen) that illuminates the background above the bricks slightly.

### Color Palette
- Normal brick: `#ee2288` (brighter, more saturated)
- Tough brick: `#ff8800`
- Hard brick: `#ff1111`
- Gold brick: `#ffee00`
- Paddle base: `#cc1166`
- Paddle glow: `#ff44aa`
- Ball: `#ffffff`
- Fireball: `#ff4400`
- Background top: `#06040a`
- Background mid: `#0a0614`
- Vignette: `#000000` (30% alpha at corners)
- Power-up gold: `#ffcc00`
- Power-up cyan: `#00ddff`

### Entity Redesigns
**Bricks:** Full 3D bevel treatment:
- Bright top-left edge (2px) suggesting the stone face catching light
- Dark bottom-right shadow edge (2px)
- Inner candy shine: small bright rectangle in upper-left at 20% alpha
- For gold bricks: a slow shimmer animation (a bright line sweeps left-to-right across the brick every 2s)
- For hard bricks: visible crack lines (2-3 short dark diagonal lines on the face) to emphasize damage
- HP counter text: placed in a small dark chip at the brick's right edge, more readable than centered text

**Paddle:** The paddle evolves as power-ups activate:
- Base: dark pink with beveled edges and a bright top contact line
- Wide paddle upgrade: visually shows rivets at the extension zones (tiny bright dots indicating extra width)
- Sticky mode: top surface shows a glossy gel-like fill (a bright stripe at 40% alpha across the top)
- The paddle's bottom has small "wheel" circles at each end (purely aesthetic but suggest the paddle slides on rails)

**Balls:**
- Normal: white sphere with cyan inner gleam and a 4-frame motion trail
- Fireball: orange circle with a bright yellow core, 6-frame trailing flame particles (small orange/yellow squares fading behind)
- Multi-ball: each ball gets a small unique color tint so the player can track all three

**Fireballs specifically:** When a fireball penetrates a brick, a brief orange flash fills that brick's cell for 2 frames before it disappears. Multiple bricks being penetrated in sequence creates a satisfying chain of orange flashes.

**Power-up selection cards:** Complete redesign:
- Cards are 140px tall stone-slab styled panels (dark grey with a beveled border)
- The border color matches the power-up color and pulses gently (0.7 → 1.0 alpha, 1-second cycle)
- The number key shows as a glowing hotkey badge (small rounded rectangle with the number, color-matched)
- The icon is rendered as a proper small illustration using canvas primitives (not text emojis):
  - MULTI-BALL: three small circles arranged in a triangle
  - WIDE PADDLE: a wide rectangle illustration
  - FIREBALL: an orange circle with radiating lines
  - STICKY: a paddle-shape with wavy lines above it
  - EXTRA LIFE: a heart shape (two circles + triangle)
  - SLOW BALL: a ball with backwards-curved motion lines

### Particle & Effect System
**Brick break (normal):** 6-8 pink particles burst outward. Some are the brick's color, some are white sparks.

**Brick break (gold):** Special treatment: 10 golden coin particles shower downward with gravity, each spinning (rotating square). A bright yellow flash fills the cell.

**Fireball trail:** Continuous: each frame while the fireball is moving, spawn one 3px orange particle at the ball's previous position, fading over 8 frames. On brick penetration: a brief fire splash (4 orange particles scatter sideways).

**Power-up chosen:** The selected card expands to fill the screen momentarily (scale 1→1.05→0 in a burst), then the new room fades in. The chosen power-up icon briefly appears large at screen center before vanishing.

**Room clear:** All bricks flash white simultaneously for 2 frames, then cascade-explode from bottom-left to top-right (each brick row triggers 2 frames after the one below it), with particles.

**Ball lost:** Red tint vignette floods corners. Ball leaves a long red trail as it exits the bottom.

### UI Polish
The power-up selection overlay gets a dramatic entrance: the dark overlay fades in over 15 frames, then the three cards slide in from below (translate from +100px to 0 over 10 frames). A title "CHOOSE YOUR POWER" appears with a dramatic scan-line effect (lines wiping away to reveal the text). Room multiplier displayed as a glowing badge: "×1.75" in gold text with a gold glow, positioned prominently.

## Sound Design Plan
*(Web Audio API only — no external files)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Normal brick break | Pink blip | 440Hz square | 0.06s | Standard break |
| Tough brick hit | Crunch | 300Hz square, slightly longer | 0.08s | Taking damage |
| Hard brick break | Boom | 200Hz square + noise | 0.1s | Satisfying heavy break |
| Gold brick break | Golden chime | 1318Hz sine + overtones | 0.2s | Special pickup feel |
| Fireball penetrate | Sizzle | Noise + 800Hz sine, short | 0.08s | Fire impact |
| Paddle hit | Thwack | 180Hz square | 0.08s | Paddle impact |
| Ball multi (split) | Chord split | 523+659+784Hz, simultaneous | 0.4s | Three-note chord |
| Ball sticky catch | Squelch | 400→200Hz sine slide | 0.15s | Sticky catch sound |
| Power-up choose | Reveal | 523+659+784+1046Hz arpeggio | 0.6s | Power-up select fanfare |
| Room clear | Victory | Bright 4-note ascending scale | 1.0s | Room complete |
| Game over | Dungeon collapse | Low rumble + descend | 1.5s | Cave-in feel |

### Music/Ambience
A dungeon ambience that escalates with room number. Starting rooms: quiet, eerie — very low drone (40Hz, barely perceptible) with occasional distant drip sound (1000Hz sine, fast attack, 2s decay). Mid rooms: a menacing low-tempo pulse begins (60Hz sine on every beat at 80 BPM, 0.02 amplitude). Late rooms: the pulse accelerates and a simple melodic motif enters — 3 notes on sawtooth wave: 196Hz, 220Hz, 164Hz, each 0.25s. The music grows with the dungeon depth, never overwhelming sound effects.

## Implementation Priority
- High: Power-up card redesign with canvas illustrations, room-clear cascade explosion, fireball trail and penetration flash, brick 3D bevel
- Medium: Ball motion trails (all balls), gold brick shimmer animation, power-up card slide-in entrance animation, background stone grid texture
- Low: Dungeon depth background tint progression, room number watermark, sticky paddle gel visual, ball individual color tints in multi-ball
