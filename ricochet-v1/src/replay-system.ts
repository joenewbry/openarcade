import type { MatchSnapshot } from './match-system.ts';
import type { Vec3 } from './network/network-types.ts';

export type ReplaySource = 'local' | 'remote';
export type ReplayProjectileType = 'paintball' | 'rubber';

export interface ReplayMeta {
  version: number;
  game: 'ricochet-v1';
  issueRef?: string;
  createdAt: number;
  startCharacter: string | null;
  arena: 'warehouse' | 'container';
  sessionMode: 'offline' | 'online';
  maxDurationMs: number;
}

export interface ReplayStateSample {
  at: number;
  durationMs: number;
  local: {
    position: Vec3;
    quaternion: { x: number; y: number; z: number; w: number };
    yaw: number;
    pitch: number;
    health: number;
    isRespawning: boolean;
    isDead: boolean;
  };
  remote: {
    visible: boolean;
    position: Vec3 | null;
    quaternion: { x: number; y: number; z: number; w: number };
    yaw: number;
    pitch: number;
    health: number;
    isDead: boolean;
  } | null;
  match: MatchSnapshot;
}

export interface ReplayProjectileEvent {
  at: number;
  type: 'projectile';
  projectileType: ReplayProjectileType;
  source: ReplaySource;
  origin: Vec3;
  direction: Vec3;
  shotId?: string;
}

export interface ReplayGenericEvent {
  at: number;
  type: 'match_state' | 'health' | 'respawn' | 'phase';
  payload: Record<string, unknown>;
}

export type ReplayEvent = ReplayProjectileEvent | ReplayGenericEvent;

export interface ReplayPayload {
  version: number;
  meta: ReplayMeta;
  durationMs: number;
  events: ReplayEvent[];
  states: ReplayStateSample[];
}

export interface ReplayRecorderOptions {
  maxDurationMs?: number;
  maxEvents?: number;
  maxStates?: number;
}

const DEFAULT_MAX_DURATION_MS = 60_000;
const DEFAULT_MAX_EVENTS = 1_000;
const DEFAULT_MAX_STATES = 600;
const MIN_EVENT_GAP_MS = 16;

function clampVec3(value: Vec3): Vec3 {
  return {
    x: Number.isFinite(value?.x) ? value.x : 0,
    y: Number.isFinite(value?.y) ? value.y : 0,
    z: Number.isFinite(value?.z) ? value.z : 0
  };
}

function isFiniteNum(value: unknown): value is number {
  return Number.isFinite(value as number);
}

export class ReplayRecorder {
  private readonly maxDurationMs: number;
  private readonly maxEvents: number;
  private readonly maxStates: number;

  private startedAt = 0;
  private lastStateAt = -Infinity;
  private lastEventAt: Record<ReplayEvent['type'], number> = {
    projectile: -Infinity,
    match_state: -Infinity,
    health: -Infinity,
    respawn: -Infinity,
    phase: -Infinity
  };

  private eventLog: ReplayEvent[] = [];
  private stateLog: ReplayStateSample[] = [];
  private matchSnapshot: MatchSnapshot | null = null;
  private meta: Omit<ReplayMeta, 'createdAt' | 'maxDurationMs'> | null = null;

  private sampleIntervalMs = 100;
  private nextAllowedEventAt = 0;

  public isCapturing = false;

  constructor(options: ReplayRecorderOptions = {}) {
    this.maxDurationMs = options.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;
    this.maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS;
    this.maxStates = options.maxStates ?? DEFAULT_MAX_STATES;
  }

  public startSession(meta: Omit<ReplayMeta, 'createdAt' | 'version' | 'game' | 'maxDurationMs'>): void {
    this.startedAt = performance.now();
    this.eventLog = [];
    this.stateLog = [];
    this.matchSnapshot = null;
    this.meta = {
      startCharacter: meta.startCharacter ?? null,
      arena: meta.arena,
      sessionMode: meta.sessionMode
    };
    this.isCapturing = true;
    this.lastStateAt = -Infinity;
    this.lastEventAt = {
      projectile: -Infinity,
      match_state: -Infinity,
      health: -Infinity,
      respawn: -Infinity,
      phase: -Infinity
    };
    this.nextAllowedEventAt = this.startedAt;
    this.sampleIntervalMs = 120;
  }

