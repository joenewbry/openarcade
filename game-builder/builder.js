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
    'progression':   false,
    'tech-needs':    false,
    'visual-design': false,
    'level-design':  false,
    'onboarding':    false,
    'audio':         false,
    'multiplayer':   false,
    'ai-npc':        false,
    'economy':       false,
    'concept-art':   false,
    'ready':         false,
  },
  techTree: {},             // node → value mapping (e.g. { genre: 'platformer' })
  conceptArtPrompt: null,
  conceptArtImages: [],     // array of URLs
  selectedArt: null,        // chosen art URL
  forkSeed: null,           // pre-filled from ?fork= and ?seed=
  currentIframeSrc: null,   // URL of game iframe
  patchPending: false,
};

// ── Tech Tree Definition ─────────────────────────────────────
const TECH_TREE_TIERS = [
  {
    name: 'Foundation',
    nodes: [
      { id: 'genre', label: 'Genre', chatPrompt: "Let's decide on the game genre" },
      { id: 'theme', label: 'Theme', chatPrompt: "What theme or setting should the game have?" },
    ],
    weight: 15, // % per node
  },
  {
    name: 'Mechanics',
    nodes: [
      { id: 'controls', label: 'Controls', chatPrompt: "What controls should the player use?" },
      { id: 'core-loop', label: 'Core Loop', chatPrompt: "What's the core gameplay loop?" },
      { id: 'win-condition', label: 'Win Condition', chatPrompt: "How does the player win or progress?" },
      { id: 'progression', label: 'Progression', chatPrompt: "What kind of progression system should we use?" },
    ],
    weight: 10,
  },
  {
    name: 'Tech Stack',
    auto: true,
    nodes: [
      { id: 'rendering', label: 'Rendering' },
      { id: 'physics', label: 'Physics' },
      { id: 'audio-engine', label: 'Audio' },
      { id: 'multiplayer-engine', label: 'Multiplayer' },
    ],
    weight: 0, // auto-resolved, no progress contribution
  },
  {
    name: 'Polish',
    nodes: [
      { id: 'visual-style', label: 'Visual Style', chatPrompt: "What visual style are you going for?" },
      { id: 'level-design', label: 'Level Design', chatPrompt: "How should the levels be structured?" },
      { id: 'ai-npc', label: 'AI/NPC', chatPrompt: "Should the game have AI-controlled characters or NPCs?" },
      { id: 'economy', label: 'Economy', chatPrompt: "Should the game have an economy or currency system?" },
    ],
    weight: 5,
  },
  {
    name: 'Finalize',
    nodes: [
      { id: 'concept-art', label: 'Concept Art' },
      { id: 'ready', label: 'Ready to Generate', locked: true },
    ],
    weight: 5,
  },
];

// ── DOM refs ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const dom = {
  messages:        $('gbMessages'),
  inputRow:        $('gbInputRow'),
  input:           $('gbInput'),
  sendBtn:         $('gbSend'),
  generateBtn:     $('gbGenerateBtn'),
  phaseDots:       document.querySelectorAll('.gb-phase-dot'),

  designPanel:     $('gbDesignPanel'),
  techTree:        $('gbTechTree'),
  tabTree:         $('gbTabTree'),
  tabGameMd:       $('gbTabGameMd'),
  tabContentTree:  $('gbTabContentTree'),
  tabContentGameMd:$('gbTabContentGameMd'),
  gameMdPreview:   $('gbGameMdPreview'),
  toastContainer:  $('gbToastContainer'),
  globalProgressFill:  $('gbGlobalProgressFill'),
  globalProgressLabel: $('gbGlobalProgressLabel'),

  artPanel:        $('gbArtPanel'),
  artGrid:         $('gbArtGrid'),
  progressPanel:   $('gbProgressPanel'),
  progressBar:     $('gbProgressBar'),
  progressPct:     $('gbProgressPct'),
  progressStep:    $('gbProgressStep'),
  stepLog:         $('gbStepLog'),
  eta:             $('gbEta'),
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
  renderTechTree();
  initDesignTabs();
  updateGlobalProgress();
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
  dom.designPanel.style.display   = phase === 'DESIGN' ? 'flex' : 'none';
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

  // In PLAYING phase, route to patch endpoint instead of design chat
  if (state.phase === 'PLAYING') {
    await applyPatch(text);
    setInputEnabled(true);
    dom.input.focus();
    return;
  }

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
      if (response.metadata.techTreeUpdates) {
        applyTechTreeUpdates(response.metadata.techTreeUpdates);
      }
      if (response.metadata.conceptArtPrompt) {
        state.conceptArtPrompt = response.metadata.conceptArtPrompt;
        updateChecklist({ 'concept-art': true });
        resolveTechTreeNode('concept-art', 'ready');
        showConceptArtButton();
      }
      if (response.metadata.readyToGenerate) {
        updateChecklist({ 'ready': true });
        resolveTechTreeNode('ready', 'yes');
        dom.generateBtn.classList.add('visible');
        dom.generateBtn.textContent = 'Generate Game →';
      }
      updateGameMdPreview();
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
  bubble.innerHTML = renderMarkdown(text);
  scrollToBottom();
}

