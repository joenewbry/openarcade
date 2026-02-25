# 1942 Pixel Campaigns Design Book

## Chapter 1: Vision
This rewrite shifts `1942` from abstract vector-like forms into a pixel-art campaign shooter with:
- deliberate theater identity,
- animated enemy readability,
- richer terrain and wildlife ambience,
- and stronger player expression through four unique planes.

Primary goal: make each campaign feel authored, play-tested, and visually distinct while preserving arcade immediacy.

## Chapter 2: Campaign Identity Boards
![Campaign Boards](./assets/campaigns-overview.svg)

### Theater Themes
- `NOT-Coral Front`: readable ocean onboarding with naval pressure.
- `NOT-Jungle Spear`: canopy ambush and river lane control.
- `NOT-Dust Convoy`: armored lanes under dust interference.
- `NOT-Iron Monsoon`: low-visibility storm climax.

## Chapter 3: Plane Roster and Pilot Expression
![Plane Boards](./assets/planes-specials.svg)

Design rules:
- Each plane has one high-identity special move.
- All planes share the same roll sequence for core dodge literacy.
- Ability cooldown bars are always visible in HUD.

## Chapter 4: Weapons Model
Primary systems:
- Hold-fire machine guns.
- Plane specials on cooldown.
- Consumable bombs.

Bomb clear specification:
- Input: `B`.
- Effect: clears all enemy bullets and deals heavy global damage to active enemies.
- Role: emergency stabilization in high-density moments.

## Chapter 5: Enemy Compendium and Animation
![Enemy Compendium](./assets/enemy-roster.svg)

Enemy rollout strategy:
- Introduce one enemy family early per campaign.
- Add a second enemy family within first 3 waves.
- Recombine old + new families in later mixed formations.
- Mini bosses test one specific mechanic before final boss phase stack.

## Chapter 6: Terrain, Wildlife, and Color Readability
![Terrain and Wildlife](./assets/terrain-wildlife.svg)

Color design intent:
- Early waves bias high contrast (easy read).
- Mid waves tighten contrast without hiding critical bullets.
- Late waves add atmospheric clutter while preserving projectile clarity.

## Chapter 7: Upgrade Economy
![Power-Up Cards](./assets/powerups.svg)

Drop policy:
- Regular waves sustain momentum (random drops).
- Boss milestones guarantee build progression.
- Bomb packs and defensive drops exist to prevent unfair fail spirals.

## Chapter 8: Pacing and Boss Escalation
![Pacing Chart](./assets/pacing-chart.svg)

All campaigns follow the same macro rhythm:
- 3 mini bosses + 1 final boss.
- Pre-boss mixed wave pressure ramps.
- Final encounter closes campaign identity arc.

## Chapter 9: Dialogue and Context Delivery
![Dialogue Timing](./assets/dialogue-flow.svg)

Dialogue goals:
- Clarify mission context.
- Telegraph mechanic shifts.
- Reduce trial-and-error deaths.

## Chapter 10: Competitive Inspiration (Comp Set)
These references were clipped for pacing, enemy readability, and encounter rhythm inspiration.

### 1942 (Capcom)
![1942 Reference](./assets/comp-1942.png)
Source: https://en.wikipedia.org/wiki/1942_(video_game)

### Raiden
![Raiden Reference](./assets/comp-raiden.png)
Source: https://en.wikipedia.org/wiki/Raiden_(video_game)

### Strikers 1945
![Strikers 1945 Reference](./assets/comp-strikers-1945.png)
Source: https://en.wikipedia.org/wiki/Strikers_1945

### DoDonPachi
![DoDonPachi Reference](./assets/comp-dodonpachi.png)
Source: https://en.wikipedia.org/wiki/DoDonPachi

### Xevious
![Xevious Reference](./assets/comp-xevious.png)
Source: https://en.wikipedia.org/wiki/Xevious

### Design Takeaways Applied
- Keep enemy silhouettes compact and distinct.
- Use wave scripts that move from simple lanes to layered crossfire.
- Make boss introductions legible before peak bullet volume.
- Balance visual richness with strict hit readability.

## Chapter 11: Implementation References
- Runtime: `1942/game.js`
- Content specs: `1942/content/*.js`
- Mechanics spec: `1942/design/game-mechanics.md`

