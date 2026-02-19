# Plants vs. Zombies — Visual & Sound Design

## Current Aesthetic

A 600x500 canvas with a 9x5 lawn grid, a left sidebar (60px) for plant selection, and a top bar (50px) for resources. The lawn grid alternates between two dark greens (`#1a2a1e` and `#182418`). Plants are rendered as text symbols — P (Peashooter), S (Sunflower), W (Wall-nut), I (Snow Pea) — centered in their cells with color coding. Zombies are circles with basic limb lines. Peas are small green circles. Sun tokens are yellow circles that fall from above and can be clicked. The sidebar shows plant costs and cooldowns.

## Aesthetic Assessment
**Score: 2/5**

The mechanics are well-implemented — lane targeting, sun management, wave escalation — but the visual presentation is drastically under-realized. Using letter symbols for plants completely kills any charm. Zombies as plain circles have zero personality. The lawn is a flat dark rectangle. Sun collection is functional but joyless. This game's original appeal came entirely from the quirky visual personalities of each plant and zombie type — something this implementation doesn't even attempt.

## Visual Redesign Plan

### Background & Environment

The lawn becomes a proper suburban backyard scene. A bright sky zone at the very top (12px) transitions from morning blue to the lawn area. The 9x5 grid uses two alternating bright greens — lighter and darker strips — suggesting mown grass rows (`#2a4a20` and `#223a18`). Each cell has subtle grass texture: thin vertical stroke lines at 10% opacity within the cell. The left sidebar becomes a seed packet display on a wooden fence post — the fence board visual frames the plant selection cards. The top bar is a wooden trough holding the sun counter and score.

A wooden fence post with wire stretches across the top of the play area. In the background (very faint), a house wall with windows can be seen behind the lawn. The night-time wave transition darkens the sky and adds stars.

### Color Palette
- Sky: `#7ec8e3`, `#a8d8ea`
- Lawn light row: `#2a4a20`
- Lawn dark row: `#223818`
- Grass texture: `#3a5a2a`
- Fence post: `#8b5e3c`, `#a0724a`
- Peashooter: `#44aa22`
- Sunflower: `#ffcc00`, `#ff9900`
- Wall-nut: `#c8943a`, `#a07030`
- Snow Pea: `#66ddff`, `#44aadd`
- Sun token: `#ffee22`, `#ffcc00`
- Zombie skin: `#8fbc8f`, `#6aab6a`
- Zombie dark: `#4a7a4a`, `#3a6a3a`
- Pea projectile: `#44dd22`
- Frozen pea: `#88ddff`
- HUD wood: `#5c3820`, `#7a4e30`
- HUD gold: `#cc9900`

### Entity Redesigns

**Peashooter:** Replace the "P" text with a proper iconic drawing. A rounded green spherical body (large filled circle), two eyes (small white circles with black dots), a wide mouth-like opening facing right, and a barrel/tube extending from the mouth. Leaves extend from the sides. The barrel puffs with a small smoke ring when firing. The body bobs slightly up and down on a loop animation.

**Sunflower:** A bright yellow flower with 8 petal shapes (elongated ellipses arranged around a center circle) and a brown-yellow center disk. Two small leaves extend from a green stem. The head turns slowly to track sunlight (oscillates 15 degrees left and right). When producing a sun, the center disk brightens and the petals flare.

**Wall-nut:** A round nut shape — an oval body in brown with visible crack lines drawn across the surface. Eyes look worried. As HP drops, the crack lines multiply and deepen. At low HP the face looks pained and the cracks glow slightly red.

**Snow Pea:** Similar to Peashooter but in icy blue-white with frost crystal decorations on the body. The barrel has frost riming the tip. Fires frozen peas (ice-blue projectiles) that leave a brief frost trail.

**Zombies:** Each zombie type gets a distinct visual body:
- Basic zombie: A shambling humanoid shape — rounded rectangle torso, circular head with wild hair lines, arms extending forward (classic zombie pose), torn shirt lines on body
- Cone zombie: Basic zombie + an orange traffic cone shape on the head (triangle)
- Bucket zombie: Basic zombie + a gray rectangular bucket on the head with a handle
- Flag zombie: Basic zombie + a tiny flag held in one arm, rendered as a colored rectangle on a stick
Each zombie's skin is sickly green, clothes are dark gray. Zombie walking is animated — alternate leg positions (2 frames, each leg forward/back). Eyes are X marks or spirals. Low-HP zombies have visible damage marks (red marks on body).

