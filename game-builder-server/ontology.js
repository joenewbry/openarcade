'use strict';

/**
 * Library Ontology — auto-selects the right tech stack based on game properties.
 * Called after the design conversation is complete.
 */

// Server infrastructure definitions
const SERVERS = {
  'matchmaking': {
    name: 'OpenArcade Matchmaking',
    host: process.env.MATCHMAKER_HOST || 'openarcade.net',
    port: 8092,
    path: '/matchmaker',
    capabilities: ['room-management', 'quick-play', 'join-specific', 'room-messaging'],
    clientSnippet: `<script src="https://cdn.socket.io/4.6.2/socket.io.min.js"></script>
<script>
  const matchmaker = io(MATCHMAKER_URL, { path: '/matchmaker' });
  matchmaker.emit('quick-play', { gameId: GAME_ID });
  matchmaker.on('room-update', (room) => { /* update lobby UI */ });
</script>`,
  },
};

// CDN-vetted library definitions
const LIBS = {
  'three': {
    name: 'Three.js',
    version: 'r134',
    cdn: 'https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.min.js',
    capability: 'rendering-3d',
    description: '3D WebGL rendering',
    whenToUse: 'Any game requiring 3D graphics or first-person perspective',
  },
  'matter': {
    name: 'Matter.js',
    version: '0.19.0',
    cdn: 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js',
    capability: 'physics',
    description: '2D rigid body physics',
    whenToUse: 'Platformers, physics sandboxes — when you need gravity, collision shapes, joints',
  },
  'planck': {
    name: 'Planck.js',
    version: '0.3.6',
    cdn: 'https://cdn.jsdelivr.net/npm/planck-js@0.3.6/dist/planck-with-testbed.min.js',
    capability: 'physics',
    description: '2D soft/rigid body physics (Box2D port)',
    whenToUse: 'When soft body simulation or complex joint types are needed',
  },
  'socket.io': {
    name: 'Socket.io Client',
    version: '4.6.2',
    cdn: 'https://cdn.socket.io/4.6.2/socket.io.min.js',
    capability: 'multiplayer-server',
    description: 'WebSocket client for server-authoritative multiplayer',
    whenToUse: 'Online multiplayer requiring server authority (turn-based, MMO, leaderboards)',
  },
  'colyseus': {
    name: 'Colyseus.js',
    version: '0.15.12',
    cdn: 'https://cdn.jsdelivr.net/npm/colyseus.js@0.15.12/dist/colyseus.js',
    capability: 'multiplayer-authoritative',
    description: 'Authoritative multiplayer game framework',
    whenToUse: 'Real-time online multiplayer with authoritative server state',
  },
  'peerjs': {
    name: 'PeerJS',
    version: '1.4.7',
    cdn: 'https://cdn.jsdelivr.net/npm/peerjs@1.4.7/dist/peerjs.min.js',
    capability: 'multiplayer-p2p',
    description: 'P2P WebRTC connections between browsers',
    whenToUse: 'Local co-op or 2-player games where P2P is sufficient (no server needed)',
  },
  'cannon': {
    name: 'Cannon.js',
    version: '0.6.2',
    cdn: 'https://cdn.jsdelivr.net/npm/cannon@0.6.2/build/cannon.min.js',
    capability: 'physics-3d',
    description: '3D rigid body physics engine',
    whenToUse: '3D games or FPS that need realistic physics (gravity, collisions, projectiles)',
  },
  'howler': {
    name: 'Howler.js',
    version: '2.2.4',
    cdn: 'https://cdn.jsdelivr.net/npm/howler@2.2.4/dist/howler.min.js',
    capability: 'audio',
    description: 'Web audio manager for sound files (mp3/ogg)',
    whenToUse: 'When using external audio files; overkill for procedural Web Audio API sounds',
  },
  'tone': {
    name: 'Tone.js',
    version: '14.7.77',
    cdn: 'https://cdn.jsdelivr.net/npm/tone@14.7.77/build/Tone.js',
    capability: 'audio-synthesis',
    description: 'Music synthesis and scheduling',
    whenToUse: 'Music/rhythm games, synthesizer games, procedurally generated music',
  },
};

/**
 * Select the tech stack based on game design properties.
 * @param {object} design - Extracted from game.md / conversation
 * @param {string} design.genre - e.g. 'platformer', 'puzzle', 'fps', 'strategy'
 * @param {string} design.renderingNeeds - '2d-simple', '2d-physics', '3d'
 * @param {string} design.physicsNeeds - 'none', 'basic', 'complex'
 * @param {string} design.multiplayerType - 'none', 'local', 'p2p', 'server', 'authoritative'
 * @param {string} design.audioNeeds - 'none', 'sfx', 'sfx-music', 'synthesis'
 * @param {boolean} design.hasAI - whether NPC/enemy AI is present
 * @returns {object} selected stack with justifications
 */
