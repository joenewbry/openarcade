type LobbyTone = 'neutral' | 'ok' | 'warn' | 'error';

type LobbyMode = 'host' | 'join';

interface LobbySystemOptions {
  pendingInviteId: string | null;
  onRetry: () => void;
  onBack: () => void;
}

const toneColors: Record<LobbyTone, string> = {
  neutral: '#d7dcff',
  ok: '#4ecdc4',
  warn: '#ffb347',
  error: '#ff6b6b'
};

export class LobbySystem {
  private readonly menuContent: HTMLElement | null;
  private readonly lobbyPanel: HTMLElement | null;
  private readonly lobbyTitle: HTMLElement | null;
  private readonly lobbyStatus: HTMLElement | null;
  private readonly sessionRow: HTMLElement | null;
  private readonly sessionIdEl: HTMLElement | null;
  private readonly inviteRow: HTMLElement | null;
  private readonly inviteInput: HTMLInputElement | null;
  private readonly copyButton: HTMLButtonElement | null;
  private readonly opponentStatus: HTMLElement | null;
  private readonly retryButton: HTMLButtonElement | null;
  private readonly backButton: HTMLButtonElement | null;

  private inviteUrl: string | null = null;
  private mode: LobbyMode | null = null;

  constructor(options: LobbySystemOptions) {
    this.menuContent = document.getElementById('menu-content');
    this.lobbyPanel = document.getElementById('lobby-panel');
    this.lobbyTitle = document.getElementById('lobby-title');
    this.lobbyStatus = document.getElementById('lobby-status');
    this.sessionRow = document.getElementById('lobby-session-row');
    this.sessionIdEl = document.getElementById('lobby-session-id');
    this.inviteRow = document.getElementById('lobby-invite-row');
    this.inviteInput = document.getElementById('lobby-invite-url') as HTMLInputElement | null;
    this.copyButton = document.getElementById('lobby-copy') as HTMLButtonElement | null;
    this.opponentStatus = document.getElementById('lobby-opponent-status');
    this.retryButton = document.getElementById('lobby-retry') as HTMLButtonElement | null;
    this.backButton = document.getElementById('lobby-back') as HTMLButtonElement | null;

    this.retryButton?.addEventListener('click', () => options.onRetry());
    this.backButton?.addEventListener('click', () => options.onBack());
    this.copyButton?.addEventListener('click', () => {
      void this.copyInviteUrl();
    });

    if (options.pendingInviteId) {
      this.setMenuHint(`Invite detected: ${options.pendingInviteId}`);
    }

    this.showCharacterSelect();
  }

  public showCharacterSelect(): void {
    if (this.menuContent) this.menuContent.style.display = 'block';
    if (this.lobbyPanel) this.lobbyPanel.style.display = 'none';
    this.mode = null;
    this.inviteUrl = null;
  }

  public beginHostFlow(): void {
    this.mode = 'host';
    this.showLobbyPanel();
    this.setTitle('Host Lobby');
    this.setStatus('Creating session…', 'neutral');
    this.setOpponentStatus('Opponent: waiting to join');
    this.toggleSessionInfo(false);
    this.toggleInviteInfo(false);
    this.setRetryVisible(false);
  }

  public beginJoinFlow(inviteId: string): void {
    this.mode = 'join';
    this.showLobbyPanel();
    this.setTitle('Join Lobby');
    this.setStatus(`Joining session ${inviteId}…`, 'neutral');
    this.setOpponentStatus('Opponent: connecting…');
    this.toggleSessionInfo(true);
    this.toggleInviteInfo(false);
    if (this.sessionIdEl) {
      this.sessionIdEl.textContent = inviteId;
    }
    this.setRetryVisible(false);
  }

  public setSessionInfo(sessionId: string, inviteUrl: string): void {
    this.toggleSessionInfo(true);
    this.toggleInviteInfo(true);
    if (this.sessionIdEl) this.sessionIdEl.textContent = sessionId;
    if (this.inviteInput) this.inviteInput.value = inviteUrl;
    this.inviteUrl = inviteUrl;
  }

  public setOpponentConnected(connected: boolean): void {
    if (connected) {
      this.setOpponentStatus('Opponent: connected ✅');
    } else {
      const waitingText = this.mode === 'join'
        ? 'Opponent: waiting for host'
        : 'Opponent: waiting to join';
      this.setOpponentStatus(waitingText);
    }
  }

  public setStatus(text: string, tone: LobbyTone = 'neutral'): void {
    if (!this.lobbyStatus) return;
    this.lobbyStatus.textContent = text;
    this.lobbyStatus.style.color = toneColors[tone];
  }

  public showReady(): void {
    this.setStatus('Both players connected. Starting match…', 'ok');
    this.setRetryVisible(false);
  }

  public showError(text: string, retryLabel = 'Retry'): void {
    this.setStatus(text, 'error');
    this.setRetryVisible(true, retryLabel);
  }

  public setMenuHint(text: string): void {
    const hint = document.getElementById('menu-invite-hint');
    if (!hint) return;
    hint.textContent = text;
    hint.style.display = 'block';
  }

  private showLobbyPanel(): void {
    if (this.menuContent) this.menuContent.style.display = 'none';
    if (this.lobbyPanel) this.lobbyPanel.style.display = 'block';
  }

  private setTitle(text: string): void {
    if (this.lobbyTitle) {
      this.lobbyTitle.textContent = text;
    }
  }

  private setOpponentStatus(text: string): void {
    if (this.opponentStatus) {
      this.opponentStatus.textContent = text;
    }
  }

  private toggleSessionInfo(visible: boolean): void {
    if (this.sessionRow) {
      this.sessionRow.style.display = visible ? 'block' : 'none';
    }
  }

  private toggleInviteInfo(visible: boolean): void {
    if (this.inviteRow) {
      this.inviteRow.style.display = visible ? 'flex' : 'none';
    }
  }

  private setRetryVisible(visible: boolean, label = 'Retry'): void {
    if (!this.retryButton) return;
    this.retryButton.style.display = visible ? 'inline-block' : 'none';
    this.retryButton.textContent = label;
  }

  private async copyInviteUrl(): Promise<void> {
    if (!this.inviteUrl || !this.copyButton) return;

    const oldLabel = this.copyButton.textContent ?? 'Copy Link';

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.inviteUrl);
      } else if (this.inviteInput) {
        this.inviteInput.select();
        this.inviteInput.setSelectionRange(0, this.inviteInput.value.length);
        document.execCommand('copy');
      }

      this.copyButton.textContent = 'Copied!';
      const copyButton = this.copyButton;
      setTimeout(() => {
        copyButton.textContent = oldLabel;
      }, 1200);
    } catch {
      this.copyButton.textContent = 'Copy failed';
      const copyButton = this.copyButton;
      setTimeout(() => {
        copyButton.textContent = oldLabel;
      }, 1200);
    }
  }
}
