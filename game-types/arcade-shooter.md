# Genre: Arcade Shooter

**Status**: complete
**Last Updated**: 2026-02-20
**Complexity**: medium
**Reference Image**: images/arcade-shooter-reference.png

---

## Identity

The arcade shooter is one of the oldest and most enduring video game genres. At its core, the player fantasy is simple: you pilot a vessel -- a ship, a fighter jet, a mech, a wizard -- through waves of hostile forces, destroying everything in your path while weaving between deadly projectile patterns. The genre distills gaming to its purest feedback loop: see threat, react, destroy, survive. There is an almost meditative quality to a well-tuned shooter, where the player enters a flow state, processing dozens of on-screen objects simultaneously and responding with pixel-precise movements.

What separates arcade shooters from other action genres is the emphasis on moment-to-moment spatial reasoning over long-term strategy. The player rarely makes decisions about resource allocation, dialogue, or exploration. Instead, every frame demands an answer to the question: "Where should I be right now, and what should I be shooting?" This makes shooters exceptionally well-suited for ML training data -- the visual state is information-dense, actions are continuous and reactive, and the reward signal (score, survival) is immediate and unambiguous.

The genre has branched into several distinct sub-genres, each with its own design language:

### Sub-genres

| Sub-genre | Perspective | Movement | Scrolling | Canonical Examples |
|-----------|------------|----------|-----------|-------------------|
| **Fixed shooter** | Top-down or bottom-up | Horizontal only (along one axis) | None (single screen) | Space Invaders (1978), Galaga (1981), Galaxian (1979), Phoenix (1980) |
| **Vertical scrolling shooter (shmup)** | Top-down | 8-directional or omnidirectional | Auto-scroll vertical | 1942 (1984), Raiden (1990), DoDonPachi (1997), Ikaruga (2001) |
| **Horizontal scrolling shooter** | Side-view | 8-directional | Auto-scroll horizontal | R-Type (1987), Gradius (1985), Darius (1986), Thunder Force III (1990) |
| **Bullet hell / danmaku** | Top-down | Omnidirectional, small hitbox | Vertical or fixed | Touhou series, DoDonPachi, Mushihimesama (2004), Jamestown (2011) |
| **Twin-stick shooter** | Top-down | Omnidirectional (left stick move, right stick aim) | None (arena) | Robotron: 2084 (1982), Geometry Wars (2003), Smash TV (1990), Nuclear Throne (2015) |
| **Arena shooter** | Top-down or isometric | Omnidirectional | None (bounded arena) | Asteroids (1979), Crimsonland (2003), Vampire Survivors (2022) |
| **Run-and-gun** | Side-view | Platformer-style (run, jump, shoot) | Horizontal or vertical | Contra (1987), Metal Slug (1996), Gunstar Heroes (1993), Cuphead (2017) |

### Classic Game Analysis

**Space Invaders (1978)**: Established the core loop of the entire genre. The formation-descent mechanic creates natural escalation -- as you kill enemies, the remaining ones move faster, making the endgame frantic even though the game starts slow. The shields that degrade with both enemy and player fire introduce tactical depth without complexity. Design lesson: the simplest possible escalation mechanic (fewer enemies = faster movement) is still one of the most effective.

**Galaga (1981)**: Introduced risk/reward with the tractor beam mechanic. Letting your ship get captured to reclaim it later for dual-fire power is a genuine strategic choice mid-combat. The swooping entry patterns gave enemies personality that grid-marching lacked. Design lesson: give the player a reason to take voluntary risk for a meaningful reward.

**R-Type (1987)**: Pioneered the charge-shot and the Force pod -- a detachable weapon orb that could be positioned in front or behind the ship. The level design was crafted around these mechanics, with corridors that required precise Force placement. Design lesson: a single deep mechanic (the Force pod) creates more interesting gameplay than many shallow ones.

