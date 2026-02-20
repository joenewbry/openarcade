'use strict';

/**
 * OpenArcade Game Builder — Frontend State Machine
 *
 * Phases: DESIGN → VISUALIZE → GENERATING → PLAYING
 */

const API_BASE = '/game-builder-api';

// ── State ────────────────────────────────────────────────────
const state = {
  phase: 'DESIGN',          // DESIGN | VISUALIZE | GENERATING | PLAYING
  gameId: null,             // slug assigned when design begins
  messages: [],             // full chat history {role, content}
  checklist: {              // design guide sections completion
    'core-concept':  false,
    'mechanics':     false,
    'tech-needs':    false,
    'visual-design': false,
    'level-design':  false,
    'audio':         false,
    'multiplayer':   false,
    'ai-npc':        false,
    'concept-art':   false,
    'ready':         false,
  },
  conceptArtPrompt: null,
  conceptArtImages: [],     // array of URLs
  selectedArt: null,        // chosen art URL
  forkSeed: null,           // pre-filled from ?fork= and ?seed=
  currentIframeSrc: null,   // URL of game iframe
  patchPending: false,
};

// ── DOM refs ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const dom = {
  messages:        $('gbMessages'),
  inputRow:        $('gbInputRow'),
  input:           $('gbInput'),
  sendBtn:         $('gbSend'),
  generateBtn:     $('gbGenerateBtn'),
  phaseDots:       document.querySelectorAll('.gb-phase-dot'),

  emptyRight:      $('gbEmptyRight'),
  artPanel:        $('gbArtPanel'),
  artGrid:         $('gbArtGrid'),
  progressPanel:   $('gbProgressPanel'),
  progressBar:     $('gbProgressBar'),
  progressPct:     $('gbProgressPct'),
  progressStep:    $('gbProgressStep'),
  stackInfo:       $('gbStackInfo'),
  gamePanel:       $('gbGamePanel'),
  gameTitle:       $('gbGameTitle'),
  gameMeta:        $('gbGameMeta'),
  gameIframe:      $('gbGameIframe'),
};

// ── Init ─────────────────────────────────────────────────────
function init() {
  // Parse query params for fork mode
  const params = new URLSearchParams(window.location.search);
  const forkGame = params.get('fork');
  const seedText = params.get('seed');

  // Assign a game ID
  state.gameId = forkGame || generateGameId();

  // Wire up input
  dom.input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  dom.sendBtn.addEventListener('click', sendMessage);
  dom.generateBtn.addEventListener('click', startGeneration);

  // Auto-resize textarea
  dom.input.addEventListener('input', () => {
    dom.input.style.height = '42px';
    dom.input.style.height = Math.min(dom.input.scrollHeight, 120) + 'px';
  });

  // Init game on server
  initGameOnServer(state.gameId, forkGame ? `Fork of ${forkGame}` : 'New Game');

  // First message
  if (forkGame && seedText) {
    addMessage('ai', `Welcome back! I'm picking up from where ${forkGame} left off.\n\nYou said: "${decodeURIComponent(seedText)}"\n\nLet's build on that. What aspects of ${forkGame} do you most want to change?`);
    state.forkSeed = { game: forkGame, text: decodeURIComponent(seedText) };
  } else {
    addMessage('ai', 'Welcome to the Game Builder! I\'m here to help you create an HTML5 game from scratch.\n\nWhat kind of game shall we make?');
  }

  updateChecklist({});
  setPhase('DESIGN');
}

// ── Phase management ──────────────────────────────────────────
function setPhase(phase) {
  state.phase = phase;
  const phases = ['DESIGN', 'VISUALIZE', 'GENERATING', 'PLAYING'];
  const idx = phases.indexOf(phase);

  dom.phaseDots.forEach((dot, i) => {
    dot.classList.toggle('done', i < idx);
    dot.classList.toggle('active', i === idx);
  });

  // Show/hide right panels
  dom.emptyRight.style.display    = phase === 'DESIGN' ? 'flex' : 'none';
  dom.artPanel.classList.toggle('visible',      phase === 'VISUALIZE');
  dom.progressPanel.classList.toggle('visible', phase === 'GENERATING');
  dom.gamePanel.classList.toggle('visible',     phase === 'PLAYING');

  // Chat width
  const chat = document.querySelector('.gb-chat');
  chat.classList.toggle('narrow', phase === 'PLAYING');
  chat.classList.toggle('full',   false);
}

