'use strict';

/**
 * OpenArcade Game Builder — Frontend State Machine
 *
 * Phases: DESIGN → VISUALIZE → GENERATING → PLAYING
 */

const API_BASE = '/game-builder-api';

// ── State ────────────────────────────────────────────────────
const state = {
  phase: 'EXPLORE',         // EXPLORE | LOAD | DESIGN | VISUALIZE | GENERATING | PLAYING
  gameId: null,             // slug assigned when design begins
  genreSlug: null,          // selected genre slug
  genreGuideContent: null,  // loaded genre markdown
  genreGuideEditMode: false,
  genreAffinityScores: {},  // genre → score (0-1) for narrowing circle
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
  // Items that start hidden — only shown when the AI mentions them
  checklistRelevance: {
    'core-concept':  true,
    'mechanics':     true,
    'progression':   true,
    'tech-needs':    true,
    'visual-design': true,
    'level-design':  true,
    'onboarding':    true,
    'audio':         true,
    'multiplayer':   false,
    'ai-npc':        false,
    'economy':       false,
    'concept-art':   true,
    'ready':         true,
  },
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
  tabGenre:        $('gbTabGenre'),
  tabGameMd:       $('gbTabGameMd'),
  tabContentTree:  $('gbTabContentTree'),
  tabContentGenre: $('gbTabContentGenre'),
  tabContentGameMd:$('gbTabContentGameMd'),
  gameMdPreview:   $('gbGameMdPreview'),
  genreGuide:      $('gbGenreGuide'),
  genreGuideContent: $('gbGenreGuideContent'),
  genreGuideEdit:  $('gbGenreGuideEdit'),
  genreEditArea:   $('gbGenreEditArea'),
  genreSaveBtn:    $('gbGenreSaveBtn'),
  genreEditToggle: $('gbGenreEditToggle'),
  genreGuideToolbar: $('gbGenreGuideToolbar'),
  genreExplorerCanvas: $('gbGenreExplorerCanvas'),
  toastContainer:  $('gbToastContainer'),
  globalProgressFill:  $('gbGlobalProgressFill'),
  globalProgressLabel: $('gbGlobalProgressLabel'),
  designRight:     $('gbDesignRight'),
  specContent:     $('gbSpecContent'),
  previewContent:  $('gbPreviewContent'),
  artPanel:        $('gbArtPanel'),
  artGrid:         $('gbArtGrid'),
  progressPanel:   $('gbProgressPanel'),
  progressBar:     $('gbProgressBar'),
  progressPct:     $('gbProgressPct'),
  progressStep:    $('gbProgressStep'),
  stepLog:         $('gbStepLog'),
  eta:             $('gbEta'),
  stackInfo:       $('gbStackInfo'),
  consoleBody:     $('gbConsoleBody'),
  gamePanel:       $('gbGamePanel'),
  gameTitle:       $('gbGameTitle'),
  gameMeta:        $('gbGameMeta'),
  gameIframe:      $('gbGameIframe'),
};

// ── Init ─────────────────────────────────────────────────────
async function init() {
  // Parse query params
  const params = new URLSearchParams(window.location.search);
  const forkGame = params.get('fork');
  const seedText = params.get('seed');
  const existingId = params.get('id');

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

  // Try to load existing session
  if (existingId) {
    state.gameId = existingId;
    const loaded = await loadExistingSession(existingId);
    if (loaded) return; // session restored
  }

  // New session
  state.gameId = forkGame || generateGameId();
  pushGameIdToUrl();

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
  initGenreGuide();
  updateGlobalProgress();
  setPhase('EXPLORE');
}

function pushGameIdToUrl() {
  const url = new URL(window.location);
  url.searchParams.set('id', state.gameId);
  window.history.replaceState({}, '', url);
}

