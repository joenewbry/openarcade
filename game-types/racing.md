# Genre: Racing

**Status**: stub
**Last Updated**: 2026-02-20
**Complexity**: medium
**Reference Image**: images/racing-reference.png

## Identity
Racing games are about speed, competition, and mastery of vehicle control. The core fantasy is being the fastest — threading through obstacles, finding optimal lines, and outpacing opponents. Sub-genres include arcade racing (Mario Kart, Out Run), simulation (Gran Turismo), top-down racing (Micro Machines), endless runner/racer, and obstacle course.

## Core Mechanics
- Vehicle physics: acceleration, braking, steering, drift/skid
- Track design: curves, straights, elevation, shortcuts
- AI opponents: rubber-banding, racing lines, overtaking behavior
- Power-ups / weapons (arcade style)
- Lap tracking, position calculation, finish detection

## Tech Stack
<!-- TECH: {"id": "matter", "role": "physics", "optional": true} -->
Canvas 2D for top-down/pseudo-3D. Three.js for 3D racing. Simple physics or Matter.js for drift mechanics.

## Generation Checklist
### Blocking
- Perspective (top-down, side-scroll, pseudo-3D, full 3D)
- Racing type (circuit, point-to-point, endless)
- Vehicle control model (arcade vs sim)
- Opponents (AI, ghost, multiplayer, time-trial)
### Defaultable
- Number of laps, track length, vehicle speed range, opponent count

## From Design to Code
*To be expanded when this genre file is completed.*
