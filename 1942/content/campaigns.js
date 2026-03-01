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
    finalWave: 20,
    waves: [
      { pattern: 'vee', mix: ['scout_zero'], count: 8 },
      { pattern: 'line', mix: ['scout_zero'], count: 10 },
      { pattern: 'stagger', mix: ['scout_zero', 'torpedo_gull'], count: 12 },
      { pattern: 'cross', mix: ['scout_zero', 'torpedo_gull'], count: 12 },
      { pattern: 'swirl', mix: ['torpedo_gull'], count: 9 },
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
    finalWave: 20,
    waves: [
      { pattern: 'line', mix: ['canopy_raider'], count: 10 },
      { pattern: 'stagger', mix: ['canopy_raider', 'scout_zero'], count: 12 },
      { pattern: 'cross', mix: ['canopy_raider', 'gunship_hornet'], count: 10 },
      { pattern: 'swirl', mix: ['gunship_hornet', 'scout_zero'], count: 9 },
      { pattern: 'vee', mix: ['canopy_raider', 'gunship_hornet'], count: 14 },
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
    finalBossScale: 1.5,               // extra-tough final boss
    finalWave: 20,
    waves: [
      { pattern: 'line', mix: ['dune_lancer'], count: 10 },
      { pattern: 'cross', mix: ['dune_lancer', 'rail_bomber'], count: 11 },
      { pattern: 'swirl', mix: ['rail_bomber', 'gunship_hornet'], count: 9 },
      { pattern: 'stagger', mix: ['dune_lancer', 'rail_bomber'], count: 13 },
      { pattern: 'vee', mix: ['dune_lancer', 'rail_bomber', 'gunship_hornet'], count: 14 },
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
    finalWave: 20,
    waves: [
      { pattern: 'vee', mix: ['storm_wraith'], count: 10 },
      { pattern: 'cross', mix: ['storm_wraith', 'sub_spear'], count: 10 },
      { pattern: 'stagger', mix: ['storm_wraith', 'dune_lancer'], count: 13 },
      { pattern: 'line', mix: ['sub_spear', 'canopy_raider'], count: 12 },
      { pattern: 'swirl', mix: ['storm_wraith', 'sub_spear', 'dune_lancer'], count: 14 },
    ],
  },
];

export function getCampaign(index) {
  if (index < 0) return CAMPAIGNS[0];
  if (index >= CAMPAIGNS.length) return CAMPAIGNS[CAMPAIGNS.length - 1];
  return CAMPAIGNS[index];
}
