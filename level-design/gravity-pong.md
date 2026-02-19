# Gravity Pong — Level Design

## Concept
Two ships fly with Asteroids-style physics in a bounded arena. A puck floats in zero gravity. Ships deflect the puck by colliding with it. Score by getting the puck into the opponent's goal zone (top edge = CPU goal, bottom edge = player goal). Asteroid obstacles drift through the field.

## Arena
- **Canvas**: 480×480
- **Goal zones**: 22px at top (CPU goal) and 22px at bottom (player goal)
- **Side walls**: hard bounces for puck; ships are clamped to their half

## Ships
| Property | Value |
|---|---|
| Radius | 12px |
| Rotation speed | 0.07 rad/frame |
| Thrust acceleration | 0.35 px/frame² |
| Friction | 0.985/frame |
| Max speed | 7 px/frame |
| Brake factor | 0.88/frame when Space held |

- **Player** confined to lower half (y: 240..480−r)
- **CPU** confined to upper half (y: r..240)
- Ships represented as triangles pointing in direction of `angle`

## Puck
- **Radius**: 8px
- **Elastic collision** with ships (normal-based velocity exchange + 40% ship momentum transfer)
- **Wall bounces**: elastic off left/right walls
- **No friction**: puck drifts until hit
- **Scoring**: enters 22px goal zone at top or bottom → point scored

## Asteroids
- **Count**: 4
- **Radius**: 18px each
- **Speed**: random ±0.6 px/frame in x and y
- **Spin**: random ±0.015 rad/frame
- **Wrap**: torus wrap around all edges
- **Collision**: deflects ships and puck (reflect velocity along collision normal, 80% restitution)
- Asteroids do not interact with each other or goals

## CPU AI
- Each frame: compute angle from ship to puck
- Rotate toward desired angle at 1.2× rot speed
- Thrust if distance to puck > 40px (80% of player thrust)
- Clamped to upper half of arena

## Scoring
- **Player scores**: puck enters top goal zone (y − r ≤ GOAL_DEPTH)
- **CPU scores**: puck enters bottom goal zone (y + r ≥ H − GOAL_DEPTH)
- **Win condition**: first to 5 points
- After each goal: puck and ships reset to starting positions

## Reset Positions
| Entity | Reset position |
|---|---|
| Player ship | (240, 360), angle=0 |
| CPU ship | (240, 120), angle=π |
| Puck | (240, 240), random velocity ±1.5 x, ±2 y |

## Controls
| Key | Action |
|---|---|
| ← | Rotate ship left |
| → | Rotate ship right |
| ↑ | Thrust forward |
| Space | Brake (velocity × 0.88) |

## Theme
- **Color**: `#0cf` (cyan)
- Player ship: cyan triangle
- CPU ship: orange (`#f84`) triangle
- Puck: light blue-white (`#ddf`), white glow
- Asteroids: dark grey fill (`#445`), neutral glow
- Goal zones: very dark background with label text
- Center dividing line: dashed `#0c3040`
