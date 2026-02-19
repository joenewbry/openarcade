# Mahjong Competitive — Visual & Sound Design

## Current Aesthetic

A 600x500 canvas with full Japanese Riichi Mahjong. Four players sit around a green felt table (`#1a3828`). Tiles are cream-colored (`#d8d0b8` / `#f5f0e0`) with suit-colored characters: Man (characters) in `#cc3333`, Pin (circles) in `#2288cc`, Sou (bamboo) in `#228822`. Dragon tiles vary. Player hand is shown at bottom with face-up tiles; opponents show face-down tiles. Riichi sticks are `#eeaa00` lines. The aesthetic has the right structural bones but feels like a functional prototype — the table lacks texture, tiles lack depth, and the overall scene lacks the refined elegance of a mahjong parlor.

## Aesthetic Assessment

**Score: 3/5**

The game's structure is impressive and the information design is sound. The color coding of suits is correct and helpful. The main shortfall is visual richness — the green felt is flat, tiles feel like labeled rectangles without physical presence, and the game lacks the atmospheric quality of a traditional mahjong experience. With proper felt texture, beveled tiles with shadows, and atmospheric lighting, this could be truly beautiful.

## Visual Redesign Plan

### Background & Environment

The table should feel like a real mahjong parlor. Replace the flat green with a rich emerald felt: draw the table circle/rectangle with a base color `#1a3828`, then overlay a subtle diagonal hatching pattern (alternating pixels at `#1c3c2c` and `#183226`) to simulate woven felt texture. Add a slight radial gradient — brighter in center `#1e4030` fading to `#122418` at edges — as if lit from above.

Border the table with a dark mahogany wood frame: `#4a2510` rectangle around the table edge, 8px wide, with a 1px inner highlight `#6a3518` and 1px outer shadow `#1a0808`. Corner embellishments: small circular ornaments in `#7a4520`.

Background beyond the table: a dark ambient room `#0a0808` with subtle warm glow around the table area. Add a soft overhead lamp effect — a radial gradient of warm amber `#4a3010` at 20% alpha centered on the table.

Wind indicator (East/South/West/North round) displayed as a decorative compass rose in the table center in `#2a5040` — barely visible, elegant.

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Table felt base | Deep emerald | `#163020` |
| Table felt highlight | Lit felt center | `#1e4030` |
| Table felt shadow | Felt edge dark | `#122418` |
| Wood frame | Mahogany | `#4a2510` |
| Tile face | Antique ivory | `#f0ead8` |
| Tile shadow face | Warm cream | `#e0d8c0` |
| Tile side (3D) | Bone edge | `#c8bc9a` |
| Tile border | Dark ink edge | `#2a1808` |
| Man suit | Deep vermillion | `#cc2222` |
| Pin suit | Royal blue | `#1166cc` |
| Sou suit | Forest green | `#228833` |
| Dragon (Haku white) | Pure white | `#ffffff` |
| Dragon (Hatsu green) | Jade | `#22aa44` |
| Dragon (Chun red) | Scarlet | `#dd2222` |
| Wind tiles | Ink black | `#1a1a1a` |
| Riichi stick | Gold | `#ddaa00` |
| Riichi stick glow | Glowing gold | `#ffcc44` |
| Winning tile glow | Triumph gold | `#ffdd44` |
| Background room | Dark parlor | `#0a0808` |
| Glow/bloom | Warm gold | `#ffcc44` |

### Entity Redesigns

**Tiles (face up)** — Add genuine 3D presence through layered rendering. For each tile:
1. Bottom shadow: offset rectangle 2px right+down in `#0a0808` at 60% alpha (depth shadow)
2. Side face (right edge): 2px strip in `#c8bc9a` (bone-colored side)
3. Bottom face: 2px strip in `#a8a080` (bottom edge)
4. Main face: `#f0ead8` fill
5. 1px dark border `#2a1808` around the face
6. Suit character rendered on top

This gives tiles a convincing 3D card-like depth. Tiles in the player's hand: slightly raised (shifted -2px upward) and individually separated by 1px gaps.

**Tiles (face down / opponents)** — Back pattern: dark `#2a5040` base with a small repeating diamond pattern `#3a6050` suggesting a decorative tile back. Add the same 3D shadow/side effect.

**Winning tile (tsumo/ron)** — When a winning tile is played, it animates: scale from 1.0 to 1.2x over 0.3s, apply `setGlow('#ffdd44', 2.0)`, then settle back to 1.1x. A shower of gold sparkles radiates from the tile.

**Riichi stick** — Instead of a simple line, render as a tapered rectangular stick with a red center band. Apply `setGlow('#ffcc44', 0.8)` for a ceremonial glow.

**Discard pile** — Tiles in the discard area should render smaller but maintain the same 3D treatment. Arrange in neat rows of 6. The most recently discarded tile is slightly brighter.

### Particle & Effect System

