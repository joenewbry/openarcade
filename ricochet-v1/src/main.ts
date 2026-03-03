import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { InputManager } from './input-manager.js';
import { PlayerController } from './player-controller.js';
import { AKWeapon } from './weapon-ak';
import { BulletSystem, createBulletSystem } from './bullet-system.ts';
import { WarehouseArena } from './arena-warehouse.js';
import { ContainerYardArena } from './arena-containers.js';
import { createHealthSystem } from './health-system.ts';
import { matchSystem, type MatchSnapshot } from './match-system.ts';
import { ScoreboardSystem } from './scoreboard-system.ts';
import { AmmoHUD } from './hud-ammo.ts';
import {
  createRespawnSystem,
  type PlayerRespawnedDetail,
  type RespawnTickDetail
} from './respawn-system.ts';
import { NetworkClient } from './network/network-client.ts';
import { NetworkState } from './network/network-state.ts';
import { LobbySystem } from './lobby-system.ts';
import { GlassCharacterSystem } from './glass-character-system.ts';
import type {
  NetServerMessage,
  PlayerTransform,
  ScoreMap,
  Vec3
} from './network/network-types.ts';

const SHARED_CHARACTER = {
  id: 'hazmat-yellow',
  name: 'Glass Cannon',
  model: 'Character_Hazmat.gltf',
  color: '#4ecdc4',
  description: 'Single shared Glass Cannon profile'
};

const CHARACTERS = [SHARED_CHARACTER];

const ONE_SHOT_HP = 1;
const ROUND_END_NOTE = 'ONE SHOT';

type DummyTargetState = {
  mesh: THREE.Mesh;
  baseScale: number;
  baseColor: THREE.Color;
  hitsRemaining: number;
};

declare global {
  interface Window {
    healthHUD?: any;
    game?: RicochetGame;
    AmmoHUD?: typeof AmmoHUD;
  }
}

class RicochetGame {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;

  private selectedCharacter: string = SHARED_CHARACTER.id;
  private gameState: 'menu' | 'loading' | 'playing' = 'menu';
  private loader!: GLTFLoader;
  private characterModels: Map<string, THREE.Group> = new Map();
  private dummyTargets: Map<string, DummyTargetState> = new Map();
  private pendingGlassStateTimer: number | null = null;
  private localPlayerMaterials: WeakMap<THREE.Mesh, { color: THREE.Color; emissive: THREE.Color; roughness: number; metalness: number; transparent: boolean; opacity: number } > = new WeakMap();
  private ambientAudioContext: AudioContext | null = null;
  private ambientMusicInterval: number | null = null;
  private musicEnabled = true;

  private inputManager: InputManager;
  private playerController: PlayerController;
  private weapon: AKWeapon | null = null;
  private bulletSystem: BulletSystem | null = null;
  private healthSystem: any | null = null;
  private ammoHUD: AmmoHUD | null = null;
  private firstPersonBodyProxy: THREE.Group | null = null;
  private glassCharacterSystem: GlassCharacterSystem;
  private respawnSystem = createRespawnSystem({ respawnDelayMs: 5000, arena: 'warehouse' });
  private isRespawning = false;

  private warehouseArena: WarehouseArena;
  private containerYardArena: ContainerYardArena;
  private currentArena: 'warehouse' | 'container' = 'warehouse';

  private pendingInviteId: string | null;
  private networkMode: 'offline' | 'host' | 'client' = 'offline';
  private networkClient: NetworkClient | null = null;
  private networkState: NetworkState = new NetworkState();
  private remotePlayerMesh: THREE.Mesh | null = null;
  private networkStatusEl: HTMLElement | null = null;
  private scoreboardSystem: ScoreboardSystem;
  private lobbySystem: LobbySystem;
  private awaitingLobbyReady = false;
  private onlineMatchStarting = false;
  private pendingJoinInviteId: string | null = null;
  private activeLobbyFlow: 'host' | 'join' | null = null;
  private pingIntervalId: number | null = null;
  private lastNetworkSyncMs = 0;
  private lastFrameMs = performance.now();

  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.pendingInviteId = params.get('invite');

    this.init();
    this.glassCharacterSystem = new GlassCharacterSystem(this.scene, this.camera);
    this.scoreboardSystem = new ScoreboardSystem();
    this.lobbySystem = new LobbySystem({
      pendingInviteId: this.pendingInviteId,
      onRetry: () => {
        void this.retryLobbyFlow();
      },
      onBack: () => {
        this.returnToCharacterMenu();
      }
    });
    this.setupCharacterSelection();
    this.setupWeapon();

    this.inputManager = new InputManager();
    this.playerController = new PlayerController(this.camera, this.scene, this.inputManager);

    this.warehouseArena = new WarehouseArena(this.scene);
    this.containerYardArena = new ContainerYardArena(this.scene);

    this.setupArenaControls();
    this.setupNetworkStatusUI();
    this.setupRespawnHooks();
    this.setupMatchHooks();
    this.setGameplayOverlayVisible(false);

