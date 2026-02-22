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
6. After sections 1-4 are done, say something like "I think we're ready to create some concept art — want to see what this could look like?" and include the CONCEPT_ART_PROMPT comment. Do NOT write the image prompt text in the visible message — it goes ONLY in the hidden comment.
7. After concept art is approved, say "Perfect — ready to generate your game? This will take about [N] seconds." where N is estimated from the tech stack.
8. When extracting design decisions, output a JSON block at the END of your response (hidden from user) in this format:
   <!-- DESIGN_UPDATE: {"section": "visual", "field": "background", "value": "#0a0a1a"} -->
   Use one per meaningful extracted decision.
9. IMPORTANT: Also output tech tree node updates when design decisions map to specific nodes:
   <!-- TECH_TREE: {"node": "genre", "value": "platformer"} -->
   Valid node names: genre, theme, controls, core-loop, win-condition, progression,
   visual-style, level-design, ai-npc, economy, concept-art.
   Use one per resolved tech tree node. These drive the visual tech tree in the UI.
10. For the concept art prompt, output ONLY as a hidden comment at the end — NEVER include the prompt text in your visible message:
   <!-- CONCEPT_ART_PROMPT: [full Grok prompt here] -->
   The UI automatically triggers image generation when it receives this. Just tell the user you're generating art.
11. When design is complete and user approves generation, output at end:
   <!-- READY_TO_GENERATE: true -->
12. When referencing a known game's design pattern from the knowledge base, output:
   <!-- KNOWLEDGE_REF: {"game": "tetris", "section": "Visual Design"} -->
13. When you want to trigger a visual reference search for the user, output:
   <!-- VISUAL_REF: {"query": "neon pixel art space shooter", "generatePrompt": "..."} -->
