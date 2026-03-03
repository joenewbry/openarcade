export type NetRole = 'host' | 'client';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerTransform {
  t: number;
  position: Vec3;
  yaw: number;
  pitch: number;
}

export type ScoreMap = Record<string, number>;

export type NetClientMessage =
  | { type: 'create_session'; characterId: string }
  | { type: 'join_session'; sessionId: string; characterId: string }
  | ({ type: 'player_state' } & PlayerTransform)
  | {
      type: 'fire';
      shotId: string;
      t: number;
      origin: Vec3;
      direction: Vec3;
    }
  | { type: 'respawn_request' }
  | { type: 'ping'; t: number };

export type NetServerMessage =
  | {
      type: 'welcome';
      playerId: string;
      serverTime: number;
    }
  | {
      type: 'session_created';
      sessionId: string;
      role: 'host';
      playerId: string;
    }
  | {
      type: 'joined_session';
      sessionId: string;
      role: 'client';
      playerId: string;
    }
  | {
      type: 'lobby_state';
      sessionId: string;
      hostId: string | null;
      clientId: string | null;
      players: Array<{ playerId: string; characterId: string; hp: number; alive: boolean }>;
      scores: ScoreMap;
    }
  | {
      type: 'player_joined';
      playerId: string;
      characterId: string;
    }
  | {
      type: 'player_left';
      playerId: string;
    }
  | ({ type: 'player_state'; playerId: string } & PlayerTransform)
  | {
      type: 'player_fire';
      playerId: string;
      shotId: string;
      t: number;
      origin: Vec3;
      direction: Vec3;
    }
  | {
      type: 'damage';
      targetId: string;
      byPlayerId: string;
      amount: number;
      hp: number;
      shotId: string;
    }
  | {
      type: 'death';
      victimId: string;
      killerId: string;
      scores: ScoreMap;
      respawnMs: number;
    }
  | {
      type: 'respawn';
      playerId: string;
      hp: number;
      position: Vec3;
    }
  | {
      type: 'score_update';
      scores: ScoreMap;
    }
  | {
      type: 'error';
      message: string;
      code?: string;
    }
  | {
      type: 'pong';
      t: number;
    };

export type FirePayload = Extract<NetClientMessage, { type: 'fire' }>;
export type PlayerStatePayload = Extract<NetClientMessage, { type: 'player_state' }>;