// ── Chat ──────────────────────────────────────────────────────
async function sendMessage() {
  const text = dom.input.value.trim();
  if (!text || dom.sendBtn.disabled) return;

  dom.input.value = '';
  dom.input.style.height = '42px';

  addMessage('user', text);
  state.messages.push({ role: 'user', content: text });

  setInputEnabled(false);
  const typingEl = addTypingIndicator();

  try {
    const response = await streamChatRequest(state.messages, state.gameId, (token) => {
      updateTypingWithText(typingEl, token);
    });

    removeTypingIndicator(typingEl);

    // Final full assistant message added from stream result
    if (response.fullText) {
      state.messages.push({ role: 'assistant', content: response.fullText.replace(/<!--[\s\S]*?-->/g, '').trim() });
    }

    // Handle metadata
    if (response.metadata) {
      if (response.metadata.designUpdates) {
        applyDesignUpdates(response.metadata.designUpdates);
      }
      if (response.metadata.conceptArtPrompt) {
        state.conceptArtPrompt = response.metadata.conceptArtPrompt;
        updateChecklist({ 'concept-art': true });
        showConceptArtButton();
      }
      if (response.metadata.readyToGenerate) {
        updateChecklist({ 'ready': true });
        dom.generateBtn.classList.add('visible');
        dom.generateBtn.textContent = 'Generate Game →';
      }
    }

  } catch (e) {
    removeTypingIndicator(typingEl);
    addMessage('ai', `Sorry, something went wrong: ${e.message}. Please try again.`);
    console.error('Chat error:', e);
  }

  setInputEnabled(true);
  dom.input.focus();
}