    window.game = this;
    window.addEventListener('weaponFired', this.onWeaponFired as EventListener);
  }

  public getHealthSystem(): any | null {
    return this.healthSystem;
  }

  private setGameplayOverlayVisible(visible: boolean): void {
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
      crosshair.style.display = visible ? 'block' : 'none';
    }

    const pointerHint = document.getElementById('pointer-lock-hint');
    if (pointerHint && !visible) {
      pointerHint.style.display = 'none';
    }

    if (this.firstPersonBodyProxy) {
      this.firstPersonBodyProxy.visible = visible;
    }
  }

  private ensureFirstPersonBodyProxy(): void {
    if (this.firstPersonBodyProxy) return;

    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'fp-body-proxy';
    bodyGroup.position.set(0, -0.65, -0.35);
    bodyGroup.layers.set(1);

    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0xb07a5a,
      roughness: 0.65,
      metalness: 0.0,
      depthTest: false,
      depthWrite: false
    });

    const sleeveMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d313b,
      roughness: 0.8,
      metalness: 0.05,
      depthTest: false,
      depthWrite: false
    });

    const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.28, 3, 8), armMaterial);
    rightArm.position.set(0.18, -0.02, -0.18);
    rightArm.rotation.set(0.1, 0.1, -0.7);
    rightArm.renderOrder = 990;

    const leftArm = rightArm.clone();
    leftArm.position.set(-0.18, -0.02, -0.18);
    leftArm.rotation.set(0.1, -0.1, 0.7);

    const rightSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.22, 10), sleeveMaterial);
    rightSleeve.position.set(0.18, 0.12, -0.22);
    rightSleeve.rotation.set(0.3, 0.1, -0.7);
    rightSleeve.renderOrder = 989;

    const leftSleeve = rightSleeve.clone();
    leftSleeve.position.set(-0.18, 0.12, -0.22);
    leftSleeve.rotation.set(0.3, -0.1, 0.7);

    bodyGroup.add(rightArm, leftArm, rightSleeve, leftSleeve);
    this.camera.layers.enable(1);
    this.camera.add(bodyGroup);

    this.firstPersonBodyProxy = bodyGroup;
    this.glassCharacterSystem.applyGlassToFirstPersonProxy(bodyGroup);
    this.glassCharacterSystem.resetLocal();
  }

  private init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 2, 5);

    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    this.loader = new GLTFLoader();

    window.addEventListener('resize', () => this.onWindowResize());
    this.animate();
  }

  private setupWeapon(): void {
    this.weapon = new AKWeapon(this.scene, this.camera);

    this.weapon.loadModel().then(() => {
      console.log('AK weapon loaded successfully');
    }).catch((error) => {
      console.error('Failed to load AK weapon:', error);
    });

    document.addEventListener('mousedown', (event) => {
      const canFire = this.gameState === 'playing'
        && !this.isRespawning
        && this.inputManager?.isPointerLocked();

      if (!canFire) return;

      if (event.button === 0 && this.weapon) {
        this.weapon.fire();
        return;
      }

      if (event.button === 2) {
        event.preventDefault();
        const origin = new THREE.Vector3();
        const direction = new THREE.Vector3();
        this.camera.getWorldPosition(origin);
        this.camera.getWorldDirection(direction);
        this.bulletSystem?.fireRubberBall(origin, direction);
      }
    });

    document.addEventListener('contextmenu', (event) => {
      if (this.gameState === 'playing' && this.inputManager?.isPointerLocked()) {
        event.preventDefault();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'r' && this.gameState === 'playing' && !this.isRespawning && this.weapon) {
        this.weapon.triggerReload();
      }
    });
  }

  private setupCharacterSelection() {
    const characterGrid = document.getElementById('character-grid');
    const quickPlayBtn = document.getElementById('quick-play') as HTMLButtonElement;
    const inviteFriendBtn = document.getElementById('invite-friend') as HTMLButtonElement;

    if (!characterGrid || !quickPlayBtn || !inviteFriendBtn) return;

    if (this.pendingInviteId) {
      quickPlayBtn.textContent = 'Join Invite Match';
    }

    characterGrid.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'character-card selected';
    card.innerHTML = `
      <div class="character-name">${SHARED_CHARACTER.name}</div>
      <div class="character-preview" style="background-color: ${SHARED_CHARACTER.color};">
        ${SHARED_CHARACTER.description}
      </div>
      <div class="character-name" style="margin-top: 0.4rem; font-size: 0.8rem; opacity: 0.85;">
        Shared Character (forced)
      </div>
    `;
    characterGrid.appendChild(card);

    this.selectedCharacter = SHARED_CHARACTER.id;
    quickPlayBtn.disabled = false;
    inviteFriendBtn.disabled = false;

    quickPlayBtn.addEventListener('click', () => {
      if (this.pendingInviteId) {
        void this.joinInviteMatch(this.pendingInviteId);
      } else {
        void this.startQuickPlay();
      }
    });

    inviteFriendBtn.addEventListener('click', () => {
      void this.createInviteLink();
    });
  }

  private async startQuickPlay() {
    if (!this.selectedCharacter) return;

    this.awaitingLobbyReady = false;
    this.onlineMatchStarting = false;
    this.activeLobbyFlow = null;
    this.pendingJoinInviteId = null;

    if (this.networkClient) {
      this.networkClient.close();
      this.networkClient = null;
    }

    this.stopPingLoop();
    this.scoreboardSystem.setPlayerPing('player1', null);
    this.scoreboardSystem.setPlayerPing('player2', null);

    this.networkMode = 'offline';
    await this.startGameplayCore();

    this.scoreboardSystem.setMatchStateOverride('Offline skirmish');
    this.updateNetworkStatus('Offline mode', '#cccccc');
    console.log(`Starting quick play with character: ${this.selectedCharacter}`);
  }

  private async createInviteLink() {
    if (!this.selectedCharacter) return;

    this.networkMode = 'host';
    this.activeLobbyFlow = 'host';
    this.awaitingLobbyReady = true;
    this.onlineMatchStarting = false;
    this.pendingJoinInviteId = null;

    this.lobbySystem.beginHostFlow();
    this.scoreboardSystem.setMatchStateOverride('Connecting to server…');
    this.updateNetworkStatus('Connecting to matchmaking server…', '#d7dcff');

    try {
      const networkClient = await this.connectNetworking();
      const sessionId = await networkClient.hostSession(this.selectedCharacter);
      const inviteUrl = networkClient.buildInviteUrl(window.location.href, sessionId);

      this.lobbySystem.setSessionInfo(sessionId, inviteUrl);
      this.lobbySystem.setOpponentConnected(false);
      this.lobbySystem.setStatus('Invite ready. Share link and wait for opponent…', 'neutral');
      this.scoreboardSystem.setMatchStateOverride('Waiting for opponent…');
      this.updateNetworkStatus(`Hosting ${sessionId} (waiting for opponent)`, '#4ecdc4');

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(inviteUrl);
          this.lobbySystem.setStatus('Invite copied to clipboard. Waiting for opponent…', 'neutral');
        } catch {
          this.lobbySystem.setStatus('Invite ready. Use Copy Link if clipboard was blocked.', 'warn');
        }
      }
    } catch (error) {
      this.handleLobbyFailure(error, 'Retry Hosting');
    }
  }

  private async joinInviteMatch(inviteId: string) {
    if (!this.selectedCharacter) return;

    this.networkMode = 'client';
    this.activeLobbyFlow = 'join';
    this.awaitingLobbyReady = true;
    this.onlineMatchStarting = false;
    this.pendingJoinInviteId = inviteId;

    this.lobbySystem.beginJoinFlow(inviteId);
    this.scoreboardSystem.setMatchStateOverride('Joining lobby…');
    this.updateNetworkStatus(`Joining ${inviteId}…`, '#d7dcff');

    try {
      const networkClient = await this.connectNetworking();
      await networkClient.joinSession(inviteId, this.selectedCharacter);

      this.lobbySystem.setOpponentConnected(false);
      this.lobbySystem.setStatus('Joined lobby. Waiting for opponent connection…', 'neutral');
      this.scoreboardSystem.setMatchStateOverride('Waiting for opponent…');
      this.updateNetworkStatus(`Connected to ${inviteId}`, '#4ecdc4');
      console.log(`Joined game via invite: ${inviteId} with character ${this.selectedCharacter}`);
    } catch (error) {
      this.handleLobbyFailure(error, 'Retry Join');
    }
  }

  private async connectNetworking(): Promise<NetworkClient> {
    if (this.networkClient?.connected) {
      return this.networkClient;
    }

    if (this.networkClient) {
      this.networkClient.close();
      this.networkClient = null;
    }

    this.stopPingLoop();

    const client = new NetworkClient({ serverUrl: this.resolveWsUrl() });
    this.attachNetworkHandlers(client);
    await client.connect();

    this.networkClient = client;
    this.startPingLoop();
    this.updateNetworkStatus('Connected to matchmaking server', '#4ecdc4');
    return client;
  }

  private attachNetworkHandlers(client: NetworkClient): void {
    client.on<Extract<NetServerMessage, { type: 'player_state' }>>('player_state', (msg) => {
      const localId = client.playerId;
      if (localId && msg.playerId === localId) return;

      this.networkState.pushRemoteState(msg.playerId, {
        t: msg.t,
        position: msg.position,
        yaw: msg.yaw,
        pitch: msg.pitch
      });
    });

    client.on<Extract<NetServerMessage, { type: 'player_joined' }>>('player_joined', () => {
      this.ensureRemotePlayerMesh().visible = true;
      this.updateNetworkStatus('Opponent connected', '#4ecdc4');
      this.scoreboardSystem.setMatchStateOverride('In progress');
      this.lobbySystem.setOpponentConnected(true);
      this.lobbySystem.setStatus('Opponent connected. Waiting for lobby ready…', 'ok');
    });

    client.on<Extract<NetServerMessage, { type: 'player_left' }>>('player_left', (msg) => {
      this.networkState.removePlayer(msg.playerId);
      if (this.remotePlayerMesh) this.remotePlayerMesh.visible = false;
      this.glassCharacterSystem.resetRemote();
      this.scoreboardSystem.setPlayerPing('player2', null);
      this.scoreboardSystem.setMatchStateOverride('Waiting for opponent…');
      this.updateNetworkStatus('Opponent disconnected', '#ffb347');

      if (this.awaitingLobbyReady) {
        this.lobbySystem.setOpponentConnected(false);
        this.lobbySystem.setStatus('Opponent disconnected. Waiting for reconnection…', 'warn');
      }
    });

    client.on<Extract<NetServerMessage, { type: 'player_fire' }>>('player_fire', (msg) => {
      if (msg.playerId !== client.playerId) {
        this.renderRemoteShot(msg.origin, msg.direction);
      }
    });

    client.on<Extract<NetServerMessage, { type: 'damage' }>>('damage', (msg) => {
      if (msg.targetId === client.playerId) {
        this.applyAuthoritativeDamage(msg.amount, msg.hp);
        return;
      }

      this.glassCharacterSystem.setRemoteHealth(msg.hp);
    });

    client.on<Extract<NetServerMessage, { type: 'death' }>>('death', (msg) => {
      if (msg.victimId === client.playerId) {
        this.beginLocalRespawn(msg.respawnMs, true);
      } else {
        this.glassCharacterSystem.setRemoteHealth(0);
        this.glassCharacterSystem.shatterRemote(this.remotePlayerMesh?.position);
      }

      this.applyScoreMap(msg.scores);
    });

    client.on<Extract<NetServerMessage, { type: 'respawn' }>>('respawn', (msg) => {
      if (msg.playerId === client.playerId) {
        this.glassCharacterSystem.resetLocal();
        this.respawnSystem.completeRespawn(msg.position, msg.playerId);
      } else if (this.remotePlayerMesh) {
        this.remotePlayerMesh.position.set(msg.position.x, msg.position.y, msg.position.z);
        this.remotePlayerMesh.visible = true;
        this.glassCharacterSystem.resetRemote();
      }
    });

    client.on<Extract<NetServerMessage, { type: 'score_update' }>>('score_update', (msg) => {
      this.applyScoreMap(msg.scores);
    });

    client.on<Extract<NetServerMessage, { type: 'lobby_state' }>>('lobby_state', (msg) => {
      this.applyScoreMap(msg.scores);
      this.handleLobbyState(msg);
      this.syncScoreboardRoster(msg.players);

      const localId = client.playerId;
      const localPlayer = localId
        ? msg.players.find((player) => player.playerId === localId)
        : null;
      const remotePlayer = localId
        ? msg.players.find((player) => player.playerId !== localId)
        : msg.players[0] ?? null;

      if (localPlayer) {
        this.glassCharacterSystem.setLocalHealth(localPlayer.hp);
      }

      if (remotePlayer) {
        this.ensureRemotePlayerMesh().visible = true;
        this.glassCharacterSystem.setRemoteHealth(remotePlayer.hp);
      }
    });

    client.on<Extract<NetServerMessage, { type: 'error' }>>('error', (msg) => {
      const friendly = this.mapNetworkErrorToLobbyMessage(msg.message, msg.code);
      this.updateNetworkStatus(`Net error: ${friendly}`, '#ff6b6b');

      if (this.awaitingLobbyReady) {
        const retryLabel = this.activeLobbyFlow === 'host' ? 'Retry Hosting' : 'Retry Join';
        this.lobbySystem.showError(friendly, retryLabel);
      }
    });

    client.on<Extract<NetServerMessage, { type: 'pong' }>>('pong', (msg) => {
      const pingMs = Math.max(0, Date.now() - msg.t);
      this.scoreboardSystem.setPlayerPing('player1', pingMs);
    });

    client.on('disconnected', () => {
      this.stopPingLoop();
      this.scoreboardSystem.setPlayerPing('player1', null);
      this.scoreboardSystem.setPlayerPing('player2', null);
      this.glassCharacterSystem.resetRemote();
      this.scoreboardSystem.setMatchStateOverride('Connection lost');
      this.updateNetworkStatus('Disconnected from networking server', '#ff6b6b');

      if (this.awaitingLobbyReady) {
        this.lobbySystem.setOpponentConnected(false);
        const retryLabel = this.activeLobbyFlow === 'host' ? 'Retry Hosting' : 'Retry Join';
        this.lobbySystem.showError('Disconnected from server. Retry to reconnect.', retryLabel);
      }
    });
  }

  private handleLobbyState(msg: Extract<NetServerMessage, { type: 'lobby_state' }>): void {
    const localId = this.networkClient?.playerId;
    const opponentConnected = localId
      ? msg.players.some((player) => player.playerId !== localId)
      : msg.players.length > 1;

    this.lobbySystem.setOpponentConnected(opponentConnected);

    const bothPlayersConnected = Boolean(msg.hostId && msg.clientId && msg.players.length >= 2);
    if (bothPlayersConnected) {
      this.scoreboardSystem.setMatchStateOverride('In progress');
    } else {
      this.scoreboardSystem.setMatchStateOverride('Waiting for opponent…');
    }

    if (this.awaitingLobbyReady) {
      if (bothPlayersConnected) {
        this.lobbySystem.showReady();
        this.updateNetworkStatus('Both players connected. Starting match…', '#4ecdc4');
        this.maybeStartOnlineMatch();
      } else if (this.activeLobbyFlow === 'host') {
        this.lobbySystem.setStatus('Lobby ready. Waiting for opponent to join…', 'neutral');
      } else {
        this.lobbySystem.setStatus('Connected. Waiting for host/opponent…', 'neutral');
      }
    }
  }

  private maybeStartOnlineMatch(): void {
    if (!this.awaitingLobbyReady || this.onlineMatchStarting || this.gameState !== 'menu') {
      return;
    }

    this.onlineMatchStarting = true;

    window.setTimeout(() => {
      void this.startGameplayCore()
        .then(() => {
          this.awaitingLobbyReady = false;
          this.activeLobbyFlow = null;
          this.scoreboardSystem.setMatchStateOverride('In progress');
        })
        .catch((error) => {
          console.error('Failed to start match after lobby ready:', error);
          this.handleLobbyFailure(error, this.activeLobbyFlow === 'host' ? 'Retry Hosting' : 'Retry Join');
        })
        .finally(() => {
          this.onlineMatchStarting = false;
        });
    }, 350);
  }

  private handleLobbyFailure(error: unknown, retryLabel: string): void {
    console.error('Lobby flow failed:', error);

    const rawMessage = error instanceof Error ? error.message : 'Unknown networking error';
    const friendly = this.mapNetworkErrorToLobbyMessage(rawMessage);

    this.awaitingLobbyReady = false;
    this.onlineMatchStarting = false;

    if (this.networkClient) {
      this.networkClient.close();
      this.networkClient = null;
    }
    this.stopPingLoop();
    if (this.remotePlayerMesh) {
      this.remotePlayerMesh.visible = false;
    }
    this.glassCharacterSystem.resetRemote();
    this.glassCharacterSystem.resetLocal();

    const menuOverlay = document.getElementById('menu-overlay');
    const hud = document.getElementById('hud');
    if (menuOverlay) menuOverlay.style.display = 'flex';
    if (hud) hud.style.display = 'none';
    this.setGameplayOverlayVisible(false);
    this.gameState = 'menu';
    this.scoreboardSystem.close();
    this.scoreboardSystem.setMatchStateOverride('Lobby error');

    this.updateNetworkStatus(friendly, '#ff6b6b');
    this.lobbySystem.showError(friendly, retryLabel);
  }

  private mapNetworkErrorToLobbyMessage(message: string, code?: string): string {
    const normalizedCode = (code ?? '').toUpperCase();
    const lower = message.toLowerCase();

    if (normalizedCode === 'NO_SESSION' || lower.includes('session not found')) {
      return 'Session not found. Ask the host for a fresh invite and retry.';
    }

    if (normalizedCode === 'SESSION_FULL' || lower.includes('already has 2 players') || lower.includes('full')) {
      return 'Session is full. Ask for a different invite and retry.';
    }

    if (lower.includes('timed out') || lower.includes('connect') || lower.includes('disconnected')) {
      return 'Could not reach matchmaking server. Check server status and retry.';
    }

    return `Lobby error: ${message}`;
  }

  private resolveCharacterName(characterId: string | null | undefined, fallback = 'Unknown'): string {
    if (!characterId) return fallback;
    const character = CHARACTERS.find((entry) => entry.id === characterId);
    return character?.name ?? fallback;
  }

  private syncScoreboardRoster(players: Array<{ playerId: string; characterId: string }>): void {
    const localId = this.networkClient?.playerId;
    if (!localId) return;

    const local = players.find((player) => player.playerId === localId) ?? null;
    const opponent = players.find((player) => player.playerId !== localId) ?? null;

    const localName = `You (${this.resolveCharacterName(local?.characterId ?? this.selectedCharacter, 'Player')})`;
    const opponentName = opponent
      ? `Opponent (${this.resolveCharacterName(opponent.characterId, 'Unknown')})`
      : 'Opponent';

    matchSystem.setPlayerNames(localName, opponentName);

    if (!opponent) {
      this.scoreboardSystem.setPlayerPing('player2', null);
      this.scoreboardSystem.setMatchStateOverride('Waiting for opponent…');
    }
  }

  private startPingLoop(): void {
    this.stopPingLoop();

    const sendPing = () => {
      if (!this.networkClient?.connected) return;
      this.networkClient.sendPing(Date.now());
    };

    sendPing();
    this.pingIntervalId = window.setInterval(sendPing, 2000);
  }

  private stopPingLoop(): void {
    if (this.pingIntervalId !== null) {
      window.clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  private startAmbientMusic(): void {
    if (!this.musicEnabled) return;

    if (!this.ambientAudioContext) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      this.ambientAudioContext = new AudioContext();
    }

    const ctx = this.ambientAudioContext;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }

    if (this.ambientMusicInterval !== null) return;

    const step = async () => {
      if (this.gameState !== 'playing' || !ctx) return;
      const now = ctx.currentTime;
      const lead = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const gain = ctx.createGain();
      const subGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.value = 420;

      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
      subGain.gain.setValueAtTime(0.02, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      lead.type = 'triangle';
      sub.type = 'sawtooth';
      lead.frequency.value = 329.63 + Math.random() * 60;
      sub.frequency.value = 82.41 + Math.random() * 18;

      lead.connect(filter);
      filter.connect(gain);
      sub.connect(subGain);
      subGain.connect(ctx.destination);
      gain.connect(ctx.destination);

      lead.start(now);
      lead.stop(now + 0.55);
      sub.start(now);
      sub.stop(now + 0.45);

      lead.onended = () => {
        lead.disconnect();
      };
      sub.onended = () => {
        sub.disconnect();
        gain.disconnect();
        filter.disconnect();
        subGain.disconnect();
      };
    };

    const loop = async () => {
      if (this.gameState !== 'playing') return;
      step();
    };

    this.ambientMusicInterval = window.setInterval(() => {
      loop();
    }, 650);
    loop();
  }

  private stopAmbientMusic(): void {
    if (this.ambientMusicInterval !== null) {
      window.clearInterval(this.ambientMusicInterval);
      this.ambientMusicInterval = null;
    }

    if (!this.ambientAudioContext) return;

    if (this.ambientAudioContext.state === 'running') {
      void this.ambientAudioContext.suspend().catch(() => undefined);
    }
  }

  private async retryLobbyFlow(): Promise<void> {
    if (this.activeLobbyFlow === 'host') {
      await this.createInviteLink();
      return;
    }

    if (this.activeLobbyFlow === 'join' && this.pendingJoinInviteId) {
      await this.joinInviteMatch(this.pendingJoinInviteId);
      return;
    }

    this.returnToCharacterMenu();
  }

  private returnToCharacterMenu(): void {
    this.awaitingLobbyReady = false;
    this.onlineMatchStarting = false;
    this.activeLobbyFlow = null;
    this.pendingJoinInviteId = null;
    this.networkMode = 'offline';

    if (this.networkClient) {
      this.networkClient.close();
      this.networkClient = null;
    }

    this.stopPingLoop();
    this.stopAmbientMusic();
    this.scoreboardSystem.setPlayerPing('player1', null);
    this.scoreboardSystem.setPlayerPing('player2', null);
    this.scoreboardSystem.setMatchStateOverride('Waiting for match start');

    if (this.playerController) {
      this.playerController.disable();
    }

    this.respawnSystem.reset?.();
    this.clearDummyTargets();

    this.isRespawning = false;
    if (this.remotePlayerMesh) {
      this.remotePlayerMesh.visible = false;
    }
    this.glassCharacterSystem.resetRemote();
    this.glassCharacterSystem.resetLocal();

    const menuOverlay = document.getElementById('menu-overlay');
    const hud = document.getElementById('hud');
    if (menuOverlay) menuOverlay.style.display = 'flex';
    if (hud) hud.style.display = 'none';

    if (window.healthHUD) {
      window.healthHUD.hideAllEffects?.();
      window.healthHUD.updateHealth?.(ONE_SHOT_HP, ONE_SHOT_HP);
    }

    const healthLabel = document.getElementById('health');
    if (healthLabel) {
      healthLabel.textContent = `${ONE_SHOT_HP}/${ONE_SHOT_HP} (${ROUND_END_NOTE})`;
    }

    this.scoreboardSystem.close();
    this.setGameplayOverlayVisible(false);

    this.gameState = 'menu';
    this.networkState = new NetworkState();
    this.lobbySystem.showCharacterSelect();
    this.updateNetworkStatus(this.pendingInviteId ? `Invite detected: ${this.pendingInviteId}` : 'Offline mode', '#cccccc');
  }

  private async startGameplayCore(): Promise<void> {
    const selectedCharacter = this.selectedCharacter ?? SHARED_CHARACTER.id;

    const menuOverlay = document.getElementById('menu-overlay');
    const hud = document.getElementById('hud');

    if (menuOverlay) menuOverlay.style.display = 'none';
    if (hud) hud.style.display = 'block';
    this.scoreboardSystem.close();
    this.setGameplayOverlayVisible(true);

    this.gameState = 'loading';
    this.isRespawning = false;

    this.clearDummyTargets();
    await this.loadCharacter(selectedCharacter);
    await this.loadCurrentArena();
    this.setupStaticDummyTargets();
    this.respawnSystem.setArena(this.currentArena);
    this.ensureFirstPersonBodyProxy();
    if (this.firstPersonBodyProxy) {
      this.firstPersonBodyProxy.visible = true;
    }

    this.glassCharacterSystem.resetLocal();
    this.glassCharacterSystem.setLocalHealth(100);
    if (this.remotePlayerMesh) {
      this.glassCharacterSystem.resetRemote();
    }

    if (!this.bulletSystem) {
      this.bulletSystem = createBulletSystem(this.scene);
      this.bulletSystem.addImpactListener((info) => {
        if (!info.object) return;
        this.handleProjectileImpact(info);
      });
    }

    const healthLabel = document.getElementById('health');
    if (healthLabel) {
      healthLabel.textContent = `${ONE_SHOT_HP}/${ONE_SHOT_HP} (${ROUND_END_NOTE})`;
    }

    if (window.healthHUD) {
      window.healthHUD.updateHealth?.(ONE_SHOT_HP, ONE_SHOT_HP);
    }

    // Ensure camera/controller starts at a stable playable spawn.
    this.playerController.setPosition(0, 1.6, 5);
    this.playerController.enable();

    const playerModel = this.characterModels.get(selectedCharacter);
    if (playerModel) {
      this.healthSystem = createHealthSystem(playerModel);
      this.healthSystem.setHealth?.(ONE_SHOT_HP);
      this.cachePlayerMaterialState(playerModel);
      this.applyGlassVisualState('full');
    }

    if (!this.ammoHUD && this.weapon) {
      this.ammoHUD = new AmmoHUD(this.weapon);
      this.ammoHUD.show();
    }

    const localName = `You (${this.resolveCharacterName(selectedCharacter, 'Player')})`;
    const opponentName = this.networkMode === 'offline' ? 'Rival' : 'Opponent';

    matchSystem.startMatch({
      player1Name: localName,
      player2Name: opponentName,
      targetScore: 5,
      useLocalDeathEvents: this.networkMode === 'offline'
    });

    this.scoreboardSystem.setPlayerPing('player1', null);
    this.scoreboardSystem.setPlayerPing('player2', null);
    this.scoreboardSystem.setMatchStateOverride(this.networkMode === 'offline' ? 'Offline skirmish' : 'Waiting for opponent…');

    this.updateNetworkStatus(this.networkMode === 'offline' ? 'Offline mode' : 'Connected', '#cccccc');

    this.startAmbientMusic();

    this.gameState = 'playing';
    window.dispatchEvent(new Event('gameStarted'));
  }

  private async loadCharacter(characterId: string) {
    const character = CHARACTERS.find(c => c.id === characterId);
    if (!character) return;

    const existing = this.characterModels.get(characterId);
    if (existing) {
      this.cachePlayerMaterialState(existing);
      return;
    }

    const candidatePaths = [
      `./assets/Characters/glTF/${character.model}`,
      `./assets/Toon Shooter Game Kit - Dec 2022/Characters/glTF/${character.model}`
    ];

    let loadedModel: THREE.Group | null = null;

    for (const modelPath of candidatePaths) {
      try {
        const gltf = await new Promise<any>((resolve, reject) => {
          this.loader.load(modelPath, resolve, undefined, reject);
        });
        loadedModel = gltf.scene;
        break;
      } catch {
        // Try next path
      }
    }

    if (!loadedModel) {
      console.error(`Error loading character ${character.name}: no valid asset path found`);
      return;
    }

    const model = loadedModel;
    model.position.set(0, 0, 0);
    model.scale.setScalar(1);

    model.traverse((child: any) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.color.multiply(new THREE.Color(character.color));
      }
    });

    this.scene.add(model);
    this.characterModels.set(characterId, model);
    this.cachePlayerMaterialState(model);

    console.log(`Loaded character: ${character.name}`);
  }

  private async loadCurrentArena() {
    this.clearDummyTargets();
    console.log(`Loading ${this.currentArena} arena...`);

    try {
      if (this.currentArena === 'warehouse') {
        await this.warehouseArena.loadArena();
      } else {
        await this.containerYardArena.loadArena();
      }
    } catch (error) {
      console.error('Error loading arena:', error);
    }
  }

  private setupArenaControls() {
    const hudElement = document.getElementById('hud');
    if (hudElement) {
      const arenaInfo = document.createElement('div');
      arenaInfo.id = 'arena-info';
      arenaInfo.style.position = 'absolute';
      arenaInfo.style.top = '80px';
      arenaInfo.style.left = '20px';
      arenaInfo.style.color = 'white';
      arenaInfo.style.fontSize = '1rem';
      arenaInfo.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
      arenaInfo.innerHTML = `
        <div>Arena: <span id="arena-name">WAREHOUSE</span></div>
        <div style="font-size: 0.8rem; margin-top: 5px;">Press 'M' to switch maps</div>
        <div style="font-size: 0.8rem; margin-top: 5px;">Press 'Q' to return to menu</div>
        <div style="font-size: 0.8rem; margin-top: 2px; opacity: 0.8;">Mode: ${ROUND_END_NOTE}</div>
      `;
      hudElement.appendChild(arenaInfo);
    }

    document.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();

      if (key === 'm' && this.gameState === 'playing') {
        void this.switchArena();
      }

      if (key === 'q' && this.gameState === 'playing') {
        event.preventDefault();
        this.returnToCharacterMenu();
      }
    });
  }

  private setupNetworkStatusUI(): void {
    const hud = document.getElementById('hud');
    if (!hud) return;

    this.networkStatusEl = document.createElement('div');
    this.networkStatusEl.id = 'network-status';
    this.networkStatusEl.style.position = 'absolute';
    this.networkStatusEl.style.top = '140px';
    this.networkStatusEl.style.left = '20px';
    this.networkStatusEl.style.color = '#cccccc';
    this.networkStatusEl.style.fontSize = '0.85rem';
    this.networkStatusEl.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    this.networkStatusEl.textContent = this.pendingInviteId
      ? `Invite detected: ${this.pendingInviteId}`
      : 'Offline mode';

    hud.appendChild(this.networkStatusEl);
  }

  private setupRespawnHooks(): void {
    this.respawnSystem.setArena(this.currentArena);
    window.addEventListener('playerDied', this.onPlayerDied as EventListener);
    window.addEventListener('respawnTick', this.onRespawnTick as EventListener);
    window.addEventListener('playerRespawned', this.onPlayerRespawned as EventListener);
  }

  private setupMatchHooks(): void {
    window.addEventListener('matchStateChanged', this.onMatchStateChanged as EventListener);
  }

  private onMatchStateChanged = (event: Event): void => {
    const detail = (event as CustomEvent<MatchSnapshot>).detail;
    if (!detail) return;

    const basicScore = document.getElementById('score');
    if (basicScore) {
      basicScore.textContent = `${detail.player1Score}-${detail.player2Score}`;
    }
  };

  private onPlayerDied = (): void => {
    if (this.networkMode !== 'offline') return;
    this.beginLocalRespawn();
  };

  private beginLocalRespawn(delayMs?: number, serverAuthoritative = false): void {
    if (this.gameState !== 'playing' || this.isRespawning) {
      return;
    }

    this.isRespawning = true;
    this.playerController.lockMovement();
    this.healthSystem?.die?.();
    this.glassCharacterSystem.setLocalHealth(0);
    this.glassCharacterSystem.shatterLocal();
    window.dispatchEvent(new Event('playerDied'));

    this.respawnSystem.startRespawn(this.getLocalPlayerId(), {
      delayMs,
      autoComplete: !serverAuthoritative
    });
  }

  private getLocalPlayerId(): string {
    return this.networkClient?.playerId ?? 'local-player';
  }

  private onRespawnTick = (event: Event): void => {
    const detail = (event as CustomEvent<RespawnTickDetail>).detail;
    if (!detail || detail.playerId !== this.getLocalPlayerId()) return;

    const timerElement = document.getElementById('respawn-timer');
    if (timerElement) {
      timerElement.textContent = `Respawning in ${detail.remainingSeconds}s`;
    }
  };

  private onPlayerRespawned = (event: Event): void => {
    const detail = (event as CustomEvent<PlayerRespawnedDetail>).detail;
    if (!detail || detail.playerId !== this.getLocalPlayerId()) return;

    this.healthSystem?.revive?.();
    this.healthSystem?.setHealth?.(100);
    this.glassCharacterSystem.resetLocal();
    this.playerController.resetMovementState();
    const respawnY = Math.max(1.6, detail.position.y);
    this.playerController.setPosition(detail.position.x, respawnY, detail.position.z);
    this.playerController.unlockMovement();
    this.isRespawning = false;

    this.applyGlassVisualState('full');

    if (window.healthHUD) {
      window.healthHUD.updateHealth?.(ONE_SHOT_HP, ONE_SHOT_HP);
    }

    const healthValueEl = document.getElementById('health');
    if (healthValueEl) {
      healthValueEl.textContent = `${ONE_SHOT_HP}/${ONE_SHOT_HP} (${ROUND_END_NOTE})`;
    }

    if (this.pendingGlassStateTimer !== null) {
      window.clearTimeout(this.pendingGlassStateTimer);
      this.pendingGlassStateTimer = null;
    }
  };

  private updateNetworkStatus(text: string, color = '#cccccc') {
    if (!this.networkStatusEl) return;
    this.networkStatusEl.textContent = text;
    this.networkStatusEl.style.color = color;
  }

  private ensureRemotePlayerMesh(): THREE.Mesh {
    if (this.remotePlayerMesh) {
      return this.remotePlayerMesh;
    }

    const geometry = new THREE.CapsuleGeometry(0.35, 1.0, 6, 10);
    const material = new THREE.MeshStandardMaterial({ color: 0x4ecdc4, emissive: 0x102020 });

    this.remotePlayerMesh = new THREE.Mesh(geometry, material);
    this.remotePlayerMesh.castShadow = true;
    this.remotePlayerMesh.position.set(2, 1.0, 2);
    this.remotePlayerMesh.visible = false;
    this.scene.add(this.remotePlayerMesh);

    this.glassCharacterSystem.applyGlassToRemoteMesh(this.remotePlayerMesh);
    this.glassCharacterSystem.resetRemote();

    return this.remotePlayerMesh;
  }

  private applyAuthoritativeDamage(amount: number, hp: number): void {
    const remainingHp = hp > 0 ? ONE_SHOT_HP : 0;

    this.healthSystem?.takeDamage?.(amount);
    this.healthSystem?.setHealth?.(hp);
    this.glassCharacterSystem.setLocalHealth(hp);

    if (window.healthHUD) {
      window.healthHUD.takeDamage?.(amount);
      window.healthHUD.updateHealth?.(remainingHp, ONE_SHOT_HP);
    }

    const healthValueEl = document.getElementById('health');
    if (healthValueEl) {
      healthValueEl.textContent = `${remainingHp}/${ONE_SHOT_HP} (${ROUND_END_NOTE})`;
    }

    this.applyGlassVisualState('crack');
    if (remainingHp <= 0) {
      this.scheduleGlassShatterState();
    }
  }

  private scheduleGlassShatterState(): void {
    if (this.pendingGlassStateTimer !== null) {
      window.clearTimeout(this.pendingGlassStateTimer);
    }

    this.pendingGlassStateTimer = window.setTimeout(() => {
      this.applyGlassVisualState('shatter');
    }, 120);
  }

  private cachePlayerMaterialState(playerModel: THREE.Group): void {
    playerModel.traverse((child: any) => {
      if (!child.isMesh) return;
      const mesh = child as THREE.Mesh;
      const material = mesh.material;
      if (!(material instanceof THREE.MeshStandardMaterial)) return;

      const snapshot = {
        color: material.color.clone(),
        emissive: material.emissive.clone(),
        roughness: material.roughness,
        metalness: material.metalness,
        transparent: material.transparent,
        opacity: material.opacity
      };

      this.localPlayerMaterials.set(mesh, snapshot);
    });
  }

  private applyGlassVisualState(state: 'full' | 'crack' | 'shatter'): void {
    const localModel = this.characterModels.get(this.selectedCharacter);
    if (!localModel) return;

    localModel.traverse((child: any) => {
      if (!child.isMesh) return;
      const mesh = child as THREE.Mesh;
      const material = mesh.material;
      if (!(material instanceof THREE.MeshStandardMaterial)) return;

      const snapshot = this.localPlayerMaterials.get(mesh);
      if (!snapshot) return;

      if (state === 'full') {
        material.color.copy(snapshot.color);
        material.emissive.copy(snapshot.emissive);
        material.roughness = snapshot.roughness;
        material.metalness = snapshot.metalness;
        material.transparent = snapshot.transparent;
        material.opacity = snapshot.opacity;
        material.opacity = 1;
        return;
      }

      if (state === 'crack') {
        material.color.lerpColors(snapshot.color, new THREE.Color(0xffd38a), 0.35);
        material.emissive.set(0x5a2a10);
        material.roughness = Math.min(1, snapshot.roughness + 0.25);
        material.opacity = 1;
        material.transparent = false;
        return;
      }

      material.color.copy(snapshot.color).multiplyScalar(0.45);
      material.emissive.set(0x1e1e1e);
      material.roughness = 0.92;
      material.transparent = true;
      material.opacity = 0.55;
    });
  }

  private applyScoreMap(scores: ScoreMap): void {
    if (!this.networkClient?.playerId) return;

    const myId = this.networkClient.playerId;
    const myScore = scores[myId] ?? 0;

    let enemyScore = 0;
    for (const [playerId, value] of Object.entries(scores)) {
      if (playerId !== myId) {
        enemyScore = value;
      }
    }

    matchSystem.applyExternalScores(myScore, enemyScore);
  }

  private renderRemoteShot(origin: Vec3, direction: Vec3): void {
    this.bulletSystem?.firePaintball(
      new THREE.Vector3(origin.x, origin.y, origin.z),
      new THREE.Vector3(direction.x, direction.y, direction.z),
      { muted: true }
    );
  }

  private handleProjectileImpact = (info: {
    point: THREE.Vector3;
    normal: THREE.Vector3;
    object: THREE.Object3D | null;
    color: THREE.Color;
    byRubber: boolean;
  }): void => {
    const target = this.resolvePaintTarget(info.object);
    if (!target) return;

    const state = this.dummyTargets.get(target.uuid);
    if (!state) return;

    state.hitsRemaining -= 1;

    const material = target.material as THREE.MeshStandardMaterial;
    material.color.set(info.color);
    material.emissive.set(info.color).multiplyScalar(0.28);
    target.position.y += 0.06;

    const scaleBoost = 1 + (state.hitsRemaining <= 0 ? 0.16 : 0.08);
    target.scale.setScalar(state.baseScale * scaleBoost);

    setTimeout(() => {
      material.color.copy(state.baseColor);
      material.emissive.set(0x111111);
      target.position.y -= 0.06;
      target.scale.setScalar(state.baseScale);
      if (state.hitsRemaining <= 0) {
        material.opacity = 0.42;
        material.transparent = true;
      }
    }, 170);
  };

  private resolvePaintTarget(object: THREE.Object3D | null): THREE.Mesh | null {
    let node: THREE.Object3D | null = object;
    while (node) {
      if ((node as any).userData?.isPaintTarget) {
        return node as THREE.Mesh;
      }
      node = node.parent;
    }

    return null;
  }

  private setupStaticDummyTargets(): void {
    this.clearDummyTargets();

    const geometry = new THREE.BoxGeometry(1.15, 1.2, 1.15);
    const baseY = 0.55;

    const spawnPositions: Array<{ x: number; y: number; z: number; color: number }> = [
      { x: -5.8, y: baseY, z: -2.8, color: 0xf4a261 },
      { x: 4.1, y: baseY, z: -4.2, color: 0x2a9d8f },
      { x: 0.8, y: baseY, z: 4.8, color: 0xe76f51 }
    ];

    spawnPositions.forEach((item) => {
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: item.color,
          emissive: 0x111111,
          roughness: 0.7,
          metalness: 0.08
        })
      );
      mesh.position.set(item.x, item.y, item.z);
      mesh.userData.isPaintTarget = true;
      mesh.userData.isArenaObject = true;
      mesh.userData.isWall = true;
      mesh.userData.hitsRemaining = 4;
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      this.scene.add(mesh);

      this.dummyTargets.set(mesh.uuid, {
        mesh,
        baseScale: mesh.scale.x,
        baseColor: new THREE.Color(item.color),
        hitsRemaining: 4
      });
    });
  }

  private clearDummyTargets(): void {
    for (const state of this.dummyTargets.values()) {
      this.scene.remove(state.mesh);
      const material = state.mesh.material;
      if (material instanceof THREE.Material) {
        material.dispose();
      }
    }
    this.dummyTargets.clear();
  }

  private onWeaponFired = (event: Event): void => {
    if (this.gameState !== 'playing' || this.isRespawning) return;

    const custom = event as CustomEvent;
    const detail = custom.detail ?? {};

    const origin: Vec3 = detail.origin ?? this.toVec3FromVector(this.camera.position);
    const direction: Vec3 = detail.direction ?? this.getCameraForward();

    this.bulletSystem?.firePaintball(
      new THREE.Vector3(origin.x, origin.y, origin.z),
      new THREE.Vector3(direction.x, direction.y, direction.z)
    );

    if (!this.networkClient?.connected) return;

    this.networkClient.sendFire({
      shotId: NetworkClient.createShotId(this.networkClient.playerId),
      t: Date.now(),
      origin,
      direction
    });
  };

  private toVec3FromVector(v: THREE.Vector3): Vec3 {
    return { x: v.x, y: v.y, z: v.z };
  }

  private getCameraForward(): Vec3 {
    const d = new THREE.Vector3();
    this.camera.getWorldDirection(d);
    return { x: d.x, y: d.y, z: d.z };
  }

  private syncLocalTransform(nowMs: number): void {
    if (!this.networkClient?.connected) return;
    if (this.isRespawning) return;
    if (nowMs - this.lastNetworkSyncMs < 50) return;

    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
    const payload: PlayerTransform = {
      t: Date.now(),
      position: this.toVec3FromVector(this.camera.position),
      yaw: euler.y,
      pitch: euler.x
    };

    this.networkClient.sendPlayerState(payload);
    this.lastNetworkSyncMs = nowMs;
  }

  private updateRemoteInterpolation(): void {
    if (!this.networkClient) return;

    const remotes = this.networkState.sampleOtherPlayers(this.networkClient.playerId, Date.now());
    if (remotes.length === 0) {
      if (this.remotePlayerMesh) this.remotePlayerMesh.visible = false;
      return;
    }

    const remote = remotes[0];
    const mesh = this.ensureRemotePlayerMesh();
    mesh.visible = true;

    const target = new THREE.Vector3(
      remote.transform.position.x,
      remote.transform.position.y - 0.9,
      remote.transform.position.z
    );

    mesh.position.lerp(target, 0.35);
    mesh.rotation.y = remote.transform.yaw;
  }

  private resolveWsUrl(): string {
    const params = new URLSearchParams(window.location.search);
    const explicit = params.get('ws');
    if (explicit) return explicit;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const port = params.get('wsPort') ?? '3001';
    return `${protocol}//${window.location.hostname}:${port}`;
  }

  private async switchArena() {
    this.currentArena = this.currentArena === 'warehouse' ? 'container' : 'warehouse';

    const arenaNameElement = document.getElementById('arena-name');
    if (arenaNameElement) {
      arenaNameElement.textContent = this.currentArena === 'warehouse' ? 'WAREHOUSE' : 'CONTAINER YARD';
    }

    await this.loadCurrentArena();
    this.setupStaticDummyTargets();
    this.respawnSystem.setArena(this.currentArena);
    this.playerController.setPosition(0, 1.6, 5);
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const nowMs = performance.now();
    const deltaTime = Math.min(0.05, (nowMs - this.lastFrameMs) / 1000);
    this.lastFrameMs = nowMs;

    if (this.gameState !== 'playing') {
      this.characterModels.forEach(model => {
        model.rotation.y += 0.01;
      });
    }

    if (this.bulletSystem) {
      this.bulletSystem.update(deltaTime);
    }

    if (this.weapon) {
      this.weapon.update(deltaTime * 1000);
    }

    this.glassCharacterSystem.update(deltaTime);

    if (this.gameState === 'playing') {
      if (!this.isRespawning) {
        this.playerController.update(deltaTime);
      }
      this.syncLocalTransform(nowMs);
      this.updateRemoteInterpolation();
    }

    this.renderer.render(this.scene, this.camera);
  };
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new RicochetGame();
});

// HUD event hooks
window.addEventListener('gameStarted', () => {
  if (window.healthHUD) {
    window.healthHUD.updateHealth(ONE_SHOT_HP, ONE_SHOT_HP);
  }

  const healthValueEl = document.getElementById('health');
  if (healthValueEl) {
    healthValueEl.textContent = `${ONE_SHOT_HP}/${ONE_SHOT_HP} (${ROUND_END_NOTE})`;
  }
});

window.addEventListener('playerDied', () => {
  if (window.healthHUD) {
    window.healthHUD.triggerDeath?.();
  }
});

window.addEventListener('playerRespawned', () => {
  if (window.healthHUD) {
    window.healthHUD.respawn?.();
  }
});
