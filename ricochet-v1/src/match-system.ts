export interface MatchSnapshot {
  player1Name: string;
  player2Name: string;
  player1Score: number;
  player2Score: number;
  matchActive: boolean;
  winner: string | null;
  targetScore: number;
  updatedAt: number;
}

interface StartMatchOptions {
  player1Name?: string;
  player2Name?: string;
  targetScore?: number;
  useLocalDeathEvents?: boolean;
}

export class MatchSystem {
  private player1Score = 0;
  private player2Score = 0;
  private player1Name = 'Player 1';
  private player2Name = 'Player 2';
  private targetScore = 5;
  private useLocalDeathEvents = true;
  private matchActive = false;
  private winner: string | null = null;

  constructor() {
    this.initEventListeners();
  }

  private initEventListeners(): void {
    // Offline/local scoring fallback.
    window.addEventListener('playerDied', () => {
      if (!this.matchActive || !this.useLocalDeathEvents) return;

      const totalElims = this.player1Score + this.player2Score;
      if (totalElims % 2 === 0) {
        this.player1Score += 1;
      } else {
        this.player2Score += 1;
      }

      this.afterScoreChange();
    });
  }

  public startMatch(options: StartMatchOptions = {}): void {
    this.player1Name = options.player1Name ?? this.player1Name;
    this.player2Name = options.player2Name ?? this.player2Name;
    this.targetScore = Math.max(1, Math.floor(options.targetScore ?? this.targetScore));
    this.useLocalDeathEvents = options.useLocalDeathEvents ?? this.useLocalDeathEvents;

    this.player1Score = 0;
    this.player2Score = 0;
    this.winner = null;
    this.matchActive = true;

    this.syncLegacyHudAndEmit();
  }

  public endMatch(winnerOverride: string | null = this.winner): void {
    this.winner = winnerOverride;
    this.matchActive = false;
    this.syncLegacyHudAndEmit();
  }

  public setPlayerNames(player1Name: string, player2Name: string): void {
    this.player1Name = player1Name;
    this.player2Name = player2Name;
    this.syncLegacyHudAndEmit();
  }

  public applyExternalScores(player1Score: number, player2Score: number): void {
    this.player1Score = Math.max(0, Math.floor(player1Score));
    this.player2Score = Math.max(0, Math.floor(player2Score));

    // Ensure remote-driven score updates keep match active until victory.
    if (!this.winner) {
      this.matchActive = true;
    }

    this.afterScoreChange();
  }

  public getSnapshot(): MatchSnapshot {
    return {
      player1Name: this.player1Name,
      player2Name: this.player2Name,
      player1Score: this.player1Score,
      player2Score: this.player2Score,
      matchActive: this.matchActive,
      winner: this.winner,
      targetScore: this.targetScore,
      updatedAt: Date.now()
    };
  }

  private afterScoreChange(): void {
    if (this.player1Score >= this.targetScore) {
      this.winner = this.player1Name;
      this.endMatch(this.winner);
      return;
    }

    if (this.player2Score >= this.targetScore) {
      this.winner = this.player2Name;
      this.endMatch(this.winner);
      return;
    }

    this.syncLegacyHudAndEmit();
  }

  private syncLegacyHudAndEmit(): void {
    this.updateLegacyHud();

    window.dispatchEvent(new CustomEvent<MatchSnapshot>('matchStateChanged', {
      detail: this.getSnapshot()
    }));
  }

  private updateLegacyHud(): void {
    const hud = document.getElementById('hud');
    if (!hud) return;

    let scoreElement = hud.querySelector('#score-display') as HTMLElement | null;
    if (!scoreElement) {
      scoreElement = document.createElement('div');
      scoreElement.id = 'score-display';
      scoreElement.style.position = 'absolute';
      scoreElement.style.top = '20px';
      scoreElement.style.left = '50%';
      scoreElement.style.transform = 'translateX(-50%)';
      scoreElement.style.color = 'white';
      scoreElement.style.fontSize = '1.5rem';
      scoreElement.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
      hud.appendChild(scoreElement);
    }

    if (this.matchActive) {
      scoreElement.textContent = `${this.player1Name}: ${this.player1Score} - ${this.player2Name}: ${this.player2Score}`;
      return;
    }

    scoreElement.textContent = this.winner ? `WINNER: ${this.winner}` : 'Match Ended';
  }
}

// Export singleton instance
export const matchSystem = new MatchSystem();
