'use strict';

/**
 * Game Ontology Engine — 6 dimensions that drive agent selection.
 * Each dimension maps game properties to required/skipped agents and libraries.
 */

const DIMENSIONS = {
  'visual-style': {
    label: 'Visual Style',
    icon: '🎨',
    values: [
      { id: 'pixel-2d', label: 'Pixel Art 2D', agents: ['sprite-gen'], skip: ['mesh-gen', 'texture', 'shader'], libs: [] },
      { id: 'canvas-2d', label: 'Canvas 2D (shapes)', agents: [], skip: ['mesh-gen', 'texture', 'shader', 'sprite-gen'], libs: [] },
      { id: 'canvas-3d', label: '3D WebGL', agents: ['mesh-gen', 'texture', 'shader'], skip: ['sprite-gen'], libs: ['three'] },
      { id: 'voxel', label: 'Voxel', agents: ['mesh-gen'], skip: ['texture', 'sprite-gen'], libs: ['three'] },
    ],
  },
  'multiplayer': {
    label: 'Multiplayer',
    icon: '👥',
    values: [
      { id: 'solo', label: 'Single Player', agents: [], skip: ['game-server', 'state-sync'], libs: [] },
      { id: 'local-coop', label: 'Local Co-op', agents: [], skip: ['game-server', 'state-sync'], libs: [] },
      { id: 'p2p', label: 'Peer-to-Peer', agents: ['state-sync'], skip: ['game-server'], libs: ['peerjs'] },
      { id: 'server-auth', label: 'Server Authoritative', agents: ['game-server', 'state-sync'], skip: [], libs: ['socket.io'] },
    ],
  },
  'core-mechanics': {
    label: 'Core Mechanics',
    icon: '⚙️',
    values: [
      { id: 'reflex', label: 'Reflex / Arcade', agents: [], skip: ['npc-ai', 'physics'], libs: [] },
      { id: 'physics-sim', label: 'Physics Simulation', agents: ['physics'], skip: [], libs: ['matter'] },
      { id: 'turn-strategy', label: 'Turn-based Strategy', agents: ['npc-ai'], skip: ['physics'], libs: [] },
      { id: 'rts', label: 'Real-time Strategy', agents: ['npc-ai', 'physics'], skip: [], libs: [] },
      { id: 'narrative-choice', label: 'Narrative / Choice', agents: ['narrative'], skip: ['physics'], libs: [] },
      { id: 'building-crafting', label: 'Building / Crafting', agents: ['economy-balance'], skip: [], libs: [] },
    ],
  },
  'content-scope': {
    label: 'Content Scope',
    icon: '🗺️',
    values: [
      { id: 'single-screen', label: 'Single Screen', agents: [], skip: ['proc-gen'], libs: [] },
      { id: 'multi-level', label: 'Multi-level', agents: [], skip: ['proc-gen'], libs: [] },
      { id: 'hub-branches', label: 'Hub + Branches', agents: [], skip: [], libs: [] },
      { id: 'procedural-infinite', label: 'Procedural / Infinite', agents: ['proc-gen'], skip: [], libs: [] },
    ],
  },
  'audio': {
    label: 'Audio',
    icon: '🔊',
    values: [
      { id: 'silent', label: 'Silent', agents: [], skip: ['sfx', 'music'], libs: [] },
      { id: 'sfx-only', label: 'SFX Only', agents: ['sfx'], skip: ['music'], libs: [] },
      { id: 'sfx-music', label: 'SFX + Music', agents: ['sfx', 'music'], skip: [], libs: [] },
      { id: 'adaptive', label: 'Adaptive Audio', agents: ['sfx', 'music'], skip: [], libs: ['tone'] },
    ],
  },
  'narrative': {
    label: 'Narrative',
    icon: '📖',
    values: [
      { id: 'none', label: 'No Narrative', agents: [], skip: ['narrative'], libs: [] },
      { id: 'contextual', label: 'Contextual Text', agents: [], skip: ['narrative'], libs: [] },
      { id: 'linear-arc', label: 'Linear Story Arc', agents: ['narrative'], skip: [], libs: [] },
      { id: 'branching', label: 'Branching Narrative', agents: ['narrative'], skip: [], libs: [] },
    ],
  },
};

// Base agents always included regardless of ontology
const BASE_AGENTS = ['lead-architect', 'html-css', 'entity', 'input', 'level-designer', 'ui-overlay', 'core-engine', 'qa-validator'];

/**
 * Resolve ontology dimensions from game.md text using keyword heuristics.
 * @param {string} gameMd - game.md content
 * @returns {object} resolved dimensions { 'visual-style': { value, agentsAdded, agentsSkipped, libsAdded }, ... }
 */
