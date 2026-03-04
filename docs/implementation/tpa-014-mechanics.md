# TPA-014 Core Mechanics Implementation

## Overview

This document describes the implementation of core gameplay mechanics for TPA-014: Tank Puzzle Assault. These scripts form the foundation for tank movement, projectile physics, destructible environments, puzzle tiles, and powerups. All components are designed for network synchronization and extensibility.

## Files Implemented

### `ProjectileArcSolver.cs`
- Computes ballistic trajectories using Newtonian physics.
- Supports both forward trajectory prediction and inverse velocity calculation.
- Designed for deterministic replication across clients using shared initial state.

### `TankControllerBase.cs`
- Abstract base class for tank movement and aiming.
- Provides hooks for derived classes to implement movement, aiming, and firing.
- Separates input handling from physics logic for clean networking.
- Exposes `GetFirePosition()` and `GetFireDirection()` as abstract methods for precise fire origin derivation.

### `DestructibleObject.cs`
- Manages health, damage, and destruction lifecycle.
- Emits `OnDestroyed` event when health reaches zero.
- Used as base class for all destructible entities (walls, boxes, tanks).

### `RampTile.cs`
- Tags Unity grid tiles as ramps for traversal puzzles.
- Triggers custom events on collider enter/exit (configurable).
- Visual gizmo in editor for easy identification.
- No physics modification; relies on character controller slope handling.

### `PowerupBox.cs`
- Extends `DestructibleObject` to spawn powerups on destruction.
- Configurable type (`health`, `ammo`, etc.) and value.
- Uses prefab instantiation for flexibility.

## Networking Considerations

- All components are stateless or use serialized fields — ready for RPC/event sync.
- No input prediction or interpolation is implemented here — reserved for higher-level network controllers.
- Events (`OnDestroyed`, `OnRampEnter`) are designed to be fired and synced via networked event system.
- Trajectory computations are deterministic — clients can recompute identical arcs from shared fire state.

## Next Steps

- Integrate with networking layer (Photon/MLAPI/Netcode for GameObjects).
- Build UI for health bars and powerup indicators.
- Implement enemy AI that uses `TankControllerBase`.
- Connect `RampTile` events to puzzle logic (e.g., unlock door).
