# Gravity Wars — Real-Time Physics Battle Arena (P2P Multiplayer)

Build a **real-time 2D physics battle arena** as a single `index.html` file with peer-to-peer multiplayer. Players fight in a destructible arena with gravity wells, unique character abilities, and explosive chain reactions.

## Core Requirements

### Networking (PeerJS from CDN)
- One player creates a room (gets a room code), others join with that code
- Support 2-4 players in a single match
- Host manages authoritative game state, broadcasts to peers at 20Hz
- Client-side prediction with server reconciliation for responsive controls
- Lobby screen: players pick character class, see who's joined, host clicks "Start"
- If a player disconnects, their character becomes an AI bot for the rest of the round
- Display latency (ping) for each player in the corner

### Physics (Planck.js from CDN)
- Full 2D rigid body physics for all game objects
- Characters are physics bodies with mass, friction, and restitution
- Projectiles are physics bodies affected by gravity wells
- Destructible terrain: terrain is composed of many small physics bodies; when hit by explosions, chunks break apart and tumble
- Chain reactions: explosive barrels detonate when hit, which can destroy nearby terrain and set off other barrels

### Arena
- Canvas 2D rendering of the physics world
- Arena is a bounded rectangular space with platforms, ramps, and destructible walls
- 3-4 different arena layouts, randomly selected each round
- **Gravity wells**: 2-3 per arena. Visible as swirling vortex effects. Bend all projectile trajectories that pass nearby. Players near a well get slowly pulled in.
- **Arena hazards** that activate on timers:
  - Lava pools at the bottom that deal damage on contact
  - Force field walls that flip on/off every 10 seconds
  - Crushing platforms that slam together periodically
- Arena slowly shrinks after 90 seconds (walls close in) to force encounters

### Character Classes (4 classes)
1. **Tank** — Heavy, slow. Fires a cannonball that arcs with gravity, explodes on impact destroying terrain. Special: Deploy a temporary shield wall.
2. **Scout** — Light, fast, double-jump. Fires rapid small bullets. Special: Grappling hook that attaches to terrain and swings the player.
3. **Engineer** — Medium build. Fires sticky mines that attach to surfaces and detonate after 3 seconds (or on proximity). Special: Build a temporary platform.
4. **Psion** — Fragile, floaty. Fires a gravity beam that pushes/pulls objects and players. Special: Create a temporary gravity well that lasts 5 seconds.

Each class has:
- Unique movement feel (different mass, jump force, air control)
- Primary weapon (unlimited, with cooldown)
- Special ability (15-second cooldown)
- Distinct visual design (geometric shapes with class color)

### Combat & Physics Interactions
- All projectiles interact with gravity wells — the player must account for bending trajectories
- Tank cannonballs destroy terrain chunks on impact, creating new paths
- Engineer mines stick to physics bodies and move with them
- Psion gravity beam can redirect other players' projectiles
- Destroyed terrain chunks become physics debris that can hit players for minor damage
- Explosive barrels (scattered around arena) create large explosions and chain reactions

### Ragdoll Deaths
- When a player is killed, their character becomes a ragdoll (multi-body joint chain)
- Ragdoll tumbles and bounces off terrain before fading out
- Respawn after 3 seconds at a random safe spawn point

### Scoring & Rounds
- First to 10 kills wins the match (or most kills after 3 minutes)
- Kill feed in the corner showing "[Player] eliminated [Player] with [weapon]"
- Round-end scoreboard: kills, deaths, K/D ratio, damage dealt
- "Play Again" button returns to lobby for character re-selection

### Visual Effects
- Explosion particles with physics (debris flies outward)
- Gravity well visual: rotating particle ring with color gradient
- Projectile trails (fading line segments)
- Screen shake on nearby explosions (proportional to distance)
- Damage numbers floating up from hit players
- Shield/special ability visual indicators
- Arena shrink zone shown as a red glowing boundary

### Audio (Web Audio API)
- Weapon fire sounds (synthesized per class)
- Explosion sounds with varying intensity
- Gravity well ambient hum (low oscillator with LFO)
- Hit confirmation beep
- Kill sound effect
- Countdown beeps at round start

### UI
- Health bar above each player (color-coded by class)
- Special ability cooldown indicator
- Kill counter (top of screen)
- Timer showing remaining round time
- Minimap showing player positions (dots)
- Connection quality indicator per player

## Technical Constraints
- Single `index.html` file
- PeerJS and Planck.js loaded from CDN
- Canvas 2D rendering (no WebGL required)
- Must handle 2-4 players with dozens of physics bodies at 60fps
- Network messages should be delta-compressed (only send changed state)
- All audio synthesized via Web Audio API
