# Shooter Design Ontology

## Key Design Questions
- Perspective: top-down, side-scroll, first-person?
- Fire mode: single shot, rapid fire, spread, charged?
- Weapon variety: single weapon with upgrades, or weapon switching?
- Enemy patterns: swarm, bullet-hell, tactical, boss-focused?
- Scoring: points, combo multipliers, grade system?
- Lives/health: one-hit death, health bar, shields?

## Common Patterns
- **Power-up drops**: Enemies drop weapon upgrades or health
- **Screen-clearing bombs**: Limited-use panic button
- **Bullet patterns**: Geometric patterns for bullet-hell style
- **Scrolling**: Auto-scroll with player dodge, or player-controlled
- **Boss phases**: Multi-stage bosses with pattern changes
- **Invincibility frames**: Brief immunity after being hit

## Pitfalls to Avoid
- Bullet visibility: enemy projectiles lost in visual noise
- Hitbox confusion: visual sprite much larger than collision box
- Power-up loss too punishing (die = lose everything)
- Difficulty spikes without gradual ramp
- No visual/audio feedback on hit registration

## Reference Games
Galaga, R-Type, Gradius, Touhou, Enter the Gungeon, Ikaruga
