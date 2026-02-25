# 1942 Pixel Campaigns: Game Mechanics

## 1. Core Loop
- Survive 4 long campaigns in sequence.
- Each campaign is 20 waves.
- Wave cadence per campaign:
  - Waves 1-4: enemy introduction and pattern onboarding.
  - Wave 5: Mini Boss 1.
  - Waves 6-9: mixed formations.
  - Wave 10: Mini Boss 2.
  - Waves 11-14: layered pressure + terrain.
  - Wave 15: Mini Boss 3.
  - Waves 16-19: high-pressure mixed enemy packs.
  - Wave 20: Final Boss.

![Campaign Overview](./assets/campaigns-overview.svg)

## 2. Player Planes and Specials
- `P-38 Falcon`: Wing Burst (short spread-fire mode).
- `F4U Lancer`: Rail Strafe (instant piercing pair).
- `XP-59 Specter`: Phase Shield (temporary invulnerability).
- `B7 Atlas`: EMP Wave (stuns enemies + clears nearby bullets).
- Shared dodge: barrel roll sequence with i-frames.

![Planes and Specials](./assets/planes-specials.svg)

## 3. Weapon and Bomb Systems
- Primary fire: hold `Space`.
- Special fire: `X` (per-plane cooldown).
- Roll dodge: `Shift` or double-tap `Space`.
- Bomb clear: `B`.

### Bomb Clear Rules
- Consumes 1 bomb charge.
- Clears all enemy bullets on screen.
- Applies heavy damage to all enemies currently active.
- Used as a pressure release tool for dense boss phases.
- Bomb packs are collectible power-ups and mini/final boss drops.

## 4. Enemy Animation System
Every enemy has a dedicated animation sequence (3+ frames) and per-type timing.

![Enemy Roster](./assets/enemy-roster.svg)

### Enemy Pixel Spec Table
| Enemy | Intro Campaign/Wave | Reuse Pattern | Pixel Art Read |
|---|---|---|---|
| `scout_zero` | C1-W1 | C1/C2 mixed lines and vee packs | slim red wings + bright cowl |
| `torpedo_gull` | C1-W3 | C1 mid/late stagger and swirl | wide amber body + dark bay stripe |
| `canopy_raider` | C2-W1 | C2/C4 cross and ambush groups | green wedge with high-contrast nose |
| `gunship_hornet` | C2-W3 | C2/C3/C4 layered pressure | heavy dual-engine silhouette |
| `dune_lancer` | C3-W1 | C3/C4 fast interception waves | tan spear profile against warm ground |
| `rail_bomber` | C3-W2 | C3 late mixed bomber lanes | long hull, high-HP readable mass |
| `storm_wraith` | C4-W1 | C4 storm packs and flankers | violet wing shape with pulse highlight |
| `sub_spear` | C4-W2 | C4 low-lane pressure | low-profile steel hull + wake stripe |

## 5. Campaign-by-Campaign Enemy Progression

## Campaign 1: NOT-Coral Front
Pixel look:
- Palette bias: cool blues with bright enemy reds for high contrast onboarding.
- Terrain: reef bands, islands, open sea lanes.
- Wildlife: whales and gulls.

Wave enemy plan:
- Introduced enemy: `scout_zero`.
- Added wave 3: `torpedo_gull`.
- Mixed waves 6-19 combine both in line, vee, stagger, cross, swirl patterns.

Mini bosses:
- `reef_guardian` at waves 5/10/15.
- Escalation: projectile count increases each appearance.
- Guaranteed drop: `bomb-pack`.

Final boss:
- `coral_dreadnought` at wave 20.
- HP target: 280 base (scaled by campaign index in runtime).
- Drop: `double-shot`.

## Campaign 2: NOT-Jungle Spear
Pixel look:
- Palette bias: greens with controlled tracer readability.
- Terrain: canopy clusters, river ribbons.
- Wildlife: birds and river movement.

Wave enemy plan:
- Introduced enemy: `canopy_raider`.
- Added wave 3: `gunship_hornet`.
- Legacy recycle: `scout_zero` folded back into mixed waves.

Mini bosses:
- `river_bastion` at waves 5/10/15.
- Drop: `shield`.

Final boss:
- `jungle_citadel` at wave 20.
- Drop: `speed-boost`.

## Campaign 3: NOT-Dust Convoy
Pixel look:
- Palette bias: warm sands with cool projectile colors for visibility.
- Terrain: dunes, convoy routes, dust-devil lanes.
- Wildlife/environment motion: dust bursts and convoy traffic.

Wave enemy plan:
- Introduced enemy: `dune_lancer`.
- Added wave 2-3: `rail_bomber`.
- Legacy recycle: `gunship_hornet` added to layered waves.

Mini bosses:
- `convoy_ram` at waves 5/10/15.
- Drop: `repair`.

Final boss:
- `dust_colossus` at wave 20.
- Drop: `shield`.

## Campaign 4: NOT-Iron Monsoon
Pixel look:
- Palette bias: storm violet/blue with periodic lightning readability spikes.
- Terrain: cloud walls, monsoon rain strips, submarine silhouettes.
- Wildlife/environment motion: storm birds, lightning flashes.

Wave enemy plan:
- Introduced enemy: `storm_wraith`.
- Added wave 2: `sub_spear`.
- Legacy recycle: `dune_lancer`, `canopy_raider` for late mixed pressure.

Mini bosses:
- `monsoon_blade` at waves 5/10/15.
- Drop: `double-shot`.

Final boss:
- `iron_tempest` at wave 20.
- Drop: `repair`.

## 6. Terrain and Wildlife Layer Behavior
- Ambient layers scroll independently from combat layer.
- Terrain visuals enrich context without creating unavoidable collisions.
- Hazards influence readability (color/contrast) more than direct collision punishment.

![Terrain and Wildlife](./assets/terrain-wildlife.svg)

## 7. Power-Ups and Economy
- Normal enemies: ~14% drop chance.
- Mini bosses: guaranteed drop.
- Final bosses: guaranteed major campaign transition drop.

![Power-Ups](./assets/powerups.svg)

## 8. Pacing and Difficulty
- Pressure rises steadily from wave 1 to 20.
- 3 mini bosses provide step-ups before final boss capstone.
- Late-campaign mixed wave pressure combines enemy count + fire density + terrain visibility strain.

![Pacing Curve](./assets/pacing-chart.svg)

## 9. Dialogue Timing
- Intro dialogue at campaign start.
- Mini-boss warning dialogue at waves 5/10/15.
- Final boss briefing at wave 20.
- Campaign clear debrief before next theater.

![Dialogue Flow](./assets/dialogue-flow.svg)
