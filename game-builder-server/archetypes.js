'use strict';

/**
 * Game Archetypes — 8 preset ontology configurations for common game types.
 * Each archetype pre-resolves all 6 ontology dimensions and lists the expected agent count.
 */

const ARCHETYPES = {
  'arcade': {
    label: 'Arcade',
    description: 'Classic single-screen reflex games — Tetris, Space Invaders, Breakout',
    ontology: {
      'visual-style': 'canvas-2d',
      'multiplayer': 'solo',
      'core-mechanics': 'reflex',
      'content-scope': 'single-screen',
      'audio': 'sfx-only',
      'narrative': 'none',
    },
    agentCount: 8,
    examples: ['tetris', 'space-invaders', 'breakout', 'pong', 'asteroids'],
    estimatedTime: 35,
  },
  'platformer': {
    label: 'Platformer',
    description: 'Side-scrolling jump & run with pixel art and multi-level progression',
    ontology: {
      'visual-style': 'pixel-2d',
      'multiplayer': 'solo',
      'core-mechanics': 'physics-sim',
      'content-scope': 'multi-level',
      'audio': 'sfx-music',
      'narrative': 'contextual',
    },
    agentCount: 12,
    examples: ['mario-style', 'celeste-lite', 'hollow-knight-lite'],
    estimatedTime: 50,
  },
  'arena': {
    label: 'Arena / Multiplayer',
    description: 'Real-time competitive games with server-authoritative networking',
    ontology: {
      'visual-style': 'canvas-2d',
      'multiplayer': 'server-auth',
      'core-mechanics': 'reflex',
      'content-scope': 'single-screen',
      'audio': 'sfx-only',
      'narrative': 'none',
    },
    agentCount: 12,
    examples: ['agar.io', 'slither.io', 'tank-wars'],
    estimatedTime: 55,
  },
  'strategy': {
    label: 'Strategy',
    description: 'Turn-based or real-time tactical games with AI opponents',
    ontology: {
      'visual-style': 'canvas-2d',
      'multiplayer': 'solo',
      'core-mechanics': 'turn-strategy',
      'content-scope': 'multi-level',
      'audio': 'sfx-music',
      'narrative': 'contextual',
    },
    agentCount: 11,
    examples: ['chess-ai', 'tower-defense', 'auto-battler'],
    estimatedTime: 50,
  },
  'roguelike': {
    label: 'Roguelike',
    description: 'Procedurally generated dungeon crawlers with permadeath',
    ontology: {
      'visual-style': 'pixel-2d',
      'multiplayer': 'solo',
      'core-mechanics': 'reflex',
      'content-scope': 'procedural-infinite',
      'audio': 'sfx-music',
      'narrative': 'contextual',
    },
    agentCount: 14,
    examples: ['spelunky-lite', 'binding-of-isaac-lite', 'dungeon-crawler'],
    estimatedTime: 65,
  },
  'sim-tycoon': {
    label: 'Sim / Tycoon',
    description: 'Building, crafting, and economy management games',
    ontology: {
      'visual-style': 'canvas-2d',
      'multiplayer': 'solo',
      'core-mechanics': 'building-crafting',
      'content-scope': 'hub-branches',
      'audio': 'sfx-music',
      'narrative': 'contextual',
    },
    agentCount: 12,
    examples: ['factorio-lite', 'cookie-clicker', 'theme-hospital-lite'],
    estimatedTime: 55,
  },
  'narrative': {
    label: 'Narrative',
    description: 'Story-driven games with branching dialogue and choices',
    ontology: {
      'visual-style': 'canvas-2d',
      'multiplayer': 'solo',
      'core-mechanics': 'narrative-choice',
      'content-scope': 'hub-branches',
      'audio': 'sfx-music',
      'narrative': 'branching',
    },
    agentCount: 10,
    examples: ['visual-novel', 'text-adventure', 'walking-sim'],
    estimatedTime: 45,
  },
  '3d-open-world': {
    label: '3D Open World',
    description: 'Full 3D games with Three.js rendering, physics, and procedural content',
    ontology: {
      'visual-style': 'canvas-3d',
      'multiplayer': 'solo',
      'core-mechanics': 'physics-sim',
      'content-scope': 'procedural-infinite',
      'audio': 'adaptive',
      'narrative': 'contextual',
    },
    agentCount: 22,
    examples: ['fps-arena', 'voxel-world', 'flight-sim'],
    estimatedTime: 90,
  },
};

/**
 * Match a game.md to the best archetype using keyword heuristics.
 * @param {string} gameMd - game.md content
 * @returns {{ archetype: string, confidence: number, label: string }}
 */
function matchArchetype(gameMd) {
  const lower = (gameMd || '').toLowerCase();

  const scores = {};
  const keywords = {
    'arcade': ['arcade', 'classic', 'retro', 'single-screen', 'high score', 'tetris', 'breakout', 'pong', 'snake', 'asteroids', 'space invaders'],
    'platformer': ['platformer', 'jump', 'side-scroll', 'pixel', 'mario', 'platform', 'wall jump', 'double jump'],
    'arena': ['arena', 'multiplayer', 'online', 'pvp', 'io game', 'battle royale', 'deathmatch'],
    'strategy': ['strategy', 'turn-based', 'tactical', 'tower defense', 'chess', 'grid', 'rts'],
    'roguelike': ['roguelike', 'roguelite', 'procedural', 'permadeath', 'dungeon', 'random generation', 'loot'],
    'sim-tycoon': ['simulation', 'tycoon', 'building', 'crafting', 'economy', 'factory', 'idle', 'clicker', 'farm'],
    'narrative': ['narrative', 'story', 'visual novel', 'dialogue', 'choice', 'branching', 'text adventure'],
    '3d-open-world': ['3d', 'three.js', 'webgl', 'first person', 'third person', 'fps', 'open world', 'voxel'],
  };

  for (const [archetype, words] of Object.entries(keywords)) {
    scores[archetype] = 0;
    for (const word of words) {
      if (lower.includes(word)) scores[archetype]++;
    }
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const confidence = best[1] > 0 ? Math.min(best[1] / 3, 1.0) : 0;

  return {
    archetype: best[1] > 0 ? best[0] : 'arcade',
    confidence,
    label: ARCHETYPES[best[1] > 0 ? best[0] : 'arcade'].label,
  };
}

/**
 * Get the defaults for a named archetype.
 * @param {string} name - archetype key
 * @returns {object|null} archetype definition or null
 */
function getArchetypeDefaults(name) {
  return ARCHETYPES[name] || null;
}

module.exports = { ARCHETYPES, matchArchetype, getArchetypeDefaults };
