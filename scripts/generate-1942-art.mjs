#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(THIS_DIR, '..');
const OUT_DIR = join(ROOT, '1942', 'design', 'assets', 'highfi');

mkdirSync(OUT_DIR, { recursive: true });

const API_URL = 'https://api.x.ai/v1/images/generations';
const MODEL = process.env.XAI_IMAGE_MODEL || 'grok-imagine-image';

const STYLE_GUIDE = [
  'WWII-inspired top-down arcade shooter screenshot concept',
  'authentic pixel-art sprite craft, crisp clusters, no blurry gradients',
  'high-fidelity pixel shading with clear silhouettes and readable HUD',
  'arcade cabinet energy with score, lives, bombs, and wave indicators',
  'rich but readable color script, bullets and hazards clearly legible',
  'game-ready composition, final-product feel, not wireframe blocks'
].join(', ');

const ASSETS = [
  {
    id: 'campaign-coral',
    file: 'campaign-coral.png',
    prompt: 'Campaign board for NOT-Coral Front: turquoise ocean, reef channels, islands, whales and gulls, enemy lanes and bullet readability tests, boss lane at top, player lane at bottom.'
  },
  {
    id: 'campaign-jungle',
    file: 'campaign-jungle.png',
    prompt: 'Campaign board for NOT-Jungle Spear: dense green canopy, river cuts, birds, ambush lanes, anti-air emplacements, high-contrast projectile readability over foliage.'
  },
  {
    id: 'campaign-dust',
    file: 'campaign-dust.png',
    prompt: 'Campaign board for NOT-Dust Convoy: dunes, convoy roads, dust devils, armored columns, warm terrain with cool projectile contrast and visible route hazards.'
  },
  {
    id: 'campaign-monsoon',
    file: 'campaign-monsoon.png',
    prompt: 'Campaign board for NOT-Iron Monsoon: storm clouds, rain bands, lightning flashes, submarine wakes, high-pressure visibility management with clear enemy bullets.'
  },
  {
    id: 'planes-sheet',
    file: 'planes-sheet.png',
    prompt: 'Plane roster showcase with four distinct player planes (P-38 Falcon, F4U Lancer, XP-59 Specter, B7 Atlas), each labeled with special ability, plus three-frame barrel-roll dodge sequence and i-frame callout.'
  },
  {
    id: 'player-roll-sprite-sheet',
    file: 'player-roll-sprite-sheet.png',
    prompt: 'Sprite sheet for player barrel-roll dodge animation: three to five directional frames, clean transparent-like background style, game-production pixel art, sheet layout for runtime slicing.'
  },
  {
    id: 'enemy-sheet',
    file: 'enemy-sheet.png',
    prompt: 'Enemy compendium board with multiple enemy sizes and families: scout, torpedo bomber, raider, gunship, submarine, each with visual identity and attack archetype tags.'
  },
  {
    id: 'enemy-sprite-sheet',
    file: 'enemy-sprite-sheet.png',
    prompt: 'Enemy sprite sheet with per-enemy 3+ animation frames and attack-state variants, organized in rows with label strips, production-ready pixel-art style.'
  },
  {
    id: 'boss-sprite-sheet',
    file: 'boss-sprite-sheet.png',
    prompt: 'Boss sprite sheet showing large multi-section bosses with destructible components and phase variants, clearly larger than standard enemies.'
  },
  {
    id: 'terrain-wildlife-board',
    file: 'terrain-wildlife-board.png',
    prompt: 'Terrain and wildlife showcase: reefs, islands, jungle canopy, dunes, storms, whales, birds, fish, with readability overlays demonstrating player/enemy contrast.'
  },
  {
    id: 'powerup-sheet',
    file: 'powerup-sheet.png',
    prompt: 'Power-up board with in-game item visuals for Double Shot, Speed Boost, Shield, Repair, Bomb Pack; each shown as pickup icon and HUD icon, not abstract rectangles.'
  },
  {
    id: 'dialogue-comic-bubbles',
    file: 'dialogue-comic-bubbles.png',
    prompt: 'Comic-book style high-contrast black-and-white dialogue panel set for mission intro, mini-boss alert, final boss warning, campaign clear debrief.'
  },
  {
    id: 'hud-shot',
    file: 'hud-shot.png',
    prompt: 'In-game combat screenshot mock with full HUD: score, lives, bombs, wave, special meter, bullet-heavy action, mini-boss presence, polished arcade screen feel.'
  }
];

function buildPrompt(assetPrompt) {
  return `${STYLE_GUIDE}. ${assetPrompt}`;
}

async function generateOne(asset, apiKey) {
  const prompt = buildPrompt(asset.prompt);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      n: 1,
      response_format: 'b64_json'
    })
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`API ${response.status}: ${txt}`);
  }

  const data = await response.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('Missing b64_json image data in API response');
  }

  const outputPath = join(OUT_DIR, asset.file);
  writeFileSync(outputPath, Buffer.from(b64, 'base64'));

  return {
    id: asset.id,
    file: asset.file,
    prompt,
    model: MODEL,
    status: 'generated'
  };
}

async function main() {
  const apiKey = process.env.XAI_API_KEY;
  const manifest = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    api: 'xAI Images API',
    outputDir: '1942/design/assets/highfi',
    styleGuide: STYLE_GUIDE,
    assets: []
  };

  if (!apiKey) {
    for (const asset of ASSETS) {
      manifest.assets.push({
        id: asset.id,
        file: asset.file,
        prompt: buildPrompt(asset.prompt),
        model: MODEL,
        status: 'skipped_missing_xai_api_key'
      });
    }
    writeFileSync(join(OUT_DIR, 'art-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log('XAI_API_KEY not set. Wrote prompt manifest only at 1942/design/assets/highfi/art-manifest.json');
    console.log('Set XAI_API_KEY and rerun: npm run design:1942:art');
    return;
  }

  for (const asset of ASSETS) {
    process.stdout.write(`generating ${asset.file}... `);
    try {
      const result = await generateOne(asset, apiKey);
      manifest.assets.push(result);
      process.stdout.write('ok\n');
    } catch (error) {
      manifest.assets.push({
        id: asset.id,
        file: asset.file,
        prompt: buildPrompt(asset.prompt),
        model: MODEL,
        status: 'error',
        error: String(error.message || error)
      });
      process.stdout.write(`failed (${error.message})\n`);
    }
  }

  writeFileSync(join(OUT_DIR, 'art-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log('wrote 1942/design/assets/highfi/art-manifest.json');
}

await main();
