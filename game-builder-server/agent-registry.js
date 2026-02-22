'use strict';

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, 'agents');

// Cached agent manifest
let agentCache = null;

/**
 * Parse agent .md metadata from ## Role section frontmatter-style lines.
 * Looks for key: value patterns in the Role section.
 */
function parseAgentMeta(md) {
  const meta = {
    tier: 1,
    category: 'code',
    assemblyOrder: 50,
    activatedBy: [],
    dependencies: [],
  };

  // Extract ## Role section
  const roleMatch = /## Role\n([\s\S]*?)(?=\n## |\n$)/.exec(md);
  if (roleMatch) {
    const roleText = roleMatch[1];

    // tier
    const tierMatch = /tier:\s*(\d+)/i.exec(roleText);
    if (tierMatch) meta.tier = parseInt(tierMatch[1]);

    // category
    const catMatch = /category:\s*(\w[\w-]*)/i.exec(roleText);
    if (catMatch) meta.category = catMatch[1].toLowerCase();

    // assembly-order
    const orderMatch = /assembly-order:\s*(\d+)/i.exec(roleText);
    if (orderMatch) meta.assemblyOrder = parseInt(orderMatch[1]);

    // activated-by (comma-separated)
    const actMatch = /activated-by:\s*(.+)/i.exec(roleText);
    if (actMatch) {
      meta.activatedBy = actMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  // Extract ## Dependencies section
  const depMatch = /## Dependencies\n([\s\S]*?)(?=\n## |\n$)/.exec(md);
  if (depMatch) {
    const lines = depMatch[1].split('\n').filter(l => l.startsWith('- '));
    meta.dependencies = lines.map(l => l.slice(2).trim());
  }

  return meta;
}

/**
 * Load and cache all agent definitions from agents/*.md.
 * @returns {object} map of agentName → { name, tier, category, assemblyOrder, activatedBy, dependencies, mdPath }
 */
function loadAllAgents() {
  if (agentCache) return agentCache;

  const manifest = {};

  if (!fs.existsSync(AGENTS_DIR)) return manifest;

  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const name = file.replace('.md', '');
    const mdPath = path.join(AGENTS_DIR, file);
    const md = fs.readFileSync(mdPath, 'utf8');
    const meta = parseAgentMeta(md);

    manifest[name] = {
      name,
      ...meta,
      mdPath,
    };
  }

  agentCache = manifest;
  return manifest;
}

/**
 * Get the full agent manifest for the API.
 * @returns {object[]} array of agent descriptors
 */
function getAgentManifest() {
  const agents = loadAllAgents();
  return Object.values(agents).map(a => ({
    name: a.name,
    tier: a.tier,
    category: a.category,
    assemblyOrder: a.assemblyOrder,
    activatedBy: a.activatedBy,
    dependencies: a.dependencies,
  }));
}

/**
 * Build a tiered execution plan from a resolved ontology.
 * Replaces the hardcoded TIER_1_AGENTS / TIER_2_AGENTS constants.
 *
 * @param {string[]} agentNames - list of agent names from ontology resolution
 * @returns {{ 0: string[], 1: string[], 2: string[], 3: string[] }}
 */
function planBuild(agentNames) {
  const agents = loadAllAgents();
  const tiers = { 0: [], 1: [], 2: [], 3: [] };

  for (const name of agentNames) {
    const agent = agents[name];
    if (!agent) {
      // Unknown agent — default to tier 1
      if (!['lead-architect', 'core-engine', 'qa-validator', 'visual-qa'].includes(name)) {
        tiers[1].push(name);
      }
      continue;
    }

    const tier = Math.min(agent.tier, 3);
    if (!tiers[tier]) tiers[tier] = [];
    tiers[tier].push(name);
  }

  // Ensure correct tier placement for known agents
  // lead-architect → always tier 0
  for (const tier of Object.values(tiers)) {
    const idx = tier.indexOf('lead-architect');
    if (idx !== -1 && tier !== tiers[0]) {
      tier.splice(idx, 1);
      if (!tiers[0].includes('lead-architect')) tiers[0].push('lead-architect');
    }
  }

  // core-engine → always tier 2
  for (const tier of Object.values(tiers)) {
    const idx = tier.indexOf('core-engine');
    if (idx !== -1 && tier !== tiers[2]) {
      tier.splice(idx, 1);
      if (!tiers[2].includes('core-engine')) tiers[2].push('core-engine');
    }
  }

  // qa-validator, visual-qa → always tier 3
  for (const qaAgent of ['qa-validator', 'visual-qa']) {
    for (const tier of Object.values(tiers)) {
      const idx = tier.indexOf(qaAgent);
      if (idx !== -1 && tier !== tiers[3]) {
        tier.splice(idx, 1);
        if (!tiers[3].includes(qaAgent)) tiers[3].push(qaAgent);
      }
    }
  }

  return tiers;
}

/**
 * Get the dependency graph of a set of agents for visualization.
 * @param {string[]} agentNames - list of active agents
 * @returns {object[]} array of { from, to } edges
 */
function getDependencyGraph(agentNames) {
  const agents = loadAllAgents();
  const edges = [];
  const nameSet = new Set(agentNames);

  // Tier-based implicit deps
  const tiers = planBuild(agentNames);
  for (let t = 1; t <= 3; t++) {
    const prevTier = tiers[t - 1] || [];
    const currTier = tiers[t] || [];
    for (const from of prevTier) {
      for (const to of currTier) {
        edges.push({ from, to });
      }
    }
  }

  return edges;
}

/**
 * Get the assembly order for a list of agents.
 * @param {string[]} agentNames - agents that produced output
 * @returns {string[]} sorted agent names by assembly order
 */
function getAssemblyOrder(agentNames) {
  const agents = loadAllAgents();

  return [...agentNames].sort((a, b) => {
    const orderA = agents[a]?.assemblyOrder ?? 50;
    const orderB = agents[b]?.assemblyOrder ?? 50;
    return orderA - orderB;
  });
}

/**
 * Clear the agent cache (for hot-reload during development).
 */
function clearCache() {
  agentCache = null;
}

module.exports = {
  loadAllAgents,
  getAgentManifest,
  planBuild,
  getDependencyGraph,
  getAssemblyOrder,
  clearCache,
};
