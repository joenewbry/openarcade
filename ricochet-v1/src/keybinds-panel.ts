import { KeyBindingManager, type InputAction, formatActionBindingLabel, normalizeKey } from './input-bindings.js';

const DEFAULT_ORDER: Array<{
  action: InputAction;
}> = [
  { action: 'moveForward' },
  { action: 'moveBackward' },
  { action: 'moveLeft' },
  { action: 'moveRight' },
  { action: 'jump' },
  { action: 'crouch' },
  { action: 'reload' },
  { action: 'throwSmoke' },
  { action: 'switchMap' },
  { action: 'returnToMenu' },
  { action: 'toggleScoreboard' }
];

export class KeybindsPanel {
  private readonly panel: HTMLElement | null;
  private readonly openButton: HTMLButtonElement | null;
  private readonly closeButton: HTMLButtonElement | null;
  private readonly resetButton: HTMLButtonElement | null;
  private readonly list: HTMLElement | null;
  private readonly crouchToggleInput: HTMLInputElement | null;
  private pendingAction: InputAction | null = null;

  private readonly unsubs: Array<() => void> = [];
  private onCaptureKey: ((event: KeyboardEvent) => void) | null = null;

  constructor(private readonly bindingManager: KeyBindingManager) {
    this.panel = document.getElementById('keybinds-panel');
    this.openButton = document.getElementById('open-keybinds') as HTMLButtonElement | null;
    this.closeButton = document.getElementById('keybinds-close') as HTMLButtonElement | null;
    this.resetButton = document.getElementById('keybinds-reset') as HTMLButtonElement | null;
    this.list = document.getElementById('keybinds-list');
    this.crouchToggleInput = document.getElementById('keybinds-crouch-toggle') as HTMLInputElement | null;

    if (!this.panel || !this.openButton || !this.closeButton || !this.resetButton || !this.list || !this.crouchToggleInput) {
      return;
    }

    this.bindEvents();
    this.render();
  }

  private bindEvents(): void {
    if (!this.openButton || !this.closeButton || !this.resetButton || !this.crouchToggleInput || !this.list) {
      return;
    }

    this.openButton.addEventListener('click', (event) => {
      event.preventDefault();
      this.show();
    });

    this.closeButton.addEventListener('click', (event) => {
      event.preventDefault();
      this.hide();
    });

    this.resetButton.addEventListener('click', (event) => {
      event.preventDefault();
      this.bindingManager.resetToDefaults();
      this.render();
    });

    this.crouchToggleInput.addEventListener('change', () => {
      this.bindingManager.setCrouchMode(this.crouchToggleInput?.checked ? 'toggle' : 'hold');
    });

    this.list.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const action = target.dataset.action || target.closest('[data-action]')?.getAttribute('data-action');
      if (!action) return;
      this.beginCapture(action as InputAction);
    });

    const unsubscribe = this.bindingManager.subscribe(() => {
      this.render();
      if (this.crouchToggleInput) {
        this.crouchToggleInput.checked = this.bindingManager.isCrouchToggle();
      }
    });

    this.unsubs.push(unsubscribe);
  }

  public show(): void {
    if (!this.panel) return;
    this.panel.style.display = 'block';
    this.render();
  }

  public hide(): void {
    if (!this.panel) return;
    this.panel.style.display = 'none';
    this.cancelCapture();
  }

  public destroy(): void {
    this.hide();
    while (this.unsubs.length > 0) {
      const unsub = this.unsubs.pop();
      unsub?.();
    }
  }

  private beginCapture(action: InputAction): void {
    this.cancelCapture();
    this.pendingAction = action;
    this.render();

    const onCapture = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const normalized = normalizeKey(event.key, event.code);
      if (!normalized) {
        return;
      }

      if (normalized === 'escape') {
        this.cancelCapture();
        return;
      }

      if (this.pendingAction) {
        this.bindingManager.setBinding(this.pendingAction, [normalized]);
      }
      this.cancelCapture();
      this.render();
    };

    this.onCaptureKey = onCapture;
    document.addEventListener('keydown', onCapture, { once: true });
  }

  private cancelCapture(): void {
    if (!this.pendingAction) {
      if (!this.onCaptureKey) return;

      document.removeEventListener('keydown', this.onCaptureKey);
      this.onCaptureKey = null;
      return;
    }

    if (this.onCaptureKey) {
      document.removeEventListener('keydown', this.onCaptureKey);
      this.onCaptureKey = null;
    }

    this.pendingAction = null;
    this.render();
  }

  private render(): void {
    if (!this.list || !this.crouchToggleInput) return;

    this.crouchToggleInput.checked = this.bindingManager.isCrouchToggle();

    const entries = DEFAULT_ORDER
      .map((entry) => {
        const config = this.bindingManager.getActionConfig()[entry.action];
        return { action: entry.action, label: config.label };
      })
      .map(({ action, label }) => {
        const isCapturing = this.pendingAction === action;
        const buttonLabel = isCapturing
          ? 'Press any key...'
          : formatActionBindingLabel(this.bindingManager.getActionKeys(action));

        return `
          <div class="keybinds-row" data-action="${action}">
            <span class="keybinds-label">${label}</span>
            <button type="button" class="keybinds-bind-btn" data-action="${action}">${buttonLabel}</button>
          </div>
        `;
      })
      .join('');

    this.list.innerHTML = entries;
  }
}