async function loadExistingSession(gameId) {
  try {
    const res = await fetch(`${API_BASE}/api/session/${gameId}`);
    if (!res.ok) return false;
    const data = await res.json();

    // Restore chat messages
    if (data.messages?.length) {
      for (const msg of data.messages) {
        addMessage(msg.role === 'user' ? 'user' : 'ai', msg.content);
        state.messages.push(msg);
      }
    } else {
      addMessage('ai', 'Welcome back! Resuming your game design session.');
    }

    // Restore checklist
    if (data.checklist) {
      Object.assign(state.checklist, data.checklist);
    }
    if (data.checklistRelevance) {
      Object.assign(state.checklistRelevance, data.checklistRelevance);
    }

    // Restore phase
    const phase = data.phase || 'DESIGN';
    updateChecklist({});
    setPhase(phase);
    pushGameIdToUrl();

    // Refresh spec panel
    refreshSpecPanel();

    return true;
  } catch (e) {
    console.warn('Could not load session:', e);
    return false;
  }
}

async function saveSessionState() {
  try {
    await fetch(`${API_BASE}/api/save-session-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: state.gameId,
        messages: state.messages,
        checklist: state.checklist,
        checklistRelevance: state.checklistRelevance,
        phase: state.phase,
      }),
    });
  } catch (e) {
    console.warn('Save session state failed:', e);
  }
}

// ── Phase management ──────────────────────────────────────────
function setPhase(phase) {
  state.phase = phase;
  const phases = ['EXPLORE', 'LOAD', 'DESIGN', 'VISUALIZE', 'GENERATING', 'PLAYING'];
  const idx = phases.indexOf(phase);

  dom.phaseDots.forEach((dot, i) => {
    dot.classList.toggle('done', i < idx);
    dot.classList.toggle('active', i === idx);
  });

  // Show/hide right panels
  const isDesignPhase = phase === 'EXPLORE' || phase === 'LOAD' || phase === 'DESIGN';
  if (dom.designPanel) dom.designPanel.style.display = isDesignPhase ? 'flex' : 'none';
  if (dom.designRight) dom.designRight.style.display = phase === 'DESIGN' ? 'flex' : 'none';
  dom.artPanel.classList.toggle('visible',      phase === 'VISUALIZE');
  dom.progressPanel.classList.toggle('visible', phase === 'GENERATING');
  dom.gamePanel.classList.toggle('visible',     phase === 'PLAYING');

  // During EXPLORE, show Genre Guide tab by default
  if (phase === 'EXPLORE') {
    switchDesignTab('genre');
  } else if (phase === 'LOAD') {
    switchDesignTab('genre');
  } else if (phase === 'DESIGN') {
    switchDesignTab('tree');
  }

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
        // Refresh spec panel and maybe generate early preview
        refreshSpecPanel();
        maybeGenerateEarlyPreview();
      }
      if (response.metadata.techTreeUpdates) {
        applyTechTreeUpdates(response.metadata.techTreeUpdates);
        // Check if genre was just resolved — transition from EXPLORE to LOAD/DESIGN
        const genreUpdate = response.metadata.techTreeUpdates.find(u => u.node === 'genre');
        if (genreUpdate && genreUpdate.value) {
          onGenreSelected(genreUpdate.value);
        }
      }
      if (response.metadata.genreGapDetected) {
        showToast(`Genre "${response.metadata.genre}" not found — building knowledge base`);
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

    // Update genre affinity scores from chat text for narrowing circle
    updateGenreAffinityFromText(text);

    // Persist session state after each turn
    saveSessionState();

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

  // Finalize the streaming bubble — detect options, remove streaming class
  if (currentBubble) {
    finalizeStreamingBubble(currentBubble);
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

function finalizeStreamingBubble(bubble) {
  bubble.classList.remove('gb-streaming');
  renderOptionsFromBubble(bubble);
}

/**
 * Scan a bubble for option patterns like "- Something?" or "- **Something**"
 * and replace them with clickable buttons.
 */
function renderOptionsFromBubble(bubble) {
  const html = bubble.innerHTML;
  // Match lines that look like options: "- Text?" or "- **Text**" or "- Text"
  const optionRegex = /(?:^|<br>)\s*[-•]\s*(?:<strong>)?(.+?)(?:<\/strong>)?(?:\?)?(?=<br>|$)/g;
  const matches = [];
  let m;
  while ((m = optionRegex.exec(html)) !== null) {
    matches.push({ full: m[0], text: m[1].replace(/<\/?[^>]+>/g, '').replace(/\?$/, '').trim() });
  }

  // Only convert if we found 2-5 option-like lines (avoids false positives)
  if (matches.length < 2 || matches.length > 6) return;

  // Build replacement: remove the matched lines, append buttons
  let cleaned = html;
  for (const match of matches) {
    cleaned = cleaned.replace(match.full, '');
  }
  // Remove trailing <br> tags
  cleaned = cleaned.replace(/(<br>\s*)+$/, '');

  const buttons = matches.map(opt =>
    `<button class="gb-option-btn" data-option="${escHtml(opt.text)}">${escHtml(opt.text)}</button>`
  ).join('');

  bubble.innerHTML = cleaned +
    `<div class="gb-options-row">${buttons}` +
    `<button class="gb-option-btn gb-option-other">Something else...</button></div>`;

  // Wire click handlers
  bubble.querySelectorAll('.gb-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('gb-option-other')) {
        dom.input.focus();
        return;
      }
      dom.input.value = btn.dataset.option;
      sendMessage();
    });
  });
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
  setPhase('DESIGN');
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
  dom.consoleBody.innerHTML = '';
  consoleLineQueue = [];
  if (consoleTimer) { clearTimeout(consoleTimer); consoleTimer = null; }
  addConsoleLine('> OpenArcade Game Builder v2.0', 'system');
  addConsoleLine('> Starting build pipeline...', 'system');
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
            queueConsoleMessages(msg.step);
          }
          if (msg.type === 'gen_text' && msg.text) {
            addConsoleCodeSnippet(msg.text);
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

// ── Build console ──────────────────────────────────────────
const CONSOLE_MESSAGES = {
  'html-structure':        ['> Scaffolding HTML document...', '> Injecting viewport meta and charset...', '> Linking stylesheet and canvas element...'],
  'game-state':            ['> Initializing game state machine...', '> Defining constants and config...', '> Setting up entity pools...'],
  'entities':              ['> Spawning entity factories...', '> Building collision masks...'],
  'game-loop':             ['> Bootstrapping physics engine...', '> Calibrating delta-time loop...', '> Registering update callbacks...'],
  'rendering':             ['> Initializing 2D rendering context...', '> Building sprite pipeline...', '> Compiling draw calls...'],
  'input':                 ['> Mapping keyboard bindings...', '> Registering touch handlers...'],
  'ui-overlays':           ['> Rendering HUD layer...', '> Building score display...', '> Creating menu screens...'],
  'audio':                 ['> Synthesizing sound effects...', '> Building audio context...'],
  'recorder-integration':  ['> Integrating OpenArcade recorder...', '> Wiring event capture hooks...'],
  'assembling':            ['> Assembling final bundle...', '> Minifying output...', '> Writing index.html...', '> Build complete.'],
};

let consoleLineQueue = [];
let consoleTimer = null;

function addConsoleLine(text, type = 'info') {
  const line = document.createElement('div');
  line.className = `gb-console-line ${type}`;
  line.textContent = text;
  dom.consoleBody.appendChild(line);
  dom.consoleBody.scrollTop = dom.consoleBody.scrollHeight;
}

function queueConsoleMessages(stepKey) {
  const normalized = stepKey.replace(/\s+/g, '-');
  const messages = CONSOLE_MESSAGES[normalized] || [`> Processing ${stepKey}...`];
  messages.forEach((msg, i) => {
    consoleLineQueue.push({ text: msg, delay: i * 400 });
  });
  drainConsoleQueue();
}

function drainConsoleQueue() {
  if (consoleTimer || !consoleLineQueue.length) return;
  const next = consoleLineQueue.shift();
  consoleTimer = setTimeout(() => {
    addConsoleLine(next.text);
    consoleTimer = null;
    drainConsoleQueue();
  }, next.delay || 100);
}

function addConsoleCodeSnippet(text) {
  const line = document.createElement('div');
  line.className = 'gb-console-line code';
  line.textContent = text.slice(0, 120);
  dom.consoleBody.appendChild(line);
  // Keep scrolled to bottom, but limit total lines
  if (dom.consoleBody.children.length > 200) {
    dom.consoleBody.removeChild(dom.consoleBody.firstChild);
  }
  dom.consoleBody.scrollTop = dom.consoleBody.scrollHeight;
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
  dom.tabGenre?.addEventListener('click', () => switchDesignTab('genre'));
  dom.tabGameMd?.addEventListener('click', () => switchDesignTab('gamemd'));
}

function switchDesignTab(tab) {
  dom.tabTree?.classList.toggle('active', tab === 'tree');
  dom.tabGenre?.classList.toggle('active', tab === 'genre');
  dom.tabGameMd?.classList.toggle('active', tab === 'gamemd');
  if (dom.tabContentTree) dom.tabContentTree.style.display = tab === 'tree' ? '' : 'none';
  if (dom.tabContentGenre) dom.tabContentGenre.style.display = tab === 'genre' ? '' : 'none';
  if (dom.tabContentGameMd) dom.tabContentGameMd.style.display = tab === 'gamemd' ? '' : 'none';
  if (tab === 'gamemd') updateGameMdPreview();
  if (tab === 'genre' && !state.genreSlug) {
    initGenreExplorerCanvas();
  }
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
      state.checklistRelevance[s] = true; // make visible
    }
    // Auto-infer section progress + reveal conditional items
    if (s?.includes('core') || s?.includes('concept')) { state.checklist['core-concept'] = true; }
    if (s?.includes('mechanic') || s?.includes('control')) { state.checklist['mechanics'] = true; }
    if (s?.includes('progress') || s?.includes('difficult') || s?.includes('curve')) { state.checklist['progression'] = true; }
    if (s?.includes('visual') || s?.includes('color') || s?.includes('style')) { state.checklist['visual-design'] = true; }
    if (s?.includes('level') || s?.includes('world')) { state.checklist['level-design'] = true; }
    if (s?.includes('onboard') || s?.includes('tutorial')) { state.checklist['onboarding'] = true; }
    if (s?.includes('audio') || s?.includes('sound')) { state.checklist['audio'] = true; }
    if (s?.includes('multi') || s?.includes('coop') || s?.includes('pvp')) {
      state.checklist['multiplayer'] = true;
      state.checklistRelevance['multiplayer'] = true;
    }
    if (s?.includes('ai') || s?.includes('npc') || s?.includes('enemy') || s?.includes('bot')) {
      state.checklist['ai-npc'] = true;
      state.checklistRelevance['ai-npc'] = true;
    }
    if (s?.includes('econom') || s?.includes('currenc') || s?.includes('shop') || s?.includes('upgrade')) {
      state.checklist['economy'] = true;
      state.checklistRelevance['economy'] = true;
    }
  }
  updateChecklist({});
}

function updateChecklist(overrides) {
  Object.assign(state.checklist, overrides);
  const container = document.getElementById('gbChecks');
  if (!container) return;

  // Only show relevant items
  const relevant = Object.entries(state.checklist).filter(([key]) => state.checklistRelevance[key]);
  container.innerHTML = relevant.map(([key, done]) => {
    const cls = done ? 'done' : 'needs-info';
    return `<div class="gb-check ${cls}"><div class="gb-check-dot"></div>${CHECK_LABELS[key]}</div>`;
  }).join('');

  // Update design progress bar — only count relevant items
  const doneCount = relevant.filter(([, d]) => d).length;
  const pct = relevant.length ? Math.round((doneCount / relevant.length) * 100) : 0;
  const bar = document.getElementById('gbDesignProgress');
  if (bar) bar.style.width = pct + '%';
}

// ── Live spec panel + early preview ───────────────────────
async function refreshSpecPanel() {
  try {
    const res = await fetch(`${API_BASE}/../${state.gameId}/game.md`);
    if (!res.ok) return;
    const md = await res.text();
    // Simple markdown rendering for the spec
    const html = md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<div class="gb-spec-item">$1</div>')
      .replace(/\n/g, '<br>');
    dom.specContent.innerHTML = html;
  } catch {}
}

async function maybeGenerateEarlyPreview() {
  // Only generate if we have enough info (core-concept + visual-design)
  if (!state.checklist['core-concept'] || !state.checklist['visual-design']) return;
  // Throttle: at least 2 chat turns since last preview
  const turnCount = state.messages.filter(m => m.role === 'user').length;
  if (state.lastPreviewTurn && turnCount - state.lastPreviewTurn < 2) return;

  state.lastPreviewTurn = turnCount;
  dom.previewContent.innerHTML = '<div class="gb-preview-loading">Generating preview...</div>';

  try {
    const res = await fetch(`${API_BASE}/api/imagine-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: state.gameId }),
    });
    if (!res.ok) throw new Error(`Preview API ${res.status}`);
    const data = await res.json();
    if (data.image) {
      dom.previewContent.innerHTML = `<img class="gb-preview-img" src="${data.image}" alt="Early preview">`;
    }
  } catch (e) {
    dom.previewContent.innerHTML = '<div class="gb-preview-placeholder">Preview will appear soon...</div>';
    console.warn('Early preview error:', e);
  }
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

