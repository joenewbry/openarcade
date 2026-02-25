# 1942 Pixel Campaigns Unified Design Doc

## Quick Navigation
- [Book](#book)
- [Mechanics](#mechanics)
- [Asset Gallery](#asset-gallery)
- [AI Art Pipeline](#ai-art-pipeline)
- [Cross-Genre Design Checklist](#cross-genre-design-checklist)

## Book

### Vision
`1942` is being rewritten as a high-fidelity pixel campaign shooter. This page is the single source for visual review, gameplay mechanics, and production specs so iteration happens before implementation churn.

Goals:
- One markdown source and one browseable HTML output.
- Campaign boards and content sheets that look close to final product.
- Strong readability across bullets, enemies, terrain, weather, and HUD.
- Four planes with unique specials and a shared roll-dodge sequence.

### Core Systems
- 4 campaigns, 20 waves each.
- Waves 5, 10, 15: mini-bosses (3 per campaign).
- Wave 20: final boss.
- Inputs: `Space` fire, `X` special, `Shift` or double-`Space` roll, `B` bomb clear.
- Bosses and mini-bosses always drop upgrades.

### Campaign Structure
1. New enemy family onboarding.
2. Enemy recombination and projectile pressure ramp.
3. Mini-boss escalations (three steps).
4. Final multi-section boss fight.

![Campaign Board: Coral Front](./assets/highfi/campaign-coral.png)
![Campaign Board: Jungle Spear](./assets/highfi/campaign-jungle.png)
![Campaign Board: Dust Convoy](./assets/highfi/campaign-dust.png)
![Campaign Board: Iron Monsoon](./assets/highfi/campaign-monsoon.png)

### Plane Roster and Shared Roll
- `P-38 Falcon` special: `Wing Burst` (spread surge, crowd clear).
- `F4U Lancer` special: `Rail Strafe` (piercing focused burst).
- `XP-59 Specter` special: `Phase Shield` (temporary invulnerability).
- `B7 Atlas` special: `EMP Wave` (enemy stun + nearby bullet erase).

Roll dodge requirements:
- Fixed roll animation sequence with visible orientation shift.
- Displacement arc (not only invulnerability lock).
- Shared timing literacy across all planes.
- Invulnerability window is shorter than full roll duration.

![Planes and Roll Board](./assets/highfi/planes-sheet.png)
![Player Roll Sprite Sheet](./assets/highfi/player-roll-sprite-sheet.png)

### Weapons and Bomb Clear
Primary weapon model:
- Persistent machine-gun fire lanes.
- Plane-specific special cooldown skills.
- Limited bomb economy.

Bomb clear requirements:
- Clear all active enemy bullets.
- Heavy board-wide enemy damage.
- Consumes one bomb stock.
- Serves as tactical pressure reset for dense phases.

### Enemy and Boss Visual Direction
Enemy sizes:
- Small: fast threat injectors.
- Medium: pattern drivers and lane denial.
- Large: anchor threats.
- Boss: staged, screen-dominant silhouettes.

Boss design:
- Multi-section destruction (turrets/engines/core).
- Phase transitions after section breakpoints.
- Firepower, HP, and pattern complexity increase each phase.

![Enemy Compendium Board](./assets/highfi/enemy-sheet.png)
![Enemy Sprite Sheet](./assets/highfi/enemy-sprite-sheet.png)
![Boss Sprite Sheet](./assets/highfi/boss-sprite-sheet.png)

### Terrain, Wildlife, and Readability
- Coral Front: islands, reefs, whales, gulls.
- Jungle Spear: canopy layers, rivers, birds.
- Dust Convoy: dunes, convoy roads, dust devils.
- Iron Monsoon: rain walls, lightning flashes, storm seabirds.

Color/readability rules:
- Player sprite and player bullets keep high luminance contrast.
- Enemy bullets use campaign-specific but always readable palettes.
- Ambient effects add atmosphere without masking hit-critical objects.

![Terrain and Wildlife Board](./assets/highfi/terrain-wildlife-board.png)

### Power-Ups and Economy
Power-ups:
- `Double Shot`
- `Speed Boost`
- `Shield`
- `Repair`
- `Bomb Pack`

Drop policy:
- Base drop chance by enemy tier.
- Progression multiplier raises drop frequency in later waves/campaigns.
- Mini-boss and final-boss drops are guaranteed.

![Power-Up Board](./assets/highfi/powerup-sheet.png)

### Dialogue Style
Dialogue panels should be comic-style high contrast black/white with minimal color accents for warnings and callouts.

![Dialogue Comic Board](./assets/highfi/dialogue-comic-bubbles.png)

### Competitive Inspiration
- `1942`
- `Raiden`
- `Strikers 1945`
- `DoDonPachi`
- `Xevious`

Applied takeaways:
- Preserve HUD context at all times.
- Maintain silhouette clarity during projectile density spikes.
- Phase bosses for spectacle and readable escalation.

![1942 Reference](./assets/comp-1942.png)
![Raiden Reference](./assets/comp-raiden.png)
![Strikers 1945 Reference](./assets/comp-strikers-1945.png)
![DoDonPachi Reference](./assets/comp-dodonpachi.png)
![Xevious Reference](./assets/comp-xevious.png)

## Mechanics

### Campaign and Wave Cadence
- Campaign count: 4.
- Waves per campaign: 20.

| Wave Range | Role |
|---|---|
| `1-4` | intro and recombination |
| `5` | mini-boss 1 |
| `6-9` | mixed pressure |
| `10` | mini-boss 2 |
| `11-14` | mixed + terrain burden |
| `15` | mini-boss 3 |
| `16-19` | high-density combinations |
| `20` | final boss |

### Enemy Types and Projectile Families
| Family | Primary Fire | Secondary Fire | Role |
|---|---|---|---|
| `scout_zero` | narrow burst | snap aimed shot | early pressure |
| `torpedo_gull` | low arc spread | lane bomb drop | low-altitude disruption |
| `canopy_raider` | angled crossfire | side pincer burst | flank opener |
| `gunship_hornet` | sustained stream | delayed bloom burst | zone denial |
| `dune_lancer` | straight lance shot | high-speed dash line | convoy intercept |
| `rail_bomber` | heavy shell volley | rear mine trail | sustained attrition |
| `storm_wraith` | pulse ring | tracking drift rounds | visibility stress |
| `sub_spear` | surfacing torpedo fan | wake mines | low-lane control |

### Boss Phase Model
Each final boss has 4 sections: `port battery`, `starboard battery`, `engine block`, `core`.

Per-phase escalation:
1. `Phase 1`: wide spread and movement intro.
2. `Phase 2`: aimed bursts + turret crossfire.
3. `Phase 3`: tracking rounds + lane denial.
4. `Phase 4`: combined patterns, movement compression, short recovery windows.

### Campaign-by-Campaign Enemy Progression
#### Campaign 1: NOT-Coral Front
- Intro family: `scout_zero` (W1).
- Added family: `torpedo_gull` (W3).
- Mini-boss waves: `reef_guardian` (W5/W10/W15).
- Final boss: `coral_dreadnought` (W20).
- Wildlife and terrain: whales, gulls, island channels.

#### Campaign 2: NOT-Jungle Spear
- Intro family: `canopy_raider` (W1).
- Added family: `gunship_hornet` (W3).
- Legacy mix: `scout_zero` in cross ambush formations.
- Mini-boss: `river_bastion` (W5/W10/W15).
- Final boss: `jungle_citadel` (W20).

#### Campaign 3: NOT-Dust Convoy
- Intro family: `dune_lancer` (W1).
- Added family: `rail_bomber` (W2-W3).
- Legacy mix: `gunship_hornet` for layered pressure.
- Mini-boss: `convoy_ram` (W5/W10/W15).
- Final boss: `dust_colossus` (W20).

#### Campaign 4: NOT-Iron Monsoon
- Intro family: `storm_wraith` (W1).
- Added family: `sub_spear` (W2).
- Legacy mix: `dune_lancer` + `canopy_raider` late waves.
- Mini-boss: `monsoon_blade` (W5/W10/W15).
- Final boss: `iron_tempest` (W20).

### Upgrade Drop Scaling
| Context | Base Chance | Progression Multiplier | Guaranteed |
|---|---|---|---|
| Small enemy | 10% | +0.4% per wave after W8 | No |
| Medium enemy | 14% | +0.5% per wave after W8 | No |
| Large enemy | 20% | +0.7% per wave after W8 | No |
| Mini-boss | 100% | n/a | Yes |
| Final boss | 100% major drop | n/a | Yes |

### Asset Gallery
![HUD Combat Mock](./assets/highfi/hud-shot.png)
![Power-Up Board](./assets/highfi/powerup-sheet.png)
![Enemy Compendium Board](./assets/highfi/enemy-sheet.png)
![Planes and Roll Board](./assets/highfi/planes-sheet.png)

## AI Art Pipeline
- Source model: `grok-imagine-image`.
- Script: `scripts/generate-1942-art.mjs`.
- Output folder: `1942/design/assets/highfi/`.
- Manifest: `1942/design/assets/highfi/art-manifest.json`.

Expected generated assets:
- Campaign boards per theater.
- Plane roster + roll sequence board.
- Enemy compendium board.
- Boss sheet.
- Sprite sheets (player roll, enemies, bosses).
- Power-up sheet with in-game style.
- Terrain/wildlife board.
- Comic dialogue board.

## Cross-Genre Design Checklist
Use this when designing non-shooter projects too. Skip modules not relevant to the genre.

### Universal Gates
- [ ] Vision, audience, session length.
- [ ] Core loop and controls.
- [ ] Progression and pacing curve.
- [ ] Content catalog and production plan.
- [ ] UX, readability, onboarding.
- [ ] Technical interfaces and acceptance criteria.

### Genre Modules
- Shooter: enemy waves, projectile families, boss phases, hit readability.
- Card game: deckbuilding loops, draw economy, counterplay visibility, archetype balance.
- Builder/sim: resource loops, placement affordances, long-horizon pacing, fail-state softness.
- FPS: weapon sandbox, map flow, spawn safety, recoil/readability tuning.
- Puzzle: teachability, state legibility, solution space breadth, anti-stall design.
- Strategy/RTS/Tactics: economy/micro/macro balance, faction asymmetry, intel and fog-of-war clarity.

### Output Requirement
- This markdown file is canonical and should be rendered to one HTML page for human review.
