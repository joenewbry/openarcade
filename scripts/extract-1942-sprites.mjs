#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Jimp } from 'jimp';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(THIS_DIR, '..');
const HIGHFI_DIR = join(ROOT, '1942', 'design', 'assets', 'highfi');
const OUT_DIR = join(HIGHFI_DIR, 'extracted');
const MANIFEST_PATH = join(HIGHFI_DIR, 'art-manifest.json');

mkdirSync(OUT_DIR, { recursive: true });

const SHEETS = [
  {
    id: 'player-roll-sprite-sheet',
    file: 'player-roll-sprite-sheet.png',
    columns: 6,
    rows: 2,
    animations: {
      specter_roll: [0, 1, 2, 3, 4, 5],
      atlas_roll: [6, 7, 8, 9, 10, 11]
    }
  },
  {
    id: 'enemy-sprite-sheet',
    file: 'enemy-sprite-sheet.png',
    columns: 8,
    rows: 4,
    animations: {
      scout: [0, 1, 2, 3],
      raider: [8, 9, 10, 11],
      gunship: [16, 17, 18, 19],
      bomber: [24, 25, 26, 27]
    }
  },
  {
    id: 'boss-sprite-sheet',
    file: 'boss-sprite-sheet.png',
    columns: 4,
    rows: 2,
    animations: {
      boss_phase_a: [0, 1, 2, 3],
      boss_phase_b: [4, 5, 6, 7]
    }
  },
  {
    id: 'whale-ambient-strip',
    file: 'whale-ambient-strip.png',
    columns: 6,
    rows: 1,
    animations: {
      whale_loop: [0, 1, 2, 3, 4, 5]
    }
  }
];

async function extractSheet(sheet) {
  const sourcePath = join(HIGHFI_DIR, sheet.file);
  if (!existsSync(sourcePath)) {
    return { id: sheet.id, file: sheet.file, status: 'missing_source' };
  }

  const source = await Jimp.read(sourcePath);
  const frameWidth = Math.floor(source.bitmap.width / sheet.columns);
  const frameHeight = Math.floor(source.bitmap.height / sheet.rows);
  const totalFrames = sheet.columns * sheet.rows;
  const sheetOutDir = join(OUT_DIR, sheet.id);
  mkdirSync(sheetOutDir, { recursive: true });

  const frames = [];
  for (let idx = 0; idx < totalFrames; idx += 1) {
    const col = idx % sheet.columns;
    const row = Math.floor(idx / sheet.columns);
    const left = col * frameWidth;
    const top = row * frameHeight;

    const frame = source.clone().crop({ x: left, y: top, w: frameWidth, h: frameHeight });
    const outFile = `${sheet.id}-f${String(idx).padStart(2, '0')}.png`;
    const outPath = join(sheetOutDir, outFile);
    await frame.write(outPath);

    frames.push({ index: idx, row, col, file: `./${sheet.id}/${outFile}` });
  }

  const metadata = {
    id: sheet.id,
    source: sheet.file,
    frameWidth,
    frameHeight,
    columns: sheet.columns,
    rows: sheet.rows,
    frames,
    animations: sheet.animations
  };
  writeFileSync(join(sheetOutDir, 'sheet-meta.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');

  return {
    id: sheet.id,
    file: sheet.file,
    status: 'extracted',
    extraction: {
      dir: `1942/design/assets/highfi/extracted/${sheet.id}`,
      metadata: `1942/design/assets/highfi/extracted/${sheet.id}/sheet-meta.json`,
      frameWidth,
      frameHeight,
      frames: totalFrames
    }
  };
}

function updateManifest(results) {
  if (!existsSync(MANIFEST_PATH)) return;
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const byId = new Map(results.map((r) => [r.id, r]));

  manifest.extractedAt = new Date().toISOString();
  manifest.extractions = results;
  for (const asset of manifest.assets || []) {
    const match = byId.get(asset.id);
    if (match?.extraction) {
      asset.extraction = {
        ...(asset.extraction || {}),
        ...match.extraction
      };
    }
  }

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function main() {
  const results = [];

  for (const sheet of SHEETS) {
    process.stdout.write(`extracting ${sheet.file}... `);
    try {
      const result = await extractSheet(sheet);
      results.push(result);
      process.stdout.write(`${result.status}\n`);
    } catch (error) {
      results.push({
        id: sheet.id,
        file: sheet.file,
        status: 'error',
        error: String(error.message || error)
      });
      process.stdout.write(`error (${error.message})\n`);
    }
  }

  updateManifest(results);
  writeFileSync(
    join(OUT_DIR, 'extract-manifest.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
    'utf8'
  );
  console.log('wrote 1942/design/assets/highfi/extracted/extract-manifest.json');
}

await main();
