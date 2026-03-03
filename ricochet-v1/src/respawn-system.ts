export type ArenaType = 'warehouse' | 'container';

export interface SpawnPoint {
  x: number;
  y: number;
  z: number;
}

export interface RespawnStartedDetail {
  playerId: string;
  delayMs: number;
  arena: ArenaType;
  respawnAt: number;
}

export interface RespawnTickDetail {
  playerId: string;
  remainingMs: number;
  remainingSeconds: number;
}

export interface PlayerRespawnedDetail {
  playerId: string;
  position: SpawnPoint;
}

interface RespawnSystemOptions {
  respawnDelayMs?: number;
  arena?: ArenaType;
}

interface StartRespawnOptions {
  delayMs?: number;
  autoComplete?: boolean;
  spawnPosition?: SpawnPoint;
}

const DEFAULT_RESPAWN_DELAY_MS = 5000;

const ARENA_SPAWN_POINTS: Record<ArenaType, SpawnPoint[]> = {
  warehouse: [
    { x: -10, y: 1.6, z: -8 },
    { x: 10, y: 1.6, z: -8 },
    { x: -10, y: 1.6, z: 8 },
    { x: 10, y: 1.6, z: 8 },
    { x: 0, y: 1.6, z: -14 },
    { x: 0, y: 1.6, z: 14 }
  ],
  container: [
    { x: -14, y: 1.6, z: 0 },
    { x: 14, y: 1.6, z: 0 },
    { x: 0, y: 1.6, z: -14 },
    { x: 0, y: 1.6, z: 14 },
    { x: -8, y: 1.6, z: 8 },
    { x: 8, y: 1.6, z: -8 }
  ]
};

export class RespawnSystem {
  private respawnDelayMs: number;
  private arena: ArenaType;

  private activePlayerId: string | null = null;
  private autoComplete: boolean = true;
  private activeRespawnAt: number | null = null;
  private pendingPosition: SpawnPoint | null = null;

  private tickIntervalId: number | null = null;
  private completeTimeoutId: number | null = null;
  private nextSpawnIndex = 0;

  constructor(options: RespawnSystemOptions = {}) {
    this.respawnDelayMs = options.respawnDelayMs ?? DEFAULT_RESPAWN_DELAY_MS;
    this.arena = options.arena ?? 'warehouse';
  }

  public setArena(arena: ArenaType): void {
    this.arena = arena;
  }

  public setRespawnDelay(respawnDelayMs: number): void {
    this.respawnDelayMs = Math.max(0, Math.floor(respawnDelayMs));
  }

  public getRespawnDelay(): number {
    return this.respawnDelayMs;
  }

  public isRespawning(): boolean {
    return this.activePlayerId !== null;
  }

  public startRespawn(playerId: string, options: StartRespawnOptions = {}): void {
    this.clearTimers();

    const delayMs = Math.max(0, Math.floor(options.delayMs ?? this.respawnDelayMs));

    this.activePlayerId = playerId;
    this.autoComplete = options.autoComplete ?? true;
    this.pendingPosition = options.spawnPosition ?? this.pickSpawnPoint();
    this.activeRespawnAt = Date.now() + delayMs;

    window.dispatchEvent(new CustomEvent<RespawnStartedDetail>('respawnStarted', {
      detail: {
        playerId,
        delayMs,
        arena: this.arena,
        respawnAt: this.activeRespawnAt
      }
    }));

    this.emitTick();

    if (delayMs > 0) {
      this.tickIntervalId = window.setInterval(() => {
        this.emitTick();
      }, 1000);
    }

    if (this.autoComplete) {
      this.completeTimeoutId = window.setTimeout(() => {
        this.completeRespawn();
      }, delayMs);
    }
  }

  public completeRespawn(positionOverride?: SpawnPoint, playerIdOverride?: string): PlayerRespawnedDetail | null {
    const playerId = this.activePlayerId ?? playerIdOverride;
    if (!playerId) return null;

    const position = positionOverride ?? this.pendingPosition ?? this.pickSpawnPoint();

    this.clearTimers();
    this.activePlayerId = null;
    this.activeRespawnAt = null;
    this.pendingPosition = null;

    const detail: PlayerRespawnedDetail = {
      playerId,
      position
    };

    window.dispatchEvent(new CustomEvent<PlayerRespawnedDetail>('playerRespawned', {
      detail
    }));

    return detail;
  }

  public reset(): void {
    this.clearTimers();
    this.activePlayerId = null;
    this.autoComplete = true;
    this.activeRespawnAt = null;
    this.pendingPosition = null;
  }

  private emitTick(): void {
    if (!this.activePlayerId || this.activeRespawnAt === null) return;

    const remainingMs = Math.max(0, this.activeRespawnAt - Date.now());

    window.dispatchEvent(new CustomEvent<RespawnTickDetail>('respawnTick', {
      detail: {
        playerId: this.activePlayerId,
        remainingMs,
        remainingSeconds: Math.ceil(remainingMs / 1000)
      }
    }));

    if (!this.autoComplete && remainingMs <= 0 && this.tickIntervalId !== null) {
      window.clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
  }

  private pickSpawnPoint(): SpawnPoint {
    const points = ARENA_SPAWN_POINTS[this.arena];
    if (points.length === 0) {
      return { x: 0, y: 1.6, z: 0 };
    }

    const point = points[this.nextSpawnIndex % points.length];
    this.nextSpawnIndex += 1;

    return { ...point };
  }

  private clearTimers(): void {
    if (this.tickIntervalId !== null) {
      window.clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }

    if (this.completeTimeoutId !== null) {
      window.clearTimeout(this.completeTimeoutId);
      this.completeTimeoutId = null;
    }
  }
}

export function createRespawnSystem(options: RespawnSystemOptions = {}): RespawnSystem {
  return new RespawnSystem(options);
}
