'use strict';

const fs = require('fs');
const path = require('path');
const { complete } = require('./claude');

const CLASSIFY_SYSTEM = `You classify game modification requests into one of three categories.
Respond with ONLY a JSON object — no other text.

Categories:
- "instant_css": Pure visual change achievable with CSS only (color, background, opacity, font size, border, etc.)
- "fast_rebuild": Logic/behavior change that touches 1-2 specific code sections (speed constants, spawn rates, scoring, entity counts, collision response)
- "full_rebuild": Fundamental architecture change (new game mechanic, new game mode, multiplayer, new entity type with complex behavior, level redesign)

Response format: {"type": "instant_css"|"fast_rebuild"|"full_rebuild", "reason": "brief explanation", "cssChanges": "CSS string if instant_css else null"}`;

/**
 * Classify and apply a patch to a game.
 * @param {string} gameId - game directory name
 * @param {string} instruction - user's modification request
 * @param {string} repoPath - base repo path
 * @returns {Promise<{type, result}>}
 */
async function applyPatch(gameId, instruction, repoPath) {
  const gameDir = path.join(repoPath, gameId);
  const indexPath = path.join(gameDir, 'index.html');
  const gameMdPath = path.join(gameDir, 'game.md');

  if (!fs.existsSync(indexPath)) {
    throw new Error(`Game index.html not found at ${indexPath}`);
  }

  const currentCode = fs.readFileSync(indexPath, 'utf8');

  // Classify the instruction
  const classifyPrompt = `Game code (first 3000 chars):\n${currentCode.slice(0, 3000)}\n\nUser instruction: "${instruction}"\n\nClassify this modification:`;
  const classifyResult = await complete(CLASSIFY_SYSTEM, classifyPrompt, 256);

  let classification;
  try {
    classification = JSON.parse(classifyResult.trim());
  } catch {
    // Fallback to fast_rebuild if parse fails
    classification = { type: 'fast_rebuild', reason: 'parse error fallback', cssChanges: null };
  }

  const { type, reason, cssChanges } = classification;

  // Apply patch based on type
  if (type === 'instant_css') {
    const css = cssChanges || await generateCSSPatch(instruction, currentCode);
    appendChangelog(gameMdPath, instruction, 'instant patch (CSS)', gameId);
    return { type: 'instant_css', css, reason };
  }

  if (type === 'fast_rebuild') {
    const patched = await applyFastRebuild(instruction, currentCode, gameId);
    fs.writeFileSync(indexPath, patched, 'utf8');
    appendChangelog(gameMdPath, instruction, 'fast rebuild', gameId);
    return { type: 'fast_rebuild', reason, url: `/${gameId}/index.html` };
  }

  // full_rebuild — caller will trigger the generate pipeline
  appendChangelog(gameMdPath, instruction, 'full rebuild (scheduled)', gameId);
  return { type: 'full_rebuild', reason };
}

async function generateCSSPatch(instruction, currentCode) {
  const system = `You generate CSS strings to apply visual changes to HTML5 games.
Output ONLY a valid CSS string (no <style> tags, no explanation).
The CSS will be injected into a <style> tag inside the game iframe.
Be specific and targeted — only change what was asked.`;

  const prompt = `Game code excerpt:\n${currentCode.slice(0, 2000)}\n\nApply this visual change: "${instruction}"\n\nCSS:`;
  return await complete(system, prompt, 512);
}

async function applyFastRebuild(instruction, currentCode, gameId) {
  const system = `You are modifying a specific section of an HTML5 game file.
Make the minimum necessary code change to fulfill the instruction.
Return the COMPLETE modified HTML file. Do not truncate or summarize.
Only change what was asked. Keep all other code exactly as-is.`;

  const prompt = `Game ID: ${gameId}\nInstruction: "${instruction}"\n\nCurrent full game code:\n\`\`\`html\n${currentCode}\n\`\`\`\n\nReturn the complete modified game.html:`;
  const result = await complete(system, prompt, 8192);

  // Extract code block if wrapped
  const match = /```(?:html)?\n([\s\S]+?)\n```/.exec(result);
  return match ? match[1] : result;
}

function appendChangelog(gameMdPath, instruction, changeType, version) {
  if (!fs.existsSync(gameMdPath)) return;

  const date = new Date().toISOString().split('T')[0];
  const entry = `\n### v (${date}) — ${changeType}\n- User: "${instruction}"\n`;

  const current = fs.readFileSync(gameMdPath, 'utf8');
  // Insert after ## Changelog header
  const patched = current.replace(/(## Changelog\n)/, `$1${entry}`);
  fs.writeFileSync(gameMdPath, patched, 'utf8');
}

module.exports = { applyPatch };
