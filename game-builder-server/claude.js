'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GAME_TYPES_PATH = path.join(__dirname, '..', 'game-types');

// Load the game design guide once at startup
let DESIGN_GUIDE = '';
try {
  DESIGN_GUIDE = fs.readFileSync(
    path.join(__dirname, '..', 'game-design-guide.md'),
    'utf8'
  );
} catch (e) {
  console.warn('Warning: could not load game-design-guide.md:', e.message);
}

// Load genre ontologies at startup (from ontologies/ directory)
const GENRE_ONTOLOGIES = {};
try {
  const ontDir = path.join(__dirname, 'ontologies');
  if (fs.existsSync(ontDir)) {
    for (const file of fs.readdirSync(ontDir)) {
      if (file.endsWith('.md')) {
        const genre = file.replace('.md', '');
        GENRE_ONTOLOGIES[genre] = fs.readFileSync(path.join(ontDir, file), 'utf8');
      }
    }
    console.log(`Loaded ${Object.keys(GENRE_ONTOLOGIES).length} genre ontologies`);
  }
} catch (e) {
  console.warn('Warning: could not load genre ontologies:', e.message);
}

/**
 * Load genre-specific knowledge base if available (from game-types/ directory).
 * @param {string} genre - genre slug (e.g. 'platformer')
 * @returns {{ content: string, isGap: boolean }}
 */
function loadGenreGuide(genre) {
  if (!genre) return { content: '', isGap: false };
  const slug = genre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const filePath = path.join(GAME_TYPES_PATH, `${slug}.md`);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const status = /\*\*Status\*\*:\s*(\w+)/.exec(content)?.[1] || 'unknown';
    return { content, isGap: status === 'stub' || status === 'building', slug };
  }
  return { content: '', isGap: true, slug };
}

const CHAT_SYSTEM_PROMPT = `You are the OpenArcade Game Builder AI — a friendly, enthusiastic game design collaborator.

Your job is to have a natural conversation with the user to design a complete HTML5 game spec, then hand it off to code generation. You work through the game-design-guide.md checklist naturally, never in a robotic checklist fashion.

${DESIGN_GUIDE}

---

BEHAVIOR RULES:
1. Never mention the checklist to the user. Work through it organically in conversation.
2. Keep responses concise — 2-4 sentences per turn. Don't overwhelm.
3. Ask one question at a time. Don't barrage with multiple questions.
4. Show genuine enthusiasm for creative ideas.
5. When you have enough info for a section, move naturally to the next gap.
6. After sections 1-4 are done, generate a concept art prompt and say "I think we're ready to create some concept art — want to see what this could look like?"
7. After concept art is approved, say "Perfect — ready to generate your game? This will take about [N] seconds." where N is estimated from the tech stack.
8. When extracting design decisions, output a JSON block at the END of your response (hidden from user) in this format:
   <!-- DESIGN_UPDATE: {"section": "visual", "field": "background", "value": "#0a0a1a"} -->
   Use one per meaningful extracted decision.
9. IMPORTANT: Also output tech tree node updates when design decisions map to specific nodes:
   <!-- TECH_TREE: {"node": "genre", "value": "platformer"} -->
   Valid node names: genre, theme, controls, core-loop, win-condition, progression,
   visual-style, level-design, ai-npc, economy, concept-art.
   Use one per resolved tech tree node. These drive the visual tech tree in the UI.
10. For the concept art prompt, output at end:
   <!-- CONCEPT_ART_PROMPT: [full Grok prompt here] -->
11. When design is complete and user approves generation, output at end:
   <!-- READY_TO_GENERATE: true -->

Remember: you're building excitement and helping someone create their dream game. Be a great collaborator.`;

/**
 * Stream a chat response to the Express response object as SSE.
 * @param {Array} messages - array of {role, content} objects
 * @param {string} gameId - for logging
 * @param {object} res - Express response (SSE)
 * @param {object} [opts] - optional overrides
 * @param {string} [opts.detectedGenre] - genre slug if already known
 */
