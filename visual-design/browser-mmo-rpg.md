# Browser MMO RPG — Visual & Sound Design

## Current Aesthetic
A top-down tile-based RPG with a 600×500 canvas, pink accent color (`#ee44aa`). The world is a 120×100 tile map with distinct zones: town (brown stone `#887755`), forest (dark green trees over floor `#1a3a1a`), dungeon (dark purple `#332233`), and PvP arena (dark red `#3a1a1a`). Tiles are simple flat-color fillRects. Forest trees are flat dark circles on trunks. Water tiles have faint animated shimmer rects. Lava tiles glow with an animated alpha orange overlay. The player and party members are rendered by `drawCharacterR` — a simple circle body with a facing direction dot. Enemies are filled circles with two red eye squares and an HP bar. The boss dragon has a glow. Projectiles are glowing circles. Item drops are plain white/colored squares that bob. The HUD features: HP/MP/XP bars (flat colored bars), an ability bar with 4 slot rectangles bordered in the pink accent, a minimap in the bottom-right, and a quest tracker panel in the top-right. UI panels (inventory, map, shop) are dark rounded rectangles with plain text. Floating damage numbers rise and fade. The background renders as whatever tile the camera is over.

## Aesthetic Assessment
The breadth of this game is impressive — a full RPG with quests, items, abilities, party members, a boss, shops, and a PvP zone in a single canvas game. The minimap is functional. The zone differentiation through tile colors is clear. However every visual element exists at the absolute minimum viable level: characters are blobs, enemies are blobs with squares for eyes, items are floating squares, the UI panels are plain dark rectangles with no border craft. For a game that invites extended play sessions, the visual feedback on combat (floating numbers, particle rings) is sparse. This should feel like a magical world worth exploring — currently it resembles a debug render of the game logic.
**Score: 2/5**

## Visual Redesign Plan

### Background & Environment
The world tiles need environmental storytelling:

**Grass tiles (type 0):** Dark verdant green base (`#1a3a1a`) with subtle variation — random small lighter grass tufts (2-3 tiny bright dots or a 2px horizontal tick mark) at random positions per tile, giving a natural meadow feel without tile repetition.

**Stone/wall tiles (type 2):** A proper cobblestone look — medium grey base with a mortar grid: every 8px, faint dark seam lines form an offset brick pattern. Alternating tile positions vary shade by ±8% for natural stone variation.

**Road/path tiles (type 3):** Warm sandy tan (`#aa9966`) with a subtle gravel texture — scattered 1px slightly lighter dots. The larger stone rects in the current code are fine but should be more numerous and varied in size.

**Town tiles (type 4):** A warm stone floor — slightly lighter than road tiles, with a faint cross-hatch pattern suggesting market square flagstones. Town buildings (the zone border walls) gain a proper rendered look: the town wall tiles show a brick pattern with colored mortar, not just a flat color.

**Forest tiles (type 5):** The tree canopy circle redesign: the circle gets a layered look — a larger darker green base circle (`#0d2a0d`) with a smaller brighter top circle (`#1a4a10`) offset slightly up-left, suggesting sunlight catching the treetop. A faint shadow ellipse below the trunk hints at tree height. Forest floor has dappled light — occasional 8×8px brighter green patches (`#2a4a2a` at 30% extra brightness) scattered between trees to suggest sunbeams through the canopy.

**Dungeon tiles (type 6):** Stone floor — near-black with visible grout lines. Occasional torch sconces visible: a small orange rectangle on random wall-adjacent tiles with a pulsing warm glow (3px radius at 20% alpha orange, cycling 0.6→1.0).

**Lava border tiles (type 7):** The existing animated alpha overlay is good — enhance it with bright orange crack lines (thin 1px lines in a random fracture pattern drawn per-tile at generation, showing through the dark tile as glowing fissures).

**Water tiles (type 1):** The shimmer rects are a good start — increase them to 3-4 shimmer patches per tile at different phases, and add a subtle wave crest line (a thin bright horizontal line that scrolls slowly across the tile from left to right, repeating every 2 seconds).

**PvP arena tiles (type 8):** Dark red-stained stone — the floor has bloodstain splatters (small dark red ellipses at random positions, generated once per tile and stored in a seed pattern), reinforcing the brutal arena atmosphere.

