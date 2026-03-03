import type { MatchSnapshot } from './match-system.ts';

type ScoreboardSlot = 'player1' | 'player2';

interface RowRefs {
  name: HTMLElement;
  kills: HTMLElement;
  deaths: HTMLElement;
  ping: HTMLElement;
}

const DEFAULT_SNAPSHOT: MatchSnapshot = {
  player1Name: 'Player 1',
  player2Name: 'Player 2',
  player1Score: 0,
  player2Score: 0,
  matchActive: false,
  winner: null,
  targetScore: 5,
  updatedAt: Date.now()
};

export class ScoreboardSystem {
  private readonly overlay: HTMLElement | null;
  private readonly stateEl: HTMLElement | null;
  private readonly winnerEl: HTMLElement | null;
  private readonly rematchEl: HTMLElement | null;
  private readonly rowRefs: Record<ScoreboardSlot, RowRefs> | null;

  private isOpen = false;
  private snapshot: MatchSnapshot = { ...DEFAULT_SNAPSHOT };
  private stateOverride: string | null = null;
  private pingBySlot: Record<ScoreboardSlot, number | null> = {
    player1: null,
    player2: null
  };

  constructor() {
    this.overlay = document.getElementById('scoreboard-overlay');
    this.stateEl = document.getElementById('scoreboard-state');
    this.winnerEl = document.getElementById('scoreboard-winner');
    this.rematchEl = document.getElementById('scoreboard-rematch');

    const p1 = this.getRowRefs('player1');
    const p2 = this.getRowRefs('player2');
    this.rowRefs = p1 && p2 ? { player1: p1, player2: p2 } : null;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('matchStateChanged', this.onMatchStateChanged as EventListener);

    this.render();
  }

  public setMatchStateOverride(text: string | null): void {
    this.stateOverride = text;
    this.renderState();
  }

  public setPlayerPing(slot: ScoreboardSlot, pingMs: number | null): void {
    this.pingBySlot[slot] = pingMs;
    this.renderRows();
  }

  public open(): void {
    if (!this.overlay) return;
    this.isOpen = true;
    this.overlay.classList.add('open');
    this.overlay.setAttribute('aria-hidden', 'false');
  }

  public close(): void {
    if (!this.overlay) return;
    this.isOpen = false;
    this.overlay.classList.remove('open');
    this.overlay.setAttribute('aria-hidden', 'true');
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
      return;
    }

    this.open();
  }

  private getRowRefs(slot: ScoreboardSlot): RowRefs | null {
    const base = document.querySelector(`[data-scoreboard-slot="${slot}"]`);
    if (!base) return null;

    const name = base.querySelector('[data-col="name"]') as HTMLElement | null;
    const kills = base.querySelector('[data-col="kills"]') as HTMLElement | null;
    const deaths = base.querySelector('[data-col="deaths"]') as HTMLElement | null;
    const ping = base.querySelector('[data-col="ping"]') as HTMLElement | null;

    if (!name || !kills || !deaths || !ping) {
      return null;
    }

    return { name, kills, deaths, ping };
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== 'Tab') return;
    if (!this.isGameHudVisible()) return;

    event.preventDefault();
    this.toggle();
  };

  private onMatchStateChanged = (event: Event): void => {
    const detail = (event as CustomEvent<MatchSnapshot>).detail;
    if (!detail) return;

    this.snapshot = detail;
    this.render();

    if (!detail.matchActive && detail.winner) {
      this.open();
    }
  };

  private render(): void {
    this.renderState();
    this.renderRows();
    this.renderWinnerAndRematch();
  }

  private renderState(): void {
    if (!this.stateEl) return;

    const shouldForceSnapshotState = !this.snapshot.matchActive && Boolean(this.snapshot.winner);
    const text = shouldForceSnapshotState
      ? this.getSnapshotStateText()
      : (this.stateOverride ?? this.getSnapshotStateText());

    this.stateEl.textContent = text;
  }

  private renderRows(): void {
    if (!this.rowRefs) return;

    const p1 = this.rowRefs.player1;
    const p2 = this.rowRefs.player2;

    p1.name.textContent = this.snapshot.player1Name;
    p1.kills.textContent = String(this.snapshot.player1Score);
    p1.deaths.textContent = String(this.snapshot.player2Score);
    p1.ping.textContent = this.formatPing(this.pingBySlot.player1);

    p2.name.textContent = this.snapshot.player2Name;
    p2.kills.textContent = String(this.snapshot.player2Score);
    p2.deaths.textContent = String(this.snapshot.player1Score);
    p2.ping.textContent = this.formatPing(this.pingBySlot.player2);
  }

  private renderWinnerAndRematch(): void {
    if (!this.winnerEl || !this.rematchEl) return;

    if (this.snapshot.matchActive || !this.snapshot.winner) {
      this.winnerEl.textContent = '';
      this.winnerEl.classList.remove('visible');
      this.rematchEl.classList.remove('visible');
      return;
    }

    this.winnerEl.textContent = `${this.snapshot.winner} WINS`;
    this.winnerEl.classList.add('visible');

    this.rematchEl.textContent = 'Rematch prompt: Press Enter to queue another round.';
    this.rematchEl.classList.add('visible');
  }

  private getSnapshotStateText(): string {
    if (this.snapshot.matchActive) {
      return `In Progress • First to ${this.snapshot.targetScore}`;
    }

    if (this.snapshot.winner) {
      return 'Match Complete';
    }

    return 'Waiting for match start';
  }

  private formatPing(pingMs: number | null): string {
    if (pingMs === null || !Number.isFinite(pingMs)) {
      return 'N/A';
    }

    return `${Math.max(0, Math.round(pingMs))} ms`;
  }

  private isGameHudVisible(): boolean {
    const hud = document.getElementById('hud');
    if (!hud) return false;
    return hud.style.display !== 'none';
  }
}