function addMessage(role, content) {
  const msg = document.createElement('div');
  msg.className = `gb-msg ${role === 'user' ? 'user' : 'ai'}`;
  const rendered = role === 'user' ? escHtml(content) : renderMarkdown(content);
  msg.innerHTML = `
    <div class="gb-avatar">${role === 'user' ? 'YOU' : 'AI'}</div>
    <div class="gb-bubble">${rendered}</div>
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

// ── Generation step descriptions ──────────────────────────────
const STEP_DESCRIPTIONS = {
  'html-structure':        'Setting up HTML structure and styles',
  'game-state':            'Defining game state and constants',
  'entities':              'Creating entity definitions',
  'game-loop':             'Building physics engine and game loop',
  'rendering':             'Writing the rendering system',
  'input':                 'Wiring up input handling',
  'ui-overlays':           'Creating UI overlays and HUD',
  'audio':                 'Generating audio system',
  'recorder-integration':  'Integrating recorder and finalizing',
  'assembling':            'Assembling final game file',
};

// ── Generation ────────────────────────────────────────────────
async function startGeneration() {
  dom.generateBtn.disabled = true;
  dom.generateBtn.textContent = 'Building…';

  // Save complete game.md from tech tree state before generating
  try {
    await fetch(`${API_BASE}/api/save-game-md`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: state.gameId, content: buildGameMdFromTree() }),
    });
  } catch (e) {
    console.warn('Save game.md failed (non-fatal):', e.message);
  }

  setPhase('GENERATING');
  state.generationStartTime = Date.now();
  state.completedSteps = [];
  dom.stepLog.innerHTML = '';
  dom.eta.textContent = '';
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

  // Also update global progress bar during generation
  setGlobalProgress(pct);

  const friendlyLabel = STEP_DESCRIPTIONS[stepLabel?.replace(/\s+/g, '-')] || stepLabel || '';
  dom.progressStep.textContent = friendlyLabel;

  // Update step log
  if (stepLabel) {
    addStepToLog(stepLabel, pct);
  }

  // Calculate ETA
  if (pct > 0 && pct < 100 && state.generationStartTime) {
    const elapsed = (Date.now() - state.generationStartTime) / 1000;
    const totalEstimate = elapsed / (pct / 100);
    const remaining = Math.max(0, Math.ceil(totalEstimate - elapsed));
    if (remaining > 0) {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      dom.eta.textContent = mins > 0 ? `~${mins}m ${secs}s remaining` : `~${secs}s remaining`;
    }
  } else if (pct >= 100) {
    dom.eta.textContent = '';
  }
}

function addStepToLog(stepKey, pct) {
  const normalizedKey = stepKey.replace(/\s+/g, '-');
  const label = STEP_DESCRIPTIONS[normalizedKey] || stepKey.replace(/-/g, ' ');

  // Mark previous active step as done
  const prev = dom.stepLog.querySelector('.gb-step-item.active');
  if (prev) {
    prev.classList.remove('active');
    prev.classList.add('done');
    const icon = prev.querySelector('.gb-step-icon');
    if (icon) icon.textContent = '\u2713';
  }

  // Don't re-add if already exists
  if (dom.stepLog.querySelector(`[data-step="${normalizedKey}"]`)) {
    const existing = dom.stepLog.querySelector(`[data-step="${normalizedKey}"]`);
    existing.classList.add('active');
    existing.classList.remove('done');
    const icon = existing.querySelector('.gb-step-icon');
    if (icon) icon.innerHTML = '<span class="gb-spinner"></span>';
    return;
  }

  const item = document.createElement('div');
  item.className = 'gb-step-item active';
  item.setAttribute('data-step', normalizedKey);
  item.innerHTML = `<span class="gb-step-icon"><span class="gb-spinner"></span></span> ${escHtml(label)}`;
  dom.stepLog.appendChild(item);
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

// ── Tech Tree ─────────────────────────────────────────────────
function renderTechTree() {
  const container = dom.techTree;
  if (!container) return;
  container.innerHTML = '';

  TECH_TREE_TIERS.forEach((tier, tierIdx) => {
    // Add connector between tiers
    if (tierIdx > 0) {
      const connector = document.createElement('div');
      connector.className = 'gb-tree-connector';
      container.appendChild(connector);
    }

    const tierEl = document.createElement('div');
    tierEl.className = 'gb-tree-tier';

    const label = document.createElement('div');
    label.className = 'gb-tree-tier-label';
    label.textContent = `${tierIdx + 1}. ${tier.name}${tier.auto ? ' (auto)' : ''}`;
    tierEl.appendChild(label);

    const nodesRow = document.createElement('div');
    nodesRow.className = 'gb-tree-tier-nodes';

    tier.nodes.forEach(node => {
      const nodeEl = document.createElement('div');
      nodeEl.className = 'gb-tree-node';
      nodeEl.setAttribute('data-node-id', node.id);

      if (node.locked) nodeEl.classList.add('locked');
      if (tier.auto) nodeEl.style.cursor = 'default';

      const nodeLabel = document.createElement('div');
      nodeLabel.className = 'gb-tree-node-label';
      nodeLabel.textContent = node.label;

      const nodeValue = document.createElement('div');
      nodeValue.className = 'gb-tree-node-value';
      nodeValue.textContent = state.techTree[node.id] || '';

      nodeEl.appendChild(nodeLabel);
      nodeEl.appendChild(nodeValue);

      // Click handler for unresolved nodes
      if (node.chatPrompt && !tier.auto) {
        nodeEl.addEventListener('click', () => onTreeNodeClick(node));
      }

      nodesRow.appendChild(nodeEl);
    });

    tierEl.appendChild(nodesRow);
    container.appendChild(tierEl);
  });
}

function onTreeNodeClick(node) {
  if (state.techTree[node.id]) return; // already resolved
  if (dom.sendBtn.disabled) return; // chat busy

  // Mark as pending
  const nodeEl = dom.techTree.querySelector(`[data-node-id="${node.id}"]`);
  if (nodeEl) nodeEl.classList.add('pending');

  // Send the prompt as a chat message
  dom.input.value = node.chatPrompt;
  sendMessage();
}

function applyTechTreeUpdates(updates) {
  let delay = 0;
  for (const u of updates) {
    if (u.node && u.value) {
      setTimeout(() => {
        resolveTechTreeNode(u.node, u.value);
      }, delay);
      delay += 200; // stagger animations
    }
  }
  // Auto-resolve tech stack after a short delay
  setTimeout(() => autoResolveTechStack(), delay + 300);
}

function resolveTechTreeNode(nodeId, value) {
  state.techTree[nodeId] = value;

  const nodeEl = dom.techTree.querySelector(`[data-node-id="${nodeId}"]`);
  if (nodeEl) {
    nodeEl.classList.remove('pending', 'locked');
    nodeEl.classList.add('resolved');
    const valueEl = nodeEl.querySelector('.gb-tree-node-value');
    if (valueEl) valueEl.textContent = value;
  }

  // Unlock "ready" node when tiers 1, 2, 4 have enough
  checkReadyUnlock();

  // Show toast
  const label = findNodeLabel(nodeId);
  if (label) showToast(`${label}: ${value}`);

  updateGlobalProgress();
}

function autoResolveTechStack() {
  // Infer tech stack from resolved design nodes (mirrors ontology.js logic)
  const tree = state.techTree;

  // Rendering
  if (!tree['rendering']) {
    if (tree['genre'] && /fps|3d/i.test(tree['genre'])) {
      autoResolveNode('rendering', 'Three.js');
    } else if (tree['genre'] || tree['theme']) {
      autoResolveNode('rendering', 'Canvas 2D');
    }
  }

  // Physics
  if (!tree['physics']) {
    if (tree['genre'] && /platformer|pinball|physics/i.test(tree['genre'])) {
      autoResolveNode('physics', 'Matter.js');
    } else if (tree['core-loop'] && /build|solve/i.test(tree['core-loop'])) {
      autoResolveNode('physics', 'none');
    } else if (tree['genre']) {
      autoResolveNode('physics', 'none');
    }
  }

  // Audio
  if (!tree['audio-engine']) {
    if (tree['genre'] && /rhythm|music/i.test(tree['genre'])) {
      autoResolveNode('audio-engine', 'Tone.js');
    } else if (tree['genre']) {
      autoResolveNode('audio-engine', 'Web Audio API');
    }
  }

  // Multiplayer
  if (!tree['multiplayer-engine']) {
    if (tree['core-loop'] || tree['genre']) {
      autoResolveNode('multiplayer-engine', 'none');
    }
  }
}

function autoResolveNode(nodeId, value) {
  state.techTree[nodeId] = value;
  const nodeEl = dom.techTree.querySelector(`[data-node-id="${nodeId}"]`);
  if (nodeEl) {
    nodeEl.classList.add('auto-resolved');
    const valueEl = nodeEl.querySelector('.gb-tree-node-value');
    if (valueEl) valueEl.textContent = value;
  }
}

function findNodeLabel(nodeId) {
  for (const tier of TECH_TREE_TIERS) {
    const node = tier.nodes.find(n => n.id === nodeId);
    if (node) return node.label;
  }
  return null;
}

function checkReadyUnlock() {
  // Unlock "ready" if tiers 1-2 are mostly filled
  const tier1Filled = ['genre', 'theme'].filter(id => state.techTree[id]).length;
  const tier2Filled = ['controls', 'core-loop', 'win-condition', 'progression'].filter(id => state.techTree[id]).length;

  if (tier1Filled >= 1 && tier2Filled >= 2) {
    const readyNode = dom.techTree.querySelector('[data-node-id="ready"]');
    if (readyNode && readyNode.classList.contains('locked')) {
      readyNode.classList.remove('locked');
    }
  }
}

// ── Global Progress Bar ───────────────────────────────────────
function updateGlobalProgress() {
  let pct = 0;
  const tree = state.techTree;

  // Tier 1 (15% each, 2 nodes = 30%)
  if (tree['genre']) pct += 15;
  if (tree['theme']) pct += 15;

  // Tier 2 (10% each, 4 nodes = 40%)
  if (tree['controls']) pct += 10;
  if (tree['core-loop']) pct += 10;
  if (tree['win-condition']) pct += 10;
  if (tree['progression']) pct += 10;

  // Tier 4 (5% each, 4 nodes = 20%)
  if (tree['visual-style']) pct += 5;
  if (tree['level-design']) pct += 5;
  if (tree['ai-npc']) pct += 5;
  if (tree['economy']) pct += 5;

  // Concept art: 5%
  if (tree['concept-art']) pct += 5;

  // Ready: 5%
  if (tree['ready']) pct += 5;

  setGlobalProgress(pct);
}

function setGlobalProgress(pct) {
  if (dom.globalProgressFill) {
    dom.globalProgressFill.style.width = pct + '%';
  }
  if (dom.globalProgressLabel) {
    dom.globalProgressLabel.textContent = pct + '%';
  }
}

// ── Design Tabs ───────────────────────────────────────────────
function initDesignTabs() {
  dom.tabTree?.addEventListener('click', () => switchDesignTab('tree'));
  dom.tabGameMd?.addEventListener('click', () => switchDesignTab('gamemd'));
}

function switchDesignTab(tab) {
  const isTree = tab === 'tree';
  dom.tabTree?.classList.toggle('active', isTree);
  dom.tabGameMd?.classList.toggle('active', !isTree);
  if (dom.tabContentTree) dom.tabContentTree.style.display = isTree ? '' : 'none';
  if (dom.tabContentGameMd) dom.tabContentGameMd.style.display = isTree ? 'none' : '';
  if (!isTree) updateGameMdPreview();
}

// ── game.md Preview ───────────────────────────────────────────
function updateGameMdPreview() {
  if (!dom.gameMdPreview) return;
  dom.gameMdPreview.textContent = buildGameMdFromTree();
}

function buildGameMdFromTree() {
  const tree = state.techTree;
  let md = `# Game: ${state.gameId}\n`;
  md += `**Status**: designing\n\n`;

  if (tree['genre'] || tree['theme']) {
    md += `## Core Concept\n`;
    if (tree['genre']) md += `- Genre: ${tree['genre']}\n`;
    if (tree['theme']) md += `- Theme: ${tree['theme']}\n`;
    md += `\n`;
  }

  if (tree['controls'] || tree['core-loop'] || tree['win-condition'] || tree['progression']) {
    md += `## Mechanics\n`;
    if (tree['controls']) md += `- Controls: ${tree['controls']}\n`;
    if (tree['core-loop']) md += `- Core Loop: ${tree['core-loop']}\n`;
    if (tree['win-condition']) md += `- Win Condition: ${tree['win-condition']}\n`;
    if (tree['progression']) md += `- Progression: ${tree['progression']}\n`;
    md += `\n`;
  }

  if (tree['rendering'] || tree['physics'] || tree['audio-engine'] || tree['multiplayer-engine']) {
    md += `## Tech Stack\n`;
    if (tree['rendering']) md += `- Rendering: ${tree['rendering']}\n`;
    if (tree['physics']) md += `- Physics: ${tree['physics']}\n`;
    if (tree['audio-engine']) md += `- Audio: ${tree['audio-engine']}\n`;
    if (tree['multiplayer-engine']) md += `- Multiplayer: ${tree['multiplayer-engine']}\n`;
    md += `\n`;
  }

  if (tree['visual-style'] || tree['level-design'] || tree['ai-npc'] || tree['economy']) {
    md += `## Polish\n`;
    if (tree['visual-style']) md += `- Visual Style: ${tree['visual-style']}\n`;
    if (tree['level-design']) md += `- Level Design: ${tree['level-design']}\n`;
    if (tree['ai-npc']) md += `- AI/NPC: ${tree['ai-npc']}\n`;
    if (tree['economy']) md += `- Economy: ${tree['economy']}\n`;
    md += `\n`;
  }

  md += `## Changelog\n`;
  return md;
}

