'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const http = require('http');
const { streamChat } = require('./claude');
const { generateConceptArt } = require('./grok');
const { generateGame } = require('./generator');
const { applyPatch } = require('./patcher');
const { initMatchmaker } = require('./matchmaker');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8092;
const REPO_PATH = process.env.OPENARCADE_REPO_PATH || '/ssd/openarcade';
const MANIFEST_PATH = path.join(REPO_PATH, 'games-manifest.json');
const GAME_TYPES_PATH = path.join(REPO_PATH, 'game-types');

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── Health check ──────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, repo: REPO_PATH });
});

// ── GET /api/games — list all games from manifest ─────────
app.get('/api/games', (req, res) => {
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    res.json(manifest);
  } catch (e) {
    res.status(500).json({ error: 'Could not read games manifest', detail: e.message });
  }
});

// ── POST /api/chat — SSE streaming chat ───────────────────
app.post('/api/chat', async (req, res) => {
  const { messages, gameId } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }
  if (messages.length === 0) {
    return res.status(400).json({ error: 'messages array must not be empty' });
  }
  if (!gameId) {
    return res.status(400).json({ error: 'gameId required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const { fullText, metadata } = await streamChat(messages, gameId, res);

    // Persist chat turn to jsonl
    appendChatLog(gameId, messages, fullText);

    // If design decisions extracted, update game.md draft
    if (metadata.designUpdates?.length) {
      updateGameMdDraft(gameId, metadata.designUpdates);
    }

    // If concept art prompt ready, note it in game.md
    if (metadata.conceptArtPrompt) {
      saveConceptArtPrompt(gameId, metadata.conceptArtPrompt);
    }

    // If genre sections contributed (self-building ontology), save them
    if (metadata.genreSections?.length) {
      const { detectGenreFromMessages: detectGenre } = require('./claude');
      const genre = metadata.techTreeUpdates?.find(u => u.node === 'genre')?.value
        || detectGenre(messages);
      if (genre) {
        const slug = genre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        saveGenreSections(slug, metadata.genreSections);
      }
    }

  } catch (e) {
    console.error('Chat error:', e);
    res.write(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`);
  }

  res.end();
});

// ── POST /api/imagine — generate concept art ──────────────
app.post('/api/imagine', async (req, res) => {
  const { prompt, gameId } = req.body;
  if (!prompt || !gameId) {
    return res.status(400).json({ error: 'prompt and gameId required' });
  }

  const gameDir = path.join(REPO_PATH, gameId);

  try {
    const imagePaths = await generateConceptArt(prompt, gameDir, 3);
    res.json({ images: imagePaths });
  } catch (e) {
    console.error('Imagine error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/generate — SSE game code generation ─────────
app.post('/api/generate', async (req, res) => {
  const { gameId } = req.body;
  if (!gameId) {
    return res.status(400).json({ error: 'gameId required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    await generateGame(gameId, REPO_PATH, res);
  } catch (e) {
    console.error('Generate error:', e);
    res.write(`event: error\ndata: ${JSON.stringify({ error: e.message })}\n\n`);
  }

  res.end();
});

// ── POST /api/patch — instant CSS or fast/full rebuild ────
app.post('/api/patch', async (req, res) => {
  const { gameId, instruction } = req.body;
  if (!gameId || !instruction) {
    return res.status(400).json({ error: 'gameId and instruction required' });
  }

  try {
    const result = await applyPatch(gameId, instruction, REPO_PATH);
    res.json(result);
  } catch (e) {
    console.error('Patch error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/init-game — create initial game.md ──────────
app.post('/api/init-game', (req, res) => {
  const { gameId, title } = req.body;
  if (!gameId) return res.status(400).json({ error: 'gameId required' });

  const gameDir = path.join(REPO_PATH, gameId);
  fs.mkdirSync(gameDir, { recursive: true });

  const gameMdPath = path.join(gameDir, 'game.md');
  if (!fs.existsSync(gameMdPath)) {
    const date = new Date().toISOString().split('T')[0];
    fs.writeFileSync(gameMdPath, `# Game: ${title || gameId}\n**Created**: ${date}  **Version**: 1.0  **Status**: designing\n\n## Changelog\n`, 'utf8');
  }

  res.json({ gameId, gameMdPath });
});

// ── POST /api/save-game-md — save complete game.md spec ───
app.post('/api/save-game-md', (req, res) => {
  const { gameId, content } = req.body;
  if (!gameId || !content) return res.status(400).json({ error: 'gameId and content required' });

  const gameDir = path.join(REPO_PATH, gameId);
  fs.mkdirSync(gameDir, { recursive: true });
  fs.writeFileSync(path.join(gameDir, 'game.md'), content, 'utf8');
  res.json({ ok: true });
});

// ── GET /api/genre/:slug — read a genre knowledge base file ──
app.get('/api/genre/:slug', (req, res) => {
  const slug = req.params.slug.replace(/[^a-z0-9-]/g, '');
  const filePath = path.join(GAME_TYPES_PATH, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    // Genre gap detected — return template
    const templatePath = path.join(GAME_TYPES_PATH, '_template.md');
    const template = fs.existsSync(templatePath) ? fs.readFileSync(templatePath, 'utf8') : '';
    return res.json({ exists: false, genre: slug, content: template, gap: true });
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const status = /\*\*Status\*\*:\s*(\w+)/.exec(content)?.[1] || 'unknown';
  res.json({ exists: true, genre: slug, content, status });
});

// ── PUT /api/genre/:slug — save/update a genre knowledge base file ──
app.put('/api/genre/:slug', (req, res) => {
  const slug = req.params.slug.replace(/[^a-z0-9-]/g, '');
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });

  fs.mkdirSync(GAME_TYPES_PATH, { recursive: true });
  fs.writeFileSync(path.join(GAME_TYPES_PATH, `${slug}.md`), content, 'utf8');
  res.json({ ok: true, genre: slug });
});

// ── GET /api/genres — list all genre files ──────────────────
app.get('/api/genres', (req, res) => {
  try {
    if (!fs.existsSync(GAME_TYPES_PATH)) return res.json({ genres: [] });
    const files = fs.readdirSync(GAME_TYPES_PATH)
      .filter(f => f.endsWith('.md') && !f.startsWith('_'));
    const genres = files.map(f => {
      const slug = f.replace('.md', '');
      const content = fs.readFileSync(path.join(GAME_TYPES_PATH, f), 'utf8');
      const status = /\*\*Status\*\*:\s*(\w+)/.exec(content)?.[1] || 'unknown';
      const complexity = /\*\*Complexity\*\*:\s*([\w-]+)/.exec(content)?.[1] || 'unknown';
      const nameMatch = /^#\s*Genre:\s*(.+)/m.exec(content);
      const name = nameMatch ? nameMatch[1].trim() : slug;
      return { slug, name, status, complexity };
    });
    res.json({ genres });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/genre-image — generate genre reference image ──
app.post('/api/genre-image', async (req, res) => {
  const { genre, prompt } = req.body;
  if (!genre || !prompt) return res.status(400).json({ error: 'genre and prompt required' });

  const slug = genre.replace(/[^a-z0-9-]/g, '');
  const imagesDir = path.join(GAME_TYPES_PATH, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });

  try {
    const imagePaths = await generateConceptArt(prompt, imagesDir, 1);
    // Rename to genre-reference.png
    if (imagePaths.length > 0) {
      const srcPath = path.join(REPO_PATH, imagePaths[0]);
      const destPath = path.join(imagesDir, `${slug}-reference.png`);
      if (fs.existsSync(srcPath)) {
        fs.renameSync(srcPath, destPath);
      }
    }
    res.json({ ok: true, path: `game-types/images/${slug}-reference.png` });
  } catch (e) {
    console.error('Genre image error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /api/genre/:slug/section — append a section to a genre file ──
app.patch('/api/genre/:slug/section', (req, res) => {
  const slug = req.params.slug.replace(/[^a-z0-9-]/g, '');
  const { section, content: sectionContent } = req.body;
  if (!section || !sectionContent) return res.status(400).json({ error: 'section and content required' });

  const filePath = path.join(GAME_TYPES_PATH, `${slug}.md`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'genre file not found' });

  let fileContent = fs.readFileSync(filePath, 'utf8');
  const placeholder = `{{${section.toUpperCase().replace(/-/g, '_')}_PLACEHOLDER}}`;

  if (fileContent.includes(placeholder)) {
    fileContent = fileContent.replace(placeholder, sectionContent);
  } else {
    // Append to end of the relevant section header
    const sectionHeader = `## ${section.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
    if (fileContent.includes(sectionHeader)) {
      fileContent = fileContent.replace(sectionHeader, `${sectionHeader}\n\n${sectionContent}`);
    }
  }

  fs.writeFileSync(filePath, fileContent, 'utf8');
  res.json({ ok: true });
});

// ── Helpers ───────────────────────────────────────────────

function appendChatLog(gameId, messages, assistantReply) {
  const gameDir = path.join(REPO_PATH, gameId);
  fs.mkdirSync(gameDir, { recursive: true });
  const logPath = path.join(gameDir, 'chat.jsonl');

  const lastUser = messages[messages.length - 1];
  const entry = {
    timestamp: new Date().toISOString(),
    user: lastUser?.content || '',
    assistant: assistantReply.replace(/<!--[\s\S]*?-->/g, '').trim(),
  };
  fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
}

function updateGameMdDraft(gameId, designUpdates) {
  const gameMdPath = path.join(REPO_PATH, gameId, 'game.md');
  if (!fs.existsSync(gameMdPath)) return;

  let content = fs.readFileSync(gameMdPath, 'utf8');
  for (const update of designUpdates) {
    const { section, field, value } = update;
    // Simple append to relevant section or add new line
    const sectionHeader = `## ${section.charAt(0).toUpperCase() + section.slice(1)}`;
    if (content.includes(sectionHeader)) {
      // Insert field under section if not already present
      const line = `- ${field}: ${value}`;
      if (!content.includes(line)) {
        content = content.replace(sectionHeader, `${sectionHeader}\n${line}`);
      }
    } else {
      content += `\n${sectionHeader}\n- ${field}: ${value}\n`;
    }
  }
  fs.writeFileSync(gameMdPath, content, 'utf8');
}

function saveGenreSections(slug, sections) {
  const filePath = path.join(GAME_TYPES_PATH, `${slug}.md`);
  // Create from template if doesn't exist
  if (!fs.existsSync(filePath)) {
    const templatePath = path.join(GAME_TYPES_PATH, '_template.md');
    if (fs.existsSync(templatePath)) {
      let template = fs.readFileSync(templatePath, 'utf8');
      template = template.replace(/\{\{GENRE_NAME\}\}/g, slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
      template = template.replace(/\{\{DATE\}\}/g, new Date().toISOString().split('T')[0]);
      template = template.replace(/\{\{SLUG\}\}/g, slug);
      template = template.replace(/\{\{COMPLEXITY\}\}/g, 'unknown');
      fs.mkdirSync(GAME_TYPES_PATH, { recursive: true });
      fs.writeFileSync(filePath, template, 'utf8');
    } else {
      return;
    }
  }

  let content = fs.readFileSync(filePath, 'utf8');
  for (const gs of sections) {
    const placeholder = `{{${gs.section.toUpperCase().replace(/-/g, '_')}_PLACEHOLDER}}`;
    if (content.includes(placeholder)) {
      content = content.replace(placeholder, gs.content);
    }
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

function saveConceptArtPrompt(gameId, prompt) {
  const gameMdPath = path.join(REPO_PATH, gameId, 'game.md');
  if (!fs.existsSync(gameMdPath)) return;

  const content = fs.readFileSync(gameMdPath, 'utf8');
  const line = `- concept_art_prompt: ${prompt}`;
  if (!content.includes('concept_art_prompt')) {
    const updated = content.includes('## Generation Prompts')
      ? content.replace('## Generation Prompts', `## Generation Prompts\n${line}`)
      : content + `\n## Generation Prompts\n${line}\n`;
    fs.writeFileSync(gameMdPath, updated, 'utf8');
  }
}

// ── Mount matchmaker + Start ──────────────────────────────
initMatchmaker(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Game Builder Server running on port ${PORT}`);
  console.log(`Repo path: ${REPO_PATH}`);
  console.log(`Matchmaker: Socket.io mounted at /matchmaker`);
  if (!process.env.ANTHROPIC_API_KEY) console.warn('WARNING: ANTHROPIC_API_KEY not set');
  if (!process.env.XAI_API_KEY) console.warn('WARNING: XAI_API_KEY not set');
});