**Peas:** Green filled circles with a slight highlight at upper-left. Frozen peas are ice blue with a small star sparkle. Peas leave a very brief motion trail (1 ghost position at 50% opacity).

**Sun tokens:** Brighter and more animated — a larger circle with 8 short ray lines extending outward, all in bright yellow. The rays rotate slowly. When clicked, the sun token spins rapidly and shrinks toward the sun counter with a brief golden trail.

### Particle & Effect System

- **Zombie hit by pea:** Small green splat — 4 particles in pea color, 10-frame life, scatter from hit point
- **Zombie hit by frozen pea:** Ice crystal burst — 4 blue-white particles + brief frost ring around zombie
- **Zombie death:** Larger explosion of 8 gray-green particles (zombie body pieces) + a brief score pop text
- **Sun collection click:** Sun token spins and zooms toward counter with a golden trail of 5 particles
- **Plant placed:** Brief green sparkle — 4 small particles emit from the cell corners, 8-frame life
- **Wall-nut damaged:** Crack appears with a small dust cloud — 3 gray particles
- **Wave incoming flag:** Flag zombie's appearance is preceded by a dramatic red warning flash on the right edge
- **Level clear:** Garden celebration — flowers and leaves (8 particles each) burst from every cell with a plant in it

### UI Polish

The seed selection sidebar becomes proper seed packets — each plant shows in a little card with rounded corners, a small plant icon, and the sun cost in bold. Cards gray out and show a cooldown fill animation (like a recharging gauge filling from bottom to top in the plant's color) when on cooldown. The sun counter at top shows as a glowing sun icon with a number badge. The wave counter shows as a "WAVE X" banner that slides in dramatically from the right when a new wave begins. At the bottom of the screen, a lawn mower sits at the left edge of each row — if a zombie reaches it, the mower activates (bold animation) and clears the row.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Pea shoot | Soft pop | Sine 400Hz, fast attack decay | 60ms | Light vegetable launch sound |
| Frozen pea shoot | Icy whoosh | Sine 500Hz + high noise hiss | 80ms | Cooler, sharper than regular pea |
| Pea hit zombie | Squishing thud | Noise + 300Hz sine, soft decay | 100ms | Satisfying veggie impact |
| Zombie takes damage | Groan | Descending noise 400→200Hz | 200ms | Zombie discomfort |
| Zombie dies | Pop + moan | Noise burst + 150Hz descend | 300ms | Comic death sound |
| Sun collected | Sparkle chime | Rising sine 600→1000Hz + 2nd harmonic | 200ms | Joyful reward |
| Sunflower produces sun | Gentle hum | Sine 440Hz, swell up and fade | 400ms | Warm, nurturing tone |
| Plant placed | Earth thud | Noise lowpass 600Hz | 100ms | Planting in soil feel |
| Wave incoming | Horn blast | Sawtooth 220Hz + 330Hz, sharp attack | 600ms | Urgent warning |
| Lawnmower activate | Engine roar | Noise + rapid 80Hz pulse | 800ms | Mechanical roar sweep |
| Level complete | Garden fanfare | C-G-E-C arpeggio, sine wave | 1s | Cheerful resolution |
| Zombie on screen | Shuffle | Very light noise burst, 200Hz | 150ms | Each zombie appearance |

### Music/Ambience

A whimsical, light-hearted garden theme: a simple melody played on triangle waves (bright, slightly toy-like) with a soft oom-pah bass (sine wave at low notes alternating 110/165Hz). The rhythm has a gentle walking feel at 105 BPM — matching zombie shuffle pace. The melody uses a major scale with occasional chromatic passing tones for quirkiness. When a night wave begins, the music shifts to a minor variant and adds a low bass drone. During the lawnmower sweep, music drops briefly. Volume: ~20% behind effects.

## Implementation Priority
- High: Plant iconic drawing replacements (especially Peashooter and Sunflower), zombie humanoid body shapes with walk animation, sun token sparkle + collection animation
- Medium: Lawn grass texture streaks, fence post sidebar aesthetic, pea hit splat particles, wave incoming dramatic horn + banner, Wall-nut crack damage states
- Low: Sky background with house silhouette, seed packet cooldown animation, level clear garden particle burst, background garden music, zombie type visual variations (cone/bucket/flag)
