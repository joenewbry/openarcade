'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Markdown Chain — manages 3 markdown files per game session:
 *   1. game.md     — evolving design spec (created at session start)
 *   2. ontology.md — resolved ontology dimensions + agent selection
 *   3. blueprint.md — human-readable build contract from blueprint JSON
 */

/**
 * Initialize the markdown chain for a session directory.
 * Creates game.md if it doesn't exist.
 */
function initMarkdownChain(gameDir, opts = {}) {
  fs.mkdirSync(gameDir, { recursive: true });

  const gameMdPath = path.join(gameDir, 'game.md');
  if (!fs.existsSync(gameMdPath)) {
    const date = new Date().toISOString().split('T')[0];
    const title = opts.title || path.basename(gameDir);
    const content = `---
title: ${title}
genre: unknown
created: ${date}
status: designing
---
# ${title}

## Core Concept


## Mechanics


## Visual Style


## Audio


## Changelog
`;
    fs.writeFileSync(gameMdPath, content, 'utf8');
  }

  return { gameMdPath };
}

/**
 * Update game.md with design decisions from chat.
 */
function updateGameMd(gameDir, updates) {
  const gameMdPath = path.join(gameDir, 'game.md');
  if (!fs.existsSync(gameMdPath)) return;

  let content = fs.readFileSync(gameMdPath, 'utf8');

  for (const { section, field, value } of updates) {
    const header = `## ${section.charAt(0).toUpperCase() + section.slice(1)}`;
    const line = `- ${field}: ${value}`;
    if (content.includes(line)) continue;

    if (content.includes(header)) {
      content = content.replace(header, `${header}\n${line}`);
    } else {
      content += `\n${header}\n${line}\n`;
    }
  }

  // Update frontmatter status
  content = content.replace(/^status:\s*\w+/m, 'status: designing');

  fs.writeFileSync(gameMdPath, content, 'utf8');
}

/**
 * Generate ontology.md from resolved ontology dimensions.
 * @param {string} gameDir - session directory
 * @param {object} resolved - resolved ontology { dimensions, agents, libs, archetype, estimatedTime }
 * @returns {string} path to ontology.md
 */
function generateOntologyMd(gameDir, resolved) {
  const mdPath = path.join(gameDir, 'ontology.md');

  const agentList = (resolved.agents || []).map(a => `\`${a}\``).join(', ');
  const libList = (resolved.libs || []).map(l => `\`${l}\``).join(', ') || 'none';

  let content = `---
archetype: ${resolved.archetype || 'custom'}
agents: [${(resolved.agents || []).join(', ')}]
libs: [${(resolved.libs || []).join(', ')}]
estimated_time: ${resolved.estimatedTime || 45}s
---
# Ontology Resolution

**Archetype**: ${resolved.archetype || 'custom'}
**Agents** (${(resolved.agents || []).length}): ${agentList}
**Libraries**: ${libList}
**Estimated Build Time**: ~${resolved.estimatedTime || 45}s

`;

  // Write each dimension resolution
  const dims = resolved.dimensions || {};
  for (const [dimId, dimVal] of Object.entries(dims)) {
    const label = dimId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    content += `## ${label}: ${dimVal.value || 'unresolved'}\n`;
    if (dimVal.agentsAdded?.length) {
      content += `- Agents added: ${dimVal.agentsAdded.join(', ')}\n`;
    }
    if (dimVal.agentsSkipped?.length) {
      content += `- Agents skipped: ${dimVal.agentsSkipped.join(', ')}\n`;
    }
    if (dimVal.libsAdded?.length) {
      content += `- Libraries: ${dimVal.libsAdded.join(', ')}\n`;
    }
    content += '\n';
  }

  fs.writeFileSync(mdPath, content, 'utf8');
  return mdPath;
}

/**
 * Generate blueprint.md from blueprint JSON.
 * @param {string} gameDir - session directory
 * @param {object} blueprint - the Blueprint JSON from lead-architect
 * @returns {string} path to blueprint.md
 */