// ── Genre Guide System ────────────────────────────────────────

const GENRE_KEYWORDS = {
  'platformer': ['jump', 'platform', 'gravity', 'side-scroll', 'mario', 'run', 'wall'],
  'arcade-shooter': ['shoot', 'bullet', 'space', 'waves', 'invaders', 'shmup', 'gun'],
  'puzzle': ['match', 'tile', 'grid', 'solve', 'logic', 'tetris', 'puzzle'],
  'roguelike': ['dungeon', 'permadeath', 'procedural', 'roguelike', 'loot', 'rogue'],
  'tower-defense': ['tower', 'defend', 'waves', 'path', 'td', 'defense'],
  'rhythm-music': ['rhythm', 'music', 'beat', 'dance', 'song', 'tempo'],
  'strategy-rts': ['strategy', 'rts', 'base', 'army', 'resource', 'troops'],
  'racing': ['race', 'car', 'speed', 'driving', 'kart', 'track'],
  'card-board': ['card', 'deck', 'board', 'hand', 'draw', 'poker'],
  'fighting': ['fight', 'combo', 'punch', 'arena', 'versus', 'brawl'],
  'sandbox': ['build', 'open world', 'mine', 'craft', 'sandbox', 'create'],
  'fps-3d': ['fps', 'first person', '3d', 'aim', 'first-person'],
  'idle-clicker': ['idle', 'click', 'upgrade', 'automate', 'prestige', 'incremental'],
  'visual-novel': ['story', 'dialogue', 'choice', 'narrative', 'novel', 'dating'],
};