function resolveOntology(gameMd) {
  const lower = (gameMd || '').toLowerCase();
  const resolved = {};

  // Visual Style
  if (/3d|webgl|three\.?js|first.person|third.person/i.test(lower)) {
    resolved['visual-style'] = pickValue('visual-style', 'canvas-3d');
  } else if (/voxel|minecraft|blocky/i.test(lower)) {
    resolved['visual-style'] = pickValue('visual-style', 'voxel');
  } else if (/pixel|sprite|retro|8.bit|16.bit/i.test(lower)) {
    resolved['visual-style'] = pickValue('visual-style', 'pixel-2d');
  } else {
    resolved['visual-style'] = pickValue('visual-style', 'canvas-2d');
  }

  // Multiplayer
  if (/colyseus|authoritative|server.auth|mmo/i.test(lower)) {
    resolved['multiplayer'] = pickValue('multiplayer', 'server-auth');
  } else if (/peerjs|p2p|peer.to.peer|webrtc/i.test(lower)) {
    resolved['multiplayer'] = pickValue('multiplayer', 'p2p');
  } else if (/local.co.?op|split.screen|same.keyboard|hot.seat/i.test(lower)) {
    resolved['multiplayer'] = pickValue('multiplayer', 'local-coop');
  } else if (/multiplayer|online|pvp|versus.online/i.test(lower)) {
    resolved['multiplayer'] = pickValue('multiplayer', 'server-auth');
  } else {
    resolved['multiplayer'] = pickValue('multiplayer', 'solo');
  }

  // Core Mechanics
  if (/physics.sim|soft.body|ragdoll|gravity.puzzle|pinball|billiard/i.test(lower)) {
    resolved['core-mechanics'] = pickValue('core-mechanics', 'physics-sim');
  } else if (/turn.based|chess|tactics|grid.strategy/i.test(lower)) {
    resolved['core-mechanics'] = pickValue('core-mechanics', 'turn-strategy');
  } else if (/rts|real.time.strategy|base.build|command/i.test(lower)) {
    resolved['core-mechanics'] = pickValue('core-mechanics', 'rts');
  } else if (/narrative|story|dialogue|choice|visual.novel/i.test(lower)) {
    resolved['core-mechanics'] = pickValue('core-mechanics', 'narrative-choice');
  } else if (/building|craft|tycoon|sim|farm|factory/i.test(lower)) {
    resolved['core-mechanics'] = pickValue('core-mechanics', 'building-crafting');
  } else {
    resolved['core-mechanics'] = pickValue('core-mechanics', 'reflex');
  }

  // Content Scope
  if (/procedural|infinite|roguelike|roguelite|random.gen|permadeath/i.test(lower)) {
    resolved['content-scope'] = pickValue('content-scope', 'procedural-infinite');
  } else if (/hub|overworld|branch|metroidvania/i.test(lower)) {
    resolved['content-scope'] = pickValue('content-scope', 'hub-branches');
  } else if (/level\s*\d|multi.level|stage|world/i.test(lower)) {
    resolved['content-scope'] = pickValue('content-scope', 'multi-level');
  } else {
    resolved['content-scope'] = pickValue('content-scope', 'single-screen');
  }

  // Audio
  if (/adaptive.audio|dynamic.music|tone\.js/i.test(lower)) {
    resolved['audio'] = pickValue('audio', 'adaptive');
  } else if (/music|soundtrack|background.music|bgm/i.test(lower)) {
    resolved['audio'] = pickValue('audio', 'sfx-music');
  } else if (/silent|no.audio|no.sound/i.test(lower)) {
    resolved['audio'] = pickValue('audio', 'silent');
  } else {
    resolved['audio'] = pickValue('audio', 'sfx-only');
  }

  // Narrative
  if (/branching|multiple.ending|dialogue.tree|choice.matter/i.test(lower)) {
    resolved['narrative'] = pickValue('narrative', 'branching');
  } else if (/linear.story|campaign|cutscene|story.arc/i.test(lower)) {
    resolved['narrative'] = pickValue('narrative', 'linear-arc');
  } else if (/lore|flavor.text|contextual|hint/i.test(lower)) {
    resolved['narrative'] = pickValue('narrative', 'contextual');
  } else {
    resolved['narrative'] = pickValue('narrative', 'none');
  }

  return resolved;
}

/**
 * Pick a dimension value by ID and return its agent/lib impacts.
 */
function pickValue(dimensionId, valueId) {
  const dim = DIMENSIONS[dimensionId];
  if (!dim) return { value: valueId, agentsAdded: [], agentsSkipped: [], libsAdded: [] };

  const val = dim.values.find(v => v.id === valueId);
  if (!val) return { value: valueId, agentsAdded: [], agentsSkipped: [], libsAdded: [] };

  return {
    value: val.id,
    label: val.label,
    agentsAdded: val.agents || [],
    agentsSkipped: val.skip || [],
    libsAdded: val.libs || [],
  };
}

/**
 * Compute the union of required agents from resolved ontology.
 * @param {object} resolved - output of resolveOntology()
 * @returns {string[]} sorted list of agent names
 */
function agentsFromOntology(resolved) {
  const added = new Set(BASE_AGENTS);
  const skipped = new Set();

  for (const dim of Object.values(resolved)) {
    for (const a of (dim.agentsAdded || [])) added.add(a);
    for (const s of (dim.agentsSkipped || [])) skipped.add(s);
  }

  // Remove skipped agents (but never remove base agents)
  for (const s of skipped) {
    if (!BASE_AGENTS.includes(s)) {
      added.delete(s);
    }
  }

  return [...added].sort();
}

/**
 * Compute the union of required CDN libraries from resolved ontology.
 * @param {object} resolved - output of resolveOntology()
 * @returns {string[]} library keys
 */
function libsFromOntology(resolved) {
  const libs = new Set();
  for (const dim of Object.values(resolved)) {
    for (const l of (dim.libsAdded || [])) libs.add(l);
  }
  return [...libs];
}

module.exports = {
  DIMENSIONS,
  BASE_AGENTS,
  resolveOntology,
  agentsFromOntology,
  libsFromOntology,
  pickValue,
};
