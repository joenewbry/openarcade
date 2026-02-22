'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { generateBlueprint, validateBlueprint } = require('./blueprint');
const { runAgent } = require('./agent-runner');
const { assemble, validateAssembly } = require('./assembler');
const { staticAnalysis, validate } = require('./qa-validator');
const { selectStack, generateCDNTags, extractDesignFromGameMd } = require('./ontology');
const { resolveOntology, agentsFromOntology, libsFromOntology } = require('./game-ontology');
const { matchArchetype } = require('./archetypes');
const { resolveFromGameMd, compileExecutionPlan } = require('./decision-flow');
const { generateOntologyMd, generateBlueprintMd } = require('./markdown-chain');
const { planBuild, getAssemblyOrder } = require('./agent-registry');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Configurable concurrency
const MAX_PARALLEL_AGENTS = parseInt(process.env.MAX_PARALLEL_AGENTS || '6', 10);

/**
 * Run the parallel game generation pipeline.
 * @param {string} gameId - game slug
 * @param {string} repoPath - absolute path to openarcade repo
 * @param {object} res - Express SSE response
 * @param {object} [opts] - options
 * @param {boolean} [opts.skipArt] - skip Grok art generation
 */
async function generateGameParallel(gameId, repoPath, res) {
  const gameDir = path.join(repoPath, gameId);
  const indexPath = path.join(gameDir, 'index.html');
  const gameMdPath = path.join(gameDir, 'game.md');

  fs.mkdirSync(gameDir, { recursive: true });

  // Load game.md
  if (!fs.existsSync(gameMdPath)) {
    throw new Error(`game.md not found for game: ${gameId}`);
  }
  const gameMd = fs.readFileSync(gameMdPath, 'utf8');

  // ── ONTOLOGY RESOLUTION ───────────────────────────────────
  const ontologyResolved = resolveOntology(gameMd);
  const agentNames = agentsFromOntology(ontologyResolved);
  const ontologyLibs = libsFromOntology(ontologyResolved);
  const archetype = matchArchetype(gameMd);
  const decisions = resolveFromGameMd(gameMd);
  const executionPlan = compileExecutionPlan(decisions);

  // Write ontology.md
  try {
    generateOntologyMd(gameDir, {
      dimensions: ontologyResolved,
      agents: agentNames,
      libs: ontologyLibs,
      archetype: archetype.archetype,
      estimatedTime: executionPlan.estimatedSeconds,
    });
    emitEvent(res, 'markdown', { file: 'ontology.md', agents: agentNames.length });
  } catch (e) {
    console.warn('ontology.md write failed (non-fatal):', e.message);
  }

  // Build tier plan from ontology-resolved agents
  const tiers = planBuild(agentNames);

  // Emit the agent plan to the frontend
  emitEvent(res, 'agent-plan', {
    archetype: archetype.archetype,
    agentCount: agentNames.length,
    agents: agentNames,
    tiers,
    estimatedSeconds: executionPlan.estimatedSeconds,
    libs: ontologyLibs,
  });

  // Extract design and resolve tech stack
  const design = extractDesignFromGameMd(gameMd);
  const stack = selectStack(design);
  const cdnTags = generateCDNTags(stack);

  // Send stack info
  emitEvent(res, 'stack', {
    rendering: stack.rendering,
    physics: stack.physics,
    multiplayer: stack.multiplayer,
    audio: stack.audio,
    justification: stack.justification,
  });

  // ── TIER 0: BLUEPRINT ──────────────────────────────────────
  emitEvent(res, 'agent-start', { agent: 'lead-architect', tier: 0 });
  const t0 = Date.now();

  let blueprint;
  try {
    blueprint = await generateBlueprint(gameMd, client, {
      onProgress: (msg) => emitEvent(res, 'progress', { step: 'blueprint', pct: 5, message: msg }),
    });

    // Inject tech stack CDN info into blueprint
    if (cdnTags) {
      blueprint.html.externalScripts = blueprint.html.externalScripts || [];
      // Add CDN tags as raw HTML
      blueprint.html.cdnBlock = cdnTags;
    }
    blueprint._stack = stack;

    const warnings = validateBlueprint(blueprint);
    if (warnings.length > 0) {
      console.warn(`Blueprint warnings for ${gameId}:`, warnings);
    }
  } catch (e) {
    console.error('Blueprint generation failed:', e.message);
    emitEvent(res, 'agent-error', { agent: 'lead-architect', error: e.message });

    // Fallback to sequential generator
    console.log('Falling back to sequential generator...');
    emitEvent(res, 'fallback', { reason: 'Blueprint generation failed: ' + e.message });
    const { generateGame } = require('./generator');
    return generateGame(gameId, repoPath, res);
  }

  emitEvent(res, 'agent-complete', { agent: 'lead-architect', tier: 0, duration: (Date.now() - t0) / 1000 });
  emitEvent(res, 'blueprint', { contractCount: (blueprint.entities?.length || 0) + Object.keys(blueprint.functions || {}).length });
  emitEvent(res, 'tier-complete', { tier: 0 });

  // Write blueprint.md
  try {
    generateBlueprintMd(gameDir, blueprint);
    emitEvent(res, 'markdown', { file: 'blueprint.md' });
  } catch (e) {
    console.warn('blueprint.md write failed (non-fatal):', e.message);
  }

  // ── TIER 1: PARALLEL AGENTS (dynamic from ontology) ──────
  const tier1Agents = tiers[1] || [];
  emitEvent(res, 'progress', { step: 'parallel-agents', pct: 10 });
  const allOutputs = {};
  const tier1Promises = [];

  // Limit concurrency with a semaphore
  const semaphore = createSemaphore(MAX_PARALLEL_AGENTS);

  for (const agentName of tier1Agents) {
    const promise = semaphore.acquire().then(async (release) => {
      emitEvent(res, 'agent-start', { agent: agentName, tier: 1 });
      const agentStart = Date.now();

      try {
        const output = await runAgent(agentName, blueprint, client, {
          gameMd,
          onProgress: (msg) => emitEvent(res, 'progress', { step: agentName, message: msg }),
        });

        allOutputs[agentName] = output;
        const duration = (Date.now() - agentStart) / 1000;
        emitEvent(res, 'agent-complete', { agent: agentName, tier: 1, duration });
      } catch (e) {
        console.error(`Agent ${agentName} failed:`, e.message);
        emitEvent(res, 'agent-error', { agent: agentName, error: e.message });

        // Retry once
        try {
          console.log(`Retrying agent ${agentName}...`);
          const output = await runAgent(agentName, blueprint, client, { gameMd });
          allOutputs[agentName] = output;
          emitEvent(res, 'agent-complete', { agent: agentName, tier: 1, duration: (Date.now() - agentStart) / 1000, retried: true });
        } catch (retryErr) {
          console.error(`Agent ${agentName} retry failed:`, retryErr.message);
          allOutputs[agentName] = `// ${agentName} agent failed: ${retryErr.message}`;
        }
      } finally {
        release();
      }
    });

    tier1Promises.push(promise);
  }

  // Optional: Grok art generation in parallel (non-blocking)
  let artPaths = [];
  const artPromise = generateArtParallel(gameId, gameMd, repoPath, res).catch(e => {
    console.warn('Art generation failed (non-fatal):', e.message);
    return [];
  });

  // Wait for all Tier 1 agents
  await Promise.all(tier1Promises);

  // Calculate progress based on completed agents
  const completedCount = Object.keys(allOutputs).length;
  const pct = Math.round(10 + (completedCount / Math.max(tier1Agents.length, 1)) * 60);
  emitEvent(res, 'progress', { step: 'tier-1-complete', pct });
  emitEvent(res, 'tier-complete', { tier: 1 });

  // ── TIER 2: CORE ENGINE (INTEGRATION) ──────────────────────
  const tier2Agents = tiers[2] || ['core-engine'];
  for (const agentName of tier2Agents) {
    emitEvent(res, 'agent-start', { agent: agentName, tier: 2 });
    emitEvent(res, 'progress', { step: agentName, pct: 75 });
    const t2 = Date.now();

    try {
      const output = await runAgent(agentName, blueprint, client, {
        gameMd,
        priorOutputs: allOutputs,
        maxTokens: 8192,
        onProgress: (msg) => emitEvent(res, 'progress', { step: agentName, message: msg }),
      });
      allOutputs[agentName] = output;
      emitEvent(res, 'agent-complete', { agent: agentName, tier: 2, duration: (Date.now() - t2) / 1000 });
    } catch (e) {
      console.error(`${agentName} failed:`, e.message);
      emitEvent(res, 'agent-error', { agent: agentName, error: e.message });

      // Retry once
      try {
        const output = await runAgent(agentName, blueprint, client, {
          gameMd,
          priorOutputs: allOutputs,
          maxTokens: 8192,
        });
        allOutputs[agentName] = output;
      } catch (retryErr) {
        if (agentName === 'core-engine') {
          console.error('Core engine retry failed — falling back to sequential');
          emitEvent(res, 'fallback', { reason: 'Core engine failed: ' + retryErr.message });
          const { generateGame } = require('./generator');
          return generateGame(gameId, repoPath, res);
        }
        allOutputs[agentName] = `// ${agentName} agent failed: ${retryErr.message}`;
      }
    }
  }

  emitEvent(res, 'tier-complete', { tier: 2 });

  // ── ASSEMBLY ───────────────────────────────────────────────
  emitEvent(res, 'progress', { step: 'assembling', pct: 90 });

  // Wait for art (non-blocking)
  artPaths = await artPromise;

  const html = assemble(allOutputs, { gameId, artPaths });

  // Quick validation of assembly
  const assemblyCheck = validateAssembly(html);
  if (!assemblyCheck.valid) {
    console.warn('Assembly validation warnings:', assemblyCheck.errors);
  }

  // Write to disk
  fs.writeFileSync(indexPath, html, 'utf8');

  // ── TIER 3: QA VALIDATION ─────────────────────────────────
  emitEvent(res, 'agent-start', { agent: 'qa-validator', tier: 3 });
  emitEvent(res, 'progress', { step: 'validation', pct: 95 });
  const t3 = Date.now();

  let qaResult;
  try {
    qaResult = await validate(html, blueprint, client);
    emitEvent(res, 'qa-result', qaResult);

    // If critical issues found, attempt fix
    if (!qaResult.pass && qaResult.issues.some(i => i.severity === 'critical')) {
      console.log('Critical issues found, attempting fix...');
      const fixedHtml = await attemptFix(html, qaResult.issues, blueprint, client, res);
      if (fixedHtml) {
        fs.writeFileSync(indexPath, fixedHtml, 'utf8');
        // Re-validate
        const recheck = staticAnalysis(fixedHtml, blueprint);
        emitEvent(res, 'qa-result', { ...recheck, fixed: true });
      }
    }
  } catch (e) {
    console.warn('QA validation failed (non-fatal):', e.message);
    qaResult = { pass: true, score: 70, issues: [] };
  }

  emitEvent(res, 'agent-complete', { agent: 'qa-validator', tier: 3, duration: (Date.now() - t3) / 1000 });
  emitEvent(res, 'tier-complete', { tier: 3 });

  // ── FINALIZE ───────────────────────────────────────────────
  // Update game.md changelog
  appendChangelog(gameMdPath, stack);

  // Git commit + push (non-fatal)
  try {
    execSync(`git -C "${repoPath}" add "${gameDir}"`, { stdio: 'pipe' });
    execSync(`git -C "${repoPath}" commit -m "Generate game: ${gameId}"`, { stdio: 'pipe' });
    execSync(`git -C "${repoPath}" push origin main`, { stdio: 'pipe', timeout: 30000 });
  } catch (e) {
    console.warn('Git push failed (non-fatal):', e.message);
  }

  // Update manifest
  updateManifest(repoPath, gameId, gameMd);

  emitEvent(res, 'complete', { url: `/${gameId}/index.html` });
}

