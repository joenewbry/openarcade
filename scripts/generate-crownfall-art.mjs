#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(THIS_DIR, '..');
const OUT_DIR = join(ROOT, 'crownfall-dominion', 'design', 'assets');
const MANIFEST_PATH = join(OUT_DIR, 'art-manifest.json');

mkdirSync(OUT_DIR, { recursive: true });

const API_URL = 'https://api.x.ai/v1/images/generations';
const MODEL = process.env.XAI_IMAGE_MODEL || 'grok-imagine-image';
const API_KEY = process.env.XAI_API_KEY || '';

const STYLE_GUIDE = [
  'high-fidelity strategy game concept board',
  'readable territory map iconography and faction silhouettes',
  'clear UI overlays for timers and diplomacy state',
  'production-ready concept quality, not placeholder wireframe'
].join(', ');

const ASSETS = [
  { id: 'world-faction-moodboard', file: 'world-faction-moodboard.png', fallback: 'world-faction-moodboard.svg', prompt: 'Crownfall Dominion world and faction moodboard with six regions, contrasting faction emblems, parchment atlas style, readable war-table lighting.' },
  { id: 'territory-ui-board', file: 'territory-ui-board.png', fallback: 'territory-ui-board.svg', prompt: 'Territory UI board with borders, capitals, reinforcement markers, and timer urgency overlays for Crownfall Dominion.' },
  { id: 'diplomacy-event-board', file: 'diplomacy-event-board.png', fallback: 'diplomacy-event-board.svg', prompt: 'Diplomacy and world-event board for Crownfall Dominion showing treaty states, betrayals, and event spike visual language.' },
  { id: 'battle-resolution-board', file: 'battle-resolution-board.png', fallback: 'battle-resolution-board.svg', prompt: 'Battle resolution board showing simultaneous order outcomes, dice result panels, and supply line effects.' },
  { id: 'tutorial-flow-board', file: 'tutorial-flow-board.png', fallback: null, prompt: 'Skippable tutorial flow board: four-turn guided onboarding versus AI, with progression callouts and skip affordance.' },
  { id: 'turn-timer-board', file: 'turn-timer-board.png', fallback: null, prompt: 'Turn timer board for Crownfall Dominion showing blitz 20s, standard 45s, ranked 60s hard-lock visual states and auto-submit warnings.' },
  { id: 'anti-collusion-board', file: 'anti-collusion-board.png', fallback: null, prompt: 'Anti-collusion analytics board with pairwise risk indicators, overlap heatmaps, and review queue UI in a strategy game dashboard style.' }
];

function promptHash(prompt) {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 16);
}

function buildPrompt(asset) {
  return `${STYLE_GUIDE}. ${asset.prompt}`;
}

async function generateImage(asset) {
  const prompt = buildPrompt(asset);
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: MODEL, prompt, n: 1, response_format: 'b64_json' })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API ${res.status}: ${txt}`);
  }
  const body = await res.json();
  const b64 = body?.data?.[0]?.b64_json;
  if (!b64) throw new Error('Missing b64_json in API response');
  writeFileSync(join(OUT_DIR, asset.file), Buffer.from(b64, 'base64'));
}

async function main() {
  const manifest = {
    game: 'crownfall-dominion',
    doc: 'crownfall-dominion-design.md',
    model: MODEL,
    generated_at: new Date().toISOString(),
    assets: []
  };

  for (const asset of ASSETS) {
    const prompt = buildPrompt(asset);
    const item = {
      id: asset.id,
      file: asset.file,
      fallback: asset.fallback,
      prompt_hash: promptHash(prompt),
      model: MODEL,
      status: 'pending'
    };

    if (!API_KEY) {
      item.status = 'skipped_missing_xai_api_key';
      item.reason = 'Set XAI_API_KEY to generate concept boards';
      manifest.assets.push(item);
      continue;
    }

    try {
      await generateImage(asset);
      item.status = 'generated';
      manifest.assets.push(item);
      console.log(`generated ${asset.file}`);
    } catch (err) {
      item.status = 'error';
      item.error = String(err.message || err);
      manifest.assets.push(item);
      console.error(`failed ${asset.file}: ${item.error}`);
    }
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`wrote ${MANIFEST_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