- **Winning hand (Tsumo/Ron)**: Golden confetti burst — 20 small square particles in `#ffdd44`, `#ffaa22`, `#ffffff` scatter from the declared tile and rain down with gravity. Screen glow briefly in warm gold.
- **Riichi declaration**: A bold circular ring expands from player position in `#ddaa00`, fading over 0.5s. Riichi stick slides into center with a smooth animation.
- **Tile discard**: Very brief tile-sliding animation (1px travel then snap to place) when a tile is discarded.
- **Deal animation**: On game start, tiles briefly "deal" by appearing in sequence with a 30ms stagger, each with a small flip-up animation.
- **Dora indicator reveal**: Bright flash when dora tile is flipped, golden sparkle burst.
- **Score announcement**: Large score number floats up from player in `#ffdd44` over 1.5s when scoring.
- **Tenpai indicator**: Subtle steady glow `#4488ff` around player when in tenpai (waiting) state.

### UI Polish

Transform the information panel into an elegant mahjong parlor display. All UI panels use dark mahogany borders `#4a2510` with ivory text `#f0ead8`:

- **Player hand area**: Semi-transparent dark backing `#0a0808` at 60% alpha, bordered with wood frame.
- **Score display**: Gold numerals `#ddaa00` with "pts" in smaller text. Player name above.
- **Wind indicators** (East/South/West/North): Rendered as decorative kanji characters in the player's corner area, styled in `#4a8060`.
- **Turn indicator**: Animated dot in `#00ddaa` bouncing at active player's corner.
- **Yaku/hand display**: When declaring win, a panel slides up showing the hand composition and yaku names.

## Sound Design Plan

*(Web Audio API only)*

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Tile draw from wall | Soft click | Band-pass noise 800–1500 Hz | 0.08s | Ceramic clicking sound |
| Tile discard | Ceramic clack | Noise 600–2000 Hz, sharp attack | 0.1s | Slightly louder than draw |
| Tile placed on table | Thump | Low noise 200–600 Hz | 0.06s | Weight of tile on felt |
| Riichi declaration | Ceremonial gong | Sine 220 Hz + 440 Hz, long decay | 1.5s | Resonant, significant moment |
| Tsumo (self-draw win) | Triumphant bell | Sine 880 Hz + 1760 Hz, ring | 1.0s | Clear, joyful bell tone |
| Ron (win on discard) | Bold gong | Sine 165 Hz + 330 Hz, strong | 1.2s | Deeper, more dramatic than Tsumo |
| Pon (claim tile) | Medium clack | Noise 500–1500 Hz, medium | 0.12s | Assertive ceramic sound |
| Chi (sequence claim) | Lighter clack | Noise 600–1800 Hz, lighter | 0.1s | Similar to Pon, slightly lighter |
| Kan (quad declaration) | Deep resonant hit | Sine 110 Hz + 220 Hz, reverb | 1.0s | Four tiles slam together |
| Furiten warning | Low warble | Sine 330→220 Hz slow bend | 0.5s | Gentle warning, not harsh |
| Round wind change | Wind chime | 3 sine tones: 523+659+784 Hz | 0.8s | Marks new round |
| Dora flip | Shimmer | Ascending 3-tone: 440+554+659 Hz | 0.4s | Expectation, reveal |
| Score calculation | Quick blip sequence | Sine 880 Hz, rapid pulses | 0.5s | Like a counter ticking up |
| Game over | Slow descending tone | Sine 440→220→110 Hz | 1.5s | Melancholy, game end |

### Music/Ambience

A subtle Japanese mahjong parlor atmosphere. Generate using Web Audio: a very quiet ambient loop suggesting a quiet game room — gentle filtered white noise (extreme low-pass, 80 Hz cutoff) at gain 0.02 for air conditioning hum, occasional distant tile sounds (the draw/discard sounds at gain 0.05 randomly firing every 8–15 seconds, suggesting other players at other tables), and a simple pentatonic melodic theme.

The melodic theme: a 16-bar loop on a triangle oscillator (warm tone) through a low-pass filter (1000 Hz cutoff), playing a simple pentatonic melody in D minor pentatonic (D-F-G-A-C). Tempo: 55 BPM, gentle and unhurried. Volume: gain 0.06. This evokes traditional game rooms without being distracting.

## Implementation Priority

**High**
- Tile 3D shadow/edge rendering (depth layers: shadow offset, side strip, face)
- Tile draw/discard ceramic sound effects
- Riichi declaration gong sound
- Tsumo/Ron win sounds (bell/gong)
- Winning tile glow animation + sparkle particles
- Table felt texture (diagonal hatching)

**Medium**
- Wood frame border with mahogany styling
- Tile back pattern (diamond lattice)
- Riichi declaration ring expansion + stick glow
- Score float-up particle animation
- Dora flip shimmer sound + animation
- Overhead lamp radial gradient on table
- Tenpai indicator glow

**Low**
- 3D deal animation (staggered tile appearance)
- Wind indicator compass rose on table
- Background room atmosphere
- Japanese pentatonic ambient music loop
- Distant tile ambience sounds
- Yaku/hand composition display panel
- Furiten warning tone
