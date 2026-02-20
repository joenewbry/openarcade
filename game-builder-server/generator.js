'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { streamGenerationStep } = require('./claude');
const { selectStack, generateCDNTags, extractDesignFromGameMd } = require('./ontology');

const GENERATION_STEPS = [
  { name: 'html-structure',       pct: 5,  label: 'HTML structure' },
  { name: 'game-state',          pct: 15, label: 'Game state & constants' },
  { name: 'entities',            pct: 30, label: 'Entity definitions' },
  { name: 'game-loop',           pct: 50, label: 'Game loop & physics' },
  { name: 'rendering',           pct: 65, label: 'Rendering system' },
  { name: 'input',               pct: 75, label: 'Input handling' },
  { name: 'ui-overlays',         pct: 85, label: 'UI overlays & HUD' },
  { name: 'audio',               pct: 90, label: 'Audio system' },
  { name: 'recorder-integration',pct: 95, label: 'Recorder integration' },
];

const BASE_SYSTEM = `You are an expert HTML5 game developer. You write clean, complete, self-contained HTML5 games.

RULES:
- Output ONLY valid HTML/CSS/JS. No markdown, no explanations, no code fences.
- Every game must be a single index.html file with all CSS and JS inline.
- Canvas games use requestAnimationFrame. Never use setInterval for the game loop.
- All games must have: an #overlay div shown on game-over (with #overlayTitle text), a restart mechanism.
- Include <script src="../recorder.js"></script> and <script src="../rating.js"></script> before </body>.
- Use CSS variables for colors (--bg, --accent, --player, --enemy, --text).
- Mobile-friendly: listen for touch events as well as keyboard where relevant.
- Respect the tech stack from game.md — only include CDN libs listed there.
- CDN libs must have the 2s timeout fallback pattern (see ontology).
- Code must work immediately — no placeholder TODOs, no "implement this" comments.`;

/**
 * Run the full multi-step game generation pipeline.
 * Streams progress events to the SSE response, writes index.html incrementally,
 * then commits to git.
 *
 * @param {string} gameId - slug for the game (e.g. "neon-striker")
 * @param {string} repoPath - absolute path to openarcade repo
 * @param {object} res - Express SSE response
 */
async function generateGame(gameId, repoPath, res) {
  const gameDir = path.join(repoPath, gameId);
  const indexPath = path.join(gameDir, 'index.html');
  const gameMdPath = path.join(gameDir, 'game.md');

  fs.mkdirSync(gameDir, { recursive: true });

  // Load game.md spec
  let gameMd = '';
  if (fs.existsSync(gameMdPath)) {
    gameMd = fs.readFileSync(gameMdPath, 'utf8');
  } else {
    throw new Error(`game.md not found for game: ${gameId}`);
  }

  // Extract design and resolve tech stack
  const design = extractDesignFromGameMd(gameMd);
  const stack = selectStack(design);
  const cdnTags = generateCDNTags(stack);

  // Send stack info to client
  res.write(`event: stack\ndata: ${JSON.stringify({
    rendering: stack.rendering,
    physics: stack.physics,
    multiplayer: stack.multiplayer,
    audio: stack.audio,
    justification: stack.justification,
  })}\n\n`);

  // Step 1: HTML structure + CSS
  const htmlStructure = await streamGenerationStep(
    BASE_SYSTEM,
    buildStepPrompt('html-structure', gameMd, stack, cdnTags, ''),
    res, 'html-structure', 5
  );

  // Step 2: Game state constants
  const gameState = await streamGenerationStep(
    BASE_SYSTEM,
    buildStepPrompt('game-state', gameMd, stack, '', htmlStructure),
    res, 'game-state', 15
  );

  // Step 3: Entity definitions
  const entities = await streamGenerationStep(
    BASE_SYSTEM,
    buildStepPrompt('entities', gameMd, stack, '', htmlStructure + '\n' + gameState),
    res, 'entities', 30
  );

  // Steps 4-9: build on accumulated context
  const context = [htmlStructure, gameState, entities];
  const remainingSteps = GENERATION_STEPS.slice(3);
  const stepOutputs = [...context];

  for (const step of remainingSteps) {
    const priorContext = stepOutputs.join('\n\n').slice(-8000); // keep last 8k chars
    const output = await streamGenerationStep(
      BASE_SYSTEM,
      buildStepPrompt(step.name, gameMd, stack, '', priorContext),
      res, step.name, step.pct
    );
    stepOutputs.push(output);
  }

  // Final assembly: ask Claude to produce the complete merged file
  res.write(`event: progress\ndata: ${JSON.stringify({ step: 'assembling', pct: 98 })}\n\n`);

  const assembleSystem = BASE_SYSTEM + '\nAssemble all provided code sections into a SINGLE complete index.html file. Do not omit any functionality. Include recorder.js and rating.js script tags before </body>.';
  const assemblePrompt = `Game spec:\n${gameMd}\n\nTech stack: ${stack.rendering}, ${stack.physics}, ${stack.multiplayer}, ${stack.audio}\n\nAssembled sections:\n${stepOutputs.join('\n\n--- NEXT SECTION ---\n\n').slice(-12000)}\n\nOutput the complete index.html:`;

  const finalHtml = await streamGenerationStep(
    assembleSystem,
    assemblePrompt,
    res, 'assembling', 98
  );

  // Extract HTML if wrapped in code fence
  let cleanHtml = finalHtml;
  const fenceMatch = /```(?:html)?\n([\s\S]+?)\n```/.exec(finalHtml);
  if (fenceMatch) cleanHtml = fenceMatch[1];

  // Write to disk
  fs.writeFileSync(indexPath, cleanHtml, 'utf8');

  // Update game.md changelog
  appendInitialChangelog(gameMdPath, stack);

  // Git commit + push
  try {
    execSync(`git -C "${repoPath}" add "${gameDir}"`, { stdio: 'pipe' });
    execSync(`git -C "${repoPath}" commit -m "Generate game: ${gameId}"`, { stdio: 'pipe' });
    execSync(`git -C "${repoPath}" push origin main`, { stdio: 'pipe', timeout: 30000 });
  } catch (e) {
    console.warn('Git push failed (non-fatal):', e.message);
  }

  // Update games-manifest.json
  updateManifest(repoPath, gameId, gameMd);

  // Notify training pipeline (non-fatal)
  notifyTrainingPipeline(gameId, stack).catch(err =>
    console.warn('Training webhook failed (non-fatal):', err.message)
  );

  res.write(`event: complete\ndata: ${JSON.stringify({ url: `/${gameId}/index.html` })}\n\n`);
}

