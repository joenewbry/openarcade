# Neon Labyrinth — 3D First-Person Dungeon Crawler

Build a **3D first-person dungeon crawler** as a single `index.html` file. The player explores a procedurally generated neon-lit labyrinth, fights enemies with spell attacks, collects loot, and defeats a boss to escape.

## Core Requirements

### Rendering & Camera
- Three.js for 3D rendering (load from CDN)
- First-person camera with mouse-look (pointer lock) and WASD movement
- Collision detection against maze walls so the player can't walk through them
- Smooth movement with acceleration/deceleration, not instant stops
- Minimap overlay in the corner showing explored areas

### Maze Generation
- Procedurally generate a different maze each playthrough using recursive backtracking or Prim's algorithm
- Maze should be at least 15x15 cells, with rooms of varying sizes connected by corridors
- Place the boss room at the farthest point from the player's spawn
- Scatter treasure chests, health pickups, and ammo caches in dead ends

### Lighting & Atmosphere
- Dynamic point lights on wall-mounted torches that flicker using sine wave + noise
- Player carries a glowing orb that illuminates nearby walls with a warm radius
- Neon accent strips on walls (cyan, magenta, electric blue) using emissive materials
- Fog that increases deeper in the dungeon, reducing visibility
- Particle effects: floating dust motes, torch sparks, spell impact particles

### Combat System
- **Fireball**: Left-click shoots a glowing projectile that travels forward, explodes on contact with walls or enemies, deals area damage, and spawns particle burst
- **Ice Shard**: Right-click shoots a fast piercing projectile that slows enemies
- Cooldown timers shown on the HUD for each spell
- Raycasting for hit detection against enemies

### Enemy AI (3 types)
1. **Sentinel** — Slow, heavy. Patrols a fixed route. Charges when it sees the player. High HP, high damage.
2. **Wraith** — Fast, low HP. Wanders randomly. Rushes directly at the player when in line of sight. Can phase through some walls.
3. **Turret** — Stationary. Shoots projectiles at the player on a timer when in range. Must be destroyed to pass safely.

Each enemy type should have a distinct glowing geometric shape (cube, tetrahedron, octahedron) with a unique neon color.

### Boss Fight
- Large enemy at the maze end with 3 attack phases
- Phase 1: Shoots spreads of projectiles
- Phase 2: Spawns minions while shielded
- Phase 3: Fast melee charges with shockwave attacks
- Health bar displayed at top of screen during the fight
- Defeating the boss opens an exit portal

### HUD & UI
- Health bar (top-left), spell cooldowns (bottom-center), ammo/mana counter
- Damage vignette effect (red flash) when hit
- Death screen with "Try Again" button that regenerates the maze
- Victory screen with time and kill stats
- Pause menu (Escape key) with resume and restart options

### Audio
- Web Audio API for all sounds
- Procedural footstep sounds (filtered noise bursts) that change based on movement speed
- Spell casting whoosh/impact sounds (synthesized, not samples)
- Enemy alert sound when they spot the player
- Ambient low-frequency drone that intensifies near the boss room
- Boss music: simple procedural beat with bass and percussion

## Technical Constraints
- Single `index.html` file, no external assets except CDN libraries
- Must run at 60fps on a modern laptop
- All textures must be procedural (canvas-generated or shader-based)
- All audio must be synthesized (Web Audio API oscillators/noise)