const GENRE_META = {
  'platformer':     { name: 'Platformer',      complexity: 'medium',    color: '#0ff' },
  'arcade-shooter': { name: 'Arcade Shooter',   complexity: 'medium',    color: '#0ff' },
  'puzzle':         { name: 'Puzzle',            complexity: 'low-medium',color: '#0f8' },
  'roguelike':      { name: 'Roguelike',         complexity: 'high',      color: '#8b5cf6' },
  'tower-defense':  { name: 'Tower Defense',     complexity: 'medium-high',color: '#0ff' },
  'rhythm-music':   { name: 'Rhythm / Music',    complexity: 'medium-high',color: '#0ff' },
  'strategy-rts':   { name: 'Strategy / RTS',    complexity: 'high',      color: '#8b5cf6' },
  'racing':         { name: 'Racing',            complexity: 'medium',    color: '#0ff' },
  'card-board':     { name: 'Card / Board',      complexity: 'medium',    color: '#0ff' },
  'fighting':       { name: 'Fighting',          complexity: 'high',      color: '#8b5cf6' },
  'sandbox':        { name: 'Sandbox',           complexity: 'high',      color: '#8b5cf6' },
  'fps-3d':         { name: 'FPS / 3D',          complexity: 'very-high', color: '#f55' },
  'idle-clicker':   { name: 'Idle / Clicker',    complexity: 'low',       color: '#0f8' },
  'visual-novel':   { name: 'Visual Novel',      complexity: 'low-medium',color: '#0f8' },
};

