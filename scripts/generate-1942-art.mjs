#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(THIS_DIR, '..');
const OUT_DIR = join(ROOT, '1942', 'design', 'assets', 'highfi');

mkdirSync(OUT_DIR, { recursive: true });

const API_URL = 'https://api.x.ai/v1/images/generations';
const MODEL = process.env.XAI_IMAGE_MODEL || 'grok-imagine-image';
const ASSET_LIMIT = Number(process.env.XAI_ASSET_LIMIT || 0);

const STYLE_GUIDE = [
  'high-fidelity pixel art vertical scrolling shooter frame',
  'top-down or near-top-down gameplay perspective only',
  'single-player HUD with score, lives, bombs, wave in top bar',
  'strong silhouette readability for player, enemies, bullets, pickups',
  'crisp pixel clusters, no blur, no painterly filtering',
  'arcade-final quality, not concept wireframe'
].join(', ');

const NEGATIVE_STYLE = [
  'no side-view ships or side-view planes',
  'no horizontal shooter layout',
  'no split-screen or two-player duplicated HUD',
  'no seagulls',
  'no campaign-board title text in active combat screenshots'
].join(', ');

const COMMON_CONSTRAINTS = {
  perspective: 'top_down_or_near_top_down_only',
  flow: 'vertical_scrolling_shooter',
  hud: 'single_player_top_bar',
  ambience: 'whales_ambient_non_interactive_only',
  remove: ['seagulls', 'dual_player_hud', 'side_view_units']
};

const CAMPAIGNS = [
  {
    id: 'c1',
    name: 'NOT-Coral Front',
    slug: 'coral',
    theme: 'turquoise ocean, reefs, islands, whale surfacing loops, clean lanes'
  },
  {
    id: 'c2',
    name: 'NOT-Jungle Spear',
    slug: 'jungle',
    theme: 'river channels, canopy gaps, anti-air outposts, high-contrast projectile lanes'
  },
  {
    id: 'c3',
    name: 'NOT-Dust Convoy',
    slug: 'dust',
    theme: 'desert dunes, convoy roads, armored columns, heat contrast readability'
  },
  {
    id: 'c4',
    name: 'NOT-Iron Monsoon',
    slug: 'monsoon',
    theme: 'storm rain sheets, submarine wakes, lightning accents, visibility-safe bullet color'
  }
];

function waveStage(wave) {
  if ([5, 10, 15].includes(wave)) return 'mini_boss';
  if (wave === 20) return 'final_boss';
  if (wave <= 4) return 'onboarding';
  if (wave <= 9) return 'mixed_pressure';
  if (wave <= 14) return 'terrain_pressure';
  return 'high_density';
}

function wavePrompt(campaign, wave) {
  const stage = waveStage(wave);
  const stageNotes = {
    onboarding: 'introduce enemy family and clear readable lanes',
    mixed_pressure: 'mix two enemy families with crossing fire lines',
    terrain_pressure: 'increase pressure while terrain stays readable',
    high_density: 'dense projectile patterns with readable dodge routes',
    mini_boss: 'single mini boss plus escort units and dramatic but readable fire pattern',
    final_boss: 'screen-dominant multi-section final boss with phase pressure and weak-point cues'
  };
  return `Wave preview frame for ${campaign.name}, wave ${wave}/20. ${campaign.theme}. ${stageNotes[stage]}. Ensure downward enemy pressure and player lane at lower screen.`;
}

