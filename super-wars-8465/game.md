# Game: New Game
**Created**: 2026-02-20  **Version**: 1.0  **Status**: designing

## Changelog

### v1.0 (2026-02-20) — initial generation
- Stack: Three.js r134, none, none, Web Audio API

## Core_concept
- theme: neon-lit procedural labyrinth
- genre: 3D first-person dungeon crawler
- name: Neon Labyrinth

## Tech
- physics: custom collision (maze walls)_requirements
- physics: custom collision (wall raycasting)
- rendering: Three.js r134

## Mechanics
- secondary_attack: Ice Shard (right-click, piercing, slows)
- primary_attack: Fireball (left-click, AoE explosion)
- controls: WASD + mouse-look (pointer lock)

## Level
- generation: procedural recursive backtracking_design
- size: 15x15+ cells with rooms and corridors
- generation: procedural (recursive backtracking/Prim's)

## Visual
- accent_colors: #00ffff,#ff00ff,#0066ff,#ff6600
- background: #0a0a0f
- style: neon/glow with dark dungeon atmosphere
- effects: flickering torches, fog, dust particles, spell particles
- palette: cyan, magenta, electric blue accents on dark
- style: neon-lit dark dungeon

## Generation Prompts
- concept_art_prompt: Cyberpunk neon dungeon crawler game scene: dark obsidian labyrinth corridors with glowing cyan and magenta neon light strips embedded in walls, flickering orange torch sconces, volumetric fog, first-person perspective. Player hands casting glowing fireball spell, ice crystal shards hovering nearby. Floating dust particles catching colorful light. Color palette: deep black #0a0a0f background, cyan #00ffff, magenta #ff00ff, electric blue #0066ff, warm orange #ff6600 for fire. Mysterious, dangerous, beautiful atmosphere. Game UI elements: minimal HUD with health bar, mana orbs, spell cooldowns, corner minimap. Detailed, game-ready 3D illustration, Unreal Engine style lighting.
