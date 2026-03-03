import type {
  FirePayload,
  NetClientMessage,
  NetRole,
  NetServerMessage,
  PlayerStatePayload
} from './network-types.ts';

interface NetworkClientOptions {
  serverUrl: string;
  requestTimeoutMs?: number;
}

type Resolver = (message: NetServerMessage) => void;

export class NetworkClient {
  public playerId: string | null = null;
  public sessionId: string | null = null;
  public role: NetRole | null = null;

  private socket: WebSocket | null = null;
  private events = new EventTarget();
  private waiters = new Map<string, Resolver[]>();
  private requestTimeoutMs: number;

  constructor(private readonly options: NetworkClientOptions) {
    this.requestTimeoutMs = options.requestTimeoutMs ?? 6000;
  }

  public get connected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  public on<T = any>(type: string, handler: (payload: T) => void): () => void {
    const wrapped = (event: Event) => {
      const custom = event as CustomEvent;
      handler(custom.detail as T);
    };

    this.events.addEventListener(type, wrapped);
    return () => this.events.removeEventListener(type, wrapped);
  }

  public async connect(): Promise<void> {
    if (this.connected) return;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.options.serverUrl);
      this.socket = ws;

      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error('Failed to connect to networking server'));
      ws.onclose = () => {
        this.events.dispatchEvent(new CustomEvent('disconnected', { detail: {} }));
      };

      ws.onmessage = (event) => {
        let message: NetServerMessage;
        try {
          message = JSON.parse(event.data as string) as NetServerMessage;
        } catch {
          return;
        }

        if (message.type === 'welcome') {
          this.playerId = message.playerId;
        }

        if (message.type === 'session_created' || message.type === 'joined_session') {
          this.sessionId = message.sessionId;
          this.role = message.role;
        }

        this.resolveWaiters(message.type, message);
        this.events.dispatchEvent(new CustomEvent(message.type, { detail: message }));
        this.events.dispatchEvent(new CustomEvent('message', { detail: message }));
      };
    });

    await this.waitFor('welcome');
  }

  public async hostSession(characterId: string): Promise<string> {
    const created = await this.requestResponse(
      { type: 'create_session', characterId },
      'session_created'
    ) as Extract<NetServerMessage, { type: 'session_created' }>;

    this.sessionId = created.sessionId;
    this.role = 'host';
    return created.sessionId;
  }

  public async joinSession(sessionId: string, characterId: string): Promise<void> {
    await this.requestResponse(
      { type: 'join_session', sessionId, characterId },
      'joined_session'
    );

    this.sessionId = sessionId;
    this.role = 'client';
  }

  public sendPlayerState(payload: Omit<PlayerStatePayload, 'type'>): void {
    this.send({ type: 'player_state', ...payload });
  }

  public sendFire(payload: Omit<FirePayload, 'type'>): void {
    this.send({ type: 'fire', ...payload });
  }

  public sendRespawnRequest(): void {
    this.send({ type: 'respawn_request' });
  }

  public sendPing(t = Date.now()): void {
    this.send({ type: 'ping', t });
  }

  public close(): void {
    this.socket?.close();
    this.socket = null;
  }

  public buildInviteUrl(baseUrl: string, sessionId: string): string {
    const url = new URL(baseUrl, window.location.href);
    url.searchParams.set('invite', sessionId);
    return url.toString();
  }

  public static createShotId(playerId: string | null): string {
    return `${playerId ?? 'p'}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }

  private async requestResponse(
    message: NetClientMessage,
    successType: NetServerMessage['type']
  ): Promise<NetServerMessage> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for ${successType}`));
      }, this.requestTimeoutMs);

      const offSuccess = this.on<NetServerMessage>(successType, (payload) => {
        cleanup();
        resolve(payload);
      });

      const offError = this.on<Extract<NetServerMessage, { type: 'error' }>>('error', (payload) => {
        cleanup();
        reject(new Error(payload.message));
      });

      const cleanup = () => {
        clearTimeout(timeout);
        offSuccess();
        offError();
      };

      this.send(message);
    });
  }

  private send(message: NetClientMessage): void {
    if (!this.connected || !this.socket) return;
    this.socket.send(JSON.stringify(message));
  }

  private waitFor(type: NetServerMessage['type']): Promise<NetServerMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for ${type}`));
      }, this.requestTimeoutMs);

      const wrappedResolve: Resolver = (message) => {
        clearTimeout(timer);
        resolve(message);
      };

      const list = this.waiters.get(type) ?? [];
      list.push(wrappedResolve);
      this.waiters.set(type, list);
    });
  }

  private resolveWaiters(type: string, message: NetServerMessage): void {
    const list = this.waiters.get(type);
    if (!list || list.length === 0) return;

    const resolve = list.shift();
    if (resolve) {
      resolve(message);
    }

    if (list.length === 0) {
      this.waiters.delete(type);
    } else {
      this.waiters.set(type, list);
    }
  }
}