function buildAssets() {
  const campaignBoards = CAMPAIGNS.map((campaign) => ({
    id: `campaign-${campaign.slug}`,
    file: `campaign-${campaign.slug}.png`,
    assetType: 'campaign',
    campaignId: campaign.id,
    prompt: `Campaign overview board for ${campaign.name}. ${campaign.theme}. Show vertical shooter battlefield language and top-bar HUD readability.`
  }));

  const waveBoards = [];
  for (const campaign of CAMPAIGNS) {
    for (let wave = 1; wave <= 20; wave += 1) {
      waveBoards.push({
        id: `wave-${campaign.id}-w${String(wave).padStart(2, '0')}`,
        file: `wave-${campaign.id}-w${String(wave).padStart(2, '0')}.png`,
        assetType: 'wave',
        campaignId: campaign.id,
        waveNumber: wave,
        stage: waveStage(wave),
        prompt: wavePrompt(campaign, wave)
      });
    }
  }

  const spriteAndBehaviorBoards = [
    {
      id: 'planes-sheet',
      file: 'planes-sheet.png',
      assetType: 'sprite_board',
      prompt: 'Plane roster board focused on XP-59 Specter and B7 Atlas only, both in top-down combat-ready orientation, with callouts for special moves and hitbox readability.'
    },
    {
      id: 'player-roll-sprite-sheet',
      file: 'player-roll-sprite-sheet.png',
      assetType: 'sprite_sheet',
      prompt: 'Animation-ready sprite sheet for barrel-roll dodge frames for Specter and Atlas. Include 6-frame roll progression each, consistent pixel scale, clean atlas layout, top-down fighter orientation.',
      extraction: { layout: 'grid', columns: 6, rows: 2 }
    },
    {
      id: 'enemy-sheet',
      file: 'enemy-sheet.png',
      assetType: 'compendium',
      prompt: 'Enemy compendium board with overhead/top-down enemies only: scout, raider, gunship, bomber, submarine, and mini-boss archetypes. Include movement arrows and projectile-family callouts.'
    },
    {
      id: 'enemy-sprite-sheet',
      file: 'enemy-sprite-sheet.png',
      assetType: 'sprite_sheet',
      prompt: 'Production sprite atlas with top-down enemy frames and attack states. Include small, medium, large enemy classes with 4 frames each and projectile muzzle frame.',
      extraction: { layout: 'grid', columns: 8, rows: 4 }
    },
    {
      id: 'boss-sprite-sheet',
      file: 'boss-sprite-sheet.png',
      assetType: 'sprite_sheet',
      prompt: 'Large boss sprite atlas, top-down perspective, multi-section weak points, phase variants, and scale that occupies major screen space like classic bullet-hell bosses.',
      extraction: { layout: 'grid', columns: 4, rows: 2 }
    },
    {
      id: 'terrain-wildlife-board',
      file: 'terrain-wildlife-board.png',
      assetType: 'behavior',
      prompt: 'Terrain and ambience board showing non-interactive wildlife only. Whale surfacing/disappearing loop examples, no seagulls, plus terrain readability overlays for all campaigns.'
    },
    {
      id: 'powerup-sheet',
      file: 'powerup-sheet.png',
      assetType: 'sprite_board',
      prompt: 'Power-up board with same pickup silhouette shape for all drops. Show progressive shot upgrade tiers (single, double, triple), speed boost, shield (non-stack), repair (non-stack), bomb pack (stack), passive turret pickup.'
    },
    {
      id: 'dialogue-comic-bubbles',
      file: 'dialogue-comic-bubbles.png',
      assetType: 'behavior',
      prompt: 'High-contrast comic dialogue panels for mission intro, mini-boss alert, final-boss alert, and campaign-clear debrief. Heavy black-and-white styling with minimal accent color.'
    },
    {
      id: 'hud-shot',
      file: 'hud-shot.png',
      assetType: 'hud',
      prompt: 'Single-player in-game combat shot with top HUD only, vertical scrolling direction, large enemy presence, and readable projectile density.'
    },
    {
      id: 'enemy-patterns-board',
      file: 'enemy-patterns-board.png',
      assetType: 'behavior',
      prompt: 'Enemy movement and fire-pattern board: direct burst, cone spread, tracking drift, lane denial mine trail, and crossfire pincer patterns with top-down units.'
    },
    {
      id: 'boss-phase-board',
      file: 'boss-phase-board.png',
      assetType: 'behavior',
      prompt: 'Boss phase behavior board with four escalating phases and destructible sections, including projectile examples and phase transition cues in vertical-shooter framing.'
    },
    {
      id: 'whale-ambient-strip',
      file: 'whale-ambient-strip.png',
      assetType: 'sprite_sheet',
      prompt: 'Ambient whale 6-frame loop strip: surface, breathe, dive. Non-interactive background element. Pixel-art sprite strip on clean atlas background.',
      extraction: { layout: 'grid', columns: 6, rows: 1 }
    }
  ];

  return [...campaignBoards, ...waveBoards, ...spriteAndBehaviorBoards];
}

