# Genre: Sandbox

**Status**: stub
**Last Updated**: 2026-02-20
**Complexity**: high
**Reference Image**: images/sandbox-reference.png

## Identity
Sandbox games give players tools and a world, then let them define their own goals. The core fantasy is creative freedom — building, exploring, and experimenting without prescribed objectives. Sub-genres include creative sandbox (Minecraft Creative), survival sandbox (Terraria, Minecraft Survival), physics sandbox (Garry's Mod), and simulation sandbox (SimCity, Factorio).

## Core Mechanics
- World grid: tile-based, voxel-based, or continuous
- Building/crafting: place/remove blocks, recipe systems, resource chains
- Inventory and resource management
- World persistence and saving (localStorage, IndexedDB)
- Tool/item interaction system
- Physics simulation for placed objects
- Day/night cycle, environmental systems

## Tech Stack
<!-- TECH: {"id": "matter", "role": "physics", "optional": true} -->
Canvas 2D for 2D sandbox. Three.js for voxel/3D. Large world requires chunking and efficient rendering.

## Generation Checklist
### Blocking
- World type (2D tile grid, 2D physics, 3D voxel)
- Core loop (creative, survival, simulation)
- World size and persistence strategy
- Interaction model (place/break, drag-and-drop, tools)
### Defaultable
- World dimensions, tile/block types, starting inventory

## From Design to Code
*To be expanded when this genre file is completed.*