async function streamChatRequest(messages, gameId, onToken) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, gameId }),
  });

  if (!res.ok) throw new Error(`Chat API ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let metadata = {};

  let currentBubble = null;
  let currentBubbleText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const msg = JSON.parse(line.slice(6));
        if (msg.type === 'text') {
          fullText += msg.text;
          currentBubbleText += msg.text;
          if (!currentBubble) {
            currentBubble = createStreamingBubble();
          }
          updateStreamingBubble(currentBubble, currentBubbleText);
        } else if (msg.type === 'metadata') {
          metadata = { ...metadata, ...msg };
          delete metadata.type;
        }
      } catch {}
    }
  }

  return { fullText, metadata };
}

// ── Streaming bubble helpers ──────────────────────────────────
function createStreamingBubble() {
  const msg = document.createElement('div');
  msg.className = 'gb-msg ai';
  msg.innerHTML = `
    <div class="gb-avatar">AI</div>
    <div class="gb-bubble gb-streaming"></div>
  `;
  dom.messages.appendChild(msg);
  scrollToBottom();
  return msg.querySelector('.gb-bubble');
}

function updateStreamingBubble(bubble, text) {
  bubble.textContent = text;
  scrollToBottom();
}

function addMessage(role, content) {
  const msg = document.createElement('div');
  msg.className = `gb-msg ${role === 'user' ? 'user' : 'ai'}`;
  msg.innerHTML = `
    <div class="gb-avatar">${role === 'user' ? 'YOU' : 'AI'}</div>
    <div class="gb-bubble">${escHtml(content)}</div>
  `;
  dom.messages.appendChild(msg);
  scrollToBottom();
  return msg;
}

function addTypingIndicator() {
  const msg = document.createElement('div');
  msg.className = 'gb-msg ai gb-typing-msg';
  msg.innerHTML = `
    <div class="gb-avatar">AI</div>
    <div class="gb-bubble">
      <div class="gb-typing"><span></span><span></span><span></span></div>
    </div>
  `;
  dom.messages.appendChild(msg);
  scrollToBottom();
  return msg;
}

function updateTypingWithText(el, token) {
  const bubble = el.querySelector('.gb-bubble');
  const typing = bubble.querySelector('.gb-typing');
  if (typing) typing.remove();
  bubble.textContent = (bubble.textContent || '') + token;
  scrollToBottom();
}

function removeTypingIndicator(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function scrollToBottom() {
  dom.messages.scrollTop = dom.messages.scrollHeight;
}

function setInputEnabled(enabled) {
  dom.input.disabled = !enabled;
  dom.sendBtn.disabled = !enabled;
}

// ── Concept art flow ──────────────────────────────────────────
function showConceptArtButton() {
  // Add a button inside chat to trigger art generation
  const msg = document.createElement('div');
  msg.className = 'gb-msg ai';
  msg.innerHTML = `
    <div class="gb-avatar">AI</div>
    <div class="gb-bubble">
      Ready to see some concept art! Click below to generate 3 visual directions.
      <br><br>
      <button class="btn btn-secondary" id="gbImagineBtn" style="margin-top:6px">Generate Concept Art →</button>
    </div>
  `;
  dom.messages.appendChild(msg);
  scrollToBottom();

  document.getElementById('gbImagineBtn').addEventListener('click', generateConceptArt);
}

async function generateConceptArt() {
  const btn = document.getElementById('gbImagineBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }

  setPhase('VISUALIZE');
  dom.artGrid.innerHTML = '<div style="color:var(--muted);font-size:0.75rem;text-align:center;width:100%">Generating concept art via Grok…</div>';

  try {
    const res = await fetch(`${API_BASE}/api/imagine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: state.conceptArtPrompt, gameId: state.gameId }),
    });

    if (!res.ok) throw new Error(`Imagine API ${res.status}`);
    const data = await res.json();
    state.conceptArtImages = data.images || [];

    renderConceptArt(state.conceptArtImages);

  } catch (e) {
    dom.artGrid.innerHTML = `<div style="color:var(--danger);font-size:0.75rem">${escHtml(e.message)}</div>`;
    console.error('Concept art error:', e);
  }
}

function renderConceptArt(images) {
  dom.artGrid.innerHTML = '';

  if (!images.length) {
    dom.artGrid.innerHTML = '<div style="color:var(--muted)">No images returned.</div>';
    return;
  }

  images.forEach((url, i) => {
    const img = document.createElement('img');
    img.className = 'gb-art-full';
    img.src = url;
    img.alt = `Concept art variation ${i + 1}`;
    img.addEventListener('click', () => selectArt(url, img));
    dom.artGrid.appendChild(img);
  });

  // Action buttons
  const actions = document.createElement('div');
  actions.className = 'gb-art-actions';
  actions.innerHTML = `
    <button class="btn btn-ghost" id="gbRegenerateArt">Regenerate</button>
    <button class="btn btn-primary" id="gbApproveArt" disabled>Use Selected →</button>
  `;
  dom.artPanel.appendChild(actions);

  document.getElementById('gbRegenerateArt').addEventListener('click', () => {
    dom.artPanel.querySelectorAll('.gb-art-actions').forEach(a => a.remove());
    generateConceptArt();
  });
  document.getElementById('gbApproveArt').addEventListener('click', () => {
    if (!state.selectedArt) return;
    approveArt();
  });
}

function selectArt(url, imgEl) {
  state.selectedArt = url;
  dom.artGrid.querySelectorAll('.gb-art-full').forEach(img => img.classList.remove('selected'));
  imgEl.classList.add('selected');
  const approveBtn = document.getElementById('gbApproveArt');
  if (approveBtn) approveBtn.disabled = false;
}

function approveArt() {
  addMessage('ai', `Concept art selected! Your game is ready to generate.\n\nClick "Generate Game →" when you're ready. The process takes 1–15 minutes depending on complexity.`);
  dom.generateBtn.classList.add('visible');
  dom.generateBtn.textContent = 'Generate Game →';
  setPhase('DESIGN'); // back to design with generate button showing
}