// ── Toast Notifications ───────────────────────────────────────
function showToast(message) {
  const container = dom.toastContainer;
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'gb-toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 2200);
}

// ── Checklist ─────────────────────────────────────────────────
const CHECK_LABELS = {
  'core-concept':  'Core Concept',
  'mechanics':     'Mechanics',
  'progression':   'Progression',
  'tech-needs':    'Tech Needs',
  'visual-design': 'Visual Design',
  'level-design':  'Level Design',
  'onboarding':    'Onboarding',
  'audio':         'Audio',
  'multiplayer':   'Multiplayer',
  'ai-npc':        'AI/NPC',
  'economy':       'Economy',
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
    if (s?.includes('progress') || s?.includes('difficult') || s?.includes('curve')) state.checklist['progression'] = true;
    if (s?.includes('visual') || s?.includes('color') || s?.includes('style')) state.checklist['visual-design'] = true;
    if (s?.includes('level') || s?.includes('world')) state.checklist['level-design'] = true;
    if (s?.includes('onboard') || s?.includes('tutorial')) state.checklist['onboarding'] = true;
    if (s?.includes('audio') || s?.includes('sound')) state.checklist['audio'] = true;
    if (s?.includes('econom') || s?.includes('currenc') || s?.includes('shop')) state.checklist['economy'] = true;
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

function renderMarkdown(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();
  initToolbar();
});
