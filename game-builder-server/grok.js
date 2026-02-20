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
        model: 'grok-2-image-1212',
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

module.exports = { generateConceptArt };