  public stopSession(): void {
    this.isCapturing = false;
  }

  public recordMatchSnapshot(snapshot: MatchSnapshot): void {
    if (!this.isCapturing) return;
    if (!this.shouldRecordEvent('match_state', 120)) return;

    this.matchSnapshot = snapshot;
    this.pushEvent({
      at: this.relativeTime(),
      type: 'match_state',
      payload: {
        ...snapshot
      }
    });
  }

  public recordHealth(source: ReplaySource, health: number, isDead: boolean): void {
    if (!this.isCapturing) return;
    if (!this.shouldRecordEvent('health', MIN_EVENT_GAP_MS)) return;

    this.pushEvent({
      at: this.relativeTime(),
      type: 'health',
      payload: {
        source,
        health,
        isDead
      }
    });
  }

  public recordRespawn(target: ReplaySource, position: Vec3 | null, health?: number): void {
    if (!this.isCapturing) return;
    if (!this.shouldRecordEvent('respawn', MIN_EVENT_GAP_MS)) return;

    this.pushEvent({
      at: this.relativeTime(),
      type: 'respawn',
      payload: {
        target,
        health: health ?? 100,
        position: position ? clampVec3(position) : null
      }
    });
  }

  public recordProjectile(
    projectileType: ReplayProjectileType,
    source: ReplaySource,
    origin: Vec3,
    direction: Vec3,
    shotId?: string
  ): void {
    if (!this.isCapturing) return;

    this.pushEvent({
      at: this.relativeTime(),
      type: 'projectile',
      projectileType,
      source,
      origin: clampVec3(origin),
      direction: clampVec3(direction),
      shotId
    });
  }

  public recordState(sample: {
    local: {
      position: Vec3;
      quaternion: { x: number; y: number; z: number; w: number };
      yaw: number;
      pitch: number;
      health: number;
      isRespawning: boolean;
      isDead: boolean;
    };
    remote: {
      visible: boolean;
      position: Vec3 | null;
      quaternion: { x: number; y: number; z: number; w: number };
      yaw: number;
      pitch: number;
      health: number;
      isDead: boolean;
    } | null;
    match: MatchSnapshot;
    maxDurationMs?: number;
  }): void {
    if (!this.isCapturing) return;
    if (this.relativeTime() - this.lastStateAt < this.sampleIntervalMs) return;

    this.lastStateAt = this.relativeTime();

    const state: ReplayStateSample = {
      at: this.relativeTime(),
      durationMs: sample.maxDurationMs ?? this.maxDurationMs,
      local: {
        position: clampVec3(sample.local.position),
        quaternion: {
          x: sample.local.quaternion.x,
          y: sample.local.quaternion.y,
          z: sample.local.quaternion.z,
          w: sample.local.quaternion.w
        },
        yaw: isFiniteNum(sample.local.yaw) ? sample.local.yaw : 0,
        pitch: isFiniteNum(sample.local.pitch) ? sample.local.pitch : 0,
        health: Math.max(0, Math.round(sample.local.health)),
        isRespawning: !!sample.local.isRespawning,
        isDead: !!sample.local.isDead
      },
      remote: sample.remote
        ? {
          position: sample.remote.position ? clampVec3(sample.remote.position) : null,
          quaternion: {
            x: sample.remote.quaternion.x,
            y: sample.remote.quaternion.y,
            z: sample.remote.quaternion.z,
            w: sample.remote.quaternion.w
          },
          yaw: isFiniteNum(sample.remote.yaw) ? sample.remote.yaw : 0,
          pitch: isFiniteNum(sample.remote.pitch) ? sample.remote.pitch : 0,
          health: Math.max(0, Math.round(sample.remote.health)),
          visible: sample.remote.visible,
          isDead: !!sample.remote.isDead
        }
        : null,
      match: {
        ...sample.match
      }
    };

    this.stateLog.push(state);
    this.trimByDurationAndSize();
  }

