'use strict';

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const fs = require('fs');
const path = require('path');

const GROK_API_URL = 'https://api.x.ai/v1/images/generations';

/**
 * Generate concept art images using Grok image API.
 * @param {string} prompt - the image generation prompt
 * @param {string} outputDir - directory to save images
 * @param {number} count - number of images to generate (default 3)
 * @returns {Promise<string[]>} array of saved file paths (relative to OPENARCADE_REPO_PATH)
 */
async function generateConceptArt(prompt, outputDir, count = 3) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY not set');

  fs.mkdirSync(outputDir, { recursive: true });

  const results = [];

  // Generate images sequentially to avoid rate limits
  for (let i = 0; i < count; i++) {
    const variantPrompt = buildVariantPrompt(prompt, i);

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-imagine-image',
        prompt: variantPrompt,
        n: 1,
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Grok API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error(`No image data in Grok response (variant ${i + 1})`);

    const filename = `concept-art-${i + 1}.png`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, Buffer.from(b64, 'base64'));

    // Return path relative to repo root
    const repoPath = process.env.OPENARCADE_REPO_PATH || '/ssd/openarcade';
    const relPath = filepath.replace(repoPath, '').replace(/^\//, '');
    results.push('/' + relPath);
  }

  return results;
}

/**
 * Build variant prompts for diversity across 3 concept art images.
 */
function buildVariantPrompt(basePrompt, index) {
  const variants = [
    `Wide establishing shot of a ${basePrompt} — focus on the overall game world and environment. Game UI overlay visible. Detailed digital art.`,
    `Action scene from a ${basePrompt} — player character in motion, primary challenge/enemy visible. Dynamic composition, dramatic lighting.`,
    `Character and UI detail sheet from a ${basePrompt} — close-up of the player sprite, enemy sprites, health bar, score display. Clean game art style.`,
  ];
  return variants[index] || basePrompt;
}

/**
 * Generate a single quick preview image from the current game.md spec.
 * @param {string} prompt - image generation prompt built from design state
 * @param {string} outputDir - directory to save the image
 * @returns {Promise<string>} saved file path (relative to OPENARCADE_REPO_PATH)
 */
async function generateQuickPreview(prompt, outputDir) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY not set');

  fs.mkdirSync(outputDir, { recursive: true });

  const response = await fetch(GROK_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-2-image',
      prompt: `Game screenshot mockup: ${prompt}. Digital pixel art style, UI elements visible, vibrant colors.`,
      n: 1,
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Grok API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image data in Grok response');

  const filename = `early-preview-${Date.now()}.png`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, Buffer.from(b64, 'base64'));

  const repoPath = process.env.OPENARCADE_REPO_PATH || '/ssd/openarcade';
  return '/' + filepath.replace(repoPath, '').replace(/^\//, '');
}

/**
 * Generate game art during parallel generation (non-blocking).
 * Produces 1-2 images: a game screenshot mockup and optionally a character sheet.
 * @param {string} gameMd - game.md spec content
 * @param {string} outputDir - directory to save images
 * @returns {Promise<string[]>} array of saved file paths (relative to repo)
 */
async function generateGameArt(gameMd, outputDir) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return []; // Silently skip if no API key

  fs.mkdirSync(outputDir, { recursive: true });

  // Build a concise prompt from game.md
  const lines = gameMd.split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2)).join(', ');
  const titleMatch = /^# Game:\s*(.+)/m.exec(gameMd);
  const title = titleMatch ? titleMatch[1].trim() : 'game';
  const prompt = `${title}: ${lines}`.slice(0, 500);

  const results = [];

  try {
    // Generate one screenshot mockup
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-2-image',
        prompt: `Game screenshot mockup: ${prompt}. Pixel art style, vibrant colors, HUD visible, gameplay action scene.`,
        n: 1,
        response_format: 'b64_json',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const b64 = data.data?.[0]?.b64_json;
      if (b64) {
        const filepath = path.join(outputDir, 'game-art-1.png');
        fs.writeFileSync(filepath, Buffer.from(b64, 'base64'));
        const repoPath = process.env.OPENARCADE_REPO_PATH || '/ssd/openarcade';
        results.push('/' + filepath.replace(repoPath, '').replace(/^\//, ''));
      }
    }
  } catch (e) {
    console.warn('Game art generation failed (non-fatal):', e.message);
  }

  return results;
}

/**
 * Generate an image for a knowledge base entry.
 * @param {string} prompt - image generation prompt
 * @param {string} outputPath - full path to save the image
 * @returns {Promise<boolean>} success
 */
async function generateKnowledgeImage(prompt, outputPath) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY not set');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const response = await fetch(GROK_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-2-image',
      prompt: `Game reference image: ${prompt}. Clean digital art style, game UI elements visible.`,
      n: 1,
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Grok API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image data in Grok response');

  fs.writeFileSync(outputPath, Buffer.from(b64, 'base64'));
  return true;
}

module.exports = { generateConceptArt, generateQuickPreview, generateGameArt, generateKnowledgeImage };
