'use strict';

/**
 * OpenArcade Game Builder — Frontend State Machine
 *
 * Phases: PICK_TYPE → PICK_MODE → DESIGN → GENERATING → PLAYING
 */

const API_BASE = '/game-builder-api';

// ── State ────────────────────────────────────────────────────
const state = {
  phase: 'PICK_TYPE',         // PICK_TYPE | PICK_MODE | DESIGN | GENERATING | PLAYING
  gameId: null,
  selectedArchetype: null,    // archetype id from /api/archetypes
  selectedMode: null,         // 'single' | 'multiplayer'
  activeAgents: [],           // computed from ontology selections
  buildChecklistItems: [],    // parsed from game.md H2 sections during GENERATING
  ontologyDimensions: null,   // cached from /api/ontology-dimensions
  messages: [],
  checklist: {
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
  techTree: {},
  conceptArtPrompt: null,
  conceptArtImages: [],
  selectedArt: null,
  forkSeed: null,
  currentIframeSrc: null,
  patchPending: false,
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

// ── Archetype icons ──────────────────────────────────────────
const ARCHETYPE_ICONS = {
  'arcade':       '🕹️',
  'platformer':   '🏃',
  'arena':        '⚔️',
  'strategy':     '♟️',
  'roguelike':    '🗡️',
  'sim-tycoon':   '🏭',
  'narrative':    '📖',
  '3d-open-world':'🌍',
};

// ── Agent category mapping ───────────────────────────────────
const AGENT_CATEGORIES = {
  'lead-architect': 'design', 'html-css': 'code', 'entity': 'code',
  'input': 'code', 'level-designer': 'design', 'ui-overlay': 'code',
  'core-engine': 'code', 'qa-validator': 'qa',
  'sprite-gen': 'assets', 'mesh-gen': 'assets', 'texture': 'assets', 'shader': 'code',
  'game-server': 'backend', 'state-sync': 'backend',
  'physics': 'code', 'npc-ai': 'code', 'narrative': 'design',
  'economy-balance': 'design', 'proc-gen': 'code',
  'sfx': 'audio', 'music': 'audio',
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
  toastContainer:  $('gbToastContainer'),
  globalProgressFill:  $('gbGlobalProgressFill'),
  globalProgressLabel: $('gbGlobalProgressLabel'),

  // New panels
  pickType:        $('gbPickType'),
  pickTypeGrid:    $('gbPickTypeGrid'),
  pickMode:        $('gbPickMode'),
  conceptPanel:    $('gbConceptPanel'),
  conceptImage:    $('gbConceptImage'),
  levelOptions:    $('gbLevelOptions'),
  agentBar:        $('gbAgentBar'),
  buildChecklist:  $('gbBuildChecklist'),

  // Canvases
  confettiCanvas:  $('gbConfettiCanvas'),
  spaceCanvas:     $('gbSpaceCanvas'),

  // Progress
  progressPanel:   $('gbProgressPanel'),
  progressBar:     $('gbProgressBar'),
  progressPct:     $('gbProgressPct'),
  progressStep:    $('gbProgressStep'),
  stepLog:         $('gbStepLog'),
  eta:             $('gbEta'),
  stackInfo:       $('gbStackInfo'),
  consoleBody:     $('gbConsoleBody'),

  // Game
  gamePanel:       $('gbGamePanel'),
  gameTitle:       $('gbGameTitle'),
  gameMeta:        $('gbGameMeta'),
  gameIframe:      $('gbGameIframe'),

  // Agent Grid
  agentGrid:       $('gbAgentGrid'),
  qaOverlay:       $('gbQaOverlay'),
  qaChecklist:     $('gbQaChecklist'),
};

// ── Init ─────────────────────────────────────────────────────
async function init() {
  const params = new URLSearchParams(window.location.search);
  const forkGame = params.get('fork');
  const seedText = params.get('seed');
  const existingId = params.get('id');

  // Init visual effects
  initConfetti();
  initSpaceBackground();

  // Fetch and cache ontology dimensions
  fetchOntologyDimensions();

  // If no ?id= param, show dashboard
  if (!existingId && !forkGame) {
    showDashboard();
    return;
  }

  // Hide dashboard, show main builder
  showBuilder();

  // Wire up input
  if (dom.input) {
    dom.input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    dom.input.addEventListener('input', () => {
      dom.input.style.height = '42px';
      dom.input.style.height = Math.min(dom.input.scrollHeight, 120) + 'px';
    });
  }
  if (dom.sendBtn) dom.sendBtn.addEventListener('click', sendMessage);
  if (dom.generateBtn) dom.generateBtn.addEventListener('click', startGeneration);

  // Try to load existing session
  if (existingId) {
    state.gameId = existingId;
    const loaded = await loadExistingSession(existingId);
    if (loaded) return;
  }

  // New session — start with PICK_TYPE
  state.gameId = forkGame || generateGameId();
  pushGameIdToUrl();

  if (forkGame && seedText) {
    // Fork flow — skip to design
    initGameOnServer(state.gameId, `Fork of ${forkGame}`);
    state.forkSeed = { game: forkGame, text: decodeURIComponent(seedText) };
    addMessage('ai', `Welcome back! I'm picking up from where ${forkGame} left off.\n\nYou said: "${decodeURIComponent(seedText)}"\n\nLet's build on that. What aspects of ${forkGame} do you most want to change?`);
    updateChecklist({});
    setPhase('DESIGN');
  } else {
    // New game — show type picker
    setPhase('PICK_TYPE');
    initPickType();
  }

  updateGlobalProgress();
}

// ── Fetch ontology dimensions ────────────────────────────────
async function fetchOntologyDimensions() {
  try {
    const res = await fetch(`${API_BASE}/api/ontology-dimensions`);
    if (res.ok) {
      state.ontologyDimensions = await res.json();
    }
  } catch (e) {
    console.warn('Ontology dimensions fetch failed:', e);
  }
}

// ── PICK_TYPE ────────────────────────────────────────────────
async function initPickType() {
  try {
    const res = await fetch(`${API_BASE}/api/archetypes`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();

    dom.pickTypeGrid.innerHTML = data.archetypes.map(arch => `
      <div class="gb-type-card" data-archetype="${escHtml(arch.id)}">
        <div class="gb-type-card-icon">${ARCHETYPE_ICONS[arch.id] || '🎮'}</div>
        <div class="gb-type-card-label">${escHtml(arch.label)}</div>
        <div class="gb-type-card-desc">${escHtml(arch.description)}</div>
        <div class="gb-type-card-meta">
          <span>🤖 ${arch.agentCount} agents</span>
          <span>⏱ ~${arch.estimatedTime}s</span>
        </div>
        <div class="gb-type-card-examples">${arch.examples.slice(0, 3).join(', ')}</div>
      </div>
    `).join('');

    // Wire click handlers
    dom.pickTypeGrid.querySelectorAll('.gb-type-card').forEach(card => {
      card.addEventListener('click', () => {
        const archId = card.dataset.archetype;
        const arch = data.archetypes.find(a => a.id === archId);
        state.selectedArchetype = arch;
        setPhase('PICK_MODE');
        initPickMode();
      });
    });
  } catch (e) {
    dom.pickTypeGrid.innerHTML = `<div style="color:var(--danger);grid-column:1/-1;text-align:center">Failed to load archetypes: ${escHtml(e.message)}</div>`;
  }
}

// ── PICK_MODE ────────────────────────────────────────────────
function initPickMode() {
  dom.pickMode.querySelectorAll('.gb-mode-card').forEach(card => {
    card.addEventListener('click', () => {
      state.selectedMode = card.dataset.mode;
      transitionToDesign();
    });
  });
}

// ── Transition to DESIGN ─────────────────────────────────────
async function transitionToDesign() {
  // Init game on server
  const title = state.selectedArchetype?.label || 'New Game';
  await initGameOnServer(state.gameId, title);

  // Compute agents from archetype + mode
  if (state.selectedArchetype) {
    updateAgentsFromSelections(state.selectedArchetype, state.selectedMode);
  }

  // Set phase
  setPhase('DESIGN');
  updateChecklist({});

  // Send welcome message
  const archLabel = state.selectedArchetype?.label || 'game';
  const modeLabel = state.selectedMode === 'multiplayer' ? 'multiplayer' : 'single player';
  addMessage('ai', `Let's build a **${archLabel}** (${modeLabel})!\n\nI've pre-configured ${state.activeAgents.length} agents for this type. Tell me about your game idea — the theme, setting, and what makes it unique.`);

  // Render agent bar
  renderAgentBar();
}

// ── Agent computation from ontology ──────────────────────────
function updateAgentsFromSelections(archetype, mode) {
  if (!state.ontologyDimensions) return;

  const dims = state.ontologyDimensions.dimensions;
  const baseAgents = state.ontologyDimensions.baseAgents || [];
  const added = new Set(baseAgents);
  const skipped = new Set();

  // Use the archetype's ontology to resolve each dimension
  const ontology = archetype.ontology || {};

  // Override multiplayer dimension if mode is multiplayer
  if (mode === 'multiplayer' && ontology['multiplayer'] === 'solo') {
    ontology['multiplayer'] = 'server-auth';
  }

  for (const [dimId, valueId] of Object.entries(ontology)) {
    const dim = dims[dimId];
    if (!dim) continue;
    const val = dim.values.find(v => v.id === valueId);
    if (!val) continue;
    for (const a of (val.agents || [])) added.add(a);
    for (const s of (val.skip || [])) skipped.add(s);
  }

  // Remove skipped (but never base agents)
  for (const s of skipped) {
    if (!baseAgents.includes(s)) added.delete(s);
  }

  state.activeAgents = [...added].sort();

  // Also store in techTree for game.md generation
  if (ontology['visual-style']) state.techTree['rendering'] = ontology['visual-style'];
  if (ontology['multiplayer']) state.techTree['multiplayer-engine'] = ontology['multiplayer'];
  if (ontology['core-mechanics']) state.techTree['core-loop'] = ontology['core-mechanics'];
  if (ontology['audio']) state.techTree['audio-engine'] = ontology['audio'];
  state.techTree['genre'] = archetype.label?.toLowerCase() || '';
}

// ── Agent Bar ────────────────────────────────────────────────
function renderAgentBar() {
  if (!dom.agentBar) return;

  if (state.activeAgents.length === 0) {
    dom.agentBar.innerHTML = '';
    dom.agentBar.classList.remove('has-agents');
    return;
  }

  dom.agentBar.classList.add('has-agents');
  dom.agentBar.innerHTML = state.activeAgents.map(agent => {
    const cat = AGENT_CATEGORIES[agent] || 'code';
    return `<span class="gb-agent-chip" data-cat="${cat}"><span class="gb-agent-chip-dot"></span>${escHtml(agent)}</span>`;
  }).join('');
}

// ── Concept Image ────────────────────────────────────────────
async function updateConceptImage() {
  if (!dom.conceptImage) return;
  dom.conceptImage.innerHTML = '<div class="gb-concept-loading">Generating concept preview...</div>';

  try {
    const res = await fetch(`${API_BASE}/api/imagine-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: state.gameId }),
    });
    if (!res.ok) throw new Error(`Preview API ${res.status}`);
    const data = await res.json();
    if (data.image) {
      dom.conceptImage.innerHTML = `<img src="${data.image}" alt="Concept preview">`;
    }
  } catch (e) {
    dom.conceptImage.innerHTML = '<div class="gb-concept-placeholder">Concept art generates as your design takes shape...</div>';
    console.warn('Concept image error:', e);
  }
}

// ── Level Options ────────────────────────────────────────────
function showLevelOptions(images) {
  if (!dom.levelOptions || !images || images.length === 0) return;
  dom.levelOptions.style.display = 'grid';
  dom.levelOptions.innerHTML = images.map((img, i) => `
    <div class="gb-level-option" data-idx="${i}">
      <img src="${escHtml(img.url || img)}" alt="Level option ${i + 1}">
      <div class="gb-level-option-label">${escHtml(img.label || `Option ${i + 1}`)}</div>
    </div>
  `).join('');

  dom.levelOptions.querySelectorAll('.gb-level-option').forEach(opt => {
    opt.addEventListener('click', () => {
      dom.levelOptions.querySelectorAll('.gb-level-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      const label = opt.querySelector('.gb-level-option-label')?.textContent || 'selected level';
      dom.input.value = `I like "${label}" for the level design`;
      sendMessage();
    });
  });
}

// ── Build Checklist ──────────────────────────────────────────
function initBuildChecklist() {
  if (!dom.buildChecklist) return;

  // Parse game.md into sections
  const md = buildGameMdFromTree();
  const sections = [];
  const h2Regex = /^## (.+)$/gm;
  let match;
  while ((match = h2Regex.exec(md)) !== null) {
    sections.push(match[1]);
  }

  // Default sections if none found
  if (sections.length === 0) {
    sections.push('Core Concept', 'Mechanics', 'Tech Stack', 'Level Design', 'Audio', 'Ready');
  }

  state.buildChecklistItems = sections.map(s => ({ label: s, checked: false }));

  dom.buildChecklist.innerHTML = state.buildChecklistItems.map((item, i) => `
    <div class="gb-build-item" data-idx="${i}">
      <div class="gb-build-check">
        <svg viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <span>${escHtml(item.label)}</span>
    </div>
  `).join('');
}

function checkBuildItem(index) {
  if (index < 0 || index >= state.buildChecklistItems.length) return;
  state.buildChecklistItems[index].checked = true;
  const el = dom.buildChecklist?.querySelector(`[data-idx="${index}"]`);
  if (el) el.classList.add('checked');
}

// Agent-complete → build checklist mapping
const AGENT_CHECKLIST_MAP = {
  'lead-architect': 'Core Concept',
  'html-css': 'Tech Stack',
  'entity': 'Mechanics',
  'level-designer': 'Level Design',
  'sfx': 'Audio',
  'music': 'Audio',
  'core-engine': 'Ready',
};

function checkBuildItemByAgent(agentName) {
  const sectionLabel = AGENT_CHECKLIST_MAP[agentName];
  if (!sectionLabel) return;
  const idx = state.buildChecklistItems.findIndex(item =>
    item.label.toLowerCase().includes(sectionLabel.toLowerCase())
  );
  if (idx >= 0) checkBuildItem(idx);
}

// ── Session Dashboard ─────────────────────────────────────────
async function showDashboard() {
  const dashboard = document.getElementById('gbDashboard');
  const main = document.getElementById('gbMain');
  if (dom.pickType) dom.pickType.style.display = 'none';
  if (dom.pickMode) dom.pickMode.style.display = 'none';
  if (dashboard) dashboard.style.display = '';
  if (main) main.style.display = 'none';

  document.getElementById('gbNewGameBtn')?.addEventListener('click', () => {
    const id = generateGameId();
    window.location.href = `?id=${id}`;
  });

  const grid = document.getElementById('gbDashboardGrid');
  try {
    const res = await fetch(`${API_BASE}/api/sessions`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    const sessions = data.sessions || [];

    if (sessions.length === 0) {
      grid.innerHTML = '<div class="gb-dashboard-empty">No game sessions yet. Click "New Game" to start!</div>';
      return;
    }

    grid.innerHTML = sessions.map(s => {
      const phase = s.phase || 'DESIGN';
      const phaseCls = phase === 'PLAYING' ? 'done' : phase === 'GENERATING' ? 'running' : '';
      const date = s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : '';
      const thumb = s.thumbnail
        ? `<img class="gb-session-thumb" src="${s.thumbnail}" alt="" loading="lazy">`
        : '<div class="gb-session-thumb-placeholder"></div>';
      return `<a href="?id=${escHtml(s.gameId)}" class="gb-session-card">
        ${thumb}
        <div class="gb-session-info">
          <div class="gb-session-title">${escHtml(s.title)}</div>
          <div class="gb-session-meta">
            <span class="gb-session-phase ${phaseCls}">${escHtml(phase)}</span>
            ${s.hasGame ? '<span class="gb-session-badge">playable</span>' : ''}
            <span class="gb-session-date">${date}</span>
          </div>
        </div>
      </a>`;
    }).join('');
  } catch (e) {
    grid.innerHTML = `<div class="gb-dashboard-empty">Could not load sessions: ${escHtml(e.message)}</div>`;
  }
}

function showBuilder() {
  const dashboard = document.getElementById('gbDashboard');
  const main = document.getElementById('gbMain');
  if (dashboard) dashboard.style.display = 'none';
  if (main) main.style.display = '';
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

    if (data.checklist) Object.assign(state.checklist, data.checklist);
    if (data.checklistRelevance) Object.assign(state.checklistRelevance, data.checklistRelevance);

    // Migrate old phase names
    let phase = data.phase || 'DESIGN';
    if (phase === 'EXPLORE' || phase === 'LOAD' || phase === 'VISUALIZE') phase = 'DESIGN';

    updateChecklist({});
    setPhase(phase);
    pushGameIdToUrl();

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
  const phases = ['PICK_TYPE', 'PICK_MODE', 'DESIGN', 'GENERATING', 'PLAYING'];
  const idx = phases.indexOf(phase);

  if (dom.phaseDots) {
    dom.phaseDots.forEach((dot, i) => {
      if (!dot) return;
      dot.classList.toggle('done', i < idx);
      dot.classList.toggle('active', i === idx);
    });
  }

  // Toggle overlays
  if (dom.pickType) dom.pickType.style.display = phase === 'PICK_TYPE' ? 'flex' : 'none';
  if (dom.pickMode) dom.pickMode.style.display = phase === 'PICK_MODE' ? 'flex' : 'none';

  // Toggle main panels
  const isDesignPhase = phase === 'DESIGN';
  if (dom.conceptPanel) dom.conceptPanel.classList.toggle('visible', isDesignPhase);
  if (dom.progressPanel) dom.progressPanel.classList.toggle('visible', phase === 'GENERATING');
  if (dom.gamePanel) dom.gamePanel.classList.toggle('visible', phase === 'PLAYING');

  // Show/hide main area for overlay phases
  const main = document.getElementById('gbMain');
  if (main) main.style.display = (phase === 'PICK_TYPE' || phase === 'PICK_MODE') ? 'none' : '';

  // Chat width
  const chat = document.querySelector('.gb-chat');
  if (chat) {
    chat.classList.toggle('narrow', phase === 'PLAYING');
    chat.classList.toggle('full', false);
  }

  // Agent bar visibility
  if (dom.agentBar) {
    dom.agentBar.style.display = isDesignPhase ? '' : 'none';
  }
}

// ── Chat ──────────────────────────────────────────────────────
async function sendMessage() {
  if (!dom.input) return;
  const text = dom.input.value.trim();
  if (!text || (dom.sendBtn && dom.sendBtn.disabled)) return;

  dom.input.value = '';
  dom.input.style.height = '42px';

  addMessage('user', text);
  state.messages.push({ role: 'user', content: text });

  // In PLAYING phase, route to patch endpoint
  if (state.phase === 'PLAYING') {
    await applyPatch(text);
    setInputEnabled(true);
    dom.input.focus();
    return;
  }

  setInputEnabled(false);
  const typingEl = addTypingIndicator();

  // Trigger parallel knowledge search (non-blocking)
  searchKnowledge(text).catch(() => {});

  try {
    const response = await streamChatRequest(state.messages, state.gameId, (token) => {
      updateTypingWithText(typingEl, token);
    });

    removeTypingIndicator(typingEl);

    if (response.fullText) {
      state.messages.push({ role: 'assistant', content: response.fullText.replace(/<!--[\s\S]*?-->/g, '').trim() });
    }

    // Handle metadata
    if (response.metadata) {
      if (response.metadata.designUpdates) {
        applyDesignUpdates(response.metadata.designUpdates);
        // Maybe generate concept image every few turns
        maybeUpdateConceptImage();
      }
      if (response.metadata.techTreeUpdates) {
        for (const u of response.metadata.techTreeUpdates) {
          if (u.node && u.value) {
            state.techTree[u.node] = u.value;
            const label = u.node.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            showToast(`${label}: ${u.value}`);
          }
        }
        updateGlobalProgress();
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
      if (response.metadata.ontologyDecisions) {
        // Re-compute agents if ontology changed
        for (const d of response.metadata.ontologyDecisions) {
          if (d.dimension && d.value) {
            state.ontologyDecisions = state.ontologyDecisions || {};
            state.ontologyDecisions[d.dimension] = d.value;
          }
        }
      }
    }

    saveSessionState();

  } catch (e) {
    removeTypingIndicator(typingEl);
    addMessage('ai', `Sorry, something went wrong: ${e.message}. Please try again.`);
    console.error('Chat error:', e);
  }

  setInputEnabled(true);
  dom.input.focus();
}

function maybeUpdateConceptImage() {
  // Throttle: only after enough info + every 3 user turns
  if (!state.checklist['core-concept'] || !state.checklist['visual-design']) return;
  const turnCount = state.messages.filter(m => m.role === 'user').length;
  if (state.lastPreviewTurn && turnCount - state.lastPreviewTurn < 3) return;
  state.lastPreviewTurn = turnCount;
  updateConceptImage();
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
          if (!currentBubble) currentBubble = createStreamingBubble();
          updateStreamingBubble(currentBubble, currentBubbleText);
        } else if (msg.type === 'metadata') {
          metadata = { ...metadata, ...msg };
          delete metadata.type;
        }
      } catch {}
    }
  }

  if (currentBubble) finalizeStreamingBubble(currentBubble);
  return { fullText, metadata };
}

// ── Streaming bubble helpers ──────────────────────────────────
function createStreamingBubble() {
  if (!dom.messages) return null;
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
  const cleaned = text.replace(/<!--[\s\S]*?-->/g, '').replace(/<!--[\s\S]*$/g, '');
  bubble.innerHTML = renderMarkdown(cleaned);
  scrollToBottom();
}

function finalizeStreamingBubble(bubble) {
  bubble.classList.remove('gb-streaming');
  renderOptionsFromBubble(bubble);
}

function renderOptionsFromBubble(bubble) {
  const html = bubble.innerHTML;
  const optionRegex = /(?:^|<br>)\s*[-•]\s*(?:<strong>)?(.+?)(?:<\/strong>)?(?:\?)?(?=<br>|$)/g;
  const matches = [];
  let m;
  while ((m = optionRegex.exec(html)) !== null) {
    matches.push({ full: m[0], text: m[1].replace(/<\/?[^>]+>/g, '').replace(/\?$/, '').trim() });
  }

  if (matches.length < 2 || matches.length > 6) return;

  let cleaned = html;
  for (const match of matches) {
    cleaned = cleaned.replace(match.full, '');
  }
  cleaned = cleaned.replace(/(<br>\s*)+$/, '');

  const buttons = matches.map(opt =>
    `<button class="gb-option-btn" data-option="${escHtml(opt.text)}">${escHtml(opt.text)}</button>`
  ).join('');

  bubble.innerHTML = cleaned +
    `<div class="gb-options-row">${buttons}` +
    `<button class="gb-option-btn gb-option-other">Something else...</button></div>`;

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
  if (dom.messages) dom.messages.scrollTop = dom.messages.scrollHeight;
}

function setInputEnabled(enabled) {
  if (dom.input) dom.input.disabled = !enabled;
  if (dom.sendBtn) dom.sendBtn.disabled = !enabled;
}

// ── Concept art flow ──────────────────────────────────────────
function showConceptArtButton() {
  const msg = document.createElement('div');
  msg.className = 'gb-msg ai';
  msg.innerHTML = `
    <div class="gb-avatar">AI</div>
    <div class="gb-bubble">
      Ready to see some concept art! Click below to generate visual directions.
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

  // Show loading in concept panel
  if (dom.conceptImage) {
    dom.conceptImage.innerHTML = '<div class="gb-concept-loading">Generating concept art via Grok...</div>';
  }

  try {
    const res = await fetch(`${API_BASE}/api/imagine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: state.conceptArtPrompt, gameId: state.gameId }),
    });

    if (!res.ok) throw new Error(`Imagine API ${res.status}`);
    const data = await res.json();
    state.conceptArtImages = data.images || [];

    // Show first image in concept panel
    if (state.conceptArtImages.length > 0 && dom.conceptImage) {
      dom.conceptImage.innerHTML = `<img src="${state.conceptArtImages[0]}" alt="Concept art">`;
    }

    // Add thumbnails to chat for selection
    if (state.conceptArtImages.length > 1) {
      addConceptArtThumbnails(state.conceptArtImages);
    }

    // Auto-approve first if only one
    if (state.conceptArtImages.length === 1) {
      state.selectedArt = state.conceptArtImages[0];
      approveArt();
    }

  } catch (e) {
    if (dom.conceptImage) {
      dom.conceptImage.innerHTML = `<div style="color:var(--danger);font-size:0.75rem">${escHtml(e.message)}</div>`;
    }
    console.error('Concept art error:', e);
  }
}

function addConceptArtThumbnails(images) {
  const msgEl = document.createElement('div');
  msgEl.className = 'gb-msg ai';
  let thumbsHtml = images.map((url, i) =>
    `<img class="gb-art-thumb" src="${url}" alt="Option ${i + 1}" data-url="${escHtml(url)}">`
  ).join('');
  msgEl.innerHTML = `
    <div class="gb-avatar">AI</div>
    <div class="gb-bubble">
      Here are ${images.length} concept directions. Click one to select it:
      <div class="gb-art-row">${thumbsHtml}</div>
    </div>
  `;
  dom.messages.appendChild(msgEl);
  scrollToBottom();

  msgEl.querySelectorAll('.gb-art-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      msgEl.querySelectorAll('.gb-art-thumb').forEach(t => t.classList.remove('selected'));
      thumb.classList.add('selected');
      state.selectedArt = thumb.dataset.url;
      // Update concept panel
      if (dom.conceptImage) {
        dom.conceptImage.innerHTML = `<img src="${state.selectedArt}" alt="Concept art">`;
      }
      approveArt();
    });
  });
}

function approveArt() {
  addMessage('ai', `Concept art selected! Your game is ready to generate.\n\nClick "Generate Game →" when you're ready. The process takes 1–15 minutes depending on complexity.`);
  dom.generateBtn.classList.add('visible');
  dom.generateBtn.textContent = 'Generate Game →';
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

  // Save game.md
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

  // Init build checklist
  initBuildChecklist();

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

      let currentEvent = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
          continue;
        }
        if (line.startsWith(': ')) continue;
        if (!line.startsWith('data: ')) continue;

        try {
          const msg = JSON.parse(line.slice(6));

          if (currentEvent === 'agent-plan') {
            renderDynamicAgentGrid(msg);
            addConsoleLine(`> Agent plan: ${msg.agentCount} agents (${msg.archetype} archetype)`, 'system');
            addConsoleLine(`> Estimated build time: ~${msg.estimatedSeconds}s`, 'system');
          } else if (currentEvent === 'markdown') {
            addConsoleLine(`> Wrote ${msg.file}`, 'system');
          } else if (currentEvent === 'agent-start') {
            updateAgentCard(msg.agent, 'running', msg.tier);
            addConsoleLine(`> [${msg.agent}] Starting...`, 'system');
          } else if (currentEvent === 'agent-complete') {
            updateAgentCard(msg.agent, 'done', msg.tier, msg.duration);
            addConsoleLine(`> [${msg.agent}] Complete (${msg.duration?.toFixed(1)}s)`, 'system');
            // Check off build checklist item
            checkBuildItemByAgent(msg.agent);
          } else if (currentEvent === 'agent-error') {
            updateAgentCard(msg.agent, 'error', msg.tier);
            addConsoleLine(`> [${msg.agent}] ERROR: ${msg.error}`, 'error');
          } else if (currentEvent === 'blueprint') {
            addConsoleLine(`> Blueprint: ${msg.contractCount} contracts defined`, 'system');
          } else if (currentEvent === 'tier-complete') {
            addConsoleLine(`> Tier ${msg.tier} complete`, 'system');
          } else if (currentEvent === 'qa-result') {
            showQaResult(msg);
          } else if (currentEvent === 'fallback') {
            addConsoleLine(`> Falling back: ${msg.reason}`, 'error');
            if (dom.agentGrid) dom.agentGrid.style.display = 'none';
          }

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
          if (msg.error && currentEvent !== 'agent-error') {
            throw new Error(msg.error);
          }
          if (msg.rendering) {
            updateStackDisplay(msg);
          }

          currentEvent = '';
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
  setGlobalProgress(pct);

  const friendlyLabel = STEP_DESCRIPTIONS[stepLabel?.replace(/\s+/g, '-')] || stepLabel || '';
  dom.progressStep.textContent = friendlyLabel;

  if (stepLabel) addStepToLog(stepLabel, pct);

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

  const prev = dom.stepLog.querySelector('.gb-step-item.active');
  if (prev) {
    prev.classList.remove('active');
    prev.classList.add('done');
    const icon = prev.querySelector('.gb-step-icon');
    if (icon) icon.textContent = '\u2713';
  }

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
    addMessage('ai', 'Your game is live! Play it in the preview. Type here to modify it — I\'ll apply changes instantly for visual tweaks, or rebuild for bigger changes.');
  }, 600);
}

// ── Patch flow (Phase: PLAYING) ───────────────────────────────
async function applyPatch(instruction) {
  if (state.patchPending) return;
  state.patchPending = true;
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
      injectCSSIntoIframe(result.css);
      addPatchBadge('instant', 'Instant — CSS patched');
    } else if (result.type === 'fast_rebuild') {
      addPatchBadge('fast', 'Rebuilding — keep playing…');
      setTimeout(() => {
        dom.gameIframe.src = state.currentIframeSrc + '?t=' + Date.now();
      }, 2000);
    } else if (result.type === 'full_rebuild') {
      addPatchBadge('full', 'Major change — rebuilding in background…');
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

// ── Global Progress Bar ───────────────────────────────────────
function updateGlobalProgress() {
  let pct = 0;
  const tree = state.techTree;

  if (tree['genre']) pct += 15;
  if (tree['theme']) pct += 15;
  if (tree['controls']) pct += 10;
  if (tree['core-loop']) pct += 10;
  if (tree['win-condition']) pct += 10;
  if (tree['progression']) pct += 10;
  if (tree['visual-style']) pct += 5;
  if (tree['concept-art']) pct += 5;
  if (tree['level-design']) pct += 5;
  if (tree['ready']) pct += 5;

  setGlobalProgress(pct);
}

function setGlobalProgress(pct) {
  if (dom.globalProgressFill) dom.globalProgressFill.style.width = pct + '%';
  if (dom.globalProgressLabel) dom.globalProgressLabel.textContent = pct + '%';
}

// ── game.md from tech tree ────────────────────────────────────
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

  if (tree['visual-style'] || tree['concept-art'] || tree['level-design']) {
    md += `## Polish & Visuals\n`;
    if (tree['visual-style']) md += `- Visual Style: ${tree['visual-style']}\n`;
    if (tree['concept-art']) md += `- Concept Art: ${tree['concept-art']}\n`;
    if (tree['level-design']) md += `- Level Design: ${tree['level-design']}\n`;
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
      state.checklistRelevance[s] = true;
    }
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

  const relevant = Object.entries(state.checklist).filter(([key]) => state.checklistRelevance[key]);
  container.innerHTML = relevant.map(([key, done]) => {
    const cls = done ? 'done' : 'needs-info';
    return `<div class="gb-check ${cls}"><div class="gb-check-dot"></div>${CHECK_LABELS[key]}</div>`;
  }).join('');

  const doneCount = relevant.filter(([, d]) => d).length;
  const pct = relevant.length ? Math.round((doneCount / relevant.length) * 100) : 0;
  const bar = document.getElementById('gbDesignProgress');
  if (bar) bar.style.width = pct + '%';
}

// ── Dynamic Agent Grid ────────────────────────────────────────
function renderDynamicAgentGrid(plan) {
  const grid = dom.agentGrid;
  if (!grid) return;
  grid.innerHTML = '';

  const tierLabels = {
    0: 'TIER 0: PLANNING',
    1: `TIER 1: DEPARTMENTS (${(plan.tiers[1] || []).length} agents, parallel)`,
    2: 'TIER 2: INTEGRATION',
    3: 'TIER 3: QUALITY CHECK',
  };

  for (const [tierNum, agents] of Object.entries(plan.tiers)) {
    if (!agents || agents.length === 0) continue;
    const tierEl = document.createElement('div');
    tierEl.className = 'gb-agent-tier';
    tierEl.setAttribute('data-tier', tierNum);

    const label = document.createElement('div');
    label.className = 'gb-agent-tier-label';
    label.textContent = tierLabels[tierNum] || `TIER ${tierNum}`;
    tierEl.appendChild(label);

    const agentsEl = document.createElement('div');
    agentsEl.className = 'gb-agent-tier-agents';

    for (const agentName of agents) {
      const card = document.createElement('div');
      card.className = 'gb-agent-card waiting';
      card.setAttribute('data-agent', agentName);
      card.innerHTML = `
        <div class="gb-agent-name">${agentName}</div>
        <div class="gb-agent-status">waiting</div>
        <div class="gb-agent-duration"></div>
      `;
      agentsEl.appendChild(card);
    }

    tierEl.appendChild(agentsEl);
    grid.appendChild(tierEl);
  }
}

function updateAgentCard(agentName, status, tier, duration) {
  let card = document.querySelector(`.gb-agent-card[data-agent="${agentName}"]`);

  if (!card) {
    const tierStr = String(tier ?? 1);
    let tierAgents = document.querySelector(`.gb-agent-tier[data-tier="${tierStr}"] .gb-agent-tier-agents`);

    if (!tierAgents) {
      const tierEl = document.createElement('div');
      tierEl.className = 'gb-agent-tier';
      tierEl.setAttribute('data-tier', tierStr);
      tierEl.innerHTML = `<div class="gb-agent-tier-label">TIER ${tierStr}</div>`;
      tierAgents = document.createElement('div');
      tierAgents.className = 'gb-agent-tier-agents';
      tierEl.appendChild(tierAgents);
      if (dom.agentGrid) dom.agentGrid.appendChild(tierEl);
    }

    card = document.createElement('div');
    card.className = 'gb-agent-card waiting';
    card.setAttribute('data-agent', agentName);
    card.innerHTML = `
      <div class="gb-agent-name">${agentName}</div>
      <div class="gb-agent-status">waiting</div>
      <div class="gb-agent-duration"></div>
    `;
    tierAgents.appendChild(card);
  }

  card.className = `gb-agent-card ${status}`;
  const statusEl = card.querySelector('.gb-agent-status');
  if (statusEl) statusEl.textContent = status;

  if (duration !== undefined) {
    const durEl = card.querySelector('.gb-agent-duration');
    if (durEl) durEl.textContent = `${duration.toFixed(1)}s`;
  }
}

// ── QA Result Display ─────────────────────────────────────────
function showQaResult(result) {
  if (!dom.qaOverlay || !dom.qaChecklist) return;
  dom.qaOverlay.style.display = '';

  const passLabel = result.pass ? 'PASSED' : 'ISSUES FOUND';
  const passClass = result.pass ? 'pass' : 'fail';
  const score = result.score || result.visualScore || 0;

  let html = `<div class="gb-qa-status ${passClass}">${passLabel} (${score}/100)</div>`;

  if (result.issues?.length) {
    html += '<div class="gb-qa-issues">';
    for (const issue of result.issues.slice(0, 8)) {
      const sev = issue.severity || 'warning';
      html += `<div class="gb-qa-issue ${sev}">
        <span class="gb-qa-sev">[${sev}]</span> ${escHtml(issue.description || issue.message || '')}
        ${issue.fix ? `<div class="gb-qa-fix">Fix: ${escHtml(issue.fix)}</div>` : ''}
      </div>`;
    }
    html += '</div>';
  }

  if (result.fixed) {
    html += '<div class="gb-qa-fixed">Auto-fixed and re-validated</div>';
  }

  dom.qaChecklist.innerHTML = html;
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
      showToast('Link copied!');
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

// ── Confetti Particle System ──────────────────────────────────
const confettiParticles = [];
const CONFETTI_COLORS = ['#0ff', '#8b5cf6', '#0f8', '#fa0', '#f55', '#f0a', '#4df'];
const MAX_CONFETTI = 150;

function initConfetti() {
  const canvas = dom.confettiCanvas;
  if (!canvas) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  document.addEventListener('mousemove', (e) => {
    // Spawn 2-3 particles
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      if (confettiParticles.length >= MAX_CONFETTI) break;
      confettiParticles.push({
        x: e.clientX + (Math.random() - 0.5) * 10,
        y: e.clientY + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3 - 1,
        size: 2 + Math.random() * 4,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
        life: 1,
        decay: 0.015 + Math.random() * 0.02,
      });
    }
  });

  requestAnimationFrame(renderConfetti);
}

function renderConfetti() {
  const canvas = dom.confettiCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const p = confettiParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08; // gravity
    p.life -= p.decay;

    if (p.life <= 0) {
      confettiParticles.splice(i, 1);
      continue;
    }

    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;

    if (p.shape === 'rect') {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 0.6);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  requestAnimationFrame(renderConfetti);
}

// ── Space Background (Parallax Starfield) ─────────────────────
const starLayers = [[], [], []];
const floatingObjects = [];
let mouseX = 0, mouseY = 0;

function initSpaceBackground() {
  const canvas = dom.spaceCanvas;
  if (!canvas) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  // Layer 0: distant (200 stars)
  for (let i = 0; i < 200; i++) {
    starLayers[0].push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 0.5 + Math.random() * 0.8,
      alpha: 0.2 + Math.random() * 0.3,
      speed: 0.02,
    });
  }

  // Layer 1: mid (100 stars)
  for (let i = 0; i < 100; i++) {
    starLayers[1].push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 0.8 + Math.random() * 1.2,
      alpha: 0.3 + Math.random() * 0.4,
      speed: 0.06,
    });
  }

  // Layer 2: close (40 stars)
  for (let i = 0; i < 40; i++) {
    starLayers[2].push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 1.2 + Math.random() * 1.5,
      alpha: 0.5 + Math.random() * 0.5,
      speed: 0.12,
    });
  }

  // Floating emoji objects
  const emojis = ['🪐', '☄️', '🚀', '🛸', '⭐', '🌙'];
  for (const emoji of emojis) {
    floatingObjects.push({
      emoji,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.2,
      size: 16 + Math.random() * 12,
      alpha: 0.15 + Math.random() * 0.15,
    });
  }

  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  requestAnimationFrame(renderSpaceBackground);
}