/**
 * Attempt to fix critical issues via Claude Sonnet.
 */
async function attemptFix(html, issues, blueprint, claude, res) {
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  if (criticalIssues.length === 0) return null;

  emitEvent(res, 'progress', { step: 'fixing', pct: 97, message: 'Fixing critical issues...' });

  const systemPrompt = `You are a game code fixer. Fix the identified issues in this HTML5 game code.
Output the COMPLETE fixed index.html — do not omit any sections. No markdown fences.`;

  const userPrompt = `Issues to fix:
${criticalIssues.map(i => `- [${i.severity}] ${i.description}${i.fix ? ` Fix: ${i.fix}` : ''}`).join('\n')}

Game code:
${html.slice(0, 20000)}

Output the complete fixed index.html:`;

  try {
    const msg = await claude.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let fixed = msg.content[0]?.text || '';
    const fenceMatch = /```(?:html)?\n([\s\S]+?)\n```/.exec(fixed);
    if (fenceMatch) fixed = fenceMatch[1];

    // Only use fix if it's reasonably complete
    if (fixed.includes('<!DOCTYPE') && fixed.includes('</html>') && fixed.length > html.length * 0.7) {
      return fixed;
    }
  } catch (e) {
    console.warn('Fix attempt failed:', e.message);
  }

  return null;
}