14. ONTOLOGY DECISIONS: As the design takes shape, classify it along these 5 dimensions. Output one for each resolved dimension:
   <!-- ONTOLOGY: {"dimension": "visual-style", "value": "pixel-2d"} -->
   Dimensions and valid values:
   - visual-style: pixel-2d, canvas-2d, canvas-3d, voxel
   - multiplayer: solo, local-coop, p2p, server-auth
   - core-mechanics: reflex, physics-sim, turn-strategy, rts, narrative-choice, building-crafting
   - content-scope: single-screen, multi-level, hub-branches, procedural-infinite
   - audio-narrative: sfx-none, sfx-music-none, sfx-music-story, adaptive-story
   Emit these as early as possible — the frontend uses them to preview agent selection.

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

  // Inject selected knowledge references if provided
  if (opts.knowledgeContext && opts.knowledgeContext.length > 0) {
    systemPrompt += '\n\n---\n\nSELECTED REFERENCE MATERIAL (user chose these for context):\n';
    for (const ref of opts.knowledgeContext) {
      systemPrompt += `\n### ${ref.game || ref.source} — ${ref.section}\n${ref.content?.slice(0, 800) || ref.excerpt || ''}\n`;
    }
    systemPrompt += '\nUse this reference material to inform your design guidance when relevant.';
  }

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
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  let fullText = '';
  let pendingBuf = '';  // Buffer for text that might be inside a comment

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
      const text = chunk.delta.text;
      fullText += text;
      pendingBuf += text;

      // Strip any complete comments from the buffer
      pendingBuf = pendingBuf.replace(/<!--[\s\S]*?-->/g, '');

      // If buffer contains a partial comment opening, hold it back
      const commentStart = pendingBuf.indexOf('<!--');
      if (commentStart !== -1) {
        // Emit everything before the partial comment
        const safe = pendingBuf.slice(0, commentStart);
        if (safe) {
          res.write(`data: ${JSON.stringify({ type: 'text', text: safe })}\n\n`);
        }
        pendingBuf = pendingBuf.slice(commentStart);
      } else {
        // Check for partial comment prefix at end of buffer (< or <! or <!-)
        let holdBack = 0;
        if (pendingBuf.endsWith('<!-')) holdBack = 3;
        else if (pendingBuf.endsWith('<!')) holdBack = 2;
        else if (pendingBuf.endsWith('<')) holdBack = 1;

        const safe = holdBack ? pendingBuf.slice(0, -holdBack) : pendingBuf;
        if (safe) {
          res.write(`data: ${JSON.stringify({ type: 'text', text: safe })}\n\n`);
        }
        pendingBuf = holdBack ? pendingBuf.slice(-holdBack) : '';
      }
    }
  }
  // Flush any remaining buffer (in case a comment was never closed)
  if (pendingBuf) {
    const cleaned = pendingBuf.replace(/<!--[\s\S]*?-->/g, '');
    if (cleaned) {
      res.write(`data: ${JSON.stringify({ type: 'text', text: cleaned })}\n\n`);
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
      model: 'claude-opus-4-6',
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

  // Extract ontology decisions
  const ontologyDecisions = [];
  const ontRegex = /<!--\s*ONTOLOGY:\s*(\{[\s\S]*?\})\s*-->/g;
  let ontMatch;
  while ((ontMatch = ontRegex.exec(text)) !== null) {
    try { ontologyDecisions.push(JSON.parse(ontMatch[1])); } catch {}
  }
  if (ontologyDecisions.length) meta.ontologyDecisions = ontologyDecisions;

  return meta;
}

/**
 * Stream an agent step to SSE — used by parallel generator for individual agents.
 * Similar to streamGenerationStep but with agent-specific naming.
 * @param {string} system - system prompt
 * @param {string} userPrompt - the prompt
 * @param {object} res - Express SSE response
 * @param {string} agentName - agent identifier for progress events
 * @param {object} [opts] - options
 * @param {string} [opts.model] - model override
 * @param {number} [opts.maxTokens] - max tokens override
 * @returns {string} full generated text
 */
async function streamAgentStep(system, userPrompt, res, agentName, opts = {}) {
  const model = opts.model || 'claude-opus-4-6';
  const maxTokens = opts.maxTokens || 4096;

  res.write(`event: agent-progress\ndata: ${JSON.stringify({ agent: agentName, status: 'running' })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 15000);

  try {
    const stream = await client.messages.stream({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let fullText = '';
    let charsSinceEmit = 0;
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        fullText += chunk.delta.text;
        charsSinceEmit += chunk.delta.text.length;
        if (charsSinceEmit >= 200) {
          const snippet = fullText.slice(-80).trim();
          if (snippet) {
            res.write(`data: ${JSON.stringify({ type: 'gen_text', agent: agentName, text: snippet })}\n\n`);
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
 * Extract knowledge reference metadata from Claude responses.
 * Extends extractMetadata with KNOWLEDGE_REF and VISUAL_REF tags.
 */
function extractKnowledgeMetadata(text) {
  const meta = extractMetadata(text);

  // Extract knowledge references
  const knowledgeRefs = [];
  const krRegex = /<!--\s*KNOWLEDGE_REF:\s*(\{[\s\S]*?\})\s*-->/g;
  let krMatch;
  while ((krMatch = krRegex.exec(text)) !== null) {
    try { knowledgeRefs.push(JSON.parse(krMatch[1])); } catch {}
  }
  if (knowledgeRefs.length) meta.knowledgeRefs = knowledgeRefs;

  // Extract visual reference triggers
  const visualRefs = [];
  const vrRegex = /<!--\s*VISUAL_REF:\s*(\{[\s\S]*?\})\s*-->/g;
  let vrMatch;
  while ((vrMatch = vrRegex.exec(text)) !== null) {
    try { visualRefs.push(JSON.parse(vrMatch[1])); } catch {}
  }
  if (visualRefs.length) meta.visualRefs = visualRefs;

  return meta;
}

module.exports = {
  streamChat, complete, streamGenerationStep, streamAgentStep,
  loadGenreGuide, detectGenreFromMessages,
  extractMetadata, extractKnowledgeMetadata,
};
