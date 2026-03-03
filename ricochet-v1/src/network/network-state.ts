import type { PlayerTransform } from './network-types.ts';

interface TimedSnapshot extends PlayerTransform {}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  let delta = b - a;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return a + delta * t;
}

class SnapshotBuffer {
  private snapshots: TimedSnapshot[] = [];

  constructor(private readonly maxSnapshots = 32) {}

  public push(snapshot: TimedSnapshot): void {
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  public sample(renderTimeMs: number): TimedSnapshot | null {
    if (this.snapshots.length === 0) return null;
    if (this.snapshots.length === 1) return this.snapshots[0];

    // Find the pair surrounding renderTime.
    let older = this.snapshots[0];
    let newer = this.snapshots[this.snapshots.length - 1];

    for (let i = 0; i < this.snapshots.length - 1; i++) {
      const a = this.snapshots[i];
      const b = this.snapshots[i + 1];
      if (a.t <= renderTimeMs && renderTimeMs <= b.t) {
        older = a;
        newer = b;
        break;
      }
      if (renderTimeMs > b.t) {
        older = b;
        newer = b;
      }
    }

    if (older.t === newer.t) {
      return older;
    }

    const alpha = Math.max(0, Math.min(1, (renderTimeMs - older.t) / (newer.t - older.t)));

    return {
      t: renderTimeMs,
      position: {
        x: lerp(older.position.x, newer.position.x, alpha),
        y: lerp(older.position.y, newer.position.y, alpha),
        z: lerp(older.position.z, newer.position.z, alpha)
      },
      yaw: lerpAngle(older.yaw, newer.yaw, alpha),
      pitch: lerpAngle(older.pitch, newer.pitch, alpha)
    };
  }
}

export class NetworkState {
  private buffers = new Map<string, SnapshotBuffer>();
  private interpolationDelayMs = 100;

  public setInterpolationDelay(ms: number): void {
    this.interpolationDelayMs = Math.max(0, ms);
  }

  public pushRemoteState(playerId: string, transform: PlayerTransform): void {
    let buffer = this.buffers.get(playerId);
    if (!buffer) {
      buffer = new SnapshotBuffer();
      this.buffers.set(playerId, buffer);
    }

    buffer.push(transform);
  }

  public removePlayer(playerId: string): void {
    this.buffers.delete(playerId);
  }

  public samplePlayer(playerId: string, nowMs: number): PlayerTransform | null {
    const buffer = this.buffers.get(playerId);
    if (!buffer) return null;

    const renderTime = nowMs - this.interpolationDelayMs;
    return buffer.sample(renderTime);
  }

  public sampleOtherPlayers(localPlayerId: string | null, nowMs: number): Array<{ playerId: string; transform: PlayerTransform }> {
    const result: Array<{ playerId: string; transform: PlayerTransform }> = [];

    for (const [playerId] of this.buffers) {
      if (localPlayerId && playerId === localPlayerId) continue;
      const transform = this.samplePlayer(playerId, nowMs);
      if (!transform) continue;
      result.push({ playerId, transform });
    }

    return result;
  }
}