**DoDonPachi (1997)**: Defined the bullet hell sub-genre. Hundreds of bullets on screen, but a tiny hitbox (often just 1-2 pixels at the ship's center). The "graze" scoring system rewarded flying as close to bullets as possible without being hit. Design lesson: perceived danger and actual danger can be decoupled to create tension without unfairness.

---

## Core Mechanics (deep)

### Player Movement

Movement is the most important mechanic in a shooter -- it determines how the player relates to danger.

| Movement Type | Axes | Feel | Best For |
|--------------|------|------|----------|
| **Horizontal only** | 1-axis (left/right) | Constrained, deliberate | Fixed shooters (Space Invaders, Galaga) |
| **4-directional** | 2-axis (no diagonals) | Grid-like, snappy | Retro-styled games |
| **8-directional** | 2-axis (with diagonals) | Fluid, standard | Most shmups (R-Type, Raiden) |
| **Omnidirectional** | Full 360 degrees | Free, responsive | Twin-stick, arena (Geometry Wars) |
| **Inertial** | Omnidirectional + momentum | Floaty, skill-intensive | Asteroids-style, space games |

**Recommended default values (Canvas pixels at 60fps):**

```
PLAYER_SPEED       = 4-6 px/frame    (normal movement)
PLAYER_SPEED_FOCUS = 1.5-2.5 px/frame (focused/slow mode for bullet hell)
PLAYER_ACCEL       = 0.5 px/frame^2   (if using inertial movement)
PLAYER_FRICTION    = 0.92              (if using inertial movement)
PLAYER_BOUNDS      = { x: 0, y: canvasHeight * 0.4, w: canvasWidth, h: canvasHeight * 0.6 }
                     (restrict player to bottom 60% of screen for vertical shooters)
```

**Focus mode**: In bullet hell games, holding a modifier key (Shift) slows the player to ~40% speed and often reveals the true hitbox. This is critical for navigating dense patterns. The hitbox should visually pulse or glow during focus mode.

### Shooting

| Property | Range | Notes |
|----------|-------|-------|
| **Fire rate** | 4-15 shots/sec (every 4-15 frames at 60fps) | Too fast feels spammy; too slow feels sluggish |
| **Bullet speed** | 6-12 px/frame | Must be faster than enemies to feel impactful |
| **Max bullets on screen** | 2-8 | Limiting bullets forces aim; unlimited feels mindless |
| **Bullet width** | 3-6 px | Thin bullets look and feel better |
| **Auto-fire** | Optional toggle | Reduces RSI; good for accessibility |

**Weapon types (progressive power-ups):**

```
Level 0: Single shot        — 1 bullet, straight ahead
Level 1: Double shot        — 2 parallel bullets, slight spread
Level 2: Triple shot        — 3 bullets in a narrow fan (center + /-8 degrees)
Level 3: Wide spread        — 5 bullets in a wide fan (center + /-15, /-30 degrees)
Level 4: Laser              — Continuous beam, pierces enemies
Level 5: Homing missiles    — Slower but auto-aim at nearest enemy
```

**Charged shots** (R-Type style):

```javascript
// Hold fire button to charge, release to fire
const CHARGE_RATE = 1;           // charge units per frame while held
const CHARGE_MAX = 90;           // frames to full charge (1.5s at 60fps)
const CHARGE_DAMAGE_MULT = 5;    // full charge does 5x damage
const CHARGE_SIZE_MULT = 3;      // full charge bullet is 3x larger

// Visual feedback: ship glows brighter as charge builds
// Audio feedback: rising pitch tone during charge
```

### Enemy Patterns

Enemies are defined by three properties: **movement**, **shooting**, and **health**.

**Movement patterns:**

```javascript
// Sine wave (classic swooping)
enemy.x = startX + Math.sin(enemy.t * frequency) * amplitude;
enemy.y = startY + enemy.t * descentSpeed;

// Bezier curve (scripted dive paths)
// Define control points: start, cp1, cp2, end
function bezierPoint(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
}

// Grid formation march (Space Invaders)
formation.x += formation.direction * formation.speed;
if (formation.x + formation.width > canvasWidth || formation.x < 0) {
  formation.direction *= -1;
  formation.y += DROP_DISTANCE; // typically 10-20 px
}

// Circle orbit (enter from top, orbit a center point)
enemy.x = centerX + Math.cos(enemy.angle) * radius;
enemy.y = centerY + Math.sin(enemy.angle) * radius;
enemy.angle += orbitSpeed;

// Kamikaze dive (break from formation, aim at player)
const dx = player.x - enemy.x;
const dy = player.y - enemy.y;
const dist = Math.sqrt(dx*dx + dy*dy);
enemy.x += (dx / dist) * diveSpeed;
enemy.y += (dy / dist) * diveSpeed;
```

**Enemy archetypes:**

| Type | HP | Movement | Shooting | Points |
|------|-----|----------|----------|--------|
| **Grunt** | 1 | Linear descent or grid march | Occasional single shot | 100 |
| **Swooper** | 1 | Sine-wave or bezier dive | Shoots during dive | 150 |
| **Tank** | 3-5 | Slow, deliberate | Spread shot or aimed | 300 |
| **Speeder** | 1 | Fast, erratic dashes | None or quick burst | 200 |
| **Splitter** | 2 | Standard | None; spawns 2 minis on death | 250 |
| **Phaser** | 1 | Standard with blink | Shoots while visible | 200 |
| **Bomber** | 2 | Slow, high altitude | Drops aimed clusters | 350 |
| **Shield** | varies | Orbits a boss or group | None; absorbs damage | 50 |
| **Turret** | 3-6 | Stationary (on terrain) | Aimed shots at player | 400 |

### Bullet Patterns

Bullet patterns are the language of the shooter genre. Each pattern creates a distinct spatial challenge.

```javascript
// Aimed shot — fires directly at the player
const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
spawnBullet(enemy.x, enemy.y, Math.cos(angle) * speed, Math.sin(angle) * speed);

// Ring / radial burst — fires N bullets in a circle
for (let i = 0; i < N; i++) {
  const angle = (i / N) * Math.PI * 2;
  spawnBullet(enemy.x, enemy.y, Math.cos(angle) * speed, Math.sin(angle) * speed);
}

// Spiral — rotating ring over time
const baseAngle = enemy.spiralAngle;  // increments each firing cycle
for (let i = 0; i < N; i++) {
  const angle = baseAngle + (i / N) * Math.PI * 2;
  spawnBullet(enemy.x, enemy.y, Math.cos(angle) * speed, Math.sin(angle) * speed);
}
enemy.spiralAngle += spiralRotation;  // 0.1 to 0.3 radians per cycle

// Spread / fan — fires N bullets in a cone aimed at player
const aimAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
const spreadTotal = spreadAngle;  // e.g., Math.PI / 4 for a 45-degree fan
for (let i = 0; i < N; i++) {
  const angle = aimAngle - spreadTotal/2 + (i / (N-1)) * spreadTotal;
  spawnBullet(enemy.x, enemy.y, Math.cos(angle) * speed, Math.sin(angle) * speed);
}

// Random scatter — fires N bullets in random directions within a cone
for (let i = 0; i < N; i++) {
  const angle = aimAngle + (Math.random() - 0.5) * scatterAngle;
  const s = speed * (0.7 + Math.random() * 0.6);  // varied speeds
  spawnBullet(enemy.x, enemy.y, Math.cos(angle) * s, Math.sin(angle) * s);
}

// Laser / beam — continuous line from enemy to direction
// Draw a line, check intersection with player hitbox each frame
// Telegraphed: show a thin warning line for 30-60 frames before firing

// Homing bullet — slowly turns toward player
bullet.angle += Math.sign(targetAngle - bullet.angle) * turnRate;
// turnRate of 0.02-0.05 rad/frame gives dodgeable homing
```

**Bullet speeds by difficulty tier:**

```
Casual:    1.5 - 3 px/frame
Normal:    3 - 5 px/frame
Hard:      4 - 7 px/frame
Bullet hell: 1.5 - 3 px/frame (slow but dense; density is the challenge, not speed)
```

### Collision Detection

For shooters, simplicity and performance matter more than pixel-accuracy.

```javascript
// Circle vs Circle (preferred for most shooter collision)
function circleCollision(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distSq = dx * dx + dy * dy;
  const radiusSum = a.radius + b.radius;
  return distSq < radiusSum * radiusSum;  // avoid sqrt for performance
}

// AABB (axis-aligned bounding box) — fast, good for rectangular sprites
function aabbCollision(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// Hitbox vs Hurtbox (bullet hell standard)
// Player hitbox: tiny (2-4 px radius at ship center)
// Player hurtbox: full ship sprite (used for enemy collision, not bullets)
// Enemy hitbox: generous (larger than sprite for easier hits)
const PLAYER_BULLET_HITBOX = 2;   // pixels radius — the "real" hitbox
const PLAYER_BODY_HITBOX = 12;    // pixels radius — collision with enemies/walls
const ENEMY_HITBOX_PADDING = 4;   // extra pixels beyond sprite for player bullets
```

### Scrolling

```javascript
// Vertical auto-scroll (shmup standard)
let scrollY = 0;
const SCROLL_SPEED = 1;  // px/frame (60px/sec at 60fps)

function updateScroll() {
  scrollY += SCROLL_SPEED;
  // Background layers scroll at different rates (parallax)
  bgLayer1Y = scrollY * 0.3;   // distant stars — slow
  bgLayer2Y = scrollY * 0.6;   // mid nebula
  bgLayer3Y = scrollY * 1.0;   // near debris — full speed
}

// Parallax background with wrapping
function drawParallaxLayer(ctx, layerY, tileHeight, drawFn) {
  const offset = layerY % tileHeight;
  for (let y = -tileHeight + offset; y < canvasHeight + tileHeight; y += tileHeight) {
    drawFn(ctx, y);
  }
}
```

### Power-ups

Power-ups should drop from specific enemies (not random) to give the player something to anticipate.

| Power-up | Effect | Duration | Visual |
|----------|--------|----------|--------|
| **Weapon Up** | Advance weapon level by 1 | Permanent until death | Red icon, pulsing |
| **Shield** | Absorb 1-3 hits | Until depleted | Blue bubble around ship |
| **Speed Boost** | +50% move speed | 10 seconds | Green trails behind ship |
| **Bomb** | Add 1 bomb to inventory | Until used | Yellow bomb icon |
| **Score x2** | Double all points earned | 15 seconds | Gold "x2" text, glowing |
| **Extra Life** | +1 life | Permanent | Heart or ship icon |
| **Magnet** | Auto-collect nearby pickups | 12 seconds | Purple aura |

**Power-up drop formula:**

```javascript
const POWERUP_DROP_CHANCE = 0.08;  // 8% base chance per enemy kill
const GUARANTEED_DROPS = [5, 12, 20, 30]; // kill counts that guarantee a drop
// Every 5th wave, the first enemy killed drops a weapon upgrade
// Bosses always drop a power-up on death
```

### Scoring

```javascript
// Base scoring
const SCORE_PER_ENEMY = { grunt: 100, swooper: 150, tank: 300, boss: 5000 };

// Combo system: kills within COMBO_WINDOW frames of each other increase multiplier
const COMBO_WINDOW = 90;  // 1.5 seconds at 60fps
let comboCount = 0;
let comboTimer = 0;
let comboMultiplier = 1;

function onEnemyKill(type) {
  comboCount++;
  comboTimer = COMBO_WINDOW;
  comboMultiplier = 1 + Math.floor(comboCount / 5) * 0.5; // +0.5x every 5 kills
  comboMultiplier = Math.min(comboMultiplier, 8);           // cap at 8x
  score += SCORE_PER_ENEMY[type] * comboMultiplier;
}

function updateCombo() {
  if (comboTimer > 0) {
    comboTimer--;
  } else {
    comboCount = 0;
    comboMultiplier = 1;
  }
}

// Graze bonus (bullet hell): award points for near-misses
const GRAZE_RADIUS = 20;  // px beyond hitbox
function checkGraze(bullet, player) {
  const dist = distance(bullet, player);
  if (dist < GRAZE_RADIUS && dist > PLAYER_BULLET_HITBOX) {
    score += 10;
    // Visual: brief spark at player position
  }
}

// End-of-wave bonus
const WAVE_CLEAR_BONUS = waveNumber * 500;
const NO_DAMAGE_BONUS = 2000;   // if player took 0 hits during the wave
const SPEED_BONUS = Math.max(0, (TIME_LIMIT - clearTime) * 10); // faster clear = more points
```

---

## Design Patterns

### Wave Design

The fundamental unit of shooter pacing is the **wave**. A good wave follows a tension arc:

```
INTRODUCE → ESCALATE → CLIMAX → REST → NEXT WAVE
(2-5 sec)   (10-20 sec)  (5-10 sec) (2-3 sec)
```

**Wave composition formula:**

```
Wave N enemy count = BASE_ENEMIES + (N - 1) * ENEMIES_PER_WAVE
Wave N enemy HP   = 1 + floor(N / 4)      (HP increase every 4 waves)
Wave N fire rate   = BASE_RATE * (1 + N * 0.08)  (8% faster each wave)
Wave N new type    = introduce 1 new enemy every 2-3 waves
```

**Example 10-wave progression:**

| Wave | Total Enemies | New Mechanic | Boss? | Approx Duration |
|------|--------------|--------------|-------|-----------------|
| 1 | 8 grunts | None (learn to shoot and dodge) | No | 15 sec |
| 2 | 12 grunts | Enemies shoot back (single aimed shots) | No | 20 sec |
| 3 | 8 grunts + 4 swoopers | Swooping enemies (sine movement) | No | 20 sec |
| 4 | 10 grunts + 6 swoopers | Increased fire rate | Mini-boss | 30 sec |
| 5 | 6 grunts + 4 swoopers + 4 tanks | Tanks (multi-hit enemies) | No | 25 sec |
| 6 | 8 swoopers + 6 tanks | Dense formation, spread shots | No | 25 sec |
| 7 | 6 tanks + 4 speeders + 8 grunts | Speeders (fast, erratic) | Mid-boss | 35 sec |
| 8 | All types mixed, 20 total | Splitters appear | No | 30 sec |
| 9 | All types, 24 total | Maximum fire density | No | 35 sec |
| 10 | 10 mixed enemies + final boss | Boss with 3 phases | YES | 60 sec |

### Difficulty Curves

**Linear ramp** (simplest, usually sufficient):
```
difficulty(wave) = BASE + wave * INCREMENT
```

**Stepped with plateaus** (better player experience):
```
difficulty(wave) = BASE + floor(wave / 3) * STEP_SIZE
// Difficulty increases every 3 waves, stays flat between steps
// Gives players time to master each level before the next spike
```

**Bullet density progression** (bullets per second on screen):
```
Wave 1-2:   1-3 enemy bullets/sec
Wave 3-5:   4-8 enemy bullets/sec
Wave 6-8:   10-20 enemy bullets/sec
Wave 9-10:  20-40 enemy bullets/sec
Bullet hell: 50-200+ enemy bullets/sec (but slow-moving)
```

### Risk/Reward Mechanics

The best shooters reward aggressive play:

- **Graze bonus**: Points for flying near bullets without being hit. Encourages close dodging. DoDonPachi awards 100-500 points per graze frame.
- **Point blank bonus**: Extra damage or points for shooting enemies at melee range. Risk of collision vs faster kills.
- **Combo timer**: Continuous kills extend a multiplier. Passive play lets the combo drop. Incentivizes forward aggression.
- **Rank system**: Hidden difficulty that increases when the player plays well (no deaths, high score) and decreases on death. Battle Garegga is famous for this -- skilled players intentionally die to lower the rank.
- **Bomb trade-off**: Bombs clear the screen but reset your score multiplier. Use them to survive, but at a cost.

### Boss Design Patterns

Bosses are the emotional peaks of a shooter. A good boss fight has 3 phases:

**Phase 1: Introduction (30% HP)**
- 1-2 simple, telegraphed attack patterns
- Large, slow bullet spreads the player can weave through
- Teaches the player the boss's "language"
- Weak point is clearly visible and easily targeted

**Phase 2: Escalation (30-60% HP)**
- Combines Phase 1 patterns in new ways
- Introduces 1-2 new attack types
- Weak point may move or become periodically shielded
- Possible adds (smaller enemies) that distract the player

**Phase 3: Desperation (final 30% HP)**
- Fastest, densest patterns
- Boss may change movement (chase player, teleport)
- Weak point fully exposed but surrounded by danger
- Music intensifies, visual effects increase
- Often includes a "final attack" -- a massive pattern the player must survive to win

**Boss telegraph system:**
```
Warning flash/color change:  30 frames (0.5 sec)
Charge-up animation:         60 frames (1 sec)
Attack execution:            variable
Recovery/vulnerable window:  45-90 frames (0.75-1.5 sec)
```

### Anti-patterns to Avoid

1. **Bullet walls with no gaps**: Every bullet pattern must have a navigable path. Even in bullet hell, there are always openings.
2. **Instant-kill spawn deaths**: Never spawn enemies on top of the player. Give at least 60 frames of warning.
3. **Off-screen attacks**: Players should never be hit by something they could not have seen coming. All threats must enter from visible screen edges.
4. **Difficulty through input lag**: The player's ship should always feel responsive. Difficulty comes from pattern complexity, not sluggish controls.
5. **Power-up dependency**: The game should be completable at base weapon level. Power-ups make it easier, not possible.
6. **Unfair death recovery**: After death, give invincibility frames (90-120 frames / 1.5-2 sec) and respawn the player in a safe position.
7. **Monotonous pacing**: Never have more than 30 seconds of constant action without a brief rest (a wave transition, a scoring screen, a power-up moment).
8. **Too many enemy types at once**: Introduce at most 1 new enemy type per wave. Mixing 3+ new types simultaneously overwhelms the player.

---

## Tech Stack

<!-- TECH: {"id": "canvas2d", "role": "rendering", "optional": false} -->
<!-- TECH: {"id": "webaudio", "role": "audio", "optional": false} -->
<!-- TECH: {"id": "howler", "role": "audio", "optional": true} -->

**Rendering**: Canvas 2D is ideal for arcade shooters. The draw calls are simple (rectangles, circles, lines, basic sprites), and the performance is more than sufficient for hundreds of objects at 60fps.

**Object pooling is essential.** A typical shooter frame may have 50-200 bullets, 20-40 enemies, and 30-100 particles. Allocating and garbage-collecting these every frame will cause stuttering.

```javascript
class ObjectPool {
  constructor(createFn, resetFn, initialSize = 100) {
    this.pool = [];
    this.active = [];
    this.createFn = createFn;
    this.resetFn = resetFn;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  get() {
    const obj = this.pool.length > 0 ? this.pool.pop() : this.createFn();
    this.active.push(obj);
    return obj;
  }

  release(obj) {
    const idx = this.active.indexOf(obj);
    if (idx !== -1) {
      this.active.splice(idx, 1);
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }

  releaseAll() {
    while (this.active.length > 0) {
      const obj = this.active.pop();
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }
}

// Usage:
const bulletPool = new ObjectPool(
  () => ({ x: 0, y: 0, vx: 0, vy: 0, active: false, type: 'player' }),
  (b) => { b.active = false; },
  200
);
```

**Audio**: Rapid-fire SFX is the main challenge. The Web Audio API handles this well with short buffer playback. Howler.js adds convenience for managing multiple simultaneous sounds but is optional.

```javascript
// Efficient rapid SFX using Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSFX(frequency, duration, type = 'square', volume = 0.3) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// Shoot: short bright blip
function sfxShoot() { playSFX(880, 0.05, 'square', 0.15); }
// Enemy hit: mid crunch
function sfxHit() { playSFX(220, 0.08, 'sawtooth', 0.2); }
// Explosion: noise burst
function sfxExplosion() { playSFX(110, 0.3, 'sawtooth', 0.4); }
// Power-up: ascending arpeggio
function sfxPowerup() {
  [440, 554, 659, 880].forEach((f, i) => {
    setTimeout(() => playSFX(f, 0.1, 'sine', 0.3), i * 60);
  });
}
```

**Performance budget** (target: 60fps on mid-range hardware):

| Object Type | Max Active | Draw Cost Each |
|-------------|-----------|----------------|
| Player bullets | 50 | Low (fillRect) |
| Enemy bullets | 200 | Low (fillRect or arc) |
| Enemies | 40 | Medium (multi-shape or sprite) |
| Particles | 100 | Low (1px fillRect) |
| Power-ups | 5 | Medium (animated icon) |
| Background layers | 3 | Low (scrolling fill) |

---

## Level Design Templates

### Wave Composition Formulas

```javascript
function generateWave(waveNumber) {
  const n = waveNumber;
  return {
    grunts:    Math.max(0, 8 - Math.floor(n / 3) * 2),      // decrease over time
    swoopers:  Math.min(n * 2, 12),                            // increase steadily
    tanks:     Math.max(0, Math.floor((n - 3) / 2) * 2),     // appear wave 4+
    speeders:  Math.max(0, Math.floor((n - 5) / 2) * 2),     // appear wave 6+
    splitters: Math.max(0, Math.floor((n - 7) / 3) * 2),     // appear wave 8+
    totalHP:   n * 8 + 10,                                     // total wave health
    fireRate:  Math.max(20, 60 - n * 4),                       // frames between shots
    bossWave:  (n % 5 === 0),                                  // boss every 5 waves
  };
}
```

### Enemy Formation Patterns

```javascript
// V-formation (classic air combat feel)
function vFormation(count, centerX, startY, spacing) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const row = Math.floor(i / 2);
    positions.push({
      x: centerX + side * row * spacing,
      y: startY - row * spacing * 0.7
    });
  }
  return positions;
}

// Grid formation (Space Invaders style)
function gridFormation(cols, rows, startX, startY, spacingX, spacingY) {
  const positions = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions.push({
        x: startX + c * spacingX,
        y: startY + r * spacingY
      });
    }
  }
  return positions;
}

// Circle formation (surround pattern)
function circleFormation(count, centerX, centerY, radius) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    positions.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    });
  }
  return positions;
}

// Staggered columns (alternating offset rows)
function staggeredFormation(cols, rows, startX, startY, spacingX, spacingY) {
  const positions = [];
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * spacingX * 0.5;
    for (let c = 0; c < cols; c++) {
      positions.push({
        x: startX + c * spacingX + offset,
        y: startY + r * spacingY
      });
    }
  }
  return positions;
}

// Random scatter within a rectangle (for chaotic waves)
function randomScatter(count, x, y, w, h) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    positions.push({
      x: x + Math.random() * w,
      y: y + Math.random() * h
    });
  }
  return positions;
}
```

### Boss Encounter Structure

```javascript
const bossTemplate = {
  name: "Wave Commander",
  hp: 60,
  phases: [
    {
      hpThreshold: 0.7,       // Phase 1: 100% to 70% HP
      patterns: ['aimed_spread_3'],
      moveStyle: 'sway',       // slow horizontal sway
      fireInterval: 45,        // frames between shots
      addSpawns: false
    },
    {
      hpThreshold: 0.3,       // Phase 2: 70% to 30% HP
      patterns: ['ring_16', 'aimed_spread_5'],
      moveStyle: 'chase',      // slowly follows player x-position
      fireInterval: 30,
      addSpawns: true,         // spawns 2 grunts every 180 frames
      addInterval: 180
    },
    {
      hpThreshold: 0,          // Phase 3: 30% to 0% HP
      patterns: ['spiral_24', 'aimed_laser'],
      moveStyle: 'teleport',   // teleports to random x every 120 frames
      fireInterval: 20,
      addSpawns: true,
      addInterval: 90
    }
  ],
  deathExplosionCount: 12,
  deathScoreBonus: 5000,
  deathDrops: ['weapon_up', 'extra_life']
};
```

### Procedural Wave Generation

For endless modes, use a weighted random wave generator:

```javascript
function generateProceduralWave(waveNumber, rng) {
  const difficulty = Math.min(waveNumber / 20, 1.0);  // 0 to 1 over 20 waves

  // Enemy type weights shift with difficulty
  const weights = {
    grunt:    Math.max(0.1, 0.5 - difficulty * 0.4),
    swooper:  0.2 + difficulty * 0.1,
    tank:     difficulty * 0.25,
    speeder:  Math.max(0, difficulty - 0.3) * 0.3,
    splitter: Math.max(0, difficulty - 0.5) * 0.2
  };

  const totalEnemies = Math.floor(8 + waveNumber * 1.5);
  const enemies = [];

  for (let i = 0; i < totalEnemies; i++) {
    enemies.push(weightedRandom(weights, rng));
  }

  // Formation selection
  const formations = ['grid', 'v', 'circle', 'staggered', 'random'];
  const formation = formations[Math.floor(rng() * formations.length)];

  // Boss every 5 waves
  const hasBoss = waveNumber % 5 === 0;

  return { enemies, formation, hasBoss, difficulty };
}
```

---

## Visual Reference

### Art Styles

| Style | Description | Difficulty to Implement | Best For |
|-------|------------|------------------------|----------|
| **Geometric / neon** | Shapes with glow effects, dark background | Easy | OpenArcade default, Geometry Wars |
| **Pixel art** | Retro sprites, 8-16 color palettes | Medium (requires sprite design) | Classic shmup feel |
| **Vector / wireframe** | Clean lines, no fills, CRT aesthetic | Easy | Asteroids, Tempest style |
| **Silhouette** | Black shapes on vivid backgrounds | Easy | Limbo-inspired, high contrast |

### Color Palettes

**Deep space (vertical shmup):**
```
Background:  #0a0a1a (near-black blue)
Stars:       #ffffff at 0.3-0.8 alpha
Player:      #00ffcc (bright cyan)
Player bullet: #00ff88 (green-cyan)
Enemy:       #ff4444 (red) / #ff8844 (orange)
Enemy bullet: #ff00ff (magenta) / #ffff00 (yellow)
Power-up:    #4488ff (blue) / #44ff44 (green)
Explosion:   #ff8800 → #ff4400 → #ff0000 → fade
```

**Neon arcade (OpenArcade style):**
```
Background:  #1a1a2e
Grid lines:  #16213e
Player:      theme accent color
Bullets:     bright version of accent
Enemies:     contrasting warm color
UI text:     #e0e0e0
Glow:        shadowBlur 8-15, matching entity color
```

### Key Sprites (Canvas 2D drawing)

```javascript
// Player ship (triangle pointing up)
function drawPlayerShip(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(x, y - 16);       // nose
  ctx.lineTo(x - 12, y + 10);  // left wing
  ctx.lineTo(x, y + 4);        // center notch
  ctx.lineTo(x + 12, y + 10);  // right wing
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
}

// Enemy (diamond or hexagon)
function drawEnemy(ctx, x, y, color, size) {
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.8, y);
  ctx.lineTo(x, y + size * 0.6);
  ctx.lineTo(x - size * 0.8, y);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
}

// Bullet (small elongated rectangle with glow)
function drawBullet(ctx, x, y, color, w, h) {
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.fillRect(x - w/2, y - h/2, w, h);
  ctx.shadowBlur = 0;
}

// Explosion (expanding ring + particles)
function drawExplosion(ctx, x, y, progress, color) {
  const alpha = 1 - progress;
  const radius = progress * 30;
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 3 - progress * 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

// Power-up (pulsing circle with icon)
function drawPowerup(ctx, x, y, type, frame) {
  const pulse = 1 + Math.sin(frame * 0.1) * 0.15;
  const radius = 10 * pulse;
  const colors = { weapon: '#ff4444', shield: '#4488ff', bomb: '#ffff00', speed: '#44ff44' };
  ctx.fillStyle = colors[type] || '#ffffff';
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}
```

### Screen Effects

```javascript
// Screen shake
let shakeX = 0, shakeY = 0, shakeMagnitude = 0;
function triggerShake(magnitude = 5, duration = 10) {
  shakeMagnitude = magnitude;
  shakeFrames = duration;
}
function updateShake() {
  if (shakeFrames > 0) {
    shakeX = (Math.random() - 0.5) * shakeMagnitude * 2;
    shakeY = (Math.random() - 0.5) * shakeMagnitude * 2;
    shakeMagnitude *= 0.9;  // decay
    shakeFrames--;
  } else {
    shakeX = 0;
    shakeY = 0;
  }
}
// Apply: ctx.save(); ctx.translate(shakeX, shakeY); ... draw ... ctx.restore();

// Flash on hit (white overlay)
let flashAlpha = 0;
function triggerFlash() { flashAlpha = 0.5; }
function drawFlash(ctx) {
  if (flashAlpha > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    flashAlpha -= 0.05;
  }
}

// Particle system (minimal)
const particles = [];
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 20 + Math.random() * 20,
      maxLife: 40,
      color
    });
  }
}
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}
function drawParticles(ctx) {
  particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 2, 2);
  });
  ctx.globalAlpha = 1;
}
```

![Reference](images/arcade-shooter-reference.png)

---

## Audio Design

### Essential Sound Effects

| Sound | Trigger | Synthesis Approach | Priority |
|-------|---------|-------------------|----------|
| **Player shoot** | Every fire event | Short square wave blip, 880Hz, 50ms | Critical (plays most often) |
| **Enemy hit** | Bullet hits enemy | Downward pitch sweep, 400-100Hz, 80ms | Critical |
| **Enemy death** | Enemy HP reaches 0 | Noise burst + pitch drop, 200ms | Critical |
| **Player hit** | Player takes damage | Low rumble + distortion, 300ms | Critical |
| **Player death** | Player loses life | Extended explosion, rising pitch then crash, 500ms | Critical |
| **Power-up collect** | Player touches power-up | Ascending arpeggio, 4 notes, 240ms | High |
| **Bomb activate** | Player uses bomb | Deep bass sweep + white noise, 600ms | High |
| **Boss appear** | Boss enters screen | Low drone + alarm tone, 1000ms | High |
| **Boss phase change** | Boss HP crosses threshold | Dramatic chord shift, 400ms | Medium |
| **Boss death** | Boss defeated | Extended multi-explosion cascade, 2000ms | High |
| **Combo milestone** | Combo reaches 10, 25, 50 | Quick flourish, ascending pitch, 150ms | Medium |
| **Wave clear** | All enemies destroyed | Victory fanfare, 3-note ascending, 500ms | Medium |
| **Menu select** | UI interaction | Click/blip, 30ms | Low |

### Music Design

**Style**: High-energy electronic, chiptune, or synthwave. The music should maintain tension and momentum.

**Structure**:
- **Title screen**: 4-bar loop, atmospheric, lower energy
- **Gameplay**: 8-16 bar loop, driving beat, 130-160 BPM
- **Boss fight**: Variation of gameplay theme, heavier bass, more intense drums
- **Game over**: 2-bar sting, descending, somber

**Intensity layering**: The music can dynamically respond to gameplay:

```
Layer 0 (always): Bass drum + hi-hat (foundation)
Layer 1 (wave active): Bass synth line
Layer 2 (enemies shooting): Snare/clap added
Layer 3 (combo > 10): Lead melody enters
Layer 4 (boss fight): All layers + extra percussion + distortion
```

### Sound Layering Considerations

With many simultaneous SFX (dozens of bullets firing per second), sound management is critical:

- **Sound limiting**: Cap simultaneous instances of any one sound at 3-4. If the player fires faster than 3 overlapping shoot sounds, skip the oldest.
- **Priority system**: Player sounds > enemy death > enemy shoot > ambient. When at max polyphony, lower-priority sounds get dropped.
- **Volume ducking**: When a bomb or boss explosion plays, reduce all other sound volumes by 50% for 200ms to prevent clipping.
- **Spatial panning**: Pan sounds based on their x-position. Enemies on the left of the screen have their sounds panned left (-0.5 to -1.0), and right-side enemies pan right.

---

## Multiplayer Considerations

### Co-op Patterns

**Shared screen co-op** (most natural for shooters):
- Player 1: Arrow keys + Space to fire
- Player 2: WASD + E to fire (or Q)
- Both players share the same screen and canvas
- Shared lives pool or individual lives (design choice)
- Revive mechanic: dead player respawns after 5 seconds, or when surviving player reaches a checkpoint

**Co-op design adjustments:**
- Increase enemy count by 50-75% (not 100% -- two players are more than twice as effective due to coverage)
- Wider enemy formations to require both players to engage different sides
- Power-ups apply to the player who collects them (creates emergent sharing dynamics)
- Score is shared (co-op, not competitive)

### Competitive Patterns

**Split arena**: Two halves of the screen, each player defends their side. Enemies killed on your side award points and may send more enemies to the opponent (Twinkle Star Sprites model).

**Score attack**: Same waves, both players see the same enemies. Compete for highest score. Stealing kills from the other player is part of the strategy.

**Vs. shmup**: Each player has their own bullet patterns they can fire at the other player, interspersed with AI enemies. Hybrid of shmup and fighting game.

### Shared Screen Considerations

- Both players must be visually distinct (different colors, different ship shapes)
- Name labels above each ship if colors are similar
- Canvas width should be at least 500px for comfortable 2-player shared screen
- Friendly fire: usually off for co-op, on for competitive
- Camera does not follow either player (fixed screen or auto-scroll)
- Input conflict prevention: make sure player 1 and player 2 key bindings do not overlap

---

## Generation Checklist

### Blocking (must be decided before code generation)

| Decision | Options | Impact |
|----------|---------|--------|
| **Perspective** | Top-down, side-scroll | Determines gravity, movement axes, sprite orientation |
| **Scrolling type** | Auto-scroll vertical, auto-scroll horizontal, fixed screen, player-driven | Determines level structure, background system, enemy spawn logic |
| **Player weapon type** | Single shot, spread, laser, charge, selectable | Core interaction loop, audio needs, balance tuning |
| **Enemy source** | Waves (scripted), spawners (positional), procedural (algorithmic), hybrid | Level design approach, difficulty system, replayability |
| **Canvas size** | 400x600 (portrait), 500x500 (square), 600x400 (landscape) | Layout, UI placement, movement range |

### Defaultable (sensible defaults if not specified)

| Property | Default | Range |
|----------|---------|-------|
| Fire rate | 8 shots/sec (every 7 frames) | 4-15 shots/sec |
| Bullet speed | 8 px/frame | 6-12 px/frame |
| Player speed | 5 px/frame | 3-8 px/frame |
| Lives | 3 | 1-5 |
| Continue system | None (restart from wave 1) | None, checkpoint, unlimited |
| Score display | Top bar, "Score: N / Best: N" | Minimal, detailed HUD |
| Power-up frequency | Every 10-15 enemy kills | Rare (20+) to generous (5) |
| Bomb count | Start with 2, max 5 | 0 (no bombs) to 9 |
| Invincibility on respawn | 90 frames (1.5 sec) | 60-180 frames |
| Enemy bullet color | Distinct from background and player bullets | Any high-contrast color |

---

## From Design to Code

This section maps the 9 steps from the Game Design Guide (Sections 1-9) to arcade shooter specifics, plus the integration steps (Sections 10-13).

### Step 1: Core Concept

For an arcade shooter, lock in these identity decisions:
- **Sub-genre**: Fixed, vertical shmup, horizontal shmup, twin-stick, arena, or bullet hell?
- **Theme**: Space, military, fantasy, abstract, or organic?
- **Tone**: Intense and serious, or colorful and playful?
- **Session length**: 1-3 minutes (arcade), 5-10 minutes (campaign run), or endless?
- **One-sentence pitch example**: "A vertical shmup where your weapon type changes every 10 seconds, forcing you to constantly adapt your strategy."

### Step 2: Core Mechanics

Map the generic mechanics checklist to shooter specifics:
- **Player controls**: Arrow keys for movement (always). Space for fire (always). Shift for focus/slow (bullet hell). Z/X for bomb. Q/E for weapon switch (if multiple weapons).
- **Core loop**: Dodge enemy bullets, destroy enemies, collect power-ups, survive wave, repeat.
- **Win condition**: Clear all waves (finite) or survive as long as possible (endless).
- **Fail state**: Lose all lives.
- **Scoring**: Points per kill * combo multiplier + wave clear bonus + no-damage bonus.
- **Key rules**: Player hitbox size, bullet collision model, power-up behavior on death (keep? lose? downgrade one level?).

### Step 3: Progression and Difficulty

- **Progression model**: Score-chase (default) or wave-based campaign.
- **Difficulty curve**: Linear for first game; stepped with plateaus for polished game.
- **What changes**: Enemy count (+2-3 per wave), enemy fire rate (+5% per wave), new enemy types (every 2-3 waves), bullet pattern complexity.
- **Session length**: Target 2-3 minutes for a full run on normal difficulty.
- **Meta-progression**: Optional. High score table (localStorage). Unlockable ships (cosmetic). Achievement badges.

### Step 4: Tech Requirements

For a standard arcade shooter:
- **Rendering**: Canvas 2D (always)
- **Physics**: None (custom circle/AABB collision is sufficient)
- **Multiplayer**: None (default) or local same-keyboard (co-op)
- **AI/NPC**: Simple to medium (pattern-based movement, state machine for bosses)
- **Turn structure**: Real-time (always)
- **Audio**: Web Audio API for synthesized SFX (default) or Howler.js if using audio files

### Step 5: Tech Stack Selection

The standard arcade shooter stack:

```
Rendering:   vanilla Canvas 2D
Physics:     none (custom collision)
Multiplayer: none
Audio:       Web Audio API (procedural)
Libraries:   none required (zero dependencies)
```

This is the simplest possible stack, which is ideal. No CDN dependencies, no loading failures, no version conflicts. Everything runs from a single HTML file.

### Step 6: Visual Design

- **Art style**: Geometric neon (OpenArcade default). Shapes with `shadowBlur` glow.
- **Background**: `#1a1a2e` with scrolling star field (2-3 parallax layers).
- **Player**: Triangle ship in theme accent color. Thruster flame animation behind it.
- **Enemies**: Diamonds, hexagons, or circles in contrasting warm colors (red, orange).
- **Bullets**: Player bullets are bright accent-colored rectangles. Enemy bullets are magenta or yellow circles.
- **Explosions**: Expanding rings + particle bursts, 20-frame animation.
- **Camera**: Fixed overhead (top-down) or fixed side-view. No camera movement unless scrolling.

### Step 7: World and Level Design

- **Single screen vs scrolling**: Fixed screen for Space Invaders style. Auto-scroll vertical for shmup.
- **Level count**: 10 waves (standard) or infinite (procedural).
- **Generation**: Scripted waves for first 10 (hand-tuned difficulty). Procedural waves after that.
- **Boss encounters**: Wave 5 (mid-boss) and Wave 10 (final boss). Every 5 waves in endless mode.
- **Background**: Scrolling star field with occasional asteroid or nebula for visual variety. New background palette every 5 waves.

### Step 8: Onboarding and Tutorial

Shooters are inherently intuitive. The onboarding approach:
- **Title screen**: Show "Arrow keys to move, Space to fire" on the overlay.
- **Wave 1**: Enemies that do not shoot back. Player learns to move and fire without pressure.
- **Wave 2**: Enemies begin firing slow, aimed shots. Player learns to dodge.
- **Wave 3**: First power-up drop. Player learns the collection mechanic.
- No formal tutorial level needed. The wave progression IS the tutorial.

### Step 9: Audio Design

Synthesize all audio with Web Audio API:
- **Shoot SFX**: 880Hz square wave, 50ms, volume 0.15 (quiet -- it plays constantly)
- **Hit SFX**: 220Hz sawtooth, pitch sweep down, 80ms
- **Explosion**: 110Hz sawtooth with noise mix, 300ms
- **Power-up**: 4-note ascending arpeggio (440, 554, 659, 880Hz)
- **Boss music**: Lower the base frequency of the background drone, add rhythmic pulse
- **No external audio files needed**

### Integration Steps (Sections 10-13 from Game Design Guide)

**Section 10 - Multiplayer**: Skip for default shooter. If co-op requested, add Player 2 with WASD + E controls, shared screen, independent lives.

**Section 11 - AI/NPC**: Enemies use pattern-based movement (sine waves, bezier curves, formations). Bosses use state machines with phase transitions triggered by HP thresholds. No pathfinding needed. All movement is pre-scripted or formulaic.

**Section 12 - Game Economy**: Typically none for arcade shooters. If present, keep it simple: coins drop from enemies, spent on continues or weapon unlocks between runs.

**Section 13 - Concept Art Prompt**: Template for Grok image generation:

```
Variation 1 (establishing):
Neon arcade-style vertical space shooter scene. Dark navy background (#1a1a2e) filled with
scrolling stars. Dozens of geometric enemy ships in red and orange diamond shapes arranged in
V-formation. Bright bullet trails criss-crossing the screen. Color palette: cyan, magenta,
orange on deep navy. Top-down perspective. Retro-futuristic atmosphere.

Variation 2 (action):
Close-up action shot of a glowing cyan triangle spaceship weaving between magenta bullet
patterns. Explosions blooming in orange rings. Power-up orbs floating nearby. Neon glow
effects on all entities. Dark background with parallax star layers. High-energy combat moment.
Game UI: score counter in top corner, combo multiplier text.

Variation 3 (character/detail):
Sprite sheet reference for a neon arcade shooter. Player ship (cyan triangle with thruster
flame). Enemy types: red diamond grunt, orange hexagon tank, yellow speeder. Bullet types:
thin rectangles, circular spread patterns. Power-up icons: weapon (red), shield (blue),
bomb (yellow). Explosion animation frames. All on dark navy background with glow effects.
```

---

## Appendix A: Complete Minimal Shooter Skeleton

This is a reference structure for the game loop of a vertical fixed-screen shooter, compatible with OpenArcade's recorder.js contract.

```javascript
// === GLOBALS (recorder contract) ===
let gameState = 'waiting';
let score = 0;

// === GAME CONSTANTS ===
const W = 480, H = 600;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 8;
const FIRE_RATE = 7;           // frames between shots
const ENEMY_BULLET_SPEED = 3;
const INITIAL_LIVES = 3;
const INVINCIBLE_FRAMES = 90;

// === STATE ===
let player, bullets, enemies, enemyBullets, particles, powerups;
let lives, wave, keys, frameCount, fireTimer;
let comboCount, comboTimer, comboMultiplier, best = 0;

function init() {
  player = { x: W/2, y: H - 50, radius: 12, hitRadius: 2, invincible: 0, weaponLevel: 0 };
  bullets = [];
  enemies = [];
  enemyBullets = [];
  particles = [];
  powerups = [];
  lives = INITIAL_LIVES;
  wave = 0;
  score = 0;
  frameCount = 0;
  fireTimer = 0;
  comboCount = 0;
  comboTimer = 0;
  comboMultiplier = 1;
  keys = {};
  gameState = 'waiting';
  // Show overlay...
}

function update() {
  frameCount++;
  movePlayer();
  if (keys[' '] || keys['z']) firePlayerBullet();
  updateBullets();
  updateEnemies();
  updateEnemyBullets();
  updateParticles();
  updatePowerups();
  checkCollisions();
  updateCombo();
  if (enemies.length === 0) nextWave();
}

function draw() {
  // Clear, draw background, draw entities, draw UI
}

function loop() {
  if (gameState !== 'playing') return;
  update();
  draw();
  requestAnimationFrame(loop);
}
```

---

## Appendix B: Difficulty Tuning Reference Card

Quick-reference values for tuning a shooter's feel:

| Feel | Player Speed | Enemy Bullet Speed | Bullet Density | Hitbox Size | Fire Rate |
|------|-------------|-------------------|----------------|-------------|-----------|
| **Casual** | 6 px/f | 2 px/f | 1-3 bullets/sec | 10 px radius | 12 shots/sec |
| **Normal** | 5 px/f | 3 px/f | 5-10 bullets/sec | 6 px radius | 8 shots/sec |
| **Hard** | 4 px/f | 4 px/f | 15-25 bullets/sec | 4 px radius | 6 shots/sec |
| **Bullet Hell** | 3-5 px/f (+ 1.5 focus) | 2 px/f | 50-200 bullets/sec | 2 px radius | 15 shots/sec (auto) |

**The golden ratio of shooter balance**: The player should feel like they "almost died" every 10-15 seconds on normal difficulty. If it is more frequent, the game is too hard. If less frequent, it is too easy. Track this in playtesting by counting close calls per minute.

---

## Appendix C: Common Bugs and Fixes

| Bug | Cause | Fix |
|-----|-------|-----|
| Bullets pass through enemies | Bullet speed > enemy width; collision check misses | Check collision along the bullet's path (line vs circle), or reduce bullet speed |
| Player stuck at edge | Bounds clamping applied before movement | Apply movement first, then clamp |
| Enemies pile up at bottom | No off-screen cleanup | Remove enemies that pass y > canvasHeight + 50 |
| Frame rate drops during explosions | Too many particles | Limit particles to 100 max; use simpler draw calls |
| Sounds overlap and distort | Too many simultaneous audio nodes | Limit concurrent instances per sound type to 3-4 |
| Score resets on restart but best does not update | Best updated before score reset | Update best BEFORE resetting score in init() |
| Keyboard input sticks after tab-away | keyup event not fired when window loses focus | Add `window.addEventListener('blur', () => { keys = {}; })` |
| Boss stays alive after HP reaches 0 | HP check uses `< 0` instead of `<= 0` | Use `if (boss.hp <= 0)` |
| Invincibility frames not visible | No visual feedback during invincibility | Flash the player sprite (draw every other frame) or change opacity |