function selectStack(design) {
  const stack = {
    rendering: 'Canvas 2D',
    renderingLib: null,
    physics: 'none',
    physicsLib: null,
    multiplayer: 'none',
    multiplayerLib: null,
    audio: 'Web Audio API',
    audioLib: null,
    cdns: [],
    justification: [],
  };

  // Rendering
  if (design.renderingNeeds === '3d' || design.genre === 'fps' || design.genre === '3d') {
    stack.rendering = 'Three.js r134';
    stack.renderingLib = LIBS['three'];
    stack.cdns.push(LIBS['three'].cdn);
    stack.justification.push('Three.js: 3D rendering required');
    // 3D physics
    if (design.physicsNeeds !== 'none') {
      stack.physics = 'Cannon.js 0.6.2';
      stack.physicsLib = LIBS['cannon'];
      stack.cdns.push(LIBS['cannon'].cdn);
      stack.justification.push('Cannon.js: 3D rigid body physics');
    }
  }

  // Physics
  if (design.physicsNeeds === 'complex' || design.genre === 'physics-sandbox') {
    stack.physics = 'Planck.js 0.3.6';
    stack.physicsLib = LIBS['planck'];
    stack.cdns.push(LIBS['planck'].cdn);
    stack.justification.push('Planck.js: complex physics / soft body needed');
  } else if (design.physicsNeeds === 'basic' || ['platformer', 'pinball', 'billiards'].includes(design.genre)) {
    stack.physics = 'Matter.js 0.19.0';
    stack.physicsLib = LIBS['matter'];
    stack.cdns.push(LIBS['matter'].cdn);
    stack.justification.push('Matter.js: rigid body physics for platformer/pinball');
  }

  // Multiplayer
  if (design.multiplayerType === 'authoritative') {
    stack.multiplayer = 'Colyseus 0.15';
    stack.multiplayerLib = LIBS['colyseus'];
    stack.cdns.push(LIBS['colyseus'].cdn);
    stack.justification.push('Colyseus: server-authoritative real-time multiplayer');
    stack.server = SERVERS['matchmaking'];
    stack.justification.push('OpenArcade Matchmaking: lobby and room management');
  } else if (design.multiplayerType === 'server' || design.multiplayerType === 'online') {
    stack.multiplayer = 'Socket.io 4.6';
    stack.multiplayerLib = LIBS['socket.io'];
    stack.cdns.push(LIBS['socket.io'].cdn);
    stack.justification.push('Socket.io: online multiplayer / turn-based server sync');
    stack.server = SERVERS['matchmaking'];
    stack.justification.push('OpenArcade Matchmaking: lobby and room management');
  } else if (design.multiplayerType === 'p2p') {
    stack.multiplayer = 'PeerJS 1.4';
    stack.multiplayerLib = LIBS['peerjs'];
    stack.cdns.push(LIBS['peerjs'].cdn);
    stack.justification.push('PeerJS: P2P WebRTC for local co-op over LAN/web');
  }

  // Audio
  if (design.audioNeeds === 'synthesis' || design.genre === 'music' || design.genre === 'rhythm') {
    stack.audio = 'Tone.js 14';
    stack.audioLib = LIBS['tone'];
    stack.cdns.push(LIBS['tone'].cdn);
    stack.justification.push('Tone.js: music synthesis / rhythm game audio');
  } else if (design.audioNeeds === 'sfx-files') {
    stack.audio = 'Howler.js 2.2';
    stack.audioLib = LIBS['howler'];
    stack.cdns.push(LIBS['howler'].cdn);
    stack.justification.push('Howler.js: external audio file playback');
  }
  // Default: Web Audio API (no CDN needed)

  return stack;
}

/**
 * Generate the HTML script tag block for the selected CDNs.
 * Includes a 2-second load timeout fallback for each CDN lib.
 */
function generateCDNTags(stack) {
  if (!stack.cdns.length) return '';

  const tags = stack.cdns.map((cdnUrl) => {
    const libName = Object.values(LIBS).find(l => l.cdn === cdnUrl)?.name || 'Library';
    return `  <script>
    (function() {
      var t = setTimeout(function() {
        document.body.innerHTML = '<div style="color:#f55;font-family:monospace;padding:20px">Failed to load ${libName} from CDN. Please refresh.</div>';
      }, 2000);
      var s = document.createElement('script');
      s.src = '${cdnUrl}';
      s.onload = function() { clearTimeout(t); };
      document.head.appendChild(s);
    })();
  </script>`;
  });
  return tags.join('\n');
}

/**
 * Extract design properties from a game.md string.
 * Simple heuristic extraction — Claude should provide structured JSON in practice.
 */
function extractDesignFromGameMd(gameMdText) {
  const design = {
    genre: 'arcade',
    renderingNeeds: '2d-simple',
    physicsNeeds: 'none',
    multiplayerType: 'none',
    audioNeeds: 'sfx',
    hasAI: false,
  };

  const lower = gameMdText.toLowerCase();

  // Genre
  if (/platformer/i.test(lower)) design.genre = 'platformer';
  else if (/fps|first.person/i.test(lower)) { design.genre = 'fps'; design.renderingNeeds = '3d'; }
  else if (/3d|three\.?js/i.test(lower)) { design.renderingNeeds = '3d'; }
  else if (/physics.sandbox|soft.body/i.test(lower)) { design.physicsNeeds = 'complex'; }
  else if (/pinball|billiard|physics/i.test(lower)) design.physicsNeeds = 'basic';

  // Multiplayer
  if (/colyseus|authoritative/i.test(lower)) design.multiplayerType = 'authoritative';
  else if (/socket\.io|online.multi|matchmak|lobby|room.based/i.test(lower)) design.multiplayerType = 'server';
  else if (/peerjs|p2p|peer.to.peer/i.test(lower)) design.multiplayerType = 'p2p';
  else if (/multiplayer|co-?op|versus|pvp/i.test(lower)) design.multiplayerType = 'server';

  // Audio
  if (/tone\.js|synthesis|rhythm/i.test(lower)) design.audioNeeds = 'synthesis';
  else if (/howler|audio.file/i.test(lower)) design.audioNeeds = 'sfx-files';

  // AI
  if (/pathfinding|a\*|behavior.tree|ai.enemy|npc/i.test(lower)) design.hasAI = true;

  return design;
}

module.exports = { selectStack, generateCDNTags, extractDesignFromGameMd, LIBS, SERVERS };
