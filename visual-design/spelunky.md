# Spelunky — Visual & Sound Design

## Current Aesthetic

480x480 procedurally generated platformer. A 15x15 tile grid (TILE=32) with 7 tile types. Walls are drawn as brown `#3a2a1a` rectangles with darker `#2a1a0a` brick-pattern lines (outline, horizontal midline, vertical divider in top half). Spikes are grey triangle polygons. Ladders are brown `#864` rails with rung rectangles. The exit is a golden `#ea6` door frame with glow; entrance is grey. Arrow traps are wall tiles with a red directional triangle. The player is a warm amber `#ea6` body rectangle with a darker head, a brown hat, white eyes with a dark pupil, and a whip line animation. Three enemy types: snake (green circle with red eye), bat (purple circles with wing triangles and flapping animation), spider (brown circle with 6 leg lines). Items: gold (yellow circle), gem (cyan diamond polygon), chest (amber rectangle). Fog of war darkens tiles beyond 5.5 tile radius with a smooth darkness gradient. Particle squares scatter on hit/collection. The overall palette is warm brown/amber with cyan/red accents — evoking classic Spelunky's color scheme appropriately.

## Aesthetic Assessment
**Score: 3.5/5**

The foundation is actually quite strong for this style of game. The brick pattern on walls has real texture. The fog of war system creates genuine atmosphere. The whip animation is functional. Where it falls short: the player character is a plain amber rectangle with minimal personality. Enemies are basic primitive shapes. The cave environment reads as generic — there's no environmental storytelling, no sense of depth or layer. The most significant missing element is sound — each interaction (whip, landing, collecting gold, getting hit) demands audio feedback. Without it, the game feels hollow. The particle system is underdeveloped: bomb explosions and enemy deaths need far more visual drama.

## Visual Redesign Plan

### Background & Environment

**Cave atmosphere:** The background behind the game area should actively contribute to the feeling of deep underground. Where empty space exists (EMPTY tiles), draw a very dark `#060610` near-black, not just black. Add subtle cave features:
- Rock texture on empty tiles near walls: very faint grey speckles (1px dots at 8% opacity) suggesting rough cave surfaces
- Moisture drops: occasionally (randomly distributed, persistent) a 1px pale blue-white dot on EMPTY tiles near walls — cave drips
- Deep background parallax: behind the entire tile grid, draw a very faint (3% opacity) slightly offset copy of the wall tiles — suggesting cave depth

**Wall tiles:** The existing brick pattern is good. Enhance it:
- Add 2-3 small random "crack" details per wall tile — thin 1-2px lines in a darker color suggesting age
- Occasional moss patches: small `#1a3300` rectangles (2-4px) in the mortar lines of some wall tiles
- Edge highlighting: where walls meet empty space, add a 1px lighter `#554433` highlight on the exposed edge, giving walls a 3D raised appearance

**Lighting system:** The fog of war is already the game's strongest visual. Enhance the falloff:
- The current linear darkening works, but replace with a smoother exponential curve — tiles at 4-5 tile distance should still be fairly bright; the darkness should concentrate in the 5-5.5 tile boundary
- Add a warm amber tint to the well-lit area near the player (multiply visible tiles with a very subtle warm overlay `#ffcc8808`) — as if the player carries a torch
- For the exit tile, let its golden glow radiate beyond its tile — add a light contribution that slightly brightens the 2-3 tiles around it

**Entrance/exit doors:** The current door frames are good structure. Add more character:
- Entrance: Grey weathered stone door frame; vines drawn as thin green lines along the frame edges (curved drawLine paths in `#224400`)
- Exit: The golden frame should have animated glow — a slow pulsing halo (varying radius ±3px, cycling at 1Hz) in amber, and small golden dust particles slowly rising from its threshold

### Color Palette
- Player body: `#ddaa55`
- Player hat: `#7a5533`
- Player eye: `#ffffff` / `#000000`
- Wall: `#3a2a1a`
- Wall mortar: `#2a1a0a`
- Wall highlight: `#554433`
- Background deep: `#060610`
- Spike: `#999999`, `#aaaaaa`
- Ladder: `#996644`
- Exit glow: `#ffcc55`
- Entrance: `#666666`
- Snake: `#116622`, `#ff0000`
- Bat: `#880088`, `#aa00aa`
- Spider: `#774422`, `#ff4444`
- Gold: `#ffdd00`
- Gem: `#44aaff`
- Chest: `#ddaa55`, `#ffdd00`
- Bomb: `#444444`, `#ff8800`
- Arrow: `#aa6644`
- Particle hit: `#ff4444`
- Particle gold: `#ffdd00`
- Glow/bloom: `#ffcc55`, `#ff4444`, `#44aaff`

