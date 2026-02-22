'use strict';

/**
 * Decision Flow Engine — 5-question branching flow that resolves ontology
 * dimensions and produces an execution plan.
 */

const FLOW = [
  {
    id: 'visual-style',
    question: "What's the visual style?",
    branches: [
      { id: 'pixel-2d', label: 'Pixel Art 2D', agentsAdded: ['sprite-gen'], agentsSkipped: ['mesh-gen', 'texture', 'shader'], libsAdded: [], estimatedTimeImpact: 5 },
      { id: 'canvas-2d', label: 'Canvas 2D (shapes)', agentsAdded: [], agentsSkipped: ['mesh-gen', 'texture', 'shader', 'sprite-gen'], libsAdded: [], estimatedTimeImpact: 0 },
      { id: 'canvas-3d', label: '3D WebGL', agentsAdded: ['mesh-gen', 'texture', 'shader'], agentsSkipped: ['sprite-gen'], libsAdded: ['three'], estimatedTimeImpact: 30 },
      { id: 'voxel', label: 'Voxel', agentsAdded: ['mesh-gen'], agentsSkipped: ['texture', 'sprite-gen'], libsAdded: ['three'], estimatedTimeImpact: 20 },
    ],
  },
  {
    id: 'multiplayer',
    question: 'Single-player or multiplayer?',
    branches: [
      { id: 'solo', label: 'Single Player', agentsAdded: [], agentsSkipped: ['game-server', 'state-sync'], libsAdded: [], estimatedTimeImpact: 0 },
      { id: 'local-coop', label: 'Local Co-op', agentsAdded: [], agentsSkipped: ['game-server', 'state-sync'], libsAdded: [], estimatedTimeImpact: 5 },
      { id: 'p2p', label: 'Peer-to-Peer', agentsAdded: ['state-sync'], agentsSkipped: ['game-server'], libsAdded: ['peerjs'], estimatedTimeImpact: 15 },
      { id: 'server-auth', label: 'Server Authoritative', agentsAdded: ['game-server', 'state-sync'], agentsSkipped: [], libsAdded: ['socket.io'], estimatedTimeImpact: 25 },
    ],
  },
  {
    id: 'core-mechanic',
    question: "What's the core mechanic?",
    branches: [
      { id: 'reflex', label: 'Reflex / Arcade', agentsAdded: [], agentsSkipped: ['npc-ai', 'physics'], libsAdded: [], estimatedTimeImpact: 0 },
      { id: 'physics-sim', label: 'Physics Simulation', agentsAdded: ['physics'], agentsSkipped: [], libsAdded: ['matter'], estimatedTimeImpact: 10 },
      { id: 'turn-strategy', label: 'Turn-based Strategy', agentsAdded: ['npc-ai'], agentsSkipped: ['physics'], libsAdded: [], estimatedTimeImpact: 10 },
      { id: 'rts', label: 'Real-time Strategy', agentsAdded: ['npc-ai', 'physics'], agentsSkipped: [], libsAdded: [], estimatedTimeImpact: 15 },
      { id: 'narrative-choice', label: 'Narrative / Choice', agentsAdded: ['narrative'], agentsSkipped: ['physics'], libsAdded: [], estimatedTimeImpact: 10 },
      { id: 'building-crafting', label: 'Building / Crafting', agentsAdded: ['economy-balance'], agentsSkipped: [], libsAdded: [], estimatedTimeImpact: 10 },
    ],
  },
  {
    id: 'content-scope',
    question: 'How much content?',
    branches: [
      { id: 'single-screen', label: 'Single Screen', agentsAdded: [], agentsSkipped: ['proc-gen'], libsAdded: [], estimatedTimeImpact: 0 },
      { id: 'multi-level', label: 'Multi-level', agentsAdded: [], agentsSkipped: ['proc-gen'], libsAdded: [], estimatedTimeImpact: 5 },
      { id: 'hub-branches', label: 'Hub + Branches', agentsAdded: [], agentsSkipped: [], libsAdded: [], estimatedTimeImpact: 10 },
      { id: 'procedural-infinite', label: 'Procedural / Infinite', agentsAdded: ['proc-gen'], agentsSkipped: [], libsAdded: [], estimatedTimeImpact: 15 },
    ],
  },
  {
    id: 'audio-narrative',
    question: 'Audio & narrative?',
    branches: [
      { id: 'sfx-none', label: 'SFX only, no story', agentsAdded: ['sfx'], agentsSkipped: ['music', 'narrative'], libsAdded: [], estimatedTimeImpact: 0 },
      { id: 'sfx-music-none', label: 'SFX + Music, no story', agentsAdded: ['sfx', 'music'], agentsSkipped: ['narrative'], libsAdded: [], estimatedTimeImpact: 5 },
      { id: 'sfx-music-story', label: 'SFX + Music + Story', agentsAdded: ['sfx', 'music', 'narrative'], agentsSkipped: [], libsAdded: [], estimatedTimeImpact: 15 },
      { id: 'adaptive-story', label: 'Adaptive audio + Branching story', agentsAdded: ['sfx', 'music', 'narrative'], agentsSkipped: [], libsAdded: ['tone'], estimatedTimeImpact: 25 },
    ],
  },
];