  public get payload(): ReplayPayload | null {
    if (!this.meta || !this.startedAt) return null;

    const now = Math.max(this.maxDurationMs, this.durationMs);
    const latestMatch = this.matchSnapshot ?? this.getLatestMatchSnapshot();
    const fallbackMatch: MatchSnapshot = latestMatch ?? {
      player1Name: 'Player 1',
      player2Name: 'Player 2',
      player1Score: 0,
      player2Score: 0,
      matchActive: false,
      winner: null,
      targetScore: 5,
      updatedAt: Date.now()
    };

    return {
      version: 1,
      meta: {
        version: 1,
        game: 'ricochet-v1',
        issueRef: '#57',
        createdAt: Date.now(),
        startCharacter: this.meta.startCharacter,
        arena: this.meta.arena,
        sessionMode: this.meta.sessionMode,
        maxDurationMs: this.maxDurationMs
      },
      durationMs: now,
      events: [...this.eventLog],
      states: [...this.stateLog]
    };
  }

  public toJSON(): string {
    const payload = this.payload;
    if (!payload) return '';

    return JSON.stringify(payload);
  }

  private relativeTime(): number {
    if (!this.isCapturing) {
      return this.maxDurationMs;
    }

    return Math.max(0, performance.now() - this.startedAt);
  }

  private get durationMs(): number {
    if (this.stateLog.length === 0) {
      return Math.max(0, this.relativeTime());
    }

    return this.stateLog[this.stateLog.length - 1].at;
  }

  private shouldRecordEvent(type: ReplayEvent['type'], minGapMs: number): boolean {
    const lastAt = this.lastEventAt[type];
    const now = this.relativeTime();

    if (now - lastAt < minGapMs) return false;
    this.lastEventAt[type] = now;
    return true;
  }

  private pushEvent(event: ReplayEvent): void {
    this.eventLog.push(event);
    this.trimEvents();
  }

  private trimByDurationAndSize(): void {
    const minAt = Math.max(0, this.relativeTime() - this.maxDurationMs);

    while (this.stateLog.length > 0 && this.stateLog[0].at < minAt) {
      this.stateLog.shift();
    }

    if (this.stateLog.length > this.maxStates) {
      this.stateLog.splice(0, this.stateLog.length - this.maxStates);
    }

    while (this.eventLog.length > 0 && this.eventLog[0].at < minAt) {
      this.eventLog.shift();
    }

    if (this.eventLog.length > this.maxEvents) {
      this.eventLog.splice(0, this.eventLog.length - this.maxEvents);
    }
  }

  private trimEvents(): void {
    if (this.eventLog.length <= this.maxEvents) return;

    this.eventLog.splice(0, this.eventLog.length - this.maxEvents);
  }

  private getLatestMatchSnapshot(): MatchSnapshot | null {
    for (let i = this.eventLog.length - 1; i >= 0; i--) {
      const event = this.eventLog[i];
      if (event.type === 'match_state' && 'payload' in event) {
        const snapshot = event.payload as unknown as MatchSnapshot;
        if (snapshot && snapshot.player1Name) {
          return snapshot;
        }
      }
    }

    return null;
  }
}

export interface ReplayPlaybackResult {
  eventIndex: number;
  stateIndex: number;
  currentTimeMs: number;
  ended: boolean;
}

export interface ReplayPlaybackHooks {
  applyState: (state: ReplayStateSample) => void;
  triggerProjectile: (event: ReplayProjectileEvent) => void;
  recordText?: (value: string) => void;
}

export class ReplayPlayer {
  private readonly payload: ReplayPayload;
  private readonly hooks: ReplayPlaybackHooks;

  private isPlaying = false;
  private isPaused = false;
  private playbackStartAt = 0;
  private cursorMs = 0;

  private eventIndex = 0;
  private stateIndex = -1;

  public constructor(payload: ReplayPayload, hooks: ReplayPlaybackHooks) {
    this.payload = payload;
    this.hooks = hooks;
    this.eventIndex = 0;
    this.stateIndex = -1;
    this.cursorMs = 0;
  }

  public get durationMs(): number {
    return Math.max(1, this.payload.durationMs);
  }

  public get progressMs(): number {
    return this.cursorMs;
  }

  public get playing(): boolean {
    return this.isPlaying;
  }

  public play(): void {
    if (this.isPlaying && !this.isPaused) return;
    if (this.cursorMs >= this.durationMs - 1) {
      this.restart();
    }

    this.isPlaying = true;
    this.isPaused = false;
    const now = performance.now();
    this.playbackStartAt = now - this.cursorMs;
  }