### Entity Redesigns

**Player character:** Replace the plain rectangle with a more recognizable adventurer silhouette at the tile scale:
- Head: Slightly wider rounded rectangle in `#ddaa55` with the brown hat as a distinct shape — hat brim extends 2px beyond head width, crown is a slightly narrower rectangle above
- Body: Narrower than head, with a color-differentiated shirt (lighter amber stripe in the center suggesting a shirt/vest detail)
- Facing direction clearly indicated: eyes always positioned toward facing direction; when facing left, the entire body polygon flips (mirroring)
- Whip redesign: Instead of a plain line, draw the whip as a curved arc that sweeps out — use 4-5 line segments with slight angular offsets to create a lashing curve effect; add a bright flash at the tip during the final frames
- Landing animation: For 3 frames after landing from a fall, slightly compress the player height by 10% (squash) then spring back to normal

**Snake:** Upgrade from a plain circle to a proper serpent silhouette:
- Elongated oval body (use an ellipse approximation with a wider x than y dimension, matching the current 20x12 hitbox)
- Head slightly wider than body, with a distinct flatter shape
- Visible scales: 3-4 small crescent shapes along the top of the body in a slightly darker green
- Forked tongue: instead of a single line, split the end into a V-shape (two short lines diverging)
- Winding motion: the body oscillates with a sine wave pattern when moving (body polygon subtly shifts side-to-side based on frameCount)

**Bat:** The current wing flap animation is already good. Enhance:
- Body is a 5-sided polygon suggesting a bat torso (not a perfect circle)
- Ears: two small triangles protruding from the top of the head
- Wing polygons get more detail — 3 vertices instead of 1 apex; the membrane curves more naturally
- When active and chasing, add a bright red glow to the eyes
- Leave a very faint trail (2-3 ghost wing shapes at low opacity) when flying fast

**Spider:** The current circle-with-legs is recognizable. Enhance:
- Draw the spider as two connected circles (abdomen larger, thorax smaller) rather than one
- 8 legs instead of 6 (4 per side), with proper spider geometry — each leg has a knee bend (two segments per leg)
- Web line when hanging: instead of a plain straight line, add 1-2 small horizontal cross-threads on the web line to suggest a silk strand
- When falling/dropping, leave a brief silk trail behind

**Items:**
- Gold: Add a small glint animation — a 1px white dot that briefly appears at the top of the gold circle and fades (every 60 frames)
- Gem: The diamond polygon should be faceted — add a slightly lighter interior triangle in the upper half suggesting a cut gem face
- Chest: Add a decorative lock mechanism — a small keyhole shape (circle + rectangle below) on the chest front

**Bombs:** The current dark circle with fuse line is good. Add a ticking visual: the fuse spark at the top should alternate between `#ff8800` and `#ffff00` every 3 frames; as the timer runs down (timer < 30), increase the flicker rate to every frame. The glow also should pulse in intensity with the flicker.

**Arrows:** Upgrade from a plain triangle to a proper arrow shaft with fletching — a thin rectangle as the shaft, triangle arrowhead, and two small diagonal lines at the tail end as fletching feathers.

### Particle & Effect System

- **Whip hit (enemy killed):** 10 particles in the enemy's color burst outward radially; a brief bright flash at the hit point
- **Bomb explosion:** Multi-stage blast — first a white flash frame covering a 3-tile radius area; then 20+ orange/yellow particles radiating outward; then smoke particles (grey at 50% opacity, slow drift upward) over 30 frames; tiles destroyed show a brief "rubble" fragment (small grey polygons that fall downward and fade)
- **Gold collected:** 8 tiny yellow spark particles burst upward from the collection point; a +100 float-up text briefly appears in gold color
- **Gem collected:** 12 cyan particles burst in all directions; the diamond shape shatters (3 small triangle fragments that drift apart briefly)
- **Chest opened:** Larger golden burst — 15+ gold/amber particles; a brief warm glow brightens surrounding tiles
- **Player hit by enemy:** 6 red particles scatter from impact; player flashes with a bright red overlay (not just the existing blink); brief screen-edge red vignette
- **Arrow fired:** The trap tile crumbles (becomes a wall tile) with 4 brown dust particles; the arrow leaves a very brief motion blur (2 ghost positions at low opacity behind it)
- **Level complete (exit reached):** The player dissolves into amber particles that swirl into the exit door — 20+ particles spiral inward over 20 frames, then flash white
- **Spider drops:** A brief silk strand appears at the ceiling connection point for the first few frames of the drop, then snaps

