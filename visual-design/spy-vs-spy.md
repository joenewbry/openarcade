# Spy vs Spy — Visual & Sound Design

## Current Aesthetic

A top-down 4x3 room grid map. Rooms are dark blue-black rectangles with simple border lines and door gaps. Furniture is drawn as colored rectangles with minimal detail (desk = brown rect, safe = dark rect with circle dial, bookshelf = rect with stripe lines). The two spies are drawn as cartoon figures with a fedora triangle hat, circle face, and rectangular coat. Colors: white/grey for the theme, player green and AI red. The overall look is functional but drab — the spy theme is barely present visually.

## Aesthetic Assessment
**Score: 2/5**

The spy character designs are actually charming in their simplicity (fedora, coat collar) but the room environments are near-empty boxes. The black/dark blue palette has potential but needs contrast and character. No sense of Cold War intrigue or tension.

## Visual Redesign Plan

### Background & Environment

**Map background**: Deep near-black with a faint blueprint grid pattern — very thin lines at every 10px in indigo-blue `#1a1a4a` at 15% alpha, suggesting an architectural schematic. The overall canvas gets a slight warm vignette (dark amber at corners) to evoke dim institutional lighting.

**Room fills**: Visible rooms get a wallpaper pattern — alternating thin horizontal lines at 8% alpha in a slightly lighter blue-grey to suggest aged wallpaper. The current room (player's location) gets a warmer, slightly brighter fill (`#22203a` vs `#151530`). Adjacent visible rooms are slightly dimmer. Unvisited rooms remain nearly black with a "fog of war" texture — small random dark rect patches.

**Room borders**: Replace single-line borders with double-line borders (outer at 60% alpha, inner at 100%) to suggest wall thickness. Door openings are wider (4 tiles instead of current 4px) with a subtle interior darkness at the threshold.

**Exit room**: Green glowing border pulses slowly. Add "EXIT" text with a blinking cursor character (|) that alternates every 30 frames.

### Color Palette
- Primary theme: `#888888` (grey — spy neutral)
- Player spy: `#44ee44` (green)
- AI spy: `#ee4444` (red)
- Background: `#08080f`, `#12121f`
- Room visible: `#1a1a30`
- Room current: `#22203a`
- Document glow: `#ffee44`
- Trap warning: `#ff3333`
- Glow/bloom: `#44ee44`, `#ee4444`, `#ffee44`

### Entity Redesigns

**Spy Characters**: Keep the fedora shape but make it more dramatic — wider brim (extend brim rect width), taller hat crown (taller triangle peak). Add a trench coat silhouette: the body rect gets a belted middle (slightly darker horizontal band). Add small hands as tiny circles at the ends of arm stubs. When a spy is in a searched state, draw a magnifying glass icon near their hand (small circle + line stem). When stunned, the stun stars animate in a faster orbit.

**Disguise state**: Spy becomes a generic grey figure with a fedora replaced by a bowler hat (circle top instead of triangle). Add "???" above their head in grey text.

**Furniture**: Far more distinct and characterful:
- **Desk**: L-shaped surface with a lamp (vertical line + circle top in amber glow). Drawer handles as small horizontal lines.
- **Safe**: Heavy metal look — multiple concentric rect borders, combination dial rendered as a detailed circle with notch marks. When player is near, the dial glows.
- **Bookshelf**: Properly filled with book spines — alternating thin colored rects (red, blue, green, brown, purple) in the shelf space.
- **Plant**: More leafy — draw 5-6 leaf shapes as small ellipse approximations (circles slightly squished with rect behind) in varying greens.
- **Cabinet**: Vertical filing cabinet with handle and a visible label slot.
- **Locker**: Metal locker with ventilation slits (thin horizontal lines) and a padlock icon (circle + small rect below).

**Document glow hint**: When furniture with a document is in the current room, a small yellow-gold sparkle animation plays — 3 tiny diamond polys rotating slowly around the furniture piece.

**Trap indicator**: Player's own traps get a more visible warning — a pulsing red diamond shape (rotated square) above the furniture, not just "!".

### Particle & Effect System

- **Trap triggered**: Explosion of stars (5-pointed poly shapes) radiating outward in yellow. Screen flashes red for 8 frames at 25% alpha.
- **Document found**: Golden sparkle burst — 8 particles of small diamond shapes. A document icon (folded-corner rectangle) briefly floats upward from the furniture.
- **Combat start**: Brief lightning bolt (jagged line poly) arcs between the two spies. Screen gets a black border flash.
- **Combat win**: Confetti burst — 12-15 tiny colored squares scatter from winner's position.
- **Spy movement**: Tiny footprint dots briefly appear behind the spy when moving (last 2 positions at 20% alpha).
- **Stun effect**: Circular rings expand from stunned spy and fade.

### UI Polish

- **Document progress HUD**: The 4 document slots are now styled as file folders — slightly yellow-tinted rectangles with a tab at the top. Found documents show a stamped red "CLASSIFIED" text diagonally.
- **Timer**: Styled as a digital clock with segmented-digit aesthetic (using rect segments to draw the numerals).
- **Combat overlay**: The rock/paper/scissors panel gets a dramatic design — dark background with a bright neon border, choice icons drawn as actual hand shapes (polygon approximations for rock fist, flat paper hand, scissors V-shape).
- **Message bar**: Styled as a teletype ticker — monospace font feel, scrolling text animation (new messages slide in from right).

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Room enter | Soft sine blip | 440→660Hz | 150ms | Footstep-door creak suggestion |
| Furniture search start | White noise filtered | Highpass 2000Hz, low gain | 300ms | Rummaging sound |
| Document found | Ascending arpeggio | 523, 659, 784, 1047Hz | 500ms | Paper rustle + success jingle |
| Trap triggered | Noise burst + descending sine | 600→200Hz + noise | 400ms | Spring-snap then daze |
| Trap set | Click: brief sine at high freq | 2000Hz | 80ms | Mechanical click |
| Combat start | Stinger: sawtooth chord | 220+330+440Hz | 300ms | Tense alarm chord |
| Combat win | Ascending slide + fanfare | 330→660Hz glide + chord | 500ms | Triumph |
| Combat loss | Descending sawtooth | 440→220Hz | 400ms | Defeat wah |
| Game timer warning | Rapid beeps | 880Hz, 4 beeps at 0.25s intervals | 1s total | Urgency |
| Disguise activated | Reverb-ey sine | 660Hz with echo (delayed copy) | 400ms | Spy theme feel |
| Mission complete | Full jingle | 523, 659, 784, 1047, 784Hz | 1200ms | Classic "mission done" |

### Music/Ambience

A tense jazz-spy ambient: A double bass approximation — triangle oscillator at 55Hz (A1) pulsing rhythmically at 1-bar intervals. Add a muted trumpet suggestion: a sine wave at 330Hz (E4) through a very slow tremolo (LFO at 5Hz, modulating gain between 0.02–0.08). Third layer: hi-hat rhythm via narrow bandpass noise (6000Hz, Q=8) at every quarter note. The whole loop runs at ~100 BPM. A "danger" variant (faster tempo, higher gain on bass) triggers when AI is in the same room.

## Implementation Priority
- High: Document found sound + sparkle, trap triggered screen flash + sound, furniture redesigns, combat overlay icons
- Medium: Spy trench coat silhouette, room wallpaper patterns, document HUD folder style, ambient spy jazz loop
- Low: Footprint particle trail, teletype message bar, disguise bowler hat, room border double-line walls
