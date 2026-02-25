# 1942 Pixel Campaigns Unified Design Doc

## Quick Navigation
- [Book](#book)
- [Mechanics](#mechanics)
- [Wave-by-Wave Visual Review](#wave-by-wave-visual-review)
- [Asset Gallery](#asset-gallery)
- [AI Art Pipeline](#ai-art-pipeline)

## Book

### Vision
`1942` is being rewritten as a high-fidelity pixel vertical shooter. This markdown is the single source for design, mechanics, pacing, and visual production review.

Goals:
- One canonical markdown file rendered into one browseable HTML page.
- All imagery follows top-down vertical shooter readability.
- Final-quality pixel look for planes, enemies, bosses, power-ups, terrain, and dialogue.
- Wave-by-wave previews so campaign pacing can be reviewed without playing.

### Core Systems
- 4 campaigns, 20 waves each.
- Waves 5/10/15: mini bosses.
- Wave 20: final boss.
- Inputs: `Space` fire, `X` special, `Shift` or double-`Space` roll, `B` bomb clear.
- HUD is single-player and top-aligned (`Score`, `Lives`, `Bombs`, `Wave`).

### Campaign Boards
![Campaign Board: Coral Front](./assets/highfi/campaign-coral.png)
![Campaign Board: Jungle Spear](./assets/highfi/campaign-jungle.png)
![Campaign Board: Dust Convoy](./assets/highfi/campaign-dust.png)
![Campaign Board: Iron Monsoon](./assets/highfi/campaign-monsoon.png)

### Plane Roster and Roll Dodge
Plane focus for this phase:
- `XP-59 Specter` special: `Phase Shield`.
- `B7 Atlas` special: `EMP Wave`.

Roll dodge requirements:
- Sprite-driven roll sequence (not a single static tilt panel).
- Shared timing literacy and movement displacement.
- I-frame window shorter than the full roll animation.

![Plane Roster (Specter + Atlas)](./assets/highfi/planes-sheet.png)
![Player Roll Sprite Sheet](./assets/highfi/player-roll-sprite-sheet.png)

### Weapons and Upgrade Rules
Primary weapons:
- Base fire starts as single shot.
- Shot upgrade is progressive and stacks by tier: `Single -> Double -> Triple`.
- Speed boost modifies movement and evade spacing.

Special and utility:
- `Shield` does not stack.
- `Repair` does not stack.
- `Bomb Pack` stacks and powers board clear.
- `Passive Turret` pickup grants automated support fire.

Bomb clear behavior:
- Clears active enemy bullets.
- Deals heavy board-wide damage.
- Consumes one bomb stock.

### Enemy and Boss Visual Direction
Enemy classes:
- Small: fast injectors.
- Medium: pattern drivers.
- Large: anchor threats.
- Boss: screen-dominant multi-section threats.

Boss structure:
- Distinct destructible sections.
- Phase escalation by HP breakpoints.
- Increasing projectile complexity and lane pressure.

![Enemy Compendium Board](./assets/highfi/enemy-sheet.png)
![Enemy Sprite Sheet](./assets/highfi/enemy-sprite-sheet.png)
![Boss Sprite Sheet](./assets/highfi/boss-sprite-sheet.png)
![Enemy Movement + Fire Patterns](./assets/highfi/enemy-patterns-board.png)
![Boss Phase Behavior Board](./assets/highfi/boss-phase-board.png)

### Terrain and Ambient Wildlife
- Wildlife is non-interactive ambience only.
- Whales may surface and disappear as visual flavor.
- Seagulls are removed.

![Terrain and Wildlife Board](./assets/highfi/terrain-wildlife-board.png)
![Whale Ambient Strip](./assets/highfi/whale-ambient-strip.png)

### Power-Ups and Readability
- All pickups use a consistent silhouette family.
- Drop readability is protected against terrain color noise.
- Late waves increase drop frequency through scaling multipliers.

![Power-Up Board](./assets/highfi/powerup-sheet.png)

### Dialogue Style
Dialogue is comic-style high-contrast black/white with minimal accent color.

![Dialogue Comic Board](./assets/highfi/dialogue-comic-bubbles.png)

### Competitive Inspiration
- `1942`
- `Raiden`
- `Strikers 1945`
- `DoDonPachi`
- `Xevious`

Applied takeaways:
- Strong HUD clarity under bullet density.
- Top-down readability and silhouette control.
- Large, screen-filling bosses with phase identity.

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
| `1-4` | onboarding and clean lanes |
| `5` | mini boss 1 |
| `6-9` | mixed pressure |
| `10` | mini boss 2 |
| `11-14` | terrain + pressure blend |
| `15` | mini boss 3 |
| `16-19` | high-density pressure |
| `20` | final boss |

### Enemy Types and Projectile Families
| Family | Movement | Primary Fire | Secondary Fire | Role |
|---|---|---|---|---|
| `scout_zero` | quick dive lanes | narrow burst | snap aimed shot | early pressure |
| `torpedo_gull` | low sweep | low arc spread | lane bomb drop | low-alt disruption |
| `canopy_raider` | flank weave | angled crossfire | side pincer burst | flank opener |
| `gunship_hornet` | slow anchor drift | sustained stream | delayed bloom burst | zone denial |
| `dune_lancer` | high-speed line dash | straight lance shot | dash tracer line | intercept |
| `rail_bomber` | staggered lane hold | heavy volley | rear mine trail | attrition |
| `storm_wraith` | pulse oscillation | pulse ring | tracking drift rounds | visibility stress |
| `sub_spear` | surfacing pop-in | torpedo fan | wake mines | low-lane control |

### Boss Phase Model
Each final boss has four core sections: `port battery`, `starboard battery`, `engine`, `core`.

1. `Phase 1`: spread baseline and movement literacy.
2. `Phase 2`: aimed bursts + crossfire.
3. `Phase 3`: tracking rounds + lane denial.
4. `Phase 4`: combined patterns with short recovery windows.

### Campaign-by-Campaign Progression
#### Campaign 1: NOT-Coral Front
- Intro: `scout_zero`.
- Added pressure: `torpedo_gull`.
- Mini bosses: `reef_guardian` on W5/W10/W15.
- Final boss: `coral_dreadnought` on W20.
- Terrain: reefs + island channels + ambient whales.

#### Campaign 2: NOT-Jungle Spear
- Intro: `canopy_raider`.
- Added pressure: `gunship_hornet`.
- Legacy remix: `scout_zero` ambush packs.
- Mini bosses: `river_bastion` on W5/W10/W15.
- Final boss: `jungle_citadel` on W20.

#### Campaign 3: NOT-Dust Convoy
- Intro: `dune_lancer`.
- Added pressure: `rail_bomber`.
- Legacy remix: `gunship_hornet` overlay waves.
- Mini bosses: `convoy_ram` on W5/W10/W15.
- Final boss: `dust_colossus` on W20.

#### Campaign 4: NOT-Iron Monsoon
- Intro: `storm_wraith`.
- Added pressure: `sub_spear`.
- Legacy remix: `dune_lancer` + `canopy_raider` late waves.
- Mini bosses: `monsoon_blade` on W5/W10/W15.
- Final boss: `iron_tempest` on W20.

### Upgrade Drop Scaling
| Context | Base Chance | Progression Multiplier | Guaranteed |
|---|---|---|---|
| Small enemy | 10% | +0.4% per wave after W8 | No |
| Medium enemy | 14% | +0.5% per wave after W8 | No |
| Large enemy | 20% | +0.7% per wave after W8 | No |
| Mini boss | 100% | n/a | Yes |
| Final boss | 100% major drop | n/a | Yes |

## Wave-by-Wave Visual Review
Each wave preview is generated to match vertical-shooter composition, top HUD layout, and campaign-specific readability constraints.

### Campaign 1: NOT-Coral Front
#### C1 Wave 1
![C1 Wave 1 Preview](./assets/highfi/wave-c1-w01.png)
#### C1 Wave 2
![C1 Wave 2 Preview](./assets/highfi/wave-c1-w02.png)
#### C1 Wave 3
![C1 Wave 3 Preview](./assets/highfi/wave-c1-w03.png)
#### C1 Wave 4
![C1 Wave 4 Preview](./assets/highfi/wave-c1-w04.png)
#### C1 Wave 5
![C1 Wave 5 Preview](./assets/highfi/wave-c1-w05.png)
#### C1 Wave 6
![C1 Wave 6 Preview](./assets/highfi/wave-c1-w06.png)
#### C1 Wave 7
![C1 Wave 7 Preview](./assets/highfi/wave-c1-w07.png)
#### C1 Wave 8
![C1 Wave 8 Preview](./assets/highfi/wave-c1-w08.png)
#### C1 Wave 9
![C1 Wave 9 Preview](./assets/highfi/wave-c1-w09.png)
#### C1 Wave 10
![C1 Wave 10 Preview](./assets/highfi/wave-c1-w10.png)
#### C1 Wave 11
![C1 Wave 11 Preview](./assets/highfi/wave-c1-w11.png)
#### C1 Wave 12
![C1 Wave 12 Preview](./assets/highfi/wave-c1-w12.png)
#### C1 Wave 13
![C1 Wave 13 Preview](./assets/highfi/wave-c1-w13.png)
#### C1 Wave 14
![C1 Wave 14 Preview](./assets/highfi/wave-c1-w14.png)
#### C1 Wave 15
![C1 Wave 15 Preview](./assets/highfi/wave-c1-w15.png)
#### C1 Wave 16
![C1 Wave 16 Preview](./assets/highfi/wave-c1-w16.png)
#### C1 Wave 17
![C1 Wave 17 Preview](./assets/highfi/wave-c1-w17.png)
#### C1 Wave 18
![C1 Wave 18 Preview](./assets/highfi/wave-c1-w18.png)
#### C1 Wave 19
![C1 Wave 19 Preview](./assets/highfi/wave-c1-w19.png)
#### C1 Wave 20
![C1 Wave 20 Preview](./assets/highfi/wave-c1-w20.png)

### Campaign 2: NOT-Jungle Spear
#### C2 Wave 1
![C2 Wave 1 Preview](./assets/highfi/wave-c2-w01.png)
#### C2 Wave 2
![C2 Wave 2 Preview](./assets/highfi/wave-c2-w02.png)
#### C2 Wave 3
![C2 Wave 3 Preview](./assets/highfi/wave-c2-w03.png)
#### C2 Wave 4
![C2 Wave 4 Preview](./assets/highfi/wave-c2-w04.png)
#### C2 Wave 5
![C2 Wave 5 Preview](./assets/highfi/wave-c2-w05.png)
#### C2 Wave 6
![C2 Wave 6 Preview](./assets/highfi/wave-c2-w06.png)
#### C2 Wave 7
![C2 Wave 7 Preview](./assets/highfi/wave-c2-w07.png)
#### C2 Wave 8
![C2 Wave 8 Preview](./assets/highfi/wave-c2-w08.png)
#### C2 Wave 9
![C2 Wave 9 Preview](./assets/highfi/wave-c2-w09.png)
#### C2 Wave 10
![C2 Wave 10 Preview](./assets/highfi/wave-c2-w10.png)
#### C2 Wave 11
![C2 Wave 11 Preview](./assets/highfi/wave-c2-w11.png)
#### C2 Wave 12
![C2 Wave 12 Preview](./assets/highfi/wave-c2-w12.png)
#### C2 Wave 13
![C2 Wave 13 Preview](./assets/highfi/wave-c2-w13.png)
#### C2 Wave 14
![C2 Wave 14 Preview](./assets/highfi/wave-c2-w14.png)
#### C2 Wave 15
![C2 Wave 15 Preview](./assets/highfi/wave-c2-w15.png)
#### C2 Wave 16
![C2 Wave 16 Preview](./assets/highfi/wave-c2-w16.png)
#### C2 Wave 17
![C2 Wave 17 Preview](./assets/highfi/wave-c2-w17.png)
#### C2 Wave 18
![C2 Wave 18 Preview](./assets/highfi/wave-c2-w18.png)
#### C2 Wave 19
![C2 Wave 19 Preview](./assets/highfi/wave-c2-w19.png)
#### C2 Wave 20
![C2 Wave 20 Preview](./assets/highfi/wave-c2-w20.png)

### Campaign 3: NOT-Dust Convoy
#### C3 Wave 1
![C3 Wave 1 Preview](./assets/highfi/wave-c3-w01.png)
#### C3 Wave 2
![C3 Wave 2 Preview](./assets/highfi/wave-c3-w02.png)
#### C3 Wave 3
![C3 Wave 3 Preview](./assets/highfi/wave-c3-w03.png)
#### C3 Wave 4
![C3 Wave 4 Preview](./assets/highfi/wave-c3-w04.png)
#### C3 Wave 5
![C3 Wave 5 Preview](./assets/highfi/wave-c3-w05.png)
#### C3 Wave 6
![C3 Wave 6 Preview](./assets/highfi/wave-c3-w06.png)
#### C3 Wave 7
![C3 Wave 7 Preview](./assets/highfi/wave-c3-w07.png)
#### C3 Wave 8
![C3 Wave 8 Preview](./assets/highfi/wave-c3-w08.png)
#### C3 Wave 9
![C3 Wave 9 Preview](./assets/highfi/wave-c3-w09.png)
#### C3 Wave 10
![C3 Wave 10 Preview](./assets/highfi/wave-c3-w10.png)
#### C3 Wave 11
![C3 Wave 11 Preview](./assets/highfi/wave-c3-w11.png)
#### C3 Wave 12
![C3 Wave 12 Preview](./assets/highfi/wave-c3-w12.png)
#### C3 Wave 13
![C3 Wave 13 Preview](./assets/highfi/wave-c3-w13.png)
#### C3 Wave 14
![C3 Wave 14 Preview](./assets/highfi/wave-c3-w14.png)
#### C3 Wave 15
![C3 Wave 15 Preview](./assets/highfi/wave-c3-w15.png)
#### C3 Wave 16
![C3 Wave 16 Preview](./assets/highfi/wave-c3-w16.png)
#### C3 Wave 17
![C3 Wave 17 Preview](./assets/highfi/wave-c3-w17.png)
#### C3 Wave 18
![C3 Wave 18 Preview](./assets/highfi/wave-c3-w18.png)
#### C3 Wave 19
![C3 Wave 19 Preview](./assets/highfi/wave-c3-w19.png)
#### C3 Wave 20
![C3 Wave 20 Preview](./assets/highfi/wave-c3-w20.png)

### Campaign 4: NOT-Iron Monsoon
#### C4 Wave 1
![C4 Wave 1 Preview](./assets/highfi/wave-c4-w01.png)
#### C4 Wave 2
![C4 Wave 2 Preview](./assets/highfi/wave-c4-w02.png)
#### C4 Wave 3
![C4 Wave 3 Preview](./assets/highfi/wave-c4-w03.png)
#### C4 Wave 4
![C4 Wave 4 Preview](./assets/highfi/wave-c4-w04.png)
#### C4 Wave 5
![C4 Wave 5 Preview](./assets/highfi/wave-c4-w05.png)
#### C4 Wave 6
![C4 Wave 6 Preview](./assets/highfi/wave-c4-w06.png)
#### C4 Wave 7
![C4 Wave 7 Preview](./assets/highfi/wave-c4-w07.png)
#### C4 Wave 8
![C4 Wave 8 Preview](./assets/highfi/wave-c4-w08.png)
#### C4 Wave 9
![C4 Wave 9 Preview](./assets/highfi/wave-c4-w09.png)
#### C4 Wave 10
![C4 Wave 10 Preview](./assets/highfi/wave-c4-w10.png)
#### C4 Wave 11
![C4 Wave 11 Preview](./assets/highfi/wave-c4-w11.png)
#### C4 Wave 12
![C4 Wave 12 Preview](./assets/highfi/wave-c4-w12.png)
#### C4 Wave 13
![C4 Wave 13 Preview](./assets/highfi/wave-c4-w13.png)
#### C4 Wave 14
![C4 Wave 14 Preview](./assets/highfi/wave-c4-w14.png)
#### C4 Wave 15
![C4 Wave 15 Preview](./assets/highfi/wave-c4-w15.png)
#### C4 Wave 16
![C4 Wave 16 Preview](./assets/highfi/wave-c4-w16.png)
#### C4 Wave 17
![C4 Wave 17 Preview](./assets/highfi/wave-c4-w17.png)
#### C4 Wave 18
![C4 Wave 18 Preview](./assets/highfi/wave-c4-w18.png)
#### C4 Wave 19
![C4 Wave 19 Preview](./assets/highfi/wave-c4-w19.png)
#### C4 Wave 20
![C4 Wave 20 Preview](./assets/highfi/wave-c4-w20.png)

## Asset Gallery
![HUD Combat Mock](./assets/highfi/hud-shot.png)
![Power-Up Board](./assets/highfi/powerup-sheet.png)
![Enemy Compendium Board](./assets/highfi/enemy-sheet.png)
![Enemy Patterns Board](./assets/highfi/enemy-patterns-board.png)
![Boss Phase Behavior Board](./assets/highfi/boss-phase-board.png)
![Whale Ambient Strip](./assets/highfi/whale-ambient-strip.png)

## AI Art Pipeline
- Source model: `grok-imagine-image`.
- Art script: `scripts/generate-1942-art.mjs`.
- Extraction script: `scripts/extract-1942-sprites.mjs`.
- Output folder: `1942/design/assets/highfi/`.
- Manifest: `1942/design/assets/highfi/art-manifest.json`.
- Extraction manifest: `1942/design/assets/highfi/extracted/extract-manifest.json`.

Expected generated assets:
- 4 campaign boards.
- 80 wave previews.
- Plane sheet (Specter + Atlas).
- Player roll sprite sheet.
- Enemy compendium and enemy sprite sheet.
- Boss sprite sheet and boss behavior board.
- Power-up board with progressive shot tiers and passive turret.
- Terrain board and whale ambient strip.
- Dialogue comic board.

## Implementation Checklist
- [x] Single canonical markdown source.
- [x] Unified HTML render target.
- [x] Top-down/vertical composition constraints in generator prompts.
- [x] Two-plane focus (`Specter`, `Atlas`).
- [x] 80-wave visual review section.
- [x] Sprite extraction pipeline and metadata.
- [x] Updated upgrade/drop mechanics documented.