### UI Polish

- HP display: Instead of just a number, draw HP as small heart icons (diamond polygon rotated, in red) — 4 hearts, dark/empty for lost HP
- Bomb and rope counts: Draw small bomb/rope icons beside the counts rather than plain text
- Level number: Large faint watermark in the background center (barely visible at 4% opacity)
- Canvas HP bar: The current green/red bar at the top is fine — add a slight amber border in `#ea6` color matching the player
- When all HP is lost (last heart), the HP bar pulses red urgently

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Whip attack | Sharp crack | White noise burst, 300 Hz high-pass, fast attack | 80ms | Satisfying physical snap |
| Footstep | Soft tap | 300 Hz sine, very short | 25ms | One per stride, alternating pitch 300/260 Hz |
| Jump | Spring boing | Sine 400→800 Hz sweep, medium | 100ms | Light and bouncy |
| Land (normal) | Thud | 80 Hz sine + noise burst, fast | 80ms | |
| Land (hard fall) | Heavy thud | 60 Hz sine + louder noise, slightly longer | 150ms | Fall damage landing |
| Gold collected | Coin ping | Sine 1320 Hz + 1760 Hz, bell envelope | 200ms | Classic coin sound |
| Gem collected | Crystal chime | Sine 2000 Hz + 3000 Hz, long bell envelope | 400ms | Rarer item, richer sound |
| Chest opened | Treasure reveal | Ascending arpeggio 440→660→880→1320 Hz | 500ms | Treasure fanfare |
| Player hurt | Damage yelp | Noise burst + 400 Hz sine blip | 150ms | Pain signal |
| Enemy killed (whip) | Squish hit | Noise burst + 220 Hz thud | 100ms | Impact satisfaction |
| Bomb fuse | Ticking | 800 Hz square wave clicks at 4Hz | Loop until explode | Gets faster last second |
| Bomb explosion | Big blast | Brown noise burst + 60 Hz sine punch, multi-layer | 600ms | Most dramatic sound |
| Arrow trap fires | Twang + whoosh | Pluck (sine 440 Hz, fast decay) + noise sweep | 200ms | Trap surprise |
| Arrow hits player | Sharp impact | Noise burst + 660 Hz blip | 100ms | |
| Ladder climb | Wooden creak | Low-frequency noise at 200 Hz, 3Hz rhythm | Loop | While climbing |
| Level complete | Exit portal hum | Sine 220 Hz + 330 Hz drone | Fade out | As player exits |
| Level start | Cave echo | Noise filtered 400 Hz low-pass, slow fade | 600ms | Entering new cave |
| Game over | Death sting | Sawtooth 440→220 Hz descend + noise fade | 800ms | |

### Music/Ambience

A tense atmospheric cave ambience with no melody — pure environmental sound suggesting deep underground danger. Three layers:

- **Cave drone:** A very quiet sustained tone at 65 Hz (slightly detuned below the standard C) on a triangle wave, filtered through a low-pass at 120 Hz at 4% volume — this is the geological hum of being underground. On lower levels (levelNum > 5), the drone drops further to 50 Hz and gains a very slow tremolo at 0.3 Hz, becoming more oppressive.

- **Water drip ambience:** Every 6-15 seconds (randomized), a brief sine tone at 800-1200 Hz with a fast attack and medium decay (50-200ms) — simulating water dripping in a cave. The pitch and timing are randomized each instance. These should be very quiet and tonally neutral — they add atmosphere without distracting.

- **Tension layer:** As the player approaches enemies (within 3 tiles), a barely-audible high-frequency shimmer activates — white noise filtered to 5000-8000 Hz at 2% volume with a slow 2Hz tremolo. This creates subconscious unease without any obvious musical element. As levelNum increases, this layer appears more frequently, increasing generalized tension.

No rhythm, no melody. The sound design philosophy for spelunky is that the player's actions provide all the rhythm — footsteps, whips, coins, and bombs create the soundtrack. The ambience should feel like silence with texture.

## Implementation Priority
- High: Whip crack sound, coin collect ping, bomb explosion sound (multi-layer), player hurt damage sound, jump/land audio
- Medium: Player character visual redesign (hat shape, body proportions), bomb explosion multi-stage particle blast, gold float-up text, spider 2-circle body with 8 legs
- Low: Wall crack details and moss, torch-warm lighting tint near player, snake winding body motion, water drip ambience synthesis, bat trail ghost wings