function generateBlueprintMd(gameDir, blueprint) {
  const mdPath = path.join(gameDir, 'blueprint.md');

  const game = blueprint.game || {};
  let content = `# Blueprint: ${game.title || 'Untitled'}

**Genre**: ${game.genre || 'unknown'}
**Canvas**: ${blueprint.html?.canvas?.width || 800}x${blueprint.html?.canvas?.height || 600}

## Entities
`;

  // Entities
  const entities = blueprint.entities || [];
  for (const entity of entities) {
    content += `\n### ${entity.name || 'Unknown'}\n`;
    if (entity.properties) {
      content += `- Properties: ${Object.keys(entity.properties).join(', ')}\n`;
    }
    if (entity.methods) {
      const methods = Array.isArray(entity.methods) ? entity.methods : Object.keys(entity.methods);
      content += `- Methods: ${methods.map(m => `${m}()`).join(', ')}\n`;
    }
  }

  // Functions
  content += '\n## Functions\n';
  const funcs = blueprint.functions || {};
  const coreNames = ['init', 'gameLoop', 'update', 'render'];
  for (const name of coreNames) {
    if (funcs[name]) {
      const f = funcs[name];
      const params = f.params ? `(${f.params.join(', ')})` : '()';
      content += `- \`${name}${params}\`${f.description ? ' — ' + f.description : ''}\n`;
    }
  }
  // Other functions
  for (const [name, f] of Object.entries(funcs)) {
    if (coreNames.includes(name)) continue;
    const params = f.params ? `(${f.params.join(', ')})` : '()';
    content += `- \`${name}${params}\`${f.description ? ' — ' + f.description : ''}\n`;
  }

  // Audio
  if (blueprint.audio) {
    content += '\n## Audio\n';
    const sounds = blueprint.audio.sounds || [];
    for (const sound of sounds) {
      if (typeof sound === 'string') {
        content += `- ${sound}\n`;
      } else {
        content += `- ${sound.name || sound.id || 'unnamed'}`;
        if (sound.type) content += `: ${sound.type}`;
        if (sound.frequency) content += ` ${sound.frequency}Hz`;
        if (sound.duration) content += `, ${sound.duration}ms`;
        content += '\n';
      }
    }
  }

  // Input
  if (blueprint.input) {
    content += '\n## Input\n';
    const keys = blueprint.input.keyboard || blueprint.input.keys || {};
    for (const [key, action] of Object.entries(keys)) {
      content += `- \`${key}\` → ${action}\n`;
    }
    if (blueprint.input.mouse) content += '- Mouse: enabled\n';
    if (blueprint.input.touch) content += '- Touch: enabled\n';
  }

  // UI
  if (blueprint.ui) {
    content += '\n## UI Overlays\n';
    const overlays = blueprint.ui.overlays || blueprint.ui;
    if (Array.isArray(overlays)) {
      for (const overlay of overlays) {
        content += `- ${overlay.id || overlay.name || overlay}: ${overlay.type || 'overlay'}\n`;
      }
    }
  }

  // CSS Variables
  if (blueprint.css?.variables) {
    content += '\n## CSS Variables\n';
    for (const [name, val] of Object.entries(blueprint.css.variables)) {
      content += `- \`${name}\`: ${val}\n`;
    }
  }

  fs.writeFileSync(mdPath, content, 'utf8');
  return mdPath;
}

/**
 * Get the current state of all markdown chain files.
 */
function getChain(gameDir) {
  const files = ['game.md', 'ontology.md', 'blueprint.md'];
  const chain = {};

  for (const file of files) {
    const filePath = path.join(gameDir, file);
    chain[file] = {
      exists: fs.existsSync(filePath),
      path: filePath,
      content: fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null,
      updatedAt: fs.existsSync(filePath) ? fs.statSync(filePath).mtime.toISOString() : null,
    };
  }

  return chain;
}

module.exports = {
  initMarkdownChain,
  updateGameMd,
  generateOntologyMd,
  generateBlueprintMd,
  getChain,
};
