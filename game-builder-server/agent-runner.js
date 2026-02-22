'use strict';

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, 'agents');

/**
 * Parse an agent .md file into its components.
 * @param {string} agentName - filename without .md (e.g. 'html-css')
 * @returns {object} { role, dependencies, systemPrompt, outputContract, qualityChecks }
 */
function loadAgent(agentName) {
  const mdPath = path.join(AGENTS_DIR, `${agentName}.md`);
  if (!fs.existsSync(mdPath)) {
    throw new Error(`Agent definition not found: ${agentName}`);
  }

  const md = fs.readFileSync(mdPath, 'utf8');

  // Extract sections by ## headings
  const sections = {};
  const sectionRegex = /^## (.+)$/gm;
  let match;
  const positions = [];

  while ((match = sectionRegex.exec(md)) !== null) {
    positions.push({ name: match[1].trim(), start: match.index + match[0].length });
  }

  for (let i = 0; i < positions.length; i++) {
    const end = i + 1 < positions.length ? positions[i + 1].start - positions[i + 1].name.length - 4 : md.length;
    sections[positions[i].name.toLowerCase()] = md.slice(positions[i].start, end).trim();
  }

  return {
    name: agentName,
    role: sections['role'] || '',
    dependencies: sections['dependencies'] || '',
    systemPrompt: sections['system prompt'] || '',
    outputContract: sections['output contract'] || '',
    qualityChecks: sections['quality checks'] || '',
  };
}

/**
 * Run an agent: send its prompt to Claude and get the output.
 * @param {string} agentName - agent name (e.g. 'html-css', 'entity')
 * @param {object} blueprint - the Game Blueprint JSON
 * @param {object} claude - Anthropic client instance
 * @param {object} [opts] - options
 * @param {object} [opts.priorOutputs] - outputs from prior tier agents (for Core Engine)
 * @param {string} [opts.gameMd] - original game.md content
 * @param {function} [opts.onProgress] - progress callback (text)
 * @param {function} [opts.onToken] - streaming token callback
 * @param {string} [opts.model] - Claude model override
 * @param {number} [opts.maxTokens] - max tokens override
 * @returns {Promise<string>} the agent's output text
 */
async function runAgent(agentName, blueprint, claude, opts = {}) {
  const agent = loadAgent(agentName);
  const model = opts.model || 'claude-sonnet-4-5-20250514';
  const maxTokens = opts.maxTokens || 4096;

  // Build the system prompt
  let system = agent.systemPrompt;

  // Add output contract as additional guidance
  if (agent.outputContract) {
    system += `\n\nEXPECTED OUTPUT FORMAT:\n${agent.outputContract}`;
  }

  // Add quality checks
  if (agent.qualityChecks) {
    system += `\n\nQUALITY REQUIREMENTS:\n${agent.qualityChecks}`;
  }

  // Build the user prompt with blueprint and any prior outputs
  let userPrompt = `Game Blueprint:\n\`\`\`json\n${JSON.stringify(blueprint, null, 2)}\n\`\`\``;

  if (opts.gameMd) {
    userPrompt += `\n\nOriginal Game Spec (game.md):\n${opts.gameMd}`;
  }

  if (opts.priorOutputs && Object.keys(opts.priorOutputs).length > 0) {
    userPrompt += '\n\n--- PRIOR AGENT OUTPUTS (your code will come AFTER these) ---\n';
    for (const [name, output] of Object.entries(opts.priorOutputs)) {
      // Truncate very long outputs to keep within context
      const truncated = output.length > 6000 ? output.slice(0, 6000) + '\n// ... (truncated)' : output;
      userPrompt += `\n=== ${name.toUpperCase()} AGENT OUTPUT ===\n${truncated}\n`;
    }
  }

  userPrompt += '\n\nProduce your output now. Remember: output ONLY code (or JSON for QA), no markdown fences, no explanations.';

  if (opts.onProgress) opts.onProgress(`Running ${agentName} agent...`);

  // Streaming mode
  if (opts.onToken) {
    const stream = await claude.messages.stream({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let fullText = '';
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        fullText += chunk.delta.text;
        opts.onToken(chunk.delta.text);
      }
    }
    return cleanOutput(fullText, agentName);
  }

  // Non-streaming mode
  const msg = await claude.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = msg.content[0]?.text || '';
  return cleanOutput(text, agentName);
}

/**
 * Clean agent output: strip code fences, trim whitespace.
 * @param {string} text - raw output
 * @param {string} agentName - for context-specific cleaning
 * @returns {string} cleaned output
 */
function cleanOutput(text, agentName) {
  let clean = text.trim();

  // QA validator returns JSON — don't strip fences from that
  if (agentName === 'qa-validator') {
    const fenceMatch = /```(?:json)?\n([\s\S]+?)\n```/.exec(clean);
    if (fenceMatch) return fenceMatch[1].trim();
    return clean;
  }

  // Strip markdown code fences
  const fenceMatch = /```(?:html|javascript|js|css)?\n([\s\S]+?)\n```/.exec(clean);
  if (fenceMatch) clean = fenceMatch[1];

  // For HTML agent, ensure output starts with <!DOCTYPE
  if (agentName === 'html-css') {
    const doctypeIdx = clean.indexOf('<!DOCTYPE');
    if (doctypeIdx > 0) clean = clean.slice(doctypeIdx);
  }

  return clean.trim();
}

/**
 * List all available agent names.
 * @returns {string[]}
 */
function listAgents() {
  return fs.readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''));
}

module.exports = { loadAgent, runAgent, cleanOutput, listAgents };