function buildPrompt(asset) {
  return `${STYLE_GUIDE}. Hard constraints: top-down gameplay read, vertical enemy flow, single-player top HUD, bosses much larger than normal enemies. Negative constraints: ${NEGATIVE_STYLE}. ${asset.prompt}`;
}

function hashPrompt(prompt) {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 16);
}

async function generateOne(asset, apiKey) {
  const prompt = buildPrompt(asset);
  const sourcePromptHash = hashPrompt(prompt);

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

  writeFileSync(join(OUT_DIR, asset.file), Buffer.from(b64, 'base64'));

  return {
    id: asset.id,
    file: asset.file,
    assetType: asset.assetType,
    campaignId: asset.campaignId || null,
    waveNumber: asset.waveNumber || null,
    stage: asset.stage || null,
    prompt,
    sourcePromptHash,
    constraints: COMMON_CONSTRAINTS,
    extraction: asset.extraction || null,
    model: MODEL,
    status: 'generated'
  };
}

function skippedRecord(asset, status, prompt) {
  return {
    id: asset.id,
    file: asset.file,
    assetType: asset.assetType,
    campaignId: asset.campaignId || null,
    waveNumber: asset.waveNumber || null,
    stage: asset.stage || null,
    prompt,
    sourcePromptHash: hashPrompt(prompt),
    constraints: COMMON_CONSTRAINTS,
    extraction: asset.extraction || null,
    model: MODEL,
    status
  };
}

async function main() {
  const apiKey = process.env.XAI_API_KEY;
  const allAssets = buildAssets();
  const assets = ASSET_LIMIT > 0 ? allAssets.slice(0, ASSET_LIMIT) : allAssets;

  const manifest = {
    version: 2,
    generatedAt: new Date().toISOString(),
    model: MODEL,
    api: 'xAI Images API',
    outputDir: '1942/design/assets/highfi',
    styleGuide: STYLE_GUIDE,
    constraints: COMMON_CONSTRAINTS,
    negativeStyle: NEGATIVE_STYLE,
    assetCount: assets.length,
    assets: []
  };

  if (!apiKey) {
    for (const asset of assets) {
      const prompt = buildPrompt(asset);
      manifest.assets.push(skippedRecord(asset, 'skipped_missing_xai_api_key', prompt));
    }
    writeFileSync(join(OUT_DIR, 'art-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log('XAI_API_KEY not set. Wrote prompt manifest only at 1942/design/assets/highfi/art-manifest.json');
    console.log('Set XAI_API_KEY and rerun: npm run design:1942:art');
    return;
  }

  for (const asset of assets) {
    process.stdout.write(`generating ${asset.file}... `);
    const prompt = buildPrompt(asset);
    try {
      const result = await generateOne(asset, apiKey);
      manifest.assets.push(result);
      process.stdout.write('ok\n');
    } catch (error) {
      manifest.assets.push({
        ...skippedRecord(asset, 'error', prompt),
        error: String(error.message || error)
      });
      process.stdout.write(`failed (${error.message})\n`);
    }
  }

  writeFileSync(join(OUT_DIR, 'art-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log('wrote 1942/design/assets/highfi/art-manifest.json');
}

await main();
