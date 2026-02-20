# Genre: Platformer

**Status**: complete
**Last Updated**: 2026-02-20
**Complexity**: medium
**Reference Image**: images/platformer-reference.png

---

## Identity

The platformer is one of the oldest and most enduring game genres. At its core, a platformer asks the player to navigate a character through a series of suspended surfaces (platforms) while overcoming gaps, hazards, and enemies using precise movement and jumping. The player fantasy is one of mastery over physics and space -- the satisfaction of threading a character through a gauntlet that initially seems impossible, then becomes fluid and instinctive through practice.

What keeps players returning to platformers is the tight feedback loop between input and consequence. Every jump has a committed trajectory. Every missed ledge punishes immediately. Every successful chain of moves rewards with forward progress and the dopamine hit of "I just did something hard." This direct cause-and-effect relationship makes platformers exceptionally well-suited for ML training data: the visual state clearly encodes what matters, and the optimal action at any moment is strongly correlated with spatial relationships on screen.

The genre spans an enormous range of complexity. A single-screen platformer like the original Donkey Kong can be built in a few hundred lines of JavaScript. A sprawling metroidvania with interconnected maps, ability gating, and boss encounters is a multi-month production. For OpenArcade, the sweet spot is short-session platformers with clear visual state, progressive difficulty, and tight controls -- games where a 30-second to 3-minute run produces meaningful training data.

### Sub-genres

- **Precision platformer**: Stripped-down movement, lethal hazards, instant respawn. The challenge IS the movement. (Celeste, Super Meat Boy, N++)
- **Exploration platformer**: Large interconnected maps, backtracking, hidden areas. Movement is a tool for discovery. (Metroid, Hollow Knight, Ori)
- **Combat platformer**: Enemies are the primary obstacle. Attack mechanics are as important as movement. (Mega Man, Castlevania, Cuphead)
- **Puzzle-platformer**: Each room is a spatial logic problem. Timing matters less than figuring out the correct sequence. (Braid, Limbo, Inside, Fez)
- **Metroidvania**: Exploration + combat + ability gating. New movement abilities unlock previously inaccessible areas. (Hollow Knight, Symphony of the Night)
- **Auto-runner**: Movement is automatic; player controls only jump/duck timing. (Canabalt, Geometry Dash, Temple Run)
- **Vertical climber**: Upward progression instead of horizontal scrolling. (Doodle Jump, Ice Climber, Jump King)

### Classic Examples and Why They Work

**Super Mario Bros (1985)**: Defined the genre's physics vocabulary. Mario's momentum-based movement (acceleration, deceleration, air control) creates a skill gradient where beginners can walk cautiously while experts sprint and chain jumps. Level design teaches mechanics through play rather than text. World 1-1 is the most studied tutorial level in game history: the first Goomba teaches you that enemies kill, the first ? block teaches you that the world is interactive, the first pipe teaches you that exploration is rewarded.

**Celeste (2018)**: Proves that a platformer with only three verbs (run, jump, dash) can sustain 8+ hours of content through level design alone. The assist mode demonstrates that difficulty accessibility does not diminish the core experience. Each screen is a self-contained puzzle that teaches one idea, tests it, then moves on. Coyote time and jump buffering make controls feel generous without reducing challenge.

**Hollow Knight (2017)**: Shows how a platformer engine (run, jump, dash, wall-jump, attack) can underpin an entire open-world game. The pogo mechanic (downward attack bounces off enemies/hazards) creates emergent platforming challenges that feel discovered rather than designed.

**Mega Man (1987)**: Established the run-and-gun platformer template. Fixed jump height (no variable-height jumping) makes every gap a binary pass/fail challenge. The weapon-copy system means the player's capabilities expand across the game, changing how levels feel on replay. Boss patterns teach through repetition and observation.