### Color Palette
- Accent / UI border: `#ee44aa`
- Warrior: `#cc4444`
- Mage: `#4466ff`
- Ranger: `#44cc44`
- HP bar: `#cc2222`
- MP bar: `#2244cc`
- XP bar: `#ccaa22`
- Common item: `#dddddd`
- Rare item: `#4488ff`
- Epic item: `#cc44ff`
- Town floor: `#887755`
- Forest floor: `#1a3a1a`
- Dungeon floor: `#221a2a`
- Arena floor: `#2a1010`
- Grass: `#1a3a1a`
- Enemy slime: `#44cc44`
- Enemy wolf: `#888888`
- Enemy goblin: `#66aa33`
- Enemy boss: `#cc2222`
- Quest gold: `#ffcc44`
- Damage number: `#ff4444`
- Heal number: `#44ff88`

### Entity Redesigns
**Player character:** The player is the protagonist — upgrade from a colored circle:
- Body: a filled circle in the class color with a bright top-left specular highlight (a small white arc at 30% alpha inside the circle at upper-left)
- A class-specific visual identifier drawn over the body: warrior gets a tiny shield silhouette (two rectangles forming a kite shield outline in dark metal), mage gets a tiny star shape (4 lines radiating from center), ranger gets a tiny bow arc
- The facing direction dot upgrades to a facing arrow — a small triangle pointing in the movement direction in white
- When invulnerable (flashing): instead of simply toggling visibility, the player glows bright white at 80% opacity for 2 frames, then normal for 2 frames — the glow communicates invulnerability without invisibility
- Level indicator: a small bright number floats just above the player's head at 50% alpha, visible at all times

