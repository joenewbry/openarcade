# Platformer Design Ontology

## Key Design Questions
- Movement feel: floaty vs tight? Air control amount?
- Jump mechanics: single, double, wall-jump, coyote time?
- Level structure: linear stages, open-world, procedural?
- Camera: side-scroll, vertical, auto-scroll sections?
- Collectibles: coins, gems, power-ups?
- Hazards: pits, spikes, moving platforms, enemies?

## Common Patterns
- **Coyote time**: Allow jumping for ~100ms after leaving a ledge
- **Jump buffering**: Queue jump input just before landing
- **Variable jump height**: Hold = higher, tap = shorter
- **Momentum preservation**: Speed carries into jumps
- **Checkpoints**: Respawn points within long levels

## Pitfalls to Avoid
- Pixel-perfect jumps without generous hitboxes
- No visual cues for deadly vs safe terrain
- Camera that doesn't lead in movement direction
- Inconsistent platform collision (one-way vs solid)

## Reference Games
Super Mario Bros, Celeste, Hollow Knight, Shovel Knight, Mega Man