function buildStepPrompt(step, gameMd, stack, cdnTags, priorCode) {
  const stackDesc = `Tech stack: ${stack.rendering}, Physics: ${stack.physics}, Multiplayer: ${stack.multiplayer}, Audio: ${stack.audio}`;

  const stepInstructions = {
    'html-structure': `Write the complete HTML skeleton + all CSS. Include DOCTYPE, head with CSS variables (--bg, --accent, --player, --enemy, --text), canvas or game container, #overlay div (hidden by default), #score display. ${cdnTags ? 'Include these CDN script tags:\n' + cdnTags : 'No external libraries needed.'} End with opening <script> tag.`,
    'game-state': 'Write the game state: all constants (speeds, sizes, colors), all game variables (player, enemies, score, lives, gameOver flag), and the init() function that resets state.',
    'entities': 'Write all entity classes or factory functions: Player, Enemy, Projectile, PowerUp, etc. Include constructors, update() and draw() methods.',
    'game-loop': 'Write the main game loop using requestAnimationFrame. Include: physics update, entity updates, collision detection, game-over check, score update.',
    'rendering': 'Write the render() function. Draw background, all entities, particles/effects, HUD elements. Use the CSS color variables.',
    'input': 'Write all input handling: keyboard (keydown/keyup listeners), mouse/touch where relevant. Include mobile touch controls if appropriate.',
    'ui-overlays': 'Write the UI: show/hide #overlay with appropriate overlayTitle text on game-over/win, restart button handler, any tutorial or pause screen.',
    'audio': `Write the audio system using ${stack.audio}. Generate sound effects procedurally (beeps/tones via Web Audio API oscillators, or Howler.js calls). Include: shoot/fire, hit/explosion, collect, death, level-up sounds.`,
    'recorder-integration': 'Add the final script tags: <script src="../recorder.js"></script> and <script src="../rating.js"></script>. Also add any final initialization code (call init(), start game loop). Close the </script> and </body> and </html> tags.',
  };

  return `Game spec (game.md):\n${gameMd}\n\n${stackDesc}\n\n${priorCode ? `Prior code sections:\n${priorCode}\n\n` : ''}Task for this step: ${stepInstructions[step] || step}`;
}

function appendInitialChangelog(gameMdPath, stack) {
  if (!fs.existsSync(gameMdPath)) return;
  const date = new Date().toISOString().split('T')[0];
  const entry = `\n### v1.0 (${date}) — initial generation\n- Stack: ${stack.rendering}, ${stack.physics}, ${stack.multiplayer}, ${stack.audio}\n`;
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

  // Extract title from game.md
  const titleMatch = /^# Game:\s*(.+)/m.exec(gameMd);
  const title = titleMatch ? titleMatch[1].trim() : gameId;

  const descMatch = /## Core Concept\n([\s\S]*?)(?=\n##|$)/.exec(gameMd);
  const description = descMatch ? descMatch[1].trim().split('\n')[0].slice(0, 150) : '';

  // Remove existing entry for this game if present
  manifest.games = manifest.games.filter(g => g.id !== gameId);

  // Add new entry
  manifest.games.push({
    id: gameId,
    title,
    category: 'user-created',
    url: `/${gameId}/index.html`,
    preview: fs.existsSync(path.join(repoPath, gameId, 'concept-art-1.png'))
      ? `/${gameId}/concept-art-1.png`
      : null,
    description,
    source: 'generated',
    created: new Date().toISOString().split('T')[0],
    creator: 'anonymous',
    gameMd: `/${gameId}/game.md`,
    chatLog: `/${gameId}/chat.jsonl`,
  });

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
}

async function notifyTrainingPipeline(gameId, stack) {
  const url = process.env.TRAINING_WEBHOOK_URL || 'http://localhost:8090/api/webhook/new-game';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'game_generated',
      gameId,
      timestamp: new Date().toISOString(),
      stack: {
        rendering: stack.rendering,
        physics: stack.physics,
        multiplayer: stack.multiplayer,
        audio: stack.audio,
      },
      urls: {
        game: `/${gameId}/index.html`,
        spec: `/${gameId}/game.md`,
        chatLog: `/${gameId}/chat.jsonl`,
      },
    }),
  });
  if (!res.ok) throw new Error(`Webhook ${res.status}`);
}

module.exports = { generateGame };
