#!/usr/bin/env node
/**
 * generate-previews.mjs
 *
 * Generates preview assets for each OpenArcade game:
 *   - preview.webp  — static screenshot (poster frame)
 *   - preview.mp4   — 4-second looping video clip
 *
 * Usage:
 *   node scripts/generate-previews.mjs              # all games
 *   node scripts/generate-previews.mjs tetris pong  # specific games
 *
 * Requirements: puppeteer (npm install), ffmpeg
 */

import puppeteer from 'puppeteer';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync, unlinkSync, rmSync } from 'fs';
import { join, extname, resolve } from 'path';
import { execSync } from 'child_process';

const ROOT = resolve(import.meta.dirname, '..');
const PORT = 9222;
const CONCURRENCY = 4;
const FRAME_RATE = 15;            // fps for video capture
const VIDEO_DURATION_SEC = 4;     // seconds of gameplay to record
const FRAME_DELAY_MS = Math.round(1000 / FRAME_RATE);
const TOTAL_FRAMES = FRAME_RATE * VIDEO_DURATION_SEC;
const POSTER_FRAME = Math.round(FRAME_RATE * 0.6); // take poster at 0.6s into gameplay (before quick-death games die)
const CANVAS_SCALE = 1;           // 1x = native canvas size, usually 300-480px wide