**Party members:** Similar upgrades — each party member gets the class icon identifier so the player can quickly identify their party composition. A thin colored outline ring distinguishes party members from enemies (outline in the character's class color at 60% opacity).

**Enemies:** A dramatic overhaul from featureless blobs:
- Slime: keep circle but give it a translucent gel look — draw the fill at 80% opacity, then a bright highlight dot (white, 3px) at upper-left, and a slight wobble (the radius alternates ±1px every 6 frames for a gelatinous feel)
- Wolf: dark grey circle with two pointed ear triangles at the top and a slightly lighter snout ellipse extending from the lower front
- Goblin: green circle with a larger head relative to body (drawn as a slightly flattened ellipse), prominent ears (small triangles), and a wicked grin (a thin arc curve in dark green)
- Skeleton: light grey circle with a skull impression — two dark oval eye sockets and a narrow horizontal mouth slit
- Wraith: purple circle drawn at 75% opacity (translucent ghost), with a slow sinusoidal vertical oscillation (hovers up and down 3px over a 2-second cycle)
- Dark Knight: dark blue-grey circle with a full helmet — an arc of slightly lighter grey over the top 60% suggesting a visor, and two narrow slit eyes (1px bright gaps)
- Shadow Dragon (boss): deserves a completely different treatment — not just a big circle but a scaled multi-element drawing: a large dark red ellipse body, a smaller head ellipse offset forward, two wing triangles extending behind (semi-transparent dark red triangles), two bright yellow eye rectangles, and a continuous orange glow radiating from the whole form. The boss also periodically breathes fire: a brief orange cone emanates from the head in the direction of movement, lasting 8 frames every 3 seconds.

**Item drops:** The plain colored squares get an upgrade:
- Common items: white square with a thin matching-color glow
- Rare items: blue square with a continuous slow-rotation sparkle — 3 tiny bright dots orbit the item in a circle
- Epic items: purple square with a bright inner glow and 6 orbiting sparkle dots. The epic item drop also releases a brief vertical beam of purple light upward (3px wide, 30px tall, fading over 0.5 seconds) when it lands, drawing the player's eye across the screen

**Projectiles:** Upgrade beyond plain glowing circles:
- Arrow (ranger): an elongated rectangle (1×6px) rather than a circle, rotated to face the movement direction, with a bright tip and a faint trail of 3 white dots fading behind it
- Firebolt (mage): keep the circle but add 4 radiating fire lines (short orange lines at 45° intervals) that rotate around the projectile as it travels, suggesting a spinning magical bolt
- Lightning (mage): a jagged zigzag line connecting the caster to the target (generated as a series of 4-5 random-offset midpoints), rendered in bright cyan/white, flickering for 3 frames before fading

### Particle & Effect System
**Melee combat impact:** When a melee attack connects, a hit-star burst: 6 short bright lines radiate from the impact point in the attacker's class color, lasting 5 frames. The impact star scales from 50%→100% in 2 frames then fades.

**AoE spells (Ice Nova, Whirlwind):** An expanding ring particle: a circle outline that expands from 10px to the ability range over 0.3 seconds, then fades. The ring color matches the ability type (ice nova: cyan, whirlwind: orange-red).

**Enemy death:** Each enemy type has a unique death effect:
- Slime: 6 green gel blobs (circles) splash outward
- Goblin: 8 small green/brown squares scatter
- Skeleton: white bone fragments (thin rectangles) fly outward
- Wraith: purple wisps (thin curved particle trails) spiral upward and dissipate
- Boss dragon: massive explosion — 15 particles in orange/red/yellow, a screen flash at 30% white alpha for 2 frames, then embers (tiny red/orange squares) drift down for 3 seconds

**Healing:** When heal ability fires or a health potion is consumed, bright green plus signs (+) burst upward from the character (4 of them, each floating 20px upward over 0.5 seconds before fading).

**Level up:** When the player levels up, a dramatic ring of golden stars expands outward from the player (10 small yellow star shapes — rendered as `*` text or a tiny 5-pointed shape). The player name/level display above their head pulses bright for 1 second. The text "LEVEL UP!" rises from the player in large gold text.

**Quest complete:** A golden scroll unrolls briefly from the quest tracker panel — a small bright gold rectangle expands from the quest entry, then a checkmark appears in gold.

**Zone transition:** When moving between zones, a brief vignette darkens (corners go black over 8 frames) then brightens as the new zone name fades in at the screen center.

### UI Polish
The HUD and UI panels get a complete visual overhaul while keeping the same layout:

**HP/MP/XP bars:** Each bar gets a gem-styled container — a dark recessed rectangle with beveled edges (lighter top-left edge, darker bottom-right edge). The bar fill has a bright highlight line along the top edge (brighter strip at 30% alpha) giving a glassy filled-tube appearance. The HP bar pulses red when below 30% health (0.8→1.0 alpha oscillation). The XP bar flashes gold when nearly full.

**Ability bar:** The four ability slots get a proper action bar style: dark stone-texture panels with the pink accent border. The cooldown overlay uses a clockwise sweep (not a top-down fill) — an arc from the top sweeping clockwise as the cooldown depletes, much more visually readable than a dimming fill rectangle. Ability icons get proper small canvas illustrations matching the design doc's power-up card concept: Slash is a sword diagonal, Shield Bash is a shield shape, Whirlwind is a spiral, War Cry is a fist with radiating lines, etc.

**Minimap:** The minimap in the bottom-right gets a dark vignette border — a circular mask that fades to dark at the edges, giving a proper "porthole" look rather than a plain rectangle. Zone colors on the minimap are slightly brighter. The player dot on the minimap pulses gently (1px→3px→1px radius cycle every 2 seconds).

**Quest tracker:** The quest tracker panel on the upper-right gets a parchment-style background (`#2a2010` with a faint diagonal cross-hatch at 5% opacity). Quest names in gold, progress counts in white. Completed quests show a bright green checkmark.

**Inventory/Shop panels:** Panels get a stone-frame border — 3px thick with a brighter outer edge and darker inner edge, using the pink accent color. Item rows have alternating row tints (very subtle lighter/darker alternation) for readability. Rarity color is shown both in the item name and as a small colored gem icon (2×4px rectangle) at the start of each item row.

**Zone name display:** The current zone name at the top center upgrades from a plain text to an ornate title — the text is flanked by two decorative horizontal line segments (simple `────` style) that taper from the accent color to transparent.

## Sound Design Plan
*(Web Audio API only — no external files)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Player footstep (grass) | Soft thud | 120Hz sine, very quiet | 0.04s | Per tile movement |
| Player footstep (stone) | Click | 400Hz square, quiet | 0.03s | Harder surface |
| Melee attack (slash) | Whoosh + crack | Noise sweep 1000→200Hz + 500Hz snap | 0.15s | Sword swing and impact |
| Shield Bash | Heavy thud | 100Hz sine + noise burst | 0.25s | Powerful block |
| Arrow shot | Twang | 500→200Hz sine, fast | 0.1s | Bowstring release |
| Firebolt | Crackle | 300Hz square + bandpass noise | 0.2s | Magical fire |
| Lightning | Electric snap | White noise + 1200Hz harmonic | 0.12s | Lightning crack |
| Ice Nova | Crystal burst | 880+1100Hz sines, chord | 0.4s | Ice shattering |
| Heal | Shimmer | 784+1046+1318Hz ascending | 0.5s | Healing magic |
| Enemy hit | Impact | 200Hz sine + noise, 0.05s | 0.1s | Generic hit |
| Slime death | Splat | Noise burst, 0.08s, lowpass | 0.1s | Gooey impact |
| Skeleton death | Rattle | Noise burst + 400Hz crunch | 0.15s | Bones breaking |
| Boss roar | Deep roar | 40Hz+80Hz sine sweep + noise | 1.0s | Dragon vocalization |
| Item pickup | Chime | 1046Hz sine, bright | 0.2s | Positive pickup |
| Level up | Fanfare | 523+784+1046+1318Hz arpeggio | 0.8s | Achievement chord |
| Quest complete | Trumpet sim | 659+784+987Hz sustained | 1.2s | Quest fanfare |
| Shop purchase | Coin clink | 1200Hz sine, fast decay | 0.1s | Transaction sound |
| Door open | Creak | 200→100Hz sine + noise | 0.3s | Entering building |
| Zone transition | Sweep | 300→600Hz sine over 0.4s | 0.4s | Zone change tone |
| Player death | Descend | 400→80Hz sine, 1s + noise | 1.5s | Defeated tone |

### Music/Ambience
A multi-zone adaptive ambient soundtrack that changes as the player moves through the world. Each zone has its own musical identity, cross-fading as the player transitions:

**Town of Haven:** Warm and peaceful — a simple melody on sine waves: 523, 659, 784, 659, 523, 784Hz (C major scale, 0.5s per note, repeating) at very low amplitude (0.02), with a light background chord (130+196Hz sine waves providing a bass foundation). Tempo: slow and unhurried at ~70 BPM felt by the melody spacing.

**Darkwood Forest:** Eerie and atmospheric — the town melody fades, replaced by a low drone (82+110Hz sines at 0.015 amplitude) and occasional high bird-like tones (1760Hz sine, brief attack, 0.5s decay) at random 8-15 second intervals. A subtle wind sound (filtered noise, 100-800Hz bandpass, 0.008 amplitude) provides continuous texture.

**Obsidian Dungeon:** Tense and threatening — a menacing low pulse (55Hz sine at 0.02 amplitude on every beat at 90 BPM), combined with a descending 3-note motif that repeats: 196→164→147Hz on a sawtooth wave, each note 0.3s. Occasional distant metallic impact sound (filtered noise hit at 0.012 amplitude every 7-15 seconds) suggests unseen dangers.

**PvP Arena:** Aggressive and intense — a fast-paced beat (80Hz kick sine every 0.4s, filtered noise snare every 0.8s) at 150 BPM, with a short repeating melodic phrase on square waves: 523, 784, 523, 659Hz, each 0.15s. The energy is much higher here.

**Combat escalation:** During any active combat (enemies nearby and engaging), the current zone's ambient music gains an additional layer — a low rhythmic pulse (60Hz sine at 0.015) starts hitting on every beat, adding urgency without changing the zone character.

**Boss fight:** The dungeon ambience drops entirely and is replaced by a dedicated boss theme: a driving 4-note progression on sawtooth waves (196, 220, 247, 174Hz, each 0.5s, repeating) with a persistent kick-drum bass (80Hz sine every 0.5s). The ambient drone continues beneath at reduced volume.

## Implementation Priority
- High: Enemy visual redesigns (class-appropriate shapes for slime/wolf/goblin/skeleton/wraith/dark knight), boss dragon multi-element drawing with fire breath, item drop rarity sparkle orbits and epic beam effect
- Medium: Zone-adaptive ambient music with cross-fade, melee impact star burst particles, ability cooldown arc sweep instead of fill, player class icon overlay
- Low: Tile texture variety (grass tufts, forest dappled light, dungeon torch sconces), world map zone transition vignette, level-up star ring explosion, quest complete scroll animation
