# Robotron

## Game Type
Twin-stick arena shooter / survival

## Core Mechanics
- **Goal**: Survive as many waves as possible, shooting all enemies while rescuing human survivors for bonus points
- **Movement**: 8-directional free movement across a fixed single-screen arena; enemies chase the player
- **Key interactions**: Move and fire simultaneously in independent directions; rescue humans by walking into them; new enemy types unlock with each wave

## Controls
- W / A / S / D — move up / left / down / right
- Arrow Up / Left / Down / Right — fire in that direction
- (Movement and firing directions are fully independent)

## Difficulty Progression

### Structure
Infinite wave-based escalation. Each wave clears all enemies, then spawns a new set. Enemy count and speed increase every wave. New enemy types are introduced at fixed wave thresholds: wave 1 = Grunts only; wave 2+ adds Hulks; wave 3+ adds Brains; wave 4+ adds Spheroids (which spawn Enforcers); wave 5+ adds Electrodes. Player starts with 3 lives.

### Key Difficulty Variables
- `PLAYER_SPEED`: `3` — constant, never changes
- `BULLET_SPEED`: `7` — constant
- `FIRE_RATE`: `6` frames between shots — constant
- `GRUNT_SPEED_BASE`: `0.8` + `wave * 0.05` — Grunts start slow but accelerate each wave
- `GRUNT_COUNT`: `5 + difficulty * 3` — grows with wave number
- `HULK_SPEED`: `0.6` — constant (Hulks cannot be killed, only dodged)
- `BRAIN_SPEED`: `0.7` + `wave * 0.02` — Brains get slightly faster each wave
- `ENFORCER_SPEED`: `1.8` — the fastest standard enemy; constant but spawned in increasing numbers via Spheroids
- Lives: `3`, no mid-game replenishment (humans rescued give points, not lives)

### Difficulty Curve Assessment
The first two waves are manageable because only Grunts appear and the arena is not yet crowded, but wave 2 introduces unkillable Hulks at the same moment Grunt density is already rising, making the threat level jump sharply. The twin-stick control scheme (WASD + arrows) is unfamiliar and has no on-screen tutorial, so new players often stand still and fire when they should be moving — dying instantly on wave 1.

## Suggested Improvements
- [ ] Reduce `GRUNT_SPEED_BASE` from 0.8 to 0.6 for the first two waves so players have time to internalize the twin-stick controls before the screen becomes crowded
- [ ] Delay Hulk introduction from wave 2 to wave 3 — the indestructible obstacle concept is a meaningful difficulty jump that deserves its own wave to shine
- [ ] Add an on-screen control reminder for the first wave (e.g. "WASD: move  Arrows: fire") since the dual-directional scheme is the single biggest barrier to entry
- [ ] Reduce `FIRE_RATE` from 6 frames to 4 frames in wave 1 only, giving beginners a slightly higher margin of error before enemy swarms arrive
- [ ] Grant one extra life for clearing every 5 waves to give skilled players a safety net for reaching later content without it feeling overly generous
- [ ] Show the current wave number and incoming enemy type on the brief pause between waves so players can mentally prepare for new threats