// ── Generation ────────────────────────────────────────────────
async function startGeneration() {
  dom.generateBtn.disabled = true;
  dom.generateBtn.textContent = 'Building…';
  setPhase('GENERATING');
  setProgress(0, 'Starting…');

  try {
    const res = await fetch(`${API_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: state.gameId }),
    });

    if (!res.ok) throw new Error(`Generate API ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('event: progress')) continue;
        if (line.startsWith('event: complete')) continue;
        if (line.startsWith('event: stack')) continue;
        if (line.startsWith('event: error')) continue;

        if (!line.startsWith('data: ')) continue;
        try {
          const msg = JSON.parse(line.slice(6));

          if (msg.step !== undefined && msg.pct !== undefined) {
            setProgress(msg.pct, msg.step.replace(/-/g, ' '));
          }
          if (msg.url) {
            gameReady(msg.url);
          }
          if (msg.error) {
            throw new Error(msg.error);
          }
          // Stack info
          if (msg.rendering) {
            updateStackDisplay(msg);
          }
        } catch (parseErr) {
          if (parseErr.message !== 'Unexpected token') console.warn(parseErr);
        }
      }
    }

  } catch (e) {
    setPhase('DESIGN');
    dom.generateBtn.disabled = false;
    dom.generateBtn.textContent = 'Try Again';
    addMessage('ai', `Generation failed: ${e.message}. You can try again or simplify the game design.`);
    console.error('Generate error:', e);
  }
}

function setProgress(pct, stepLabel) {
  dom.progressBar.style.width = pct + '%';
  dom.progressPct.textContent = pct + '%';
  dom.progressStep.textContent = stepLabel || '';
}

function updateStackDisplay(stack) {
  dom.stackInfo.innerHTML = `
    <div>Rendering: <span>${stack.rendering || '—'}</span></div>
    <div>Physics: <span>${stack.physics || 'none'}</span></div>
    <div>Multiplayer: <span>${stack.multiplayer || 'none'}</span></div>
    <div>Audio: <span>${stack.audio || '—'}</span></div>
  `;
}

function gameReady(url) {
  state.currentIframeSrc = url;
  setProgress(100, 'Complete!');

  setTimeout(() => {
    setPhase('PLAYING');
    dom.gameIframe.src = url;
    dom.gameTitle.textContent = state.gameId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    dom.gameMeta.textContent = `v1.0 · ${new Date().toISOString().split('T')[0]}`;
    addMessage('ai', '🎮 Your game is live! Play it in the preview. Type here to modify it — I\'ll apply changes instantly for visual tweaks, or rebuild for bigger changes.');
  }, 600);
}