function initGenreGuide() {
  dom.genreEditToggle?.addEventListener('click', toggleGenreEditMode);
  dom.genreSaveBtn?.addEventListener('click', saveGenreGuide);
  initGenreExplorerCanvas();
}

function updateGenreAffinityFromText(text) {
  const lower = text.toLowerCase();
  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    let score = state.genreAffinityScores[genre] || 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 0.15;
    }
    state.genreAffinityScores[genre] = Math.min(score, 1);
  }
  // Re-render the inline genre explorer if visible
  if (dom.tabContentGenre && dom.tabContentGenre.style.display !== 'none' && !state.genreSlug) {
    renderGenreExplorerFrame();
  }
}

async function onGenreSelected(genreValue) {
  const slug = genreValue.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  state.genreSlug = slug;

  // Transition to LOAD phase
  setPhase('LOAD');
  showToast(`Loading genre: ${genreValue}`);

  try {
    const res = await fetch(`${API_BASE}/api/genre/${slug}`);
    if (!res.ok) throw new Error(`Genre API ${res.status}`);
    const data = await res.json();

    state.genreGuideContent = data.content;

    if (data.gap) {
      showToast(`Building genre knowledge for: ${genreValue}`);
    }

    // Render the genre guide
    renderGenreGuideContent(data.content, data.status || 'unknown');

    // Hide canvas, show content
    if (dom.genreExplorerCanvas) dom.genreExplorerCanvas.style.display = 'none';
    if (dom.genreGuideContent) dom.genreGuideContent.style.display = '';
    if (dom.genreGuideToolbar) dom.genreGuideToolbar.style.display = '';

    // Transition to DESIGN
    setTimeout(() => setPhase('DESIGN'), 600);

  } catch (e) {
    console.warn('Genre load failed:', e.message);
    setPhase('DESIGN');
  }
}