/**
 * Generate game art in parallel (non-blocking).
 */
async function generateArtParallel(gameId, gameMd, repoPath, res) {
  try {
    const { generateGameArt } = require('./grok');
    emitEvent(res, 'agent-start', { agent: 'art-grok', tier: 1 });
    const t = Date.now();

    const paths = await generateGameArt(gameMd, path.join(repoPath, gameId));

    emitEvent(res, 'agent-complete', { agent: 'art-grok', tier: 1, duration: (Date.now() - t) / 1000 });
    return paths;
  } catch (e) {
    console.warn('Art generation skipped:', e.message);
    return [];
  }
}

// ── Helpers ──────────────────────────────────────────────────

function emitEvent(res, event, data) {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch (e) {
    // Client may have disconnected
  }
}

function createSemaphore(max) {
  let current = 0;
  const queue = [];

  return {
    acquire() {
      return new Promise(resolve => {
        const tryAcquire = () => {
          if (current < max) {
            current++;
            resolve(() => {
              current--;
              if (queue.length > 0) queue.shift()();
            });
          } else {
            queue.push(tryAcquire);
          }
        };
        tryAcquire();
      });
    },
  };
}

function appendChangelog(gameMdPath, stack) {
  if (!fs.existsSync(gameMdPath)) return;
  const date = new Date().toISOString().split('T')[0];
  const entry = `\n### v1.0 (${date}) — parallel generation\n- Stack: ${stack.rendering}, ${stack.physics}, ${stack.multiplayer}, ${stack.audio}\n- Mode: parallel (blueprint + ${Object.keys(stack).length} agents)\n`;
  const current = fs.readFileSync(gameMdPath, 'utf8');
  if (current.includes('## Changelog')) {
    fs.writeFileSync(gameMdPath, current.replace(/(## Changelog\n)/, `$1${entry}`), 'utf8');
  } else {
    fs.appendFileSync(gameMdPath, `\n## Changelog${entry}`);
  }
}

function updateManifest(repoPath, gameId, gameMd) {
  const manifestPath = path.join(repoPath, 'games-manifest.json');
  let manifest = { version: 1, games: [] };
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {}

  const titleMatch = /^# Game:\s*(.+)/m.exec(gameMd);
  const title = titleMatch ? titleMatch[1].trim() : gameId;

  const descMatch = /## Core Concept\n([\s\S]*?)(?=\n##|$)/.exec(gameMd);
  const description = descMatch ? descMatch[1].trim().split('\n')[0].slice(0, 150) : '';

  manifest.games = manifest.games.filter(g => g.id !== gameId);
  manifest.games.push({
    id: gameId,
    title,
    category: 'user-created',
    url: `/${gameId}/index.html`,
    preview: fs.existsSync(path.join(repoPath, gameId, 'concept-art-1.png'))
      ? `/${gameId}/concept-art-1.png` : null,
    description,
    source: 'generated',
    created: new Date().toISOString().split('T')[0],
    creator: 'anonymous',
    gameMd: `/${gameId}/game.md`,
    chatLog: `/${gameId}/chat.jsonl`,
  });

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
}

module.exports = { generateGameParallel };
