#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(THIS_DIR, '..');
const OUT_DIR = join(ROOT, 'breach-protocol', 'design', 'assets');
const MANIFEST_PATH = join(OUT_DIR, 'art-manifest.json');

mkdirSync(OUT_DIR, { recursive: true });

const API_URL = 'https://api.x.ai/v1/images/generations';
const MODEL = process.env.XAI_IMAGE_MODEL || 'grok-imagine-image';
const API_KEY = process.env.XAI_API_KEY || '';

const STYLE_GUIDE = [
  'high-fidelity tactical FPS concept board',
  'competitive readability with strong silhouettes and map callouts',
  'clear HUD and spectator overlays',
  'production-ready game concept art'
].join(', ');

const ASSETS = [
  { id: 'visual-moodboard', file: 'visual-moodboard.png', fallback: 'visual-moodboard.svg', prompt: 'Breach Protocol visual moodboard showing near-future tactical FPS tone, high-clarity team silhouettes, and objective-focused combat staging.' },
  { id: 'weapon-lineup-board', file: 'weapon-lineup-board.png', fallback: null, prompt: 'Weapon lineup board for Breach Protocol showing 12 guns grouped by class with silhouette, role, and recoil identity cues.' },
  { id: 'class-silhouette-board', file: 'class-silhouette-board.png', fallback: null, prompt: 'Class silhouette board with four classes: Anchor, Entry, Controller, Scout. Distinct gear profiles and utility identity.' },
  { id: 'map-helios-yard-board', file: 'map-helios-yard-board.png', fallback: null, prompt: 'Map board for Helios Yard: industrial rail yard tactical map with callouts, two objective sites, and lane flow arrows.' },
  { id: 'map-cathedral-arc-board', file: 'map-cathedral-arc-board.png', fallback: null, prompt: 'Map board for Cathedral Arc: tight tactical interior with vertical nave routes, callouts, and execute paths.' },
  { id: 'map-severance-port-board', file: 'map-severance-port-board.png', fallback: null, prompt: 'Map board for Severance Port: long sightlines, port infrastructure, anchor positions, and rotation risks clearly labeled.' },
  { id: 'hud-spectator-board', file: 'hud-spectator-board.png', fallback: 'hud-spectator-board.svg', prompt: 'HUD and spectator board for Breach Protocol with readable economy, objective timers, and replay timeline overlays.' },
  { id: 'clipping-share-board', file: 'clipping-share-board.png', fallback: null, prompt: 'Clipping and share UX board showing instant clip capture, timeline trim, social card preview, and share link flow.' },
  { id: 'screen-flow-board', file: 'screen-flow-board.png', fallback: null, prompt: 'Screen flow board for Breach Protocol showing matchmaking, loadout, in-round HUD, scoreboard, replay, and share screens.' }
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
    game: 'breach-protocol',
    doc: 'breach-protocol-design.md',
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