  public pause(): void {
    if (!this.isPlaying || this.isPaused) return;

    this.cursorMs = this.currentClockMs();
    this.isPlaying = false;
    this.isPaused = true;
  }

  public restart(): void {
    this.cursorMs = 0;
    this.eventIndex = 0;
    this.stateIndex = -1;
    this.isPlaying = true;
    this.isPaused = false;
    this.playbackStartAt = performance.now();
  }

  public stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.cursorMs = 0;
    this.eventIndex = 0;
    this.stateIndex = -1;
  }

  public tick(): ReplayPlaybackResult {
    if (!this.isPlaying || this.isPaused) {
      return {
        eventIndex: this.eventIndex,
        stateIndex: this.stateIndex,
        currentTimeMs: this.cursorMs,
        ended: !this.isPlaying
      };
    }

    const clock = this.currentClockMs();
    this.cursorMs = Math.min(clock, this.durationMs);

    this.applyStateSamples(this.cursorMs);
    this.applyEvents(this.cursorMs);

    if (this.cursorMs >= this.durationMs) {
      this.isPlaying = false;
      this.isPaused = false;
      return {
        eventIndex: this.eventIndex,
        stateIndex: this.stateIndex,
        currentTimeMs: this.cursorMs,
        ended: true
      };
    }

    return {
      eventIndex: this.eventIndex,
      stateIndex: this.stateIndex,
      currentTimeMs: this.cursorMs,
      ended: false
    };
  }

  private currentClockMs(): number {
    if (this.playbackStartAt === 0) return 0;
    return Math.max(0, performance.now() - this.playbackStartAt);
  }

  private applyEvents(currentMs: number): void {
    while (this.eventIndex < this.payload.events.length) {
      const event = this.payload.events[this.eventIndex];
      if (event.at > currentMs) break;

      if (event.type === 'projectile') {
        this.hooks.triggerProjectile(event);
      }

      this.eventIndex += 1;
    }
  }

  private applyStateSamples(currentMs: number): void {
    const states = this.payload.states;
    if (states.length === 0) return;

    while (this.stateIndex + 1 < states.length && states[this.stateIndex + 1].at <= currentMs) {
      this.stateIndex += 1;
    }

    if (this.stateIndex < 0 && states.length > 0 && states[0].at <= currentMs) {
      this.stateIndex = 0;
    }

    if (this.stateIndex >= 0 && this.stateIndex < states.length) {
      this.hooks.applyState(states[this.stateIndex]);
    }
  }
}

export class ReplayIO {
  public static isReplayPayload(raw: string): boolean {
    try {
      const parsed = JSON.parse(raw) as ReplayPayload;
      return ReplayIO.parsePayload(parsed) !== null;
    } catch {
      return false;
    }
  }

  public static parsePayload(raw: string): ReplayPayload | null {
    try {
      const parsed = JSON.parse(raw) as Partial<ReplayPayload>;
      if (!parsed || parsed.version !== 1 || !parsed.meta || parsed.meta.game !== 'ricochet-v1') {
        return null;
      }

      const events = Array.isArray(parsed.events) ? parsed.events : [];
      const states = Array.isArray(parsed.states) ? parsed.states : [];

      if (events.length === 0 && states.length === 0) {
        return null;
      }

      return {
        version: 1,
        meta: {
          version: 1,
          game: 'ricochet-v1',
          issueRef: typeof parsed.meta?.issueRef === 'string' ? parsed.meta.issueRef : '#57',
          createdAt: typeof parsed.meta?.createdAt === 'number' ? parsed.meta.createdAt : Date.now(),
          startCharacter: typeof parsed.meta?.startCharacter === 'string' ? parsed.meta.startCharacter : null,
          arena: (parsed.meta as any)?.arena === 'container' ? 'container' : 'warehouse',
          sessionMode: (parsed.meta as any)?.sessionMode === 'online' ? 'online' : 'offline',
          maxDurationMs: typeof (parsed.meta as any)?.maxDurationMs === 'number' ? (parsed.meta as any).maxDurationMs : DEFAULT_MAX_DURATION_MS
        },
        durationMs: typeof parsed.durationMs === 'number' ? parsed.durationMs : 0,
        events: events as ReplayEvent[],
        states: states as ReplayStateSample[]
      };
    } catch {
      return null;
    }
  }
}
