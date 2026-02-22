'use strict';

const fs = require('fs');
const path = require('path');

const REPO_PATH = process.env.OPENARCADE_REPO_PATH || '/ssd/openarcade';

// Directories to index
const SOURCES = [
  { dir: 'game-types', type: 'genre-guide', label: 'Genre Guides' },
  { dir: 'game-builder-server/ontologies', type: 'ontology', label: 'Ontologies' },
  { dir: 'visual-design', type: 'visual-design', label: 'Visual Design' },
  { dir: 'level-design', type: 'level-design', label: 'Level Design' },
];

// In-memory index
let chunks = [];
let invertedIndex = {};
let lastIndexTime = 0;
let watchers = [];

/**
 * Parse a markdown file into chunks (split on ## headings).
 * @param {string} filePath - absolute path to .md file
 * @param {string} type - source type
 * @returns {Array} array of chunk objects
 */
function parseFile(filePath, type) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return [];
  }

  const basename = path.basename(filePath, '.md');
  const fileChunks = [];

  // Split on ## headings
  const sections = content.split(/(?=^## )/m);

  for (const section of sections) {
    if (!section.trim()) continue;

    // Extract heading
    const headingMatch = /^##\s+(.+)$/m.exec(section);
    const heading = headingMatch ? headingMatch[1].trim() : basename;

    // Extract image references
    const imageRefs = [];
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(section)) !== null) {
      imageRefs.push({ alt: imgMatch[1], src: imgMatch[2] });
    }

    // Extract hex color values
    const hexColors = [];
    const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
    let hexMatch;
    while ((hexMatch = hexRegex.exec(section)) !== null) {
      hexColors.push(hexMatch[0]);
    }
    // Deduplicate colors
    const uniqueColors = [...new Set(hexColors)];

    // Build excerpt (first 500 chars, strip markdown)
    const excerpt = section
      .replace(/^##\s+.+$/m, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*`_~>]/g, '')
      .trim()
      .slice(0, 500);

    // Extract keywords (meaningful words > 3 chars)
    const text = section.toLowerCase();
    const words = text
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);
    const wordFreq = {};
    for (const w of words) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
    // Top keywords by frequency
    const keywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);

    fileChunks.push({
      id: `${type}/${basename}/${heading.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
      source: filePath,
      type,
      game: basename,
      section: heading,
      excerpt,
      content: section,
      keywords,
      imageRefs,
      hexColors: uniqueColors,
    });
  }

  return fileChunks;
}

/**
 * Build the full index from all source directories.
 */
function buildIndex() {
  const startTime = Date.now();
  chunks = [];
  invertedIndex = {};

  for (const source of SOURCES) {
    const dirPath = path.join(REPO_PATH, source.dir);
    if (!fs.existsSync(dirPath)) {
      console.warn(`Knowledge index: directory not found: ${dirPath}`);
      continue;
    }

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md') && !f.startsWith('_'));

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const fileChunks = parseFile(filePath, source.type);
      chunks.push(...fileChunks);
    }
  }

  // Build inverted keyword index
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    for (const keyword of chunk.keywords) {
      if (!invertedIndex[keyword]) invertedIndex[keyword] = [];
      invertedIndex[keyword].push(i);
    }
    // Also index the game name and section heading
    const gameWords = chunk.game.toLowerCase().split(/[-_]/);
    for (const w of gameWords) {
      if (w.length > 2) {
        if (!invertedIndex[w]) invertedIndex[w] = [];
        invertedIndex[w].push(i);
      }
    }
  }

  lastIndexTime = Date.now();
  const elapsed = lastIndexTime - startTime;
  console.log(`Knowledge index built: ${chunks.length} chunks from ${SOURCES.length} directories in ${elapsed}ms`);
}

/**
 * Search the knowledge base.
 * @param {string} query - search query
 * @param {object} [opts] - options
 * @param {string} [opts.type] - filter by source type
 * @param {string} [opts.game] - boost exact game match
 * @param {string} [opts.genre] - boost genre match
 * @param {number} [opts.limit] - max results (default 6)
 * @returns {Array} ranked results
 */
function search(query, opts = {}) {
  if (chunks.length === 0) buildIndex();

  const limit = opts.limit || 6;
  const queryWords = query.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);

  if (queryWords.length === 0) return [];

  // Score each chunk
  const scores = new Map();

  for (const word of queryWords) {
    // Exact match in inverted index
    const matches = invertedIndex[word] || [];
    for (const idx of matches) {
      scores.set(idx, (scores.get(idx) || 0) + 1);
    }

    // Partial match (prefix)
    for (const [key, indices] of Object.entries(invertedIndex)) {
      if (key.startsWith(word) && key !== word) {
        for (const idx of indices) {
          scores.set(idx, (scores.get(idx) || 0) + 0.5);
        }
      }
    }
  }

  // Apply boosts
  const results = [];
  for (const [idx, baseScore] of scores) {
    const chunk = chunks[idx];
    let score = baseScore;

    // Type filter
    if (opts.type && chunk.type !== opts.type) continue;

    // Exact game match boost (2x)
    if (opts.game && chunk.game.toLowerCase() === opts.game.toLowerCase()) {
      score *= 2;
    }

    // Genre match boost (1.5x)
    if (opts.genre && chunk.game.toLowerCase().includes(opts.genre.toLowerCase())) {
      score *= 1.5;
    }

    // Section type relevance boost
    if (chunk.type === 'visual-design' && query.match(/color|palette|style|art|sprite|pixel/i)) {
      score *= 1.3;
    }
    if (chunk.type === 'level-design' && query.match(/level|stage|world|map|layout|difficulty/i)) {
      score *= 1.3;
    }

    // Bonus for chunks with images
    if (chunk.imageRefs.length > 0) score += 0.5;

    // Bonus for chunks with color palettes
    if (chunk.hexColors.length >= 3) score += 0.3;

    results.push({ ...chunk, score, content: undefined }); // Don't include full content in search results
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

/**
 * Get the full content of a specific chunk.
 * @param {string} type - source type
 * @param {string} game - game slug
 * @param {string} section - section heading (kebab-case)
 * @returns {object|null} full chunk or null
 */
function getChunk(type, game, section) {
  if (chunks.length === 0) buildIndex();

  const id = `${type}/${game}/${section}`;
  return chunks.find(c => c.id === id) || null;
}

/**
 * Set up file watchers for hot-reload.
 */
function watchForChanges() {
  // Clean up existing watchers
  for (const w of watchers) {
    try { w.close(); } catch {}
  }
  watchers = [];

  for (const source of SOURCES) {
    const dirPath = path.join(REPO_PATH, source.dir);
    if (!fs.existsSync(dirPath)) continue;

    try {
      const watcher = fs.watch(dirPath, { persistent: false }, (eventType, filename) => {
        if (filename && filename.endsWith('.md')) {
          // Debounce: only rebuild if it's been > 2s since last build
          if (Date.now() - lastIndexTime > 2000) {
            console.log(`Knowledge index: ${filename} changed, rebuilding...`);
            buildIndex();
          }
        }
      });
      watchers.push(watcher);
    } catch (e) {
      console.warn(`Could not watch ${dirPath}:`, e.message);
    }
  }
}

/**
 * Initialize the knowledge index (call at server startup).
 */
function initKnowledgeIndex() {
  buildIndex();
  watchForChanges();
}

/**
 * Get index stats.
 */
function getStats() {
  return {
    totalChunks: chunks.length,
    uniqueKeywords: Object.keys(invertedIndex).length,
    byType: SOURCES.map(s => ({
      type: s.type,
      label: s.label,
      count: chunks.filter(c => c.type === s.type).length,
    })),
    lastIndexed: lastIndexTime ? new Date(lastIndexTime).toISOString() : null,
  };
}

module.exports = { initKnowledgeIndex, search, getChunk, getStats, buildIndex };
