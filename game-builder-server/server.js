'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const { streamChat } = require('./claude');
const { generateConceptArt } = require('./grok');
const { generateGame } = require('./generator');
const { applyPatch } = require('./patcher');

const app = express();
const PORT = process.env.PORT || 8092;
const REPO_PATH = process.env.OPENARCADE_REPO_PATH || '/ssd/openarcade';
const MANIFEST_PATH = path.join(REPO_PATH, 'games-manifest.json');

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

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Game Builder Server running on port ${PORT}`);
  console.log(`Repo path: ${REPO_PATH}`);
  if (!process.env.ANTHROPIC_API_KEY) console.warn('WARNING: ANTHROPIC_API_KEY not set');
  if (!process.env.XAI_API_KEY) console.warn('WARNING: XAI_API_KEY not set');
});