function renderSpaceBackground() {
  if (document.hidden) {
    requestAnimationFrame(renderSpaceBackground);
    return;
  }

  const canvas = dom.spaceCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw star layers with parallax
  const parallaxStrength = [4, 10, 20];
  for (let layer = 0; layer < 3; layer++) {
    const offsetX = mouseX * parallaxStrength[layer];
    const offsetY = mouseY * parallaxStrength[layer];

    for (const star of starLayers[layer]) {
      // Slow drift
      star.y += star.speed;
      if (star.y > canvas.height + 5) {
        star.y = -5;
        star.x = Math.random() * canvas.width;
      }

      const sx = star.x + offsetX;
      const sy = star.y + offsetY;

      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = '#e0e0f0';
      ctx.beginPath();
      ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw floating objects
  for (const obj of floatingObjects) {
    obj.x += obj.vx;
    obj.y += obj.vy;

    // Wrap around
    if (obj.x < -30) obj.x = canvas.width + 30;
    if (obj.x > canvas.width + 30) obj.x = -30;
    if (obj.y < -30) obj.y = canvas.height + 30;
    if (obj.y > canvas.height + 30) obj.y = -30;

    const ox = obj.x + mouseX * 15;
    const oy = obj.y + mouseY * 15;

    ctx.globalAlpha = obj.alpha;
    ctx.font = `${obj.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(obj.emoji, ox, oy);
  }

  ctx.globalAlpha = 1;
  requestAnimationFrame(renderSpaceBackground);
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
  str = str.replace(/<!--[\s\S]*?-->/g, '').replace(/<!--[\s\S]*$/g, '');
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

// ── Knowledge search (non-blocking, enriches context) ─────────
async function searchKnowledge(text) {
  try {
    const res = await fetch(`${API_BASE}/api/knowledge/search?q=${encodeURIComponent(text)}&limit=3`);
    if (!res.ok) return;
    // Results are used server-side to enrich chat context
  } catch {}
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();
  initToolbar();
});
