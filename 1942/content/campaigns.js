export const CAMPAIGNS = [
  {
    id: 'coral_front',
    name: 'Coral Front',
    theme: {
      sky: '#6bb8d8',
      sea: '#1c5d8f',
      low: '#19466b',
      accent: '#7ee8ff',
      hazard: '#f9d27d',
      wildlife: ['whale', 'gulls', 'islands'],
    },
    roster: ['scout_zero', 'torpedo_gull'],
    miniboss: 'reef_guardian',
    finalBoss: 'coral_dreadnought',
    minibossWaves: [5, 10, 15],       // C1: standard tutorial pacing
    signatureMoments: {}, // ARCADE-059: whale_crossing removed
    finalWave: 20,
    // ── C1: Tutorial campaign — gentle ramp, teaches basics ──
    waves: [
      // Act 1: Learning to fly (W1-4) — scouts only, small counts, simple patterns
      { pattern: 'line',    mix: ['scout_zero'], count: 3 },    // W1: 3 scouts in a line — easiest possible
      { pattern: 'line',    mix: ['scout_zero'], count: 4 },    // W2: 4 scouts, still simple
      { pattern: 'line',    mix: ['scout_zero'], count: 5 },    // W3: 5 scouts, getting comfortable
      { pattern: 'vee',     mix: ['scout_zero'], count: 5 },    // W4: first formation — V shape
      // W5: MINIBOSS — reef_guardian
      { pattern: 'line',    mix: ['scout_zero'], count: 4 },    // W5 escort (miniboss wave)

      // Act 2: New enemy type (W6-9) — introduce torpedo_gull
      { pattern: 'line',    mix: ['torpedo_gull'], count: 3 },  // W6: meet the torpedo_gull alone
      { pattern: 'stagger', mix: ['scout_zero', 'torpedo_gull'], count: 6 },  // W7: mixed — whale crossing!
      { pattern: 'vee',     mix: ['scout_zero', 'torpedo_gull'], count: 7 },   // W8: V formation mixed
      { pattern: 'cross',   mix: ['torpedo_gull'], count: 6 },  // W9: torpedo_gull cross pattern
      // W10: MINIBOSS — reef_guardian
      { pattern: 'stagger', mix: ['scout_zero', 'torpedo_gull'], count: 5 },  // W10 escort

      // Act 3: Escalation (W11-14) — larger groups, varied patterns
      { pattern: 'line',    mix: ['scout_zero', 'torpedo_gull'], count: 8 },   // W11: big line
      { pattern: 'swirl',   mix: ['torpedo_gull'], count: 7 },  // W12: swirl — new movement
      { pattern: 'cross',   mix: ['scout_zero', 'torpedo_gull'], count: 9 },   // W13: cross pattern
      { pattern: 'stagger', mix: ['torpedo_gull', 'scout_zero'], count: 10 },  // W14: dense stagger
      // W15: MINIBOSS — reef_guardian
      { pattern: 'vee',     mix: ['scout_zero', 'torpedo_gull'], count: 6 },   // W15 escort

      // Act 4: Final push (W16-19) — peak difficulty before boss
      { pattern: 'swirl',   mix: ['torpedo_gull', 'scout_zero'], count: 10 },  // W16: swirl wave
      { pattern: 'cross',   mix: ['scout_zero', 'torpedo_gull'], count: 11 },  // W17: big cross
      { pattern: 'stagger', mix: ['torpedo_gull'], count: 9 },  // W18: all torpedo stagger
      { pattern: 'vee',     mix: ['scout_zero', 'torpedo_gull'], count: 12 },  // W19: massive V — climax
      // W20: FINAL BOSS — coral_dreadnought
      { pattern: 'line',    mix: ['scout_zero'], count: 3 },    // W20 escort (light before boss)
    ],
  },
  {
    id: 'jungle_spear',
    name: 'Jungle Spear',
    theme: {
      sky: '#8ba36e',
      sea: '#3a6a4f',
      low: '#25442f',
      accent: '#d7f07a',
      hazard: '#ffac6c',
      wildlife: ['treeline', 'river', 'birds'],
    },
    roster: ['canopy_raider', 'gunship_hornet', 'scout_zero'],
    miniboss: 'river_bastion',
    finalBoss: 'jungle_citadel',
    minibossWaves: [3, 10],            // C2: early boss at W3, double mini-boss at W10
    doubleMiniWaves: [10],             // spawn 2 mini bosses on these waves
    signatureMoments: { 6: 'ambush_all_edges' },
    finalWave: 20,
    // ── C2: Aggressive — early boss surprise, ambush at W6 ──
    waves: [
      // Act 1: Quick intro then BOSS (W1-3)
      { pattern: 'line',    mix: ['canopy_raider'], count: 6 },  // W1: fast raiders
      { pattern: 'stagger', mix: ['canopy_raider', 'scout_zero'], count: 8 },  // W2: mixed stagger
      // W3: MINIBOSS (early surprise!) — river_bastion
      { pattern: 'vee',     mix: ['canopy_raider'], count: 5 },  // W3 escort

      // Act 2: Build with gunships, ambush at W6 (W4-9)
      { pattern: 'line',    mix: ['gunship_hornet'], count: 4 }, // W4: introduce gunships
      { pattern: 'cross',   mix: ['canopy_raider', 'gunship_hornet'], count: 8 },  // W5: cross mix
      { pattern: 'stagger', mix: ['canopy_raider', 'gunship_hornet'], count: 10 }, // W6: ambush!
      { pattern: 'swirl',   mix: ['canopy_raider'], count: 8 }, // W7: swirl breather
      { pattern: 'vee',     mix: ['gunship_hornet', 'canopy_raider'], count: 9 },  // W8: V formation
      { pattern: 'cross',   mix: ['canopy_raider', 'gunship_hornet', 'scout_zero'], count: 10 }, // W9: 3-type mix
      // W10: DOUBLE MINIBOSS — 2x river_bastion
      { pattern: 'stagger', mix: ['canopy_raider', 'scout_zero'], count: 6 },  // W10 escort

      // Act 3: Sustained pressure (W11-15)
      { pattern: 'swirl',   mix: ['gunship_hornet'], count: 8 },     // W11: gunship swirl
      { pattern: 'cross',   mix: ['canopy_raider', 'gunship_hornet'], count: 11 }, // W12: big cross
      { pattern: 'line',    mix: ['canopy_raider', 'gunship_hornet', 'scout_zero'], count: 12 }, // W13: full roster line
      { pattern: 'vee',     mix: ['gunship_hornet', 'canopy_raider'], count: 10 }, // W14: V mix
      { pattern: 'stagger', mix: ['canopy_raider', 'gunship_hornet'], count: 12 }, // W15: dense stagger

      // Act 4: Gauntlet (W16-19) — everything at once
      { pattern: 'swirl',   mix: ['gunship_hornet', 'canopy_raider'], count: 11 }, // W16: swirl storm
      { pattern: 'cross',   mix: ['canopy_raider', 'gunship_hornet', 'scout_zero'], count: 13 }, // W17: chaos cross
      { pattern: 'vee',     mix: ['gunship_hornet'], count: 10 },     // W18: all gunship V
      { pattern: 'stagger', mix: ['canopy_raider', 'gunship_hornet', 'scout_zero'], count: 14 }, // W19: max density
      // W20: FINAL BOSS — jungle_citadel
      { pattern: 'line',    mix: ['canopy_raider'], count: 4 },  // W20 escort
    ],
  },
  {
    id: 'dust_convoy',
    name: 'Dust Convoy',
    theme: {
      sky: '#cf9b57',
      sea: '#91643d',
      low: '#68452b',
      accent: '#ffd58a',
      hazard: '#f46244',
      wildlife: ['dunes', 'convoy', 'dustdevils'],
    },
    roster: ['dune_lancer', 'rail_bomber', 'gunship_hornet'],
    miniboss: 'convoy_ram',
    finalBoss: 'dust_colossus',
    minibossWaves: [],                 // C3: no mini bosses — pure wave survival
    signatureMoments: { 10: 'powerup_shower' },  // C3 midpoint break to fight fatigue
    finalBossScale: 1.5,               // extra-tough final boss
    finalWave: 20,
    // ── C3: Endurance — no minibosses, relentless waves, escalating density ──
    waves: [
      // Act 1: Fast lancers (W1-5) — hit-and-run enemies
      { pattern: 'line',    mix: ['dune_lancer'], count: 6 },    // W1: fast lancers
      { pattern: 'vee',     mix: ['dune_lancer'], count: 7 },    // W2: V formation
      { pattern: 'stagger', mix: ['dune_lancer'], count: 8 },    // W3: stagger
      { pattern: 'cross',   mix: ['dune_lancer'], count: 9 },    // W4: cross pattern
      { pattern: 'swirl',   mix: ['dune_lancer'], count: 8 },    // W5: swirl

      // Act 2: Add bombers (W6-10) — slow but dangerous
      { pattern: 'line',    mix: ['rail_bomber'], count: 5 },    // W6: introduce bombers
      { pattern: 'stagger', mix: ['dune_lancer', 'rail_bomber'], count: 9 },  // W7: fast + slow mix
      { pattern: 'cross',   mix: ['rail_bomber', 'dune_lancer'], count: 10 }, // W8: cross mix
      { pattern: 'vee',     mix: ['dune_lancer', 'rail_bomber'], count: 10 }, // W9: V mix
      { pattern: 'swirl',   mix: ['rail_bomber'], count: 7 },    // W10: bomber swirl

      // Act 3: Full roster (W11-15) — add gunships to the mix
      { pattern: 'line',    mix: ['gunship_hornet', 'dune_lancer'], count: 10 },   // W11: gunships join
      { pattern: 'cross',   mix: ['dune_lancer', 'rail_bomber', 'gunship_hornet'], count: 11 }, // W12: 3-type cross
      { pattern: 'stagger', mix: ['rail_bomber', 'gunship_hornet'], count: 10 },   // W13: heavy stagger
      { pattern: 'vee',     mix: ['dune_lancer', 'gunship_hornet'], count: 12 },   // W14: fast V
      { pattern: 'swirl',   mix: ['dune_lancer', 'rail_bomber', 'gunship_hornet'], count: 11 }, // W15: full swirl

      // Act 4: Gauntlet run (W16-19) — max pressure
      { pattern: 'cross',   mix: ['gunship_hornet', 'rail_bomber'], count: 12 },   // W16: heavy fire cross
      { pattern: 'stagger', mix: ['dune_lancer', 'rail_bomber', 'gunship_hornet'], count: 14 }, // W17: max stagger
      { pattern: 'vee',     mix: ['dune_lancer', 'gunship_hornet'], count: 13 },   // W18: big V
      { pattern: 'swirl',   mix: ['rail_bomber', 'dune_lancer', 'gunship_hornet'], count: 15 }, // W19: climax
      // W20: FINAL BOSS — dust_colossus (1.5x scale)
      { pattern: 'line',    mix: ['dune_lancer'], count: 4 },    // W20 escort
    ],
  },
  {
    id: 'iron_monsoon',
    name: 'Iron Monsoon',
    theme: {
      sky: '#525c7f',
      sea: '#2e3455',
      low: '#1d2238',
      accent: '#b7c9ff',
      hazard: '#f44f64',
      wildlife: ['storm', 'subs', 'lightning'],
    },
    roster: ['storm_wraith', 'sub_spear', 'dune_lancer', 'canopy_raider'],
    miniboss: 'monsoon_blade',
    finalBoss: 'iron_tempest',
    minibossWaves: [4, 8, 12, 16],    // C4: relentless — boss every 4 waves
    signatureMoments: { 14: 'wingman' },
    finalWave: 20,
    // ── C4: The Gauntlet — bosses every 4 waves, 4 enemy types, max chaos ──
    waves: [
      // Segment 1: Storm wraiths (W1-4, boss at W4)
      { pattern: 'vee',     mix: ['storm_wraith'], count: 8 },   // W1: fast wraiths
      { pattern: 'cross',   mix: ['storm_wraith', 'sub_spear'], count: 9 },   // W2: add subs
      { pattern: 'stagger', mix: ['storm_wraith', 'sub_spear'], count: 10 },  // W3: stagger build
      // W4: MINIBOSS — monsoon_blade
      { pattern: 'line',    mix: ['storm_wraith'], count: 5 },   // W4 escort

      // Segment 2: Escalation (W5-8, boss at W8)
      { pattern: 'swirl',   mix: ['storm_wraith', 'dune_lancer'], count: 10 },    // W5: add lancers
      { pattern: 'cross',   mix: ['sub_spear', 'dune_lancer'], count: 11 },       // W6: subs + lancers
      { pattern: 'vee',     mix: ['storm_wraith', 'sub_spear', 'dune_lancer'], count: 12 }, // W7: 3-type V
      // W8: MINIBOSS — monsoon_blade
      { pattern: 'stagger', mix: ['storm_wraith', 'dune_lancer'], count: 6 },     // W8 escort

      // Segment 3: Full roster (W9-12, boss at W12)
      { pattern: 'line',    mix: ['canopy_raider', 'storm_wraith'], count: 10 },   // W9: add raiders
      { pattern: 'cross',   mix: ['storm_wraith', 'sub_spear', 'canopy_raider'], count: 12 }, // W10: 3-type cross
      { pattern: 'swirl',   mix: ['canopy_raider', 'dune_lancer', 'sub_spear'], count: 13 },  // W11: swirl chaos
      // W12: MINIBOSS — monsoon_blade
      { pattern: 'vee',     mix: ['storm_wraith', 'canopy_raider'], count: 7 },    // W12 escort

      // Segment 4: Endgame + wingman (W13-16, boss at W16)
      { pattern: 'stagger', mix: ['storm_wraith', 'sub_spear', 'dune_lancer', 'canopy_raider'], count: 14 }, // W13: all 4 types
      { pattern: 'cross',   mix: ['canopy_raider', 'storm_wraith', 'sub_spear'], count: 13 }, // W14: wingman!
      { pattern: 'swirl',   mix: ['dune_lancer', 'canopy_raider', 'storm_wraith'], count: 14 }, // W15: max swirl
      // W16: MINIBOSS — monsoon_blade
      { pattern: 'vee',     mix: ['storm_wraith', 'sub_spear'], count: 8 },        // W16 escort

      // Final push (W17-19) — absolute chaos before final boss
      { pattern: 'cross',   mix: ['storm_wraith', 'sub_spear', 'dune_lancer', 'canopy_raider'], count: 15 }, // W17
      { pattern: 'stagger', mix: ['canopy_raider', 'storm_wraith', 'dune_lancer'], count: 14 }, // W18
      { pattern: 'swirl',   mix: ['storm_wraith', 'sub_spear', 'dune_lancer', 'canopy_raider'], count: 16 }, // W19: final wave
      // W20: FINAL BOSS — iron_tempest
      { pattern: 'line',    mix: ['storm_wraith'], count: 4 },   // W20 escort
    ],
  },
];

export function getCampaign(index) {
  if (index < 0) return CAMPAIGNS[0];
  if (index >= CAMPAIGNS.length) return CAMPAIGNS[CAMPAIGNS.length - 1];
  return CAMPAIGNS[index];
}
