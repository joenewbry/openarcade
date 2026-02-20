# Genre: FPS / 3D Action

**Status**: stub
**Last Updated**: 2026-02-20
**Complexity**: very-high
**Reference Image**: images/fps-3d-reference.png

## Identity
First-person shooters and 3D action games put the player directly in the character's perspective. The core fantasy is embodied action — you ARE the character, aiming, moving, and reacting in a 3D space. Sub-genres include arena FPS (Quake), tactical FPS (Counter-Strike), looter-shooter, retro FPS (DOOM-like), and walking simulator.

## Core Mechanics
- 3D camera: first-person, mouse-look, pointer lock API
- Movement: WASD, strafe, jump, crouch, sprint
- Raycasting for shooting (hitscan) or projectile simulation
- Enemy AI: patrol, alert, chase, take cover, flank
- Weapon system: hitscan vs projectile, ammo, reload, switching
- Level geometry: BSP, portals, or simple box colliders
- Lighting and atmosphere

## Tech Stack
<!-- TECH: {"id": "three", "role": "rendering", "required": true} -->
<!-- TECH: {"id": "cannon", "role": "physics", "recommended": true} -->
Three.js required. Cannon.js for physics. Pointer Lock API for mouse control.

## Generation Checklist
### Blocking
- Scope (single room, multi-room, open area)
- Combat type (hitscan, projectile, melee)
- Enemy types and AI complexity
- Art style (low-poly, retro, realistic)
### Defaultable
- FOV, mouse sensitivity, movement speed, health amount

## From Design to Code
*To be expanded when this genre file is completed.*