**Geometry Dash (2013)**: Strips the platformer to its absolute minimum: tap to jump, hold to fly. The genius is in the level editor and rhythm-based obstacle placement. Demonstrates that auto-runner platformers generate extremely good training data because the action space is tiny (jump or don't) but the timing window is precise.

---

## Core Mechanics (Deep)

### Movement Physics

All values below assume a 60fps game loop with per-frame updates. Adjust proportionally for different frame rates or delta-time-based systems.

#### Gravity and Vertical Motion

```
GRAVITY         = 0.55 px/frame^2     (acceleration downward each frame)
MAX_FALL_SPEED  = 12 px/frame         (terminal velocity, prevents tunneling)
```

Gravity is the single most important constant in a platformer. Too low and the game feels floaty (like underwater). Too high and jumps feel abrupt and uncontrollable. The range 0.4 to 0.7 covers most 2D platformers at 60fps.

For reference, common gravity values in classic games (normalized to 60fps pixel scale):
- Super Mario Bros: ~0.43 (floaty, generous air time)
- Mega Man: ~0.55 (snappy, committed jumps)
- Celeste: ~0.65 (fast fall, but with air dash to compensate)
- Geometry Dash: ~0.80 (heavy, very short air time)

#### Horizontal Motion

```
MOVE_SPEED      = 4 px/frame          (target ground speed)
ACCELERATION    = 0.6 px/frame^2      (how fast you reach MOVE_SPEED)
DECELERATION    = 0.5 px/frame^2      (friction when no input)
AIR_CONTROL     = 0.4                  (multiplier on horizontal accel in air, 0.0-1.0)
```

Acceleration and deceleration create the feel of the character. Zero acceleration (instant speed change) feels arcadey and precise. High acceleration with low deceleration feels slippery (ice physics). Most platformers want something in between: responsive enough that the player feels in control, but with enough momentum that skilled play involves managing inertia.

Air control determines how much the player can steer mid-jump. A value of 1.0 means full air control (same as ground movement). A value of 0.0 means fully committed jumps (once airborne, horizontal velocity is locked). Most games use 0.3 to 0.6 for a balance of commitment and correction.

#### Movement Update Pseudocode

```javascript
// Horizontal
if (input.left) {
  player.vx -= ACCELERATION * (player.onGround ? 1.0 : AIR_CONTROL);
} else if (input.right) {
  player.vx += ACCELERATION * (player.onGround ? 1.0 : AIR_CONTROL);
} else {
  // Apply friction/deceleration
  if (Math.abs(player.vx) < DECELERATION) {
    player.vx = 0;
  } else {
    player.vx -= Math.sign(player.vx) * DECELERATION;
  }
}
player.vx = Math.max(-MOVE_SPEED, Math.min(MOVE_SPEED, player.vx));

// Vertical
player.vy += GRAVITY;
player.vy = Math.min(player.vy, MAX_FALL_SPEED);

// Apply
player.x += player.vx;
player.y += player.vy;
```

### Jump System

#### Variable-Height Jump

The most important platformer mechanic after basic movement. When the player releases the jump button early, upward velocity is cut, producing a shorter jump. This gives the player analog control over jump height with a single button.

```
JUMP_VELOCITY   = -10 px/frame        (initial upward velocity on jump)
JUMP_CUT_MULT   = 0.4                 (multiply vy by this on early release)
```

```javascript
// On jump button press (while grounded)
player.vy = JUMP_VELOCITY;
player.onGround = false;

// On jump button release (while ascending)
if (player.vy < 0) {
  player.vy *= JUMP_CUT_MULT;
}
```

Jump height from these values:
- Full jump height: `JUMP_VELOCITY^2 / (2 * GRAVITY)` = `100 / 1.1` = ~91 pixels
- Cut jump height: approximately `(JUMP_VELOCITY * JUMP_CUT_MULT)^2 / (2 * GRAVITY)` = ~14.5 pixels (varies by when the cut happens)

#### Coyote Time

Allow the player to jump for a few frames after walking off a ledge. This compensates for the visual mismatch between when the player *sees* the edge and when the character's hitbox actually leaves it. Without coyote time, players constantly report "I pressed jump but nothing happened" because they pressed 2-3 frames late.

```
COYOTE_FRAMES = 6     (approximately 100ms at 60fps)
```

```javascript
if (player.onGround) {
  player.coyoteTimer = COYOTE_FRAMES;
} else {
  player.coyoteTimer--;
}

// Jump is allowed if coyoteTimer > 0 (not just onGround)
if (jumpPressed && player.coyoteTimer > 0) {
  player.vy = JUMP_VELOCITY;
  player.coyoteTimer = 0;
}
```

#### Jump Buffering

Allow the player to press jump a few frames before landing, and have the jump execute on landing. This makes rapid jump chains feel responsive. Without it, the player must press jump on the exact frame of landing.

```
JUMP_BUFFER_FRAMES = 8   (approximately 133ms at 60fps)
```

```javascript
if (jumpPressed) {
  player.jumpBufferTimer = JUMP_BUFFER_FRAMES;
}
player.jumpBufferTimer--;

// On landing
if (player.justLanded && player.jumpBufferTimer > 0) {
  player.vy = JUMP_VELOCITY;
  player.jumpBufferTimer = 0;
}
```

#### Double Jump

A second jump that can be performed while airborne. Resets on landing.

```javascript
if (jumpPressed && !player.onGround && player.jumpsRemaining > 0) {
  player.vy = JUMP_VELOCITY * 0.85;  // Second jump slightly weaker
  player.jumpsRemaining--;
}

// On landing
player.jumpsRemaining = 1;  // Reset double-jump
```

#### Wall Jump

Jump away from a wall while sliding down it. Typically involves a brief period where horizontal input is overridden by the wall-jump impulse.

```
WALL_JUMP_VX    = 6 px/frame          (horizontal impulse away from wall)
WALL_JUMP_VY    = -9 px/frame         (vertical impulse)
WALL_SLIDE_SPEED = 2 px/frame         (reduced fall speed when against wall)
WALL_JUMP_LOCK  = 8 frames            (frames where horizontal input is reduced)
```

```javascript
// Wall slide
if (!player.onGround && player.touchingWall && player.vy > 0) {
  player.vy = Math.min(player.vy, WALL_SLIDE_SPEED);
}

// Wall jump
if (jumpPressed && player.touchingWall && !player.onGround) {
  player.vy = WALL_JUMP_VY;
  player.vx = WALL_JUMP_VX * -player.wallDirection;  // Away from wall
  player.wallJumpLockTimer = WALL_JUMP_LOCK;
}

// During lock, reduce player's ability to override the impulse
if (player.wallJumpLockTimer > 0) {
  player.wallJumpLockTimer--;
  // Reduce air control during lock period
}
```

### Collision Detection

#### AABB vs Tilemap

For tile-based platformers, collision is resolved axis-by-axis to prevent corner-catching:

```javascript
// Move X first, resolve X collisions
player.x += player.vx;
resolveCollisionX(player, tilemap);

// Then move Y, resolve Y collisions
player.y += player.vy;
resolveCollisionY(player, tilemap);
```

```javascript
function resolveCollisionX(entity, tilemap) {
  const tileSize = tilemap.tileSize;
  const left = Math.floor(entity.x / tileSize);
  const right = Math.floor((entity.x + entity.width - 1) / tileSize);
  const top = Math.floor(entity.y / tileSize);
  const bottom = Math.floor((entity.y + entity.height - 1) / tileSize);

  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (tilemap.isSolid(tx, ty)) {
        if (entity.vx > 0) {
          entity.x = tx * tileSize - entity.width;
        } else if (entity.vx < 0) {
          entity.x = (tx + 1) * tileSize;
        }
        entity.vx = 0;
      }
    }
  }
}
```

#### One-Way Platforms

Platforms the player can jump through from below but land on from above. The key check: only collide when the player's previous bottom edge was above the platform's top edge and the player is falling.

```javascript
if (platform.oneWay) {
  const wasAbove = (entity.prevY + entity.height) <= platform.y;
  const isNowBelow = (entity.y + entity.height) > platform.y;
  const isFalling = entity.vy >= 0;
  if (wasAbove && isNowBelow && isFalling) {
    entity.y = platform.y - entity.height;
    entity.vy = 0;
    entity.onGround = true;
  }
}
```

#### Moving Platforms

The player must inherit the platform's velocity when standing on it. Track which platform the player is on and apply the platform's delta position before the player's own movement.

```javascript
if (player.ridingPlatform) {
  player.x += player.ridingPlatform.dx;
  player.y += player.ridingPlatform.dy;
}
```

#### Slopes

For 45-degree slopes, check the tile the player is on and adjust Y position based on X position within the tile:

```javascript
// For a right-ascending slope in a 32x32 tile
const localX = player.x - tileX * tileSize;
const slopeY = tileY * tileSize + (tileSize - localX);
if (player.y + player.height > slopeY) {
  player.y = slopeY - player.height;
  player.vy = 0;
  player.onGround = true;
}
```

### Camera System

#### Follow-Cam with Dead Zone

A dead zone is a rectangular region at the center of the screen where the player can move without the camera following. The camera only moves when the player exits this zone. This prevents jittery camera movement during small adjustments.

```
DEAD_ZONE_X     = 40 pixels (half-width from center)
DEAD_ZONE_Y     = 30 pixels (half-height from center)
CAMERA_SMOOTH   = 0.1                 (lerp factor, 0.05 = very smooth, 0.2 = snappy)
```

```javascript
const screenCenterX = camera.x + canvas.width / 2;
const screenCenterY = camera.y + canvas.height / 2;

let targetX = camera.x;
let targetY = camera.y;

if (player.x < screenCenterX - DEAD_ZONE_X) {
  targetX = player.x - canvas.width / 2 + DEAD_ZONE_X;
} else if (player.x > screenCenterX + DEAD_ZONE_X) {
  targetX = player.x - canvas.width / 2 - DEAD_ZONE_X;
}

if (player.y < screenCenterY - DEAD_ZONE_Y) {
  targetY = player.y - canvas.height / 2 + DEAD_ZONE_Y;
} else if (player.y > screenCenterY + DEAD_ZONE_Y) {
  targetY = player.y - canvas.height / 2 - DEAD_ZONE_Y;
}

camera.x += (targetX - camera.x) * CAMERA_SMOOTH;
camera.y += (targetY - camera.y) * CAMERA_SMOOTH;
```

#### Look-Ahead

Shift the camera slightly in the direction the player is moving, so more of the upcoming level is visible. Essential for fast-moving platformers.

```javascript
const lookAhead = player.vx * 3;  // 3 frames of look-ahead
targetX += lookAhead;
```

#### Screen Boundaries

Clamp the camera to the level bounds to prevent showing empty space:

```javascript
camera.x = Math.max(0, Math.min(levelWidth - canvas.width, camera.x));
camera.y = Math.max(0, Math.min(levelHeight - canvas.height, camera.y));
```

---

## Design Patterns

### Level Flow

The fundamental rhythm of platformer level design follows a pattern:

**Introduce -> Practice -> Challenge -> Reward -> Rest -> Escalate**

1. **Introduce**: Show a new mechanic or hazard in a safe context. A pit with a platform over it before the player encounters a pit they must jump across.
2. **Practice**: Give the player 2-3 instances to use the mechanic with low consequence.
3. **Challenge**: Combine the new mechanic with previously learned mechanics. The first real test.
4. **Reward**: A collectible, a health pickup, a satisfying animation, or simply a safe flat area.
5. **Rest**: A brief section with no challenge. Let tension dissipate. This is where many designers fail -- they forget to give the player breathing room.
6. **Escalate**: Return to the mechanic with increased difficulty or combine it with another mechanic.

### Difficulty Curve Approaches

**Linear ramp**: Difficulty increases at a constant rate. Simple to implement, but can feel monotonous. Works for short games (auto-runners, single-screen challenges).

**Sawtooth wave**: Difficulty increases, then drops at the start of each new level/world before climbing higher. This is the Mario model. World 2-1 is easier than World 1-4, but World 2-4 is harder than World 1-4.

**Staircase**: Flat difficulty within a level, jumps between levels. Each level establishes a new baseline. Works for room-based or screen-based designs.

**Inverted U**: Difficulty peaks at 60-70% through the game, then eases slightly for the finale. The climax is in the player's mastery, not in the final challenge being the hardest.

### Concrete Difficulty Examples

For a 10-level platformer generating ML training data:
- Levels 1-2: Gap width = 2 tiles (trivial jump), no enemies, no moving platforms
- Levels 3-4: Gap width = 3 tiles, stationary enemies, one-way platforms introduced
- Levels 5-6: Gap width = 3-4 tiles, moving platforms, enemies that patrol
- Levels 7-8: Gap width = 4-5 tiles (requires near-max jump), enemies that shoot, combination hazards
- Levels 9-10: Everything combined, precise timing required, multiple paths (reward exploration)

### Anti-Patterns and Pitfalls

**Pixel-perfect jumps**: If the player must land on a single pixel to survive, the challenge is unfair. Minimum landing platform should be at least 2x the player's width.

**Blind jumps**: Requiring the player to jump into unseen space. If the camera cannot show where the player will land, the design is asking for memorization, not skill. Use coins/collectibles as breadcrumbs to guide the eye, or extend the camera look-ahead.

**Leap of faith**: A cousin of the blind jump. A pit that the player cannot see the bottom of. If there is a safe platform down there, the player has no way to know. If there is death down there, the player has no way to know. Either way, it is bad design.

**Enemy spam**: Filling a room with enemies does not create difficulty; it creates tedium. Each enemy should have a purpose in the spatial puzzle. One well-placed enemy on a narrow platform is harder and more interesting than ten enemies on flat ground.

**Inconsistent physics**: If gravity, jump height, or movement speed change between levels without clear in-game justification, the player's muscle memory is invalidated. Any physics change should be introduced gradually and flagged visually (water sections, low-gravity zones).

**Death pits after checkpoints**: Placing an instant-death hazard immediately after a checkpoint (within 1-2 seconds of play) is deeply frustrating. The player respawns and dies again before they have time to process the challenge.

### What Separates Good from Great

- **Juice**: Screen shake on landing, squash-and-stretch on the player sprite, particle effects on wall-jump. These have zero gameplay impact but massively increase perceived quality.
- **Teaching without text**: Every great platformer teaches through level design, not tutorials. The environment demonstrates what is possible.
- **Multiple valid solutions**: The best platformer rooms can be traversed multiple ways. Speed-runners find one path; cautious players find another. Both feel intentional.
- **Rhythm**: Great levels have a cadence. The spacing between platforms, the timing of enemy patterns, the placement of collectibles all create a rhythm that the player falls into.

### Theming Patterns

Platformers commonly progress through themed worlds that introduce new mechanics:
- **Grasslands/Forest**: Basic platforming, gentle slopes, simple enemies
- **Underground/Cave**: Darkness mechanics, falling hazards, tighter corridors
- **Sky/Cloud**: Moving platforms, wind mechanics, vertical emphasis
- **Ice/Snow**: Reduced friction, slippery surfaces, environmental hazard
- **Factory/Mechanical**: Conveyor belts, crushers, timing-based hazards
- **Lava/Fire**: Rising hazard floors, timed safe zones, aggressive enemies

### Reward Loops

- **Micro loop** (every 2-5 seconds): Collectible pickup, enemy defeat, successful jump
- **Medium loop** (every 30-60 seconds): Reach checkpoint, complete room, unlock shortcut
- **Macro loop** (every 2-5 minutes): Complete level, defeat boss, unlock new ability

---

## Tech Stack

<!-- TECH: {"id": "canvas2d", "role": "rendering", "optional": false} -->
<!-- TECH: {"id": "matter", "role": "physics", "optional": true} -->
<!-- TECH: {"id": "howler", "role": "audio", "optional": true} -->

### Canvas 2D vs Physics Engine

**Canvas 2D is sufficient (and preferred) when:**
- The game uses tile-based collision (AABB vs tilemap)
- Gravity and movement are simple constants (no complex body interactions)
- There are no physics objects that interact with each other (no stacking, no ragdoll)
- Platforms are axis-aligned rectangles or simple one-way platforms
- The game has fewer than 100 active entities

This covers 90% of OpenArcade platformers. Custom physics code (as shown in Core Mechanics above) is lighter, faster, and more predictable than a physics engine.

**Consider Matter.js when:**
- The game has physics-driven puzzle elements (weighted objects, seesaws, pendulums)
- Entities need to interact physically with each other (pushing, stacking)
- Rope or chain mechanics are involved
- Destructible terrain is a core mechanic
- You need accurate angular momentum (spinning platforms, rotating hazards)

If using Matter.js, be aware that its default friction and restitution values produce bouncy, slippery behavior that does not feel like a traditional platformer. You will need to override body properties:

```javascript
// Platformer-friendly Matter.js body settings
const playerBody = Matter.Bodies.rectangle(x, y, width, height, {
  friction: 0.01,
  frictionAir: 0.02,
  restitution: 0,        // No bounce
  inertia: Infinity,     // Prevent rotation
  inverseInertia: 0
});
```

### Audio

For simple SFX (jump, land, collect, die), the Web Audio API is lightweight and sufficient. For games with music, layered audio, or many simultaneous sounds, Howler.js is recommended.

Decision criteria:
- 1-5 sound effects, no music: Web Audio API
- 6+ sound effects or background music: Howler.js
- Dynamic music (layers that change based on game state): Howler.js

---

## Level Design Templates

### Platform Spacing Formulas

The fundamental question: how far apart can platforms be for the player to jump between them?

**Horizontal jump distance** (how far the player travels horizontally during a full jump):

```
jump_time = 2 * |JUMP_VELOCITY| / GRAVITY
horizontal_distance = MOVE_SPEED * jump_time
```

With default values: `jump_time = 2 * 10 / 0.55 = 36.4 frames`, `horizontal_distance = 4 * 36.4 = 145.6 pixels`.

**Maximum gap the player can cross**: approximately 80% of horizontal_distance to account for reaction time and the need to land on a platform (not at its edge). With defaults: `145.6 * 0.8 = 116 pixels` or roughly 3.6 tiles at 32px per tile.

**Vertical jump height**: `JUMP_VELOCITY^2 / (2 * GRAVITY) = 100 / 1.1 = 90.9 pixels` or roughly 2.8 tiles at 32px per tile.

**Rule of thumb for tile-based levels (32px tiles):**
- Easy gap: 2 tiles (64px) -- trivial, walking speed is enough
- Medium gap: 3 tiles (96px) -- requires a running jump
- Hard gap: 4 tiles (128px) -- requires full-speed running jump with good timing
- Maximum gap: 4.5 tiles (144px) -- possible but leaves no margin for error

### Hazard Placement Patterns

**Gauntlet**: Hazards in a straight line that the player must weave through. Good for teaching timing.

**Funnel**: Wide area narrows to a chokepoint with a hazard. Teaches the player to aim their trajectory.

**Alternating**: Hazards alternate between high and low, requiring the player to jump and duck (or jump at different heights). Classic Mario pattern.

**Orbiting**: A hazard moves in a circle around a platform. The player must time their approach. Used extensively in precision platformers.

**Conveyor**: A series of hazards that move in one direction, creating a current the player must fight against or ride. Good for adding urgency.

### Checkpoint Frequency Guidelines

- **Auto-runner**: Every 15-30 seconds of gameplay (every 2-3 screen widths)
- **Precision platformer**: Every room/screen (Celeste model)
- **Exploration platformer**: Every 2-3 rooms or at each safe zone
- **Combat platformer**: Before and after each major enemy encounter or boss
- **General rule**: The player should never lose more than 30-60 seconds of progress on death

For ML training data, frequent checkpoints are better. They produce more varied starting states and prevent the AI from spending all its training time on the first section.

### Procedural Generation Strategies

**Column-based generation** (simplest, good for auto-runners):
Divide the level into vertical columns. Each column is a template: flat ground, gap, platform-at-height, enemy-on-ground, etc. String columns together with rules (no more than 2 gaps in a row, platform after gap must be reachable from gap edge).

```javascript
const COLUMN_TYPES = ['ground', 'gap', 'platform_low', 'platform_high', 'enemy'];
function generateColumn(prevColumn) {
  const validNext = TRANSITIONS[prevColumn.type];
  return validNext[Math.floor(Math.random() * validNext.length)];
}
```

**Room/Screen templates** (good for screen-based games):
Pre-design 10-20 room templates. Each template has tags (difficulty, mechanics_required). Generate a level by selecting rooms that match the current difficulty and ensuring required mechanics have been introduced.

**Grammar-based generation**:
Define a grammar of level segments. Each production rule expands a symbol into a sequence of tiles or sub-segments. This produces levels with structural coherence.

```
LEVEL     -> INTRO BODY CLIMAX REST
INTRO     -> FLAT FLAT EASY_GAP
BODY      -> SECTION SECTION SECTION
SECTION   -> GAP PLATFORM ENEMY | PLATFORM PLATFORM GAP
CLIMAX    -> HARD_GAP ENEMY HARD_GAP
REST      -> FLAT COLLECTIBLE FLAT
```

**Wave Function Collapse (WFC)** (most sophisticated):
Define tile adjacency rules (which tiles can be placed next to which). Start with an empty grid and collapse tiles one at a time based on entropy. Produces natural-looking levels but requires careful constraint definition. Overkill for most OpenArcade games but powerful for exploration-style levels.

### Room/Screen Transition Patterns

**Hard cut**: Instant transition. Player exits one side, appears on the other side of the new room. Simple, no animation needed. Used in Celeste, Mega Man.

**Scrolling transition**: Camera pans to the new room while the player walks through a doorway or corridor. More polished but requires a transition state in the game loop.

**Seamless scrolling**: No discrete rooms. The camera follows the player through a continuous level. Simplest camera-wise but hardest for level design (no natural pacing boundaries).

For OpenArcade, hard cuts or seamless scrolling are recommended. Scrolling transitions add complexity without meaningful benefit for ML training data.

---

## Visual Reference

### Art Styles

**Pixel art** (most common for OpenArcade):
- 16x16 or 32x32 tile size
- Limited palette (8-16 colors per sprite)
- Clear silhouettes -- the player should be identifiable at a glance
- For Canvas 2D without sprite assets, use `ctx.fillRect` with neon colors on dark background

**Vector/Geometric** (good for generated graphics):
- Player as a colored rectangle or circle with glow
- Platforms as solid rectangles with border
- Enemies as distinct geometric shapes (triangles for aggressive, circles for passive)
- This style requires no art assets and renders crisply at any size

**Hand-drawn/Sketch** (rare for OpenArcade, requires assets):
- Organic line weight variation
- Textured fills
- Not recommended for generated games due to asset requirements

### Color Palette Conventions

For the OpenArcade neon aesthetic:
- **Background**: `#1a1a2e` (dark navy) with optional parallax layers in `#16213e` and `#0f3460`
- **Player**: Bright accent color with glow (e.g., `#0ff`, `#f0f`, `#0f8`)
- **Platforms**: Medium-dark (`#334`) with lighter top edge (`#556`) to indicate surface
- **Hazards**: Red/orange family (`#f44`, `#f80`) with pulsing glow
- **Collectibles**: Gold/yellow (`#ff0`, `#fa0`) with sparkle effect
- **Enemies**: Contrasting hue from player. If player is cyan, enemies could be magenta.
- **Background elements**: Very low contrast (`#223`, `#1a2a3a`) to not compete with gameplay elements

### Camera Perspectives

- **Side-view** (standard): Camera looks at the level from the side. Player moves left/right and jumps up/down. This is the default for most platformers.
- **2.5D**: Side-view with parallax layers creating depth illusion. Multiple background layers scroll at different speeds.

### Key Sprite/Entity Descriptions

For OpenArcade platformers using geometric rendering:

| Entity | Shape | Size | Color | Visual Cues |
|--------|-------|------|-------|-------------|
| Player | Rectangle with eye dot | 24x32 px | Theme accent | Shadow/glow, squash on land |
| Ground platform | Rectangle | 32xN px | #334 with #556 top | Solid top edge line |
| One-way platform | Thin rectangle | 32x8 px | #445 dashed | Dashed or dotted to suggest pass-through |
| Enemy (walker) | Rectangle with spikes | 28x28 px | Contrasting hue | Bounces slightly while walking |
| Enemy (flier) | Diamond or triangle | 24x24 px | Contrasting hue | Bobs up and down |
| Collectible | Small circle or star | 12x12 px | #ff0 | Rotates or pulses |
| Hazard (spikes) | Triangles on surface | 32x16 px | #f44 | Slight glow |
| Hazard (projectile) | Small circle | 8x8 px | #f80 | Trail effect |
| Checkpoint | Tall thin rectangle (flag) | 8x32 px | #0f0 | Changes color when activated |
| Exit/Goal | Arch or door shape | 32x48 px | #ff0 | Pulsing glow |

### Animation Frame Counts and Timing

For sprite-based animation at 60fps:
- **Idle**: 2-4 frames, 10 frames per sprite (4-6 fps animation)
- **Run**: 4-6 frames, 6 frames per sprite (10 fps animation)
- **Jump (ascending)**: 1 static frame
- **Fall (descending)**: 1 static frame (distinct from jump)
- **Land squash**: 2 frames, 3 frames per sprite (brief)
- **Death**: 4-6 frames, 4 frames per sprite
- **Enemy walk**: 2 frames, 8 frames per sprite

For geometric rendering (no sprites), animate with transforms:
- Squash on land: compress height by 30% for 4 frames, then spring back
- Stretch on jump: extend height by 20% for 3 frames
- Eye direction: draw a dot that shifts toward movement direction

![Reference](images/platformer-reference.png)

---

## Audio Design

### Essential SFX List

| Sound | Trigger | Character | Duration |
|-------|---------|-----------|----------|
| Jump | Player leaves ground | Short upward sweep, bright | 100-150ms |
| Land | Player touches ground from fall | Soft thud, low frequency | 80-120ms |
| Collect (coin/gem) | Player overlaps collectible | High-pitched ding, ascending | 100-200ms |
| Damage/Hit | Player takes damage | Harsh buzz or crunch | 150-250ms |
| Death | Player dies | Descending tone, sad | 400-800ms |
| Enemy defeat | Enemy HP reaches 0 | Pop or burst, satisfying | 150-200ms |
| Checkpoint | Player activates checkpoint | Ascending chime, 3 notes | 300-500ms |
| Level complete | Player reaches exit | Fanfare, ascending arpeggio | 800-1500ms |
| Menu select | UI navigation | Click or blip | 50-80ms |
| Wall slide | Player sliding on wall | Continuous scraping, soft | Looping while sliding |

### Music Style Recommendations

- **Chiptune**: 8-bit style. Matches pixel art aesthetic. Can be generated programmatically with oscillators.
- **Electronic/Synthwave**: Matches the neon aesthetic of OpenArcade. Driving beat, arpeggiated synths.
- **Orchestral**: Too heavy for most arcade platformers. Reserve for epic metroidvania-style games.

For OpenArcade, music is optional. The recorder captures game state at 2fps, so audio does not contribute to ML training data. If included, keep it unobtrusive.

### Web Audio API vs Howler.js

**Web Audio API** (built-in, no dependency):
```javascript
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playJumpSFX() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}
```

Pros: No external dependency, tiny code footprint, programmatic sound generation.
Cons: Verbose API, no built-in sprite sheets, managing multiple sounds is manual.

**Howler.js** (external library):
```javascript
const jumpSfx = new Howl({ src: ['jump.mp3'], volume: 0.5 });
jumpSfx.play();
```

Pros: Simple API, audio sprites, automatic format detection, mobile support.
Cons: External dependency (~10KB gzipped), requires audio files.

**Recommendation for OpenArcade**: Use Web Audio API with programmatic sound generation. No audio files to manage, no dependencies, and synthesized sounds match the retro aesthetic. Howler.js only if the game requires music playback from a file.

### Dynamic Music Layering

For games that warrant it, layer music tracks that activate/deactivate based on game state:
- **Base layer**: Ambient pad, always playing during gameplay
- **Rhythm layer**: Drums/percussion, added when enemies are present
- **Melody layer**: Added during boss fights or intense sections
- **Danger layer**: Low drone, added when player HP is low

Implementation: create multiple audio sources, crossfade by adjusting gain nodes.

---

## Multiplayer Considerations

### Co-op Patterns

**Shared screen**: Both players on the same screen. Camera follows midpoint between players. Tethering (max distance between players) prevents one player from scrolling the other off-screen.

**Independent screens**: Split-screen or separate viewports. Each player has their own camera. More complex to render but eliminates camera conflicts.

**Asymmetric co-op**: One player controls the character, the other modifies the level (placing platforms, triggering switches). Novel but niche.

### Competitive Patterns

**Race**: Both players navigate the same level simultaneously. First to the exit wins. Ghost mode (players cannot collide) simplifies implementation.

**Battle**: Players can attack each other on a shared arena. Last player standing wins. Requires combat mechanics beyond basic platforming.

**Score attack**: Both players play the same level independently. Higher score wins. Easiest to implement -- just run two instances.

### Server Requirements

| Mode | Network Model | Tick Rate | Bandwidth |
|------|--------------|-----------|-----------|
| Co-op (shared screen) | Peer-to-peer or relay | 20-30 Hz | Low (~2KB/s per player) |
| Competitive race | Server authoritative | 30-60 Hz | Medium (~5KB/s per player) |
| Battle (PvP) | Server authoritative | 60 Hz | Medium-High (~8KB/s per player) |

For OpenArcade, multiplayer is not a priority. Single-player games produce cleaner ML training data because there is one agent's actions to correlate with game state changes.

### Input Synchronization Challenges

- **Input delay**: Transmitting inputs over the network adds latency. For platformers, even 50ms of input delay makes jumps feel unresponsive. Client-side prediction with server reconciliation is necessary for competitive modes.
- **Determinism**: If both clients run the same physics with the same inputs, they should produce the same results. Floating-point inconsistencies across platforms can cause desync. Use fixed-point arithmetic or synchronize full state periodically.
- **Rollback**: For competitive play, rollback netcode (re-simulate from the last confirmed state when a late input arrives) provides the best feel but is complex to implement.

---

## Generation Checklist

Every decision the AI must resolve before code generation, organized by priority.

### Blocking (must decide before any code is written)

| Decision | Options | Impact |
|----------|---------|--------|
| Player movement style | Free-move (momentum) vs. grid-snap | Determines entire physics system |
| Jump type | Single, variable-height, double, wall-jump, none | Core mechanic identity |
| View orientation | Side-scroll horizontal, side-scroll vertical, single-screen | Camera and level structure |
| Level structure | Single screen, scrolling, room-based, procedural | Data structure and generation approach |
| Win condition | Reach exit, survive timer, collect all items, defeat boss | Game loop termination |
| Death mechanic | Lives system, health bar, one-hit-death, infinite retry | Difficulty feel and session length |
| Scrolling direction | Left-to-right, right-to-left, vertical, omnidirectional | Camera and level layout |

### Defaultable (safe defaults exist, override if the game concept demands it)

| Decision | Default | Range | Notes |
|----------|---------|-------|-------|
| Gravity | 0.55 px/frame^2 | 0.3 - 0.8 | Lower = floatier, higher = snappier |
| Jump velocity | -10 px/frame | -8 to -13 | Must be tuned relative to gravity |
| Move speed | 4 px/frame | 2 - 6 | Higher demands wider level design |
| Air control | 0.4 | 0.0 - 1.0 | 0 = committed jumps, 1 = full air steering |
| Coyote time | 6 frames | 0 - 10 | 0 feels punishing, 10 feels lenient |
| Jump buffer | 8 frames | 0 - 12 | Higher = more forgiving rapid jumps |
| Number of lives | 3 | 1 - 5 | 1 = roguelike tension, 5 = casual |
| Player size | 24x32 px | 16x16 - 32x48 | Smaller = more precise, larger = more visible |
| Tile size | 32 px | 16, 24, 32, 48 | Determines level granularity |
| Canvas size | 480x360 px | See style guide | Must fit laptop screen, max 600px wide |
| Score system | Points per collectible + time bonus | Varied | Must increment frequently for ML signal |
| Checkpoint frequency | Every 2-3 screens | Every screen to every 5 screens | More frequent = better ML training data |

### Optional Enhancements (add if time permits)

- Parallax background layers
- Screen shake on impact
- Particle effects (dust on land, sparks on wall-slide)
- Squash-and-stretch animation
- Dynamic difficulty (adjust based on death count)
- Speed-run timer display

---

## From Design to Code

How each of the 9 generation steps maps to the Platformer genre specifically.

### Step 1: html-structure

Set up the HTML shell following the OpenArcade template (Section 2 of the generation instructions).

**Platformer-specific notes:**
- Canvas size recommendation: `480x360` for side-scrollers (wide enough for look-ahead, tall enough for vertical jumps) or `400x500` for vertical climbers
- The canvas must use `image-rendering: pixelated` if using pixel-art style at low resolution with upscaling
- Add CSS for any HUD elements that live outside the canvas (lives display, ability indicators)

```html
<canvas id="game" width="480" height="360"></canvas>
```

### Step 2: game-state

Define the game state object and all persistent data structures.

```javascript
let gameState = 'waiting';
let score = 0;
let best = 0;

const player = {
  x: 0, y: 0,
  vx: 0, vy: 0,
  width: 24, height: 32,
  onGround: false,
  jumpsRemaining: 1,
  coyoteTimer: 0,
  jumpBufferTimer: 0,
  facing: 1,           // 1 = right, -1 = left
  hp: 3,
  lives: 3,
  invincibleTimer: 0
};

const level = {
  tiles: [],           // 2D array of tile IDs
  tileSize: 32,
  width: 0,            // in tiles
  height: 0,           // in tiles
  entities: [],        // enemies, collectibles, checkpoints
  spawnX: 0,
  spawnY: 0
};

const camera = { x: 0, y: 0 };
const keys = {};
```

### Step 3: entities

Define all entity types with their properties and behaviors.

**Player**: See player object above. The player is the most complex entity with physics, collision, state (grounded, jumping, falling, wall-sliding, damaged, dead), and animation state.

**Enemies**: Each enemy type needs:
- Position and velocity
- Patrol behavior (walk between two points, fly in pattern, stationary turret)
- Collision bounds (may differ from visual bounds)
- Damage dealt on contact
- HP and death behavior

```javascript
function createWalker(x, y) {
  return {
    type: 'walker',
    x, y, vx: 1, width: 28, height: 28,
    hp: 1, damage: 1,
    patrolLeft: x - 64, patrolRight: x + 64
  };
}

function createFlier(x, y) {
  return {
    type: 'flier',
    x, y, width: 24, height: 24,
    hp: 1, damage: 1,
    baseY: y, amplitude: 30, frequency: 0.03, phase: 0
  };
}
```

**Collectibles**: Coins, gems, power-ups. Simple overlap detection, no physics needed.

**Platforms**: Moving platforms need position, velocity, and path data. One-way platforms need a flag.

**Hazards**: Spikes (static, instant damage), projectiles (moving, need trajectory), lava/pits (death zones).

### Step 4: game-loop

The core update cycle. For platformers, the order of operations matters.

```javascript
function update() {
  handleInput();
  updatePlayerPhysics();
  updateEnemies();
  updateProjectiles();
  updateMovingPlatforms();
  checkPlayerTileCollision();
  checkPlayerEnemyCollision();
  checkPlayerCollectibleCollision();
  checkPlayerHazardCollision();
  checkDeathZones();
  updateCamera();
  updateTimers();
  updateScore();
}
```

**Critical ordering**: Moving platforms must update before player collision, because the player may be riding a platform. Player physics must apply before collision resolution. Camera must update after player position is finalized.

### Step 5: rendering

Draw everything in back-to-front order (painter's algorithm).

```javascript
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawBackground();        // Parallax layers (optional)
  drawTiles();             // Ground, walls, platforms
  drawCollectibles();      // Coins, gems (behind player)
  drawEnemies();           // Enemy sprites
  drawPlayer();            // Player sprite with effects
  drawProjectiles();       // Bullets, fireballs (in front)
  drawParticles();         // Dust, sparks (optional)

  ctx.restore();

  drawHUD();               // Score, lives, HP bar (screen-space, not affected by camera)
}
```

**Tile rendering optimization**: Only draw tiles visible within the camera viewport.

```javascript
function drawTiles() {
  const startCol = Math.floor(camera.x / level.tileSize);
  const endCol = Math.ceil((camera.x + canvas.width) / level.tileSize);
  const startRow = Math.floor(camera.y / level.tileSize);
  const endRow = Math.ceil((camera.y + canvas.height) / level.tileSize);

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const tile = level.tiles[row]?.[col];
      if (tile) {
        drawTile(tile, col * level.tileSize, row * level.tileSize);
      }
    }
  }
}
```

### Step 6: input

Platformers need responsive input with support for held keys. Track key state in a map and read it during the update step.

```javascript
document.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }

  if (gameState === 'waiting') { start(); return; }
  if (gameState === 'over') { init(); return; }

  keys[e.key] = true;

  // Jump is triggered on press, not hold
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
    player.jumpPressed = true;
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;

  // Variable-height jump: cut velocity on release
  if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') && player.vy < 0) {
    player.vy *= JUMP_CUT_MULT;
  }
});
```

**Touch controls** (optional, for mobile):
Add virtual buttons for left, right, and jump. Overlay them on the canvas or below it. Touch input is not recorded by the OpenArcade pipeline, so this is a nice-to-have.

### Step 7: ui-overlays

**HUD elements** (drawn every frame during gameplay):
- Score: top-left or top-center, always visible
- Lives: top-right, represented as small player icons or a number
- HP bar (if applicable): below score, colored bar that depletes

**Overlay screens** (shown during waiting/over states):
- Title screen: game name, "Press SPACE to start", brief control summary
- Game over screen: "GAME OVER", final score, best score, "Press any key to restart"
- Level complete (optional): "LEVEL COMPLETE", score summary, brief pause before next level

**Pause menu** (optional):
Pause the game loop on Escape. Show a simple overlay. Resume on Escape again. Not critical for ML training data but improves player experience.

```javascript
// Score display in HUD
function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '16px Courier New';
  ctx.fillText(`Score: ${score}`, 10, 24);

  // Lives
  for (let i = 0; i < player.lives; i++) {
    ctx.fillStyle = THEME_COLOR;
    ctx.fillRect(canvas.width - 30 - i * 20, 10, 14, 14);
  }
}
```

### Step 8: audio

Initialize audio context on first user interaction (browser autoplay policy).

```javascript
let audioCtx;
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// Call initAudio() in the start() function or on first keydown

function sfx(type) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  switch (type) {
    case 'jump':
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
      break;
    case 'land':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    case 'collect':
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
    case 'damage':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
      break;
    case 'death':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
      break;
  }
}
```

### Step 9: recorder-integration

Follow the standard recorder contract (Section 12 of generation instructions). Platformer-specific considerations:

- **Score must update frequently**: Award points for collectibles (10-50 each), enemies defeated (100 each), distance traveled (1 per screen width), and level completion (500+ bonus). The ML model needs a dense reward signal.
- **Game sessions should be 30-120 seconds**: Tune difficulty so average players die within this window. If the game is too easy, the sessions run too long and produce less diverse training data.
- **Visual state must be unambiguous at 2fps capture**: At 2 frames per second, the recorder captures a snapshot every 500ms. The player should be clearly distinguishable from the background in every frame. Avoid relying on rapid animation for critical game state (e.g., do not communicate danger only through a 4-frame flash that lasts 66ms).

Optional but valuable -- expose structured game state for future training pipelines:

```javascript
window.gameData = {
  playerX: player.x,
  playerY: player.y,
  playerVX: player.vx,
  playerVY: player.vy,
  onGround: player.onGround,
  hp: player.hp,
  lives: player.lives,
  enemies: level.entities
    .filter(e => e.type === 'walker' || e.type === 'flier')
    .map(e => ({ x: e.x, y: e.y, type: e.type })),
  collectiblesRemaining: level.entities
    .filter(e => e.type === 'collectible' && !e.collected).length
};
```
