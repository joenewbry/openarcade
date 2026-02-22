#!/usr/bin/env node
'use strict';

/**
 * Batch image generation for the knowledge base.
 * Generates reference images for genre guides and top visual-design games.
 *
 * Usage: node scripts/generate-kb-images.js [--dry-run] [--genres-only] [--games-only]
 *
 * Requires XAI_API_KEY environment variable.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const { generateKnowledgeImage } = require('../grok');

const REPO_PATH = process.env.OPENARCADE_REPO_PATH || '/ssd/openarcade';
const GAME_TYPES_PATH = path.join(REPO_PATH, 'game-types');
const VISUAL_DESIGN_PATH = path.join(REPO_PATH, 'visual-design');
const MANIFEST_PATH = path.join(__dirname, '..', 'kb-image-manifest.json');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const GENRES_ONLY = args.includes('--genres-only');
const GAMES_ONLY = args.includes('--games-only');

// Delay between API calls (ms) to avoid rate limits
const DELAY = 3000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateGenreImages() {
  console.log('\n=== Generating Genre Guide Images ===\n');

  const imagesDir = path.join(GAME_TYPES_PATH, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });

  // Find all genre files (not stubs)
  const files = fs.readdirSync(GAME_TYPES_PATH)
    .filter(f => f.endsWith('.md') && !f.startsWith('_'));

  const results = [];

  for (const file of files) {
    const slug = file.replace('.md', '');
    const outputPath = path.join(imagesDir, `${slug}-reference.png`);

    // Skip if already exists
    if (fs.existsSync(outputPath)) {
      console.log(`  [skip] ${slug} — image already exists`);
      results.push({ slug, path: `game-types/images/${slug}-reference.png`, status: 'exists' });
      continue;
    }

    // Read genre file to build a prompt
    const content = fs.readFileSync(path.join(GAME_TYPES_PATH, file), 'utf8');
    const status = /\*\*Status\*\*:\s*(\w+)/.exec(content)?.[1] || 'unknown';
    if (status === 'stub') {
      console.log(`  [skip] ${slug} — stub genre`);
      continue;
    }

    // Extract genre name and key characteristics
    const nameMatch = /^#\s*Genre:\s*(.+)/m.exec(content);
    const name = nameMatch ? nameMatch[1].trim() : slug;

    // Find key mechanics or description
    const identityMatch = /## Identity[\s\S]*?(?=\n##|$)/.exec(content);
    const identity = identityMatch ? identityMatch[0].slice(0, 200) : '';

    const prompt = `Reference image for ${name} genre game. ${identity.replace(/[#*\n]/g, ' ').trim()}. Retro pixel art style, game screenshot mockup with UI elements, vibrant colors.`;

    console.log(`  [gen] ${slug}: "${prompt.slice(0, 80)}..."`);

    if (!DRY_RUN) {
      try {
        await generateKnowledgeImage(prompt, outputPath);
        results.push({ slug, path: `game-types/images/${slug}-reference.png`, status: 'generated' });
        console.log(`    -> saved`);
        await sleep(DELAY);
      } catch (e) {
        console.error(`    -> FAILED: ${e.message}`);
        results.push({ slug, status: 'failed', error: e.message });
      }
    } else {
      results.push({ slug, path: `game-types/images/${slug}-reference.png`, status: 'dry-run' });
    }
  }

  return results;
}

async function generateGameImages() {
  console.log('\n=== Generating Visual Design Game Images ===\n');

  if (!fs.existsSync(VISUAL_DESIGN_PATH)) {
    console.log('  Visual design directory not found, skipping');
    return [];
  }

  const imagesDir = path.join(VISUAL_DESIGN_PATH, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });

  // Find all visual design files, sort by size (larger = more detailed = more referenced)
  const files = fs.readdirSync(VISUAL_DESIGN_PATH)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      name: f,
      slug: f.replace('.md', ''),
      size: fs.statSync(path.join(VISUAL_DESIGN_PATH, f)).size,
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 30); // Top 30 most detailed

  const results = [];

  for (const file of files) {
    const outputPath = path.join(imagesDir, `${file.slug}-mockup.png`);

    // Skip if already exists
    if (fs.existsSync(outputPath)) {
      console.log(`  [skip] ${file.slug} — image already exists`);
      results.push({ slug: file.slug, path: `visual-design/images/${file.slug}-mockup.png`, status: 'exists' });
      continue;
    }

    // Read file to build prompt
    const content = fs.readFileSync(path.join(VISUAL_DESIGN_PATH, file.name), 'utf8');
    const titleMatch = /^#\s*(.+)/m.exec(content);
    const title = titleMatch ? titleMatch[1].trim() : file.slug;

    // Extract visual keywords
    const colorMatch = content.match(/#[0-9a-fA-F]{3,8}/g);
    const colors = colorMatch ? colorMatch.slice(0, 5).join(', ') : '';

    const prompt = `Game screenshot mockup of ${title}. ${colors ? `Color palette: ${colors}.` : ''} Retro pixel art game, gameplay action scene, HUD overlay visible.`;

    console.log(`  [gen] ${file.slug}: "${prompt.slice(0, 80)}..."`);

    if (!DRY_RUN) {
      try {
        await generateKnowledgeImage(prompt, outputPath);
        results.push({ slug: file.slug, path: `visual-design/images/${file.slug}-mockup.png`, status: 'generated' });
        console.log(`    -> saved`);
        await sleep(DELAY);
      } catch (e) {
        console.error(`    -> FAILED: ${e.message}`);
        results.push({ slug: file.slug, status: 'failed', error: e.message });
      }
    } else {
      results.push({ slug: file.slug, path: `visual-design/images/${file.slug}-mockup.png`, status: 'dry-run' });
    }
  }

  return results;
}

async function main() {
  console.log('OpenArcade Knowledge Base Image Generator');
  console.log(`Repo: ${REPO_PATH}`);
  if (DRY_RUN) console.log('*** DRY RUN — no images will be generated ***');
  if (!process.env.XAI_API_KEY && !DRY_RUN) {
    console.error('ERROR: XAI_API_KEY not set');
    process.exit(1);
  }

  const manifest = { generated: new Date().toISOString(), genres: [], games: [] };

  if (!GAMES_ONLY) {
    manifest.genres = await generateGenreImages();
  }

  if (!GENRES_ONLY) {
    manifest.games = await generateGameImages();
  }

  // Write manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\nManifest written to: ${MANIFEST_PATH}`);

  const genCount = [...manifest.genres, ...manifest.games].filter(r => r.status === 'generated').length;
  const skipCount = [...manifest.genres, ...manifest.games].filter(r => r.status === 'exists').length;
  const failCount = [...manifest.genres, ...manifest.games].filter(r => r.status === 'failed').length;

  console.log(`\nSummary: ${genCount} generated, ${skipCount} skipped (existing), ${failCount} failed`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
