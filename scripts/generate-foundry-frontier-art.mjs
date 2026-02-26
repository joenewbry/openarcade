#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(THIS_DIR, '..');
const OUT_DIR = join(ROOT, 'foundry-frontier', 'design', 'assets');
const MANIFEST_PATH = join(OUT_DIR, 'art-manifest.json');

mkdirSync(OUT_DIR, { recursive: true });

const API_URL = 'https://api.x.ai/v1/images/generations';
const MODEL = process.env.XAI_IMAGE_MODEL || 'grok-imagine-image';
const API_KEY = process.env.XAI_API_KEY || '';

const STYLE_GUIDE = [
  'high-fidelity game concept art board for a moon industrial automation game',
  'crisp composition with strong silhouette readability',
  'clear lighting and color-script choices',
  'include interface readability cues and gameplay framing',
  'production concept board quality, not placeholder wireframe'
].join(', ');

const ASSETS = [
  {
    id: 'factory-moodboard',
    file: 'factory-moodboard.png',
    fallback: 'factory-moodboard.svg',
    prompt: 'Foundry Frontier lunar factory moodboard. Moon regolith fields, industrial modules, conveyor and drone silhouettes, nighttime lunar horizon, strong cyan-amber contrast palette.'
  },
  {
    id: 'production-system-board',
    file: 'production-system-board.png',
    fallback: 'production-system-board.svg',
    prompt: 'Production system board for Foundry Frontier. Visualize extractor to refinery to assembler chain on lunar terrain, with clean route arrows and bottleneck callouts.'
  },
  {
    id: 'crisis-event-board',
    file: 'crisis-event-board.png',
    fallback: 'crisis-event-board.svg',
    prompt: 'Crisis event board for Foundry Frontier. Show micrometeor strike, lunar-night brownout, thermal spike, and dust contamination with readable hazard iconography.'
  },
  {
    id: 'hud-ux-board',
    file: 'hud-ux-board.png',
    fallback: 'hud-ux-board.svg',
    prompt: 'HUD and UX board for Foundry Frontier with mass driver stage tracker, oxygen/power gauges, thermal warnings, and clear production graph mini-panel.'
  },
  {
    id: 'mass-driver-assembly-board',
    file: 'mass-driver-assembly-board.png',
    fallback: null,
    prompt: 'Mass driver assembly board for Foundry Frontier. Four-stage construction visuals: site prep, rail segment assembly, capacitor bank integration, final launch certification.'
  },
  {
    id: 'lunar-resource-chain-board',
    file: 'lunar-resource-chain-board.png',
    fallback: null,
    prompt: 'Lunar resource chain board for Foundry Frontier. Regolith, ilmenite, and polar ice pipelines transformed into aluminum feedstock, oxygen, and superconductive components.'
  },
  {
    id: 'onboarding-flow-board',
    file: 'onboarding-flow-board.png',
    fallback: null,
    prompt: 'Onboarding flow board for Foundry Frontier showing chapter ramp from first extractor to mass-driver prep with progressive unlock cards and guided objectives.'
  }
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
    body: JSON.stringify({
      model: MODEL,
      prompt,
      n: 1,
      response_format: 'b64_json'
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API ${res.status}: ${txt}`);
  }

  const body = await res.json();
  const b64 = body?.data?.[0]?.b64_json;
  if (!b64) throw new Error('Missing b64_json in API response');

  writeFileSync(join(OUT_DIR, asset.file), Buffer.from(b64, 'base64'));
  return { status: 'generated', prompt };
}

async function main() {
  const manifest = {
    game: 'foundry-frontier',
    doc: 'foundry-frontier-design.md',
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
      item.reason = 'Set XAI_API_KEY to generate non-placeholder concept boards';
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