function renderGenreGuideContent(markdown, status) {
  if (!dom.genreGuideContent) return;
  dom.genreGuideContent.innerHTML = renderGenreMarkdown(markdown);
}

function renderGenreMarkdown(md) {
  // Process TECHCARD annotations first
  md = md.replace(/<!--\s*TECHCARD:\s*(\{[\s\S]*?\})\s*-->/g, (match, json) => {
    try {
      const card = JSON.parse(json);
      return `<div class="gb-techcard" data-type="${escHtml(card.type || '')}">
        <div class="gb-techcard-info">
          <span class="gb-techcard-name">${escHtml(card.name || card.id)}</span>
          <span class="gb-techcard-version">v${escHtml(card.version || '?')}</span>
          <div class="gb-techcard-desc">${escHtml(card.best_for || '')}</div>
          <div class="gb-techcard-meta">
            ${card.reliability ? `<span>Reliability: ${escHtml(card.reliability)}</span>` : ''}
            ${card.docs ? `<a href="${escHtml(card.docs)}" target="_blank" style="color:var(--accent)">Docs</a>` : ''}
          </div>
        </div>
      </div>`;
    } catch { return ''; }
  });

  // Process inline TECH annotations
  md = md.replace(/<!--\s*TECH:\s*(\{[\s\S]*?\})\s*-->/g, (match, json) => {
    try {
      const tech = JSON.parse(json);
      return `<span class="gb-tech-badge">${escHtml(tech.id)} (${escHtml(tech.role || '')})</span>`;
    } catch { return ''; }
  });

  // Strip remaining HTML comments
  md = md.replace(/<!--[\s\S]*?-->/g, '');

  // Convert markdown to HTML
  let html = md
    // Code blocks (must be before inline code)
    .replace(/```(\w*)\n([\s\S]*?)```/g, (m, lang, code) =>
      `<pre><code>${escHtml(code.trim())}</code></pre>`)
    // Headings
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, src) => {
      const imgSrc = src.startsWith('http') ? src : `${API_BASE}/../game-types/${src}`;
      return `<img src="${imgSrc}" alt="${escHtml(alt)}" loading="lazy">`;
    })
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--accent)">$1</a>')
    // Blockquotes
    .replace(/^>\s?(.+)$/gm, '<blockquote>$1</blockquote>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--border);margin:12px 0">')
    // Tables
    .replace(/^\|(.+)\|$/gm, (match, content) => {
      const cells = content.split('|').map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) return ''; // separator row
      const tag = content.includes('---') ? 'td' : 'td';
      return '<tr>' + cells.map(c => `<${tag}>${c}</${tag}>`).join('') + '</tr>';
    })
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Numbered lists
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap list items
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Wrap table rows
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)/g, '<table>$1</table>');
  html = html.replace(/<\/table>\s*<table>/g, '');

  return `<p>${html}</p>`;
}

