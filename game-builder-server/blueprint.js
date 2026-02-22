'use strict';

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, 'agents');

/**
 * Load the Lead Architect agent prompt from agents/lead-architect.md
 */
function loadArchitectPrompt() {
  const mdPath = path.join(AGENTS_DIR, 'lead-architect.md');
  const md = fs.readFileSync(mdPath, 'utf8');
  // Extract the system prompt section
  const systemMatch = /## System Prompt\n\n([\s\S]*?)(?=\n## Output Contract)/m.exec(md);
  return systemMatch ? systemMatch[1].trim() : md;
}

/**
 * Generate a Game Blueprint from game.md spec.
 * @param {string} gameMd - the full game.md content
 * @param {object} claude - Anthropic client instance
 * @param {object} [opts] - options
 * @param {function} [opts.onProgress] - progress callback
 * @returns {Promise<object>} parsed blueprint JSON
 */
async function generateBlueprint(gameMd, claude, opts = {}) {
  const architectPrompt = loadArchitectPrompt();

  const systemPrompt = `${architectPrompt}

IMPORTANT:
- Output ONLY valid JSON — no markdown, no code fences, no explanation
- The blueprint must be complete enough for 6 independent agents to build their code sections
- Adapt the schema to match this specific game — add entity types, sounds, UI elements as needed
- Use exact names that will appear in code (PascalCase classes, camelCase functions, kebab-case IDs)`;

  const userPrompt = `Here is the game specification. Generate a complete Game Blueprint JSON:

${gameMd}`;

  if (opts.onProgress) opts.onProgress('Generating blueprint...');

  const msg = await claude.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = msg.content[0]?.text || '';
  return parseBlueprint(text);
}

/**
 * Parse and validate blueprint JSON from Claude's response.
 * @param {string} text - raw response text
 * @returns {object} validated blueprint
 */
function parseBlueprint(text) {
  // Strip code fences if present
  let clean = text.trim();
  const fenceMatch = /```(?:json)?\n([\s\S]+?)\n```/.exec(clean);
  if (fenceMatch) clean = fenceMatch[1];

  // Find JSON object boundaries
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('Blueprint response contains no valid JSON object');
  }
  clean = clean.slice(firstBrace, lastBrace + 1);

  let blueprint;
  try {
    blueprint = JSON.parse(clean);
  } catch (e) {
    throw new Error(`Blueprint JSON parse error: ${e.message}`);
  }

  // Validate required top-level keys
  const required = ['game', 'html', 'css', 'entities', 'functions', 'input', 'audio', 'ui'];
  const missing = required.filter(k => !blueprint[k]);
  if (missing.length > 0) {
    throw new Error(`Blueprint missing required keys: ${missing.join(', ')}`);
  }

  // Validate game section
  if (!blueprint.game.title || !blueprint.game.canvasId) {
    throw new Error('Blueprint game section must have title and canvasId');
  }

  // Set defaults for optional fields
  blueprint.game.width = blueprint.game.width || 800;
  blueprint.game.height = blueprint.game.height || 600;
  blueprint.html.elementIds = blueprint.html.elementIds || ['gameCanvas', 'overlay', 'overlayTitle', 'scoreDisplay'];
  blueprint.html.externalScripts = blueprint.html.externalScripts || [];
  blueprint.constants = blueprint.constants || {};
  blueprint.levels = blueprint.levels || { type: 'wave-based', count: 5, progression: 'linear' };

  // Ensure canvas ID is in elementIds
  if (!blueprint.html.elementIds.includes(blueprint.game.canvasId)) {
    blueprint.html.elementIds.unshift(blueprint.game.canvasId);
  }

  return blueprint;
}

/**
 * Validate a blueprint for completeness and consistency.
 * Returns array of warning strings (empty = perfect).
 * @param {object} bp - parsed blueprint
 * @returns {string[]} warnings
 */
function validateBlueprint(bp) {
  const warnings = [];

  // Entity checks
  if (!bp.entities || bp.entities.length === 0) {
    warnings.push('No entities defined — game will have no interactable objects');
  }
  for (const entity of (bp.entities || [])) {
    if (!entity.className) warnings.push(`Entity missing className`);
    if (!entity.methods || entity.methods.length === 0) {
      warnings.push(`Entity ${entity.className} has no methods`);
    }
    if (!entity.methods?.some(m => m.startsWith('update'))) {
      warnings.push(`Entity ${entity.className} missing update() method`);
    }
    if (!entity.methods?.some(m => m.startsWith('draw'))) {
      warnings.push(`Entity ${entity.className} missing draw() method`);
    }
  }

  // Audio checks
  if (!bp.audio?.sounds || bp.audio.sounds.length === 0) {
    warnings.push('No sounds defined');
  }

  // Input checks
  if (!bp.input?.keyboard || bp.input.keyboard.length === 0) {
    warnings.push('No keyboard inputs defined');
  }

  // UI checks
  if (!bp.ui?.overlays || bp.ui.overlays.length === 0) {
    warnings.push('No UI overlays defined');
  }

  // Function checks
  const coreFns = bp.functions?.core || [];
  if (!coreFns.some(f => f.includes('init'))) warnings.push('Missing init() in core functions');
  if (!coreFns.some(f => f.includes('gameLoop'))) warnings.push('Missing gameLoop() in core functions');

  return warnings;
}

module.exports = { generateBlueprint, parseBlueprint, validateBlueprint };