// ── Patch flow (Phase: PLAYING) ───────────────────────────────
async function applyPatch(instruction) {
  if (state.patchPending) return;
  state.patchPending = true;

  // Add user message to chat (already done in sendMessage)
  setInputEnabled(false);

  try {
    const res = await fetch(`${API_BASE}/api/patch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: state.gameId, instruction }),
    });

    if (!res.ok) throw new Error(`Patch API ${res.status}`);
    const result = await res.json();

    if (result.type === 'instant_css') {
      // Inject CSS into iframe
      injectCSSIntoIframe(result.css);
      addPatchBadge('instant', '⚡ Instant — CSS patched');
    } else if (result.type === 'fast_rebuild') {
      addPatchBadge('fast', '↻ Rebuilding — keep playing…');
      // Reload iframe after a moment
      setTimeout(() => {
        dom.gameIframe.src = state.currentIframeSrc + '?t=' + Date.now();
      }, 2000);
    } else if (result.type === 'full_rebuild') {
      addPatchBadge('full', '⧖ Major change — rebuilding in background…');
      // Trigger full rebuild
      startGeneration();
    }

  } catch (e) {
    addMessage('ai', `Patch failed: ${e.message}`);
    console.error('Patch error:', e);
  }

  state.patchPending = false;
  setInputEnabled(true);
}

function injectCSSIntoIframe(css) {
  try {
    const iframeDoc = dom.gameIframe.contentDocument || dom.gameIframe.contentWindow.document;
    let styleEl = iframeDoc.getElementById('gb-injected-style');
    if (!styleEl) {
      styleEl = iframeDoc.createElement('style');
      styleEl.id = 'gb-injected-style';
      iframeDoc.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  } catch (e) {
    // Cross-origin — reload instead
    dom.gameIframe.src = state.currentIframeSrc + '?t=' + Date.now();
  }
}

function addPatchBadge(type, label) {
  const lastMsg = dom.messages.lastElementChild;
  if (!lastMsg) return;
  const badge = document.createElement('div');
  badge.className = `gb-patch-badge ${type}`;
  badge.textContent = label;
  lastMsg.querySelector('.gb-bubble')?.appendChild(badge);
}

// ── Checklist ─────────────────────────────────────────────────
const CHECK_LABELS = {
  'core-concept':  'Core Concept',
  'mechanics':     'Mechanics',
  'tech-needs':    'Tech Needs',
  'visual-design': 'Visual Design',
  'level-design':  'Level Design',
  'audio':         'Audio',
  'multiplayer':   'Multiplayer',
  'ai-npc':        'AI/NPC',
  'concept-art':   'Concept Art',
  'ready':         'Ready',
};

function applyDesignUpdates(updates) {
  for (const u of updates) {
    const s = u.section?.toLowerCase().replace(/\s+/g, '-');
    if (s && state.checklist.hasOwnProperty(s)) {
      state.checklist[s] = true;
    }
    // Auto-infer section progress
    if (s?.includes('core') || s?.includes('concept')) state.checklist['core-concept'] = true;
    if (s?.includes('mechanic') || s?.includes('control')) state.checklist['mechanics'] = true;
    if (s?.includes('visual') || s?.includes('color') || s?.includes('style')) state.checklist['visual-design'] = true;
    if (s?.includes('level') || s?.includes('world')) state.checklist['level-design'] = true;
    if (s?.includes('audio') || s?.includes('sound')) state.checklist['audio'] = true;
  }
  updateChecklist({});
}

function updateChecklist(overrides) {
  Object.assign(state.checklist, overrides);
  const container = document.getElementById('gbChecks');
  if (!container) return;
  container.innerHTML = Object.entries(state.checklist).map(([key, done]) => {
    const cls = done ? 'done' : '';
    return `<div class="gb-check ${cls}"><div class="gb-check-dot"></div>${CHECK_LABELS[key]}</div>`;
  }).join('');
}

// ── Toolbar actions ───────────────────────────────────────────
function initToolbar() {
  document.getElementById('gbViewGameMd')?.addEventListener('click', () => {
    window.open(`${API_BASE}/../${state.gameId}/game.md`, '_blank');
  });
  document.getElementById('gbViewChatLog')?.addEventListener('click', () => {
    window.open(`${API_BASE}/../${state.gameId}/chat.jsonl`, '_blank');
  });
  document.getElementById('gbShareLink')?.addEventListener('click', () => {
    const url = `${window.location.origin}/${state.gameId}/index.html`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied: ' + url);
    });
  });
}

// ── Server helpers ────────────────────────────────────────────
async function initGameOnServer(gameId, title) {
  try {
    await fetch(`${API_BASE}/api/init-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, title }),
    });
  } catch (e) {
    console.warn('Init game failed (server may be offline):', e.message);
  }
}

// ── Utilities ─────────────────────────────────────────────────
function generateGameId() {
  const adj = ['neon','cyber','turbo','ultra','super','mega','pixel','retro','hyper','void'];
  const noun = ['striker','runner','blaster','quest','arena','force','storm','drive','hunter','wars'];
  const a = adj[Math.floor(Math.random() * adj.length)];
  const n = noun[Math.floor(Math.random() * noun.length)];
  return `${a}-${n}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();
  initToolbar();
});