function toggleGenreEditMode() {
  state.genreGuideEditMode = !state.genreGuideEditMode;
  if (state.genreGuideEditMode) {
    dom.genreGuideContent.style.display = 'none';
    dom.genreGuideEdit.style.display = 'flex';
    dom.genreEditArea.value = state.genreGuideContent || '';
    dom.genreEditToggle.textContent = 'Preview';
  } else {
    dom.genreGuideContent.style.display = '';
    dom.genreGuideEdit.style.display = 'none';
    dom.genreEditToggle.textContent = 'Edit';
  }
}

async function saveGenreGuide() {
  if (!state.genreSlug) return;
  const content = dom.genreEditArea.value;
  state.genreGuideContent = content;

  try {
    await fetch(`${API_BASE}/api/genre/${state.genreSlug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    renderGenreGuideContent(content);
    showToast('Genre guide saved');
    toggleGenreEditMode();
  } catch (e) {
    showToast('Save failed: ' + e.message);
  }
}

// ── Inline Genre Explorer (Narrowing Circle) ─────────────────
let genreExplorerAnim = null;
const genreBubbles = [];

function initGenreExplorerCanvas() {
  const canvas = dom.genreExplorerCanvas;
  if (!canvas) return;

  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width || 600;
  canvas.height = rect.height || 400;

  // Initialize bubbles
  genreBubbles.length = 0;
  const genres = Object.keys(GENRE_META);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = Math.min(cx, cy) * 0.7;

  genres.forEach((slug, i) => {
    const angle = (i / genres.length) * Math.PI * 2 - Math.PI / 2;
    genreBubbles.push({
      slug,
      name: GENRE_META[slug].name,
      color: GENRE_META[slug].color,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      targetR: 32,
      r: 32,
      alpha: 0.6,
      targetAlpha: 0.6,
      hover: false,
    });
  });

  // Mouse interaction
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const b of genreBubbles) {
      const dist = Math.hypot(mx - b.x, my - b.y);
      b.hover = dist < b.r + 4;
    }
    canvas.style.cursor = genreBubbles.some(b => b.hover) ? 'pointer' : 'default';
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const b of genreBubbles) {
      const dist = Math.hypot(mx - b.x, my - b.y);
      if (dist < b.r + 4) {
        // Genre selected via explorer
        dom.input.value = `I want to make a ${b.name.toLowerCase()} game`;
        sendMessage();
        return;
      }
    }
  });

  renderGenreExplorerFrame();
}

function renderGenreExplorerFrame() {
  const canvas = dom.genreExplorerCanvas;
  if (!canvas || canvas.style.display === 'none') return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update bubble sizes based on affinity scores
  for (const b of genreBubbles) {
    const score = state.genreAffinityScores[b.slug] || 0;
    b.targetR = 24 + score * 24;
    b.targetAlpha = 0.3 + score * 0.7;
    if (b.hover) { b.targetR += 6; b.targetAlpha = 1; }
    // Lerp
    b.r += (b.targetR - b.r) * 0.1;
    b.alpha += (b.targetAlpha - b.alpha) * 0.1;
  }

  // Draw connections (subtle lines between bubbles)
  ctx.strokeStyle = 'rgba(30, 30, 58, 0.5)';
  ctx.lineWidth = 0.5;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  for (const b of genreBubbles) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // Draw bubbles
  for (const b of genreBubbles) {
    ctx.globalAlpha = b.alpha;

    // Glow
    if (b.alpha > 0.5) {
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 12 * b.alpha;
    }

    // Circle
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${b.color === '#0ff' ? '0,255,255' : b.color === '#8b5cf6' ? '139,92,246' : b.color === '#0f8' ? '0,255,136' : '255,85,85'}, 0.12)`;
    ctx.fill();
    ctx.strokeStyle = b.color;
    ctx.lineWidth = b.hover ? 2 : 1;
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle = b.alpha > 0.5 ? '#e0e0f0' : '#5a5a7a';
    ctx.font = `${Math.max(9, b.r * 0.35)}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.name, b.x, b.y);
  }

  ctx.globalAlpha = 1;

  // Continue animation
  if (!state.genreSlug) {
    genreExplorerAnim = requestAnimationFrame(renderGenreExplorerFrame);
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