async function streamChat(messages, gameId, res, opts = {}) {
  // Build dynamic system prompt with genre-specific knowledge
  let systemPrompt = CHAT_SYSTEM_PROMPT;
  const genre = opts.detectedGenre || detectGenreFromMessages(messages);

  if (genre) {
    const guide = loadGenreGuide(genre);
    if (guide.content && !guide.isGap) {
      systemPrompt += `\n\n---\n\nGENRE KNOWLEDGE BASE (${genre}):\nUse this deep genre-specific knowledge to inform your design guidance.\n\n${guide.content}`;
    } else if (guide.isGap) {
      // Try ontologies/ fallback for genres not in game-types/
      const ontologySlug = genre.toLowerCase().replace(/\s+/g, '-');
      if (GENRE_ONTOLOGIES[ontologySlug]) {
        systemPrompt += `\n\n---\n\nGENRE-SPECIFIC DESIGN GUIDE (${genre}):\n${GENRE_ONTOLOGIES[ontologySlug]}`;
      } else {
        systemPrompt += `\n\n---\n\nGENRE GAP DETECTED: A knowledge base file does not yet exist for "${genre}". As you design the game, also help build the genre knowledge base. When you have insights about this genre's core mechanics, design patterns, or tech requirements, output them as:\n<!-- GENRE_SECTION: {"section": "core-mechanics", "content": "..."} -->\nValid sections: identity, core-mechanics, design-patterns, tech-stack, level-design, visual-reference, audio-design, multiplayer, generation-checklist, design-to-code`;
        // Send gap notification to client
        res.write(`data: ${JSON.stringify({ type: 'metadata', genreGapDetected: true, genre: guide.slug })}\n\n`);
      }
    }
  }

  const stream = await client.messages.stream({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  let fullText = '';

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
      const text = chunk.delta.text;
      fullText += text;
      // Strip hidden comments before streaming to client
      const visibleText = text.replace(/<!--[\s\S]*?-->/g, '');
      if (visibleText) {
        res.write(`data: ${JSON.stringify({ type: 'text', text: visibleText })}\n\n`);
      }
    }
  }

  // Extract hidden metadata from full response
  const metadata = extractMetadata(fullText);
  if (Object.keys(metadata).length > 0) {
    res.write(`data: ${JSON.stringify({ type: 'metadata', ...metadata })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  return { fullText, metadata };
}

/**
 * Single (non-streaming) call — used for classification and patch decisions.
 */
async function complete(systemPrompt, userPrompt, maxTokens = 512) {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  return msg.content[0]?.text || '';
}

/**
 * Stream code generation step to SSE.
 * @param {string} system - system prompt for this step
 * @param {string} userPrompt - the step-specific prompt
 * @param {object} res - Express response (SSE)
 * @param {string} stepName - for progress events
 * @param {number} pct - progress percentage
 * @returns {string} full generated text
 */
async function streamGenerationStep(system, userPrompt, res, stepName, pct) {
  res.write(`event: progress\ndata: ${JSON.stringify({ step: stepName, pct })}\n\n`);

  // Start heartbeat to prevent proxy/Cloudflare timeout on idle SSE connection
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 15000);

  try {
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let fullText = '';
    let charsSinceEmit = 0;
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        fullText += chunk.delta.text;
        charsSinceEmit += chunk.delta.text.length;
        // Emit code snippets every ~200 chars so the console can show streaming code
        if (charsSinceEmit >= 200) {
          const snippet = fullText.slice(-80).trim();
          if (snippet) {
            res.write(`data: ${JSON.stringify({ type: 'gen_text', text: snippet })}\n\n`);
          }
          charsSinceEmit = 0;
        }
      }
    }

    return fullText;
  } finally {
    clearInterval(heartbeat);
  }
}

/**
 * Try to detect genre from conversation messages (simple keyword matching).
 */
function detectGenreFromMessages(messages) {
  const GENRE_KEYWORDS = {
    'platformer': ['platformer', 'platform game', 'jump and run', 'side-scroll', 'metroidvania'],
    'arcade-shooter': ['shooter', 'shmup', 'bullet hell', 'space invaders', 'shoot em up', 'twin-stick'],
    'puzzle': ['puzzle', 'match-3', 'tetris', 'sokoban', 'logic game', 'tile matching'],
    'roguelike': ['roguelike', 'roguelite', 'permadeath', 'dungeon crawler', 'procedural dungeon'],
    'tower-defense': ['tower defense', 'tower defence', 'td game', 'defend the base'],
    'rhythm-music': ['rhythm', 'music game', 'beat', 'guitar hero', 'dance'],
    'strategy-rts': ['strategy', 'rts', 'real-time strategy', 'base building', '4x'],
    'racing': ['racing', 'race game', 'driving', 'kart'],
    'card-board': ['card game', 'board game', 'deck builder', 'solitaire', 'poker'],
    'fighting': ['fighting game', 'fighter', 'brawler', 'beat em up'],
    'sandbox': ['sandbox', 'minecraft', 'building game', 'creative mode'],
    'fps-3d': ['fps', 'first person', 'first-person shooter', '3d shooter'],
    'idle-clicker': ['idle', 'clicker', 'incremental', 'cookie clicker'],
    'visual-novel': ['visual novel', 'dating sim', 'interactive fiction', 'narrative game'],
  };

  // Search through the last few messages
  const recentText = messages.slice(-6).map(m => m.content).join(' ').toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    const score = keywords.filter(kw => recentText.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = genre;
    }
  }

  return bestMatch;
}

function extractMetadata(text) {
  const meta = {};

  // Extract design updates
  const designUpdates = [];
  const duRegex = /<!--\s*DESIGN_UPDATE:\s*(\{[\s\S]*?\})\s*-->/g;
  let match;
  while ((match = duRegex.exec(text)) !== null) {
    try { designUpdates.push(JSON.parse(match[1])); } catch {}
  }
  if (designUpdates.length) meta.designUpdates = designUpdates;

  // Extract tech tree updates
  const techTreeUpdates = [];
  const ttRegex = /<!--\s*TECH_TREE:\s*(\{[\s\S]*?\})\s*-->/g;
  let ttMatch;
  while ((ttMatch = ttRegex.exec(text)) !== null) {
    try { techTreeUpdates.push(JSON.parse(ttMatch[1])); } catch {}
  }
  if (techTreeUpdates.length) meta.techTreeUpdates = techTreeUpdates;

  // Extract concept art prompt
  const capMatch = /<!--\s*CONCEPT_ART_PROMPT:\s*([\s\S]*?)\s*-->/.exec(text);
  if (capMatch) meta.conceptArtPrompt = capMatch[1].trim();

  // Extract ready to generate flag
  if (/<!--\s*READY_TO_GENERATE:\s*true\s*-->/.test(text)) meta.readyToGenerate = true;

  // Extract genre section contributions (for self-building ontology)
  const genreSections = [];
  const gsRegex = /<!--\s*GENRE_SECTION:\s*(\{[\s\S]*?\})\s*-->/g;
  let gsMatch;
  while ((gsMatch = gsRegex.exec(text)) !== null) {
    try { genreSections.push(JSON.parse(gsMatch[1])); } catch {}
  }
  if (genreSections.length) meta.genreSections = genreSections;

  return meta;
}

module.exports = { streamChat, complete, streamGenerationStep, loadGenreGuide, detectGenreFromMessages };