// Simple static file server
function startServer() {
  const MIME = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp',
    '.mp4': 'video/mp4', '.svg': 'image/svg+xml',
  };

  const server = createServer((req, res) => {
    let url = req.url.split('?')[0];
    if (url.endsWith('/')) url += 'index.html';

    // Handle API requests with empty responses so games don't hang
    if (url.startsWith('/api/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ total_sessions: 0, total_frames: 0, total_bytes: 0, total_duration_seconds: 0 }));
      return;
    }

    const filePath = join(ROOT, url);
    if (!existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(readFileSync(filePath));
  });

  return new Promise(r => server.listen(PORT, () => { console.log(`Server on :${PORT}`); r(server); }));
}

// Discover all game directories (has index.html with a canvas)
function discoverGames() {
  return readdirSync(ROOT)
    .filter(d => {
      if (d === 'scripts' || d === 'node_modules' || d.startsWith('.')) return false;
      const dir = join(ROOT, d);
      return statSync(dir).isDirectory() && existsSync(join(dir, 'index.html'));
    })
    .sort();
}

// Capture frames from a single game
async function captureGame(browser, gameName) {
  const gameUrl = `http://localhost:${PORT}/${gameName}/index.html`;
  const framesDir = join(ROOT, gameName, '_frames');
  const posterPath = join(ROOT, gameName, 'preview.webp');
  const videoPath = join(ROOT, gameName, 'preview.mp4');

  // Skip if previews already exist (use --force to regenerate)
  if (existsSync(posterPath) && existsSync(videoPath) && !process.argv.includes('--force')) {
    console.log(`  [skip] ${gameName} — previews exist`);
    return { game: gameName, status: 'skipped' };
  }

  let page;
  try {
    page = await browser.newPage();

    // Block recorder.js from loading (we don't need it and it makes network requests)
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (req.url().includes('recorder.js') || req.url().includes('/api/ingest')) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Navigate to game
    await page.goto(gameUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Wait for canvas to appear
    await page.waitForSelector('canvas#game', { timeout: 5000 }).catch(() => {
      // Some games might use a different canvas selector
      return page.waitForSelector('canvas', { timeout: 3000 });
    });

    // Get canvas dimensions to set viewport
    const canvasSize = await page.evaluate(() => {
      const c = document.querySelector('canvas#game') || document.querySelector('canvas');
      return c ? { width: c.width, height: c.height } : { width: 480, height: 600 };
    });

    // Set viewport to canvas size (we'll screenshot just the canvas)
    await page.setViewport({
      width: Math.max(canvasSize.width + 40, 320),
      height: Math.max(canvasSize.height + 40, 400),
      deviceScaleFactor: CANVAS_SCALE,
    });

    // Wait a moment for initial render
    await sleep(500);

    // Start the game — press Space (works for most games)
    await page.keyboard.press('Space');
    await sleep(200);
    // Also try arrow keys for games that need them (snake, 2048)
    await page.keyboard.press('ArrowRight');
    await sleep(200);

    // Prepare frames directory
    if (existsSync(framesDir)) rmSync(framesDir, { recursive: true });
    mkdirSync(framesDir, { recursive: true });

    // Capture frames
    console.log(`  [capture] ${gameName} — ${TOTAL_FRAMES} frames @ ${FRAME_RATE}fps...`);

    // Send periodic keypresses during capture to keep game active
    // Games that need continuous input — {keys, interval in frames}
    const keypressGames = {
      'flappy': { keys: ['Space'], every: 5 },           // flap every ~0.33s
      'helicopter': { keys: ['Space'], every: 4 },        // hold-style
      'dino': { keys: ['Space'], every: 12 },
      'canabalt': { keys: ['Space'], every: 10 },
      'doodle-jump': { keys: ['ArrowLeft', 'ArrowRight'], every: 8 },
      'geometry-dash': { keys: ['Space'], every: 8 },
      'jetpack-joyride': { keys: ['Space'], every: 6 },
      'temple-run': { keys: ['ArrowUp'], every: 10 },
    };
    const keypressConfig = keypressGames[gameName];
    const keysToPress = keypressConfig ? keypressConfig.keys : [];
    const keyInterval = keypressConfig ? keypressConfig.every : Math.round(FRAME_RATE * 0.8);

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const frameStart = Date.now();

      // Screenshot the canvas element directly
      const canvasEl = await page.$('canvas#game') || await page.$('canvas');
      if (canvasEl) {
        await canvasEl.screenshot({
          path: join(framesDir, `frame_${String(i).padStart(4, '0')}.webp`),
          type: 'webp',
          quality: 80,
        });
      }

      // Save poster frame
      if (i === POSTER_FRAME && canvasEl) {
        await canvasEl.screenshot({
          path: posterPath,
          type: 'webp',
          quality: 85,
        });
      }

      // Periodic keypresses to keep game moving
      if (keysToPress.length > 0 && i % keyInterval === 0) {
        for (const k of keysToPress) {
          await page.keyboard.press(k);
        }
      }

      // For movement games, press arrow keys occasionally
      if (['snake', 'pac-man', 'ms-pacman', 'frogger', 'bomberman', 'tron',
           'crossy-road', 'dig-dug', 'qbert', 'amidar', 'sokoban',
           'lode-runner', 'boulder-dash', 'rally-x', 'mr-do'].includes(gameName)) {
        if (i % 10 === 0) {
          const dirs = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
          await page.keyboard.press(dirs[Math.floor(Math.random() * dirs.length)]);
        }
      }

      // For shooters, fire occasionally
      if (['space-invaders', 'galaga', 'galaxian', 'centipede', 'phoenix',
           '1942', 'xevious', 'raiden', 'gradius', 'r-type', 'defender',
           'robotron', 'moon-patrol', 'tempest', 'sinistar'].includes(gameName)) {
        if (i % 5 === 0) {
          await page.keyboard.press('Space');
          const dirs = ['ArrowLeft', 'ArrowRight'];
          await page.keyboard.press(dirs[Math.floor(Math.random() * dirs.length)]);
        }
      }

      // Maintain frame rate
      const elapsed = Date.now() - frameStart;
      if (elapsed < FRAME_DELAY_MS) {
        await sleep(FRAME_DELAY_MS - elapsed);
      }
    }

    // If poster wasn't captured (game too short), grab last frame
    if (!existsSync(posterPath)) {
      const canvasEl = await page.$('canvas#game') || await page.$('canvas');
      if (canvasEl) {
        await canvasEl.screenshot({ path: posterPath, type: 'webp', quality: 85 });
      }
    }

    // Assemble video with ffmpeg
    console.log(`  [encode] ${gameName} — assembling MP4...`);
    try {
      execSync(
        `ffmpeg -y -framerate ${FRAME_RATE} -i "${framesDir}/frame_%04d.webp" ` +
        `-c:v libx264 -preset fast -crf 28 -pix_fmt yuv420p ` +
        `-vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ` +
        `-movflags +faststart -an "${videoPath}" 2>/dev/null`,
        { timeout: 30000 }
      );
    } catch (e) {
      console.error(`  [error] ${gameName} — ffmpeg failed: ${e.message}`);
      return { game: gameName, status: 'error', error: 'ffmpeg failed' };
    }

    // Clean up frames
    rmSync(framesDir, { recursive: true });

    // Report sizes
    const posterSize = statSync(posterPath).size;
    const videoSize = statSync(videoPath).size;
    console.log(`  [done] ${gameName} — poster: ${(posterSize / 1024).toFixed(0)}KB, video: ${(videoSize / 1024).toFixed(0)}KB`);

    return { game: gameName, status: 'ok', posterKB: Math.round(posterSize / 1024), videoKB: Math.round(videoSize / 1024) };
  } catch (e) {
    console.error(`  [error] ${gameName} — ${e.message}`);
    // Clean up frames dir if it exists
    if (existsSync(framesDir)) rmSync(framesDir, { recursive: true });
    return { game: gameName, status: 'error', error: e.message };
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Process games with limited concurrency
async function processGames(browser, games) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < games.length) {
      const game = games[idx++];
      const result = await captureGame(browser, game);
      results.push(result);
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, games.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// Main
async function main() {
  // Determine which games to process
  const cliGames = process.argv.slice(2).filter(a => !a.startsWith('-'));
  const allGames = discoverGames();
  const games = cliGames.length > 0
    ? cliGames.filter(g => allGames.includes(g))
    : allGames;

  if (games.length === 0) {
    console.error('No valid games found. Available:', allGames.join(', '));
    process.exit(1);
  }

  console.log(`Generating previews for ${games.length} games...\n`);

  const server = await startServer();
  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 60000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const results = await processGames(browser, games);

    // Summary
    console.log('\n=== Summary ===');
    const ok = results.filter(r => r.status === 'ok');
    const skipped = results.filter(r => r.status === 'skipped');
    const errors = results.filter(r => r.status === 'error');

    console.log(`OK: ${ok.length}, Skipped: ${skipped.length}, Errors: ${errors.length}`);

    if (ok.length > 0) {
      const totalPoster = ok.reduce((s, r) => s + r.posterKB, 0);
      const totalVideo = ok.reduce((s, r) => s + r.videoKB, 0);
      console.log(`Total poster size: ${totalPoster}KB (avg ${Math.round(totalPoster / ok.length)}KB)`);
      console.log(`Total video size: ${totalVideo}KB (avg ${Math.round(totalVideo / ok.length)}KB)`);
    }

    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(e => console.log(`  ${e.game}: ${e.error}`));
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