// Base agents always included
const BASE_AGENTS = ['lead-architect', 'html-css', 'entity', 'input', 'level-designer', 'ui-overlay', 'core-engine', 'qa-validator'];

/**
 * Auto-resolve the decision flow from game.md content.
 * Uses keyword heuristics on each question's branches.
 * @param {string} gameMd - game.md content
 * @returns {object[]} array of { questionId, branchId, label }
 */
function resolveFromGameMd(gameMd) {
  const { resolveOntology } = require('./game-ontology');
  const resolved = resolveOntology(gameMd);
  const decisions = [];

  // Map ontology dimension → flow question
  const dimToFlow = {
    'visual-style': 'visual-style',
    'multiplayer': 'multiplayer',
    'core-mechanics': 'core-mechanic',
    'content-scope': 'content-scope',
  };

  for (const [dimId, flowId] of Object.entries(dimToFlow)) {
    const dimVal = resolved[dimId];
    if (!dimVal) continue;
    const question = FLOW.find(f => f.id === flowId);
    if (!question) continue;
    const branch = question.branches.find(b => b.id === dimVal.value);
    decisions.push({
      questionId: flowId,
      branchId: dimVal.value,
      label: branch ? branch.label : dimVal.value,
    });
  }

  // Audio + narrative combined question
  const audioVal = resolved['audio']?.value || 'sfx-only';
  const narrativeVal = resolved['narrative']?.value || 'none';

  let audioBranch = 'sfx-none';
  if (narrativeVal === 'branching' || narrativeVal === 'linear-arc') {
    audioBranch = audioVal === 'adaptive' ? 'adaptive-story' : 'sfx-music-story';
  } else if (audioVal === 'sfx-music' || audioVal === 'adaptive') {
    audioBranch = 'sfx-music-none';
  }

  const q5 = FLOW.find(f => f.id === 'audio-narrative');
  const b5 = q5.branches.find(b => b.id === audioBranch);
  decisions.push({
    questionId: 'audio-narrative',
    branchId: audioBranch,
    label: b5 ? b5.label : audioBranch,
  });

  return decisions;
}

/**
 * Compile an execution plan from a set of decisions.
 * @param {object[]} decisions - array of { questionId, branchId }
 * @returns {{ agents: string[], libs: string[], tiers: object, estimatedSeconds: number }}
 */
function compileExecutionPlan(decisions) {
  const agents = new Set(BASE_AGENTS);
  const skipped = new Set();
  const libs = new Set();
  let estimatedSeconds = 30; // base time

  for (const decision of decisions) {
    const question = FLOW.find(f => f.id === decision.questionId);
    if (!question) continue;

    const branch = question.branches.find(b => b.id === decision.branchId);
    if (!branch) continue;

    for (const a of (branch.agentsAdded || [])) agents.add(a);
    for (const s of (branch.agentsSkipped || [])) skipped.add(s);
    for (const l of (branch.libsAdded || [])) libs.add(l);
    estimatedSeconds += branch.estimatedTimeImpact || 0;
  }

  // Remove skipped (except base agents)
  for (const s of skipped) {
    if (!BASE_AGENTS.includes(s)) agents.delete(s);
  }

  // Also always include visual-qa
  agents.add('visual-qa');

  const agentList = [...agents];

  // Organize into tiers
  const tiers = {
    0: agentList.filter(a => a === 'lead-architect'),
    1: agentList.filter(a => !['lead-architect', 'core-engine', 'qa-validator', 'visual-qa'].includes(a)),
    2: agentList.filter(a => a === 'core-engine'),
    3: agentList.filter(a => a === 'qa-validator' || a === 'visual-qa'),
  };

  return {
    agents: agentList,
    libs: [...libs],
    tiers,
    estimatedSeconds,
  };
}

module.exports = { FLOW, resolveFromGameMd, compileExecutionPlan };
