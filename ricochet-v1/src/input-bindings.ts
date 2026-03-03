export type InputAction =
  | 'moveForward'
  | 'moveBackward'
  | 'moveLeft'
  | 'moveRight'
  | 'jump'
  | 'crouch'
  | 'reload'
  | 'throwSmoke'
  | 'switchMap'
  | 'returnToMenu'
  | 'toggleScoreboard';

export type CrouchMode = 'hold' | 'toggle';

export interface ActionBindingDescriptor {
  label: string;
  description?: string;
  defaults: string[];
}

export type ActionBindingMap = { [key in InputAction]: string[] };

const ACTION_DEFINITIONS: Record<InputAction, ActionBindingDescriptor> = {
  moveForward: {
    label: 'Move Forward',
    defaults: ['w', 'arrowup']
  },
  moveBackward: {
    label: 'Move Backward',
    defaults: ['s', 'arrowdown']
  },
  moveLeft: {
    label: 'Move Left',
    defaults: ['a', 'arrowleft']
  },
  moveRight: {
    label: 'Move Right',
    defaults: ['d', 'arrowright']
  },
  jump: {
    label: 'Jump',
    defaults: [' ']
  },
  crouch: {
    label: 'Crouch',
    defaults: ['c']
  },
  reload: {
    label: 'Reload',
    defaults: ['r']
  },
  throwSmoke: {
    label: 'Throw Smoke',
    defaults: ['g']
  },
  switchMap: {
    label: 'Switch Map',
    defaults: ['m']
  },
  returnToMenu: {
    label: 'Return To Menu',
    defaults: ['q']
  },
  toggleScoreboard: {
    label: 'Scoreboard',
    defaults: ['tab']
  }
};

const STORAGE_KEY = 'ricochet:input-bindings:v1';
const SETTINGS_KEY = 'ricochet:input-bindings-settings:v1';

const DEFAULT_BINDINGS: ActionBindingMap = {
  moveForward: [...ACTION_DEFINITIONS.moveForward.defaults],
  moveBackward: [...ACTION_DEFINITIONS.moveBackward.defaults],
  moveLeft: [...ACTION_DEFINITIONS.moveLeft.defaults],
  moveRight: [...ACTION_DEFINITIONS.moveRight.defaults],
  jump: [...ACTION_DEFINITIONS.jump.defaults],
  crouch: [...ACTION_DEFINITIONS.crouch.defaults],
  reload: [...ACTION_DEFINITIONS.reload.defaults],
  throwSmoke: [...ACTION_DEFINITIONS.throwSmoke.defaults],
  switchMap: [...ACTION_DEFINITIONS.switchMap.defaults],
  returnToMenu: [...ACTION_DEFINITIONS.returnToMenu.defaults],
  toggleScoreboard: [...ACTION_DEFINITIONS.toggleScoreboard.defaults]
};

function normalizeKey(rawKey: string, rawCode?: string): string {
  const key = rawKey.toLowerCase().trim();
  const code = (rawCode ?? '').toLowerCase();

  if (!key) {
    return '';
  }

  if (key === ' ') {
    return ' ';
  }

  if (code === 'space') {
    return ' ';
  }

  if (code.startsWith('key') && code.length === 4) {
    return code.slice(3);
  }

  if (code.startsWith('digit') && code.length === 6) {
    return code.slice(5);
  }

  if (code === 'arrowup') return 'arrowup';
  if (code === 'arrowdown') return 'arrowdown';
  if (code === 'arrowleft') return 'arrowleft';
  if (code === 'arrowright') return 'arrowright';

  if (code === 'tab') return 'tab';
  if (code === 'shiftleft' || code === 'shiftright') return 'shift';

  if (code === 'escape') return 'escape';

  return key;
}

function normalizeBindingList(rawBindings: string[]): string[] {
  const next = new Set<string>();

  for (const raw of rawBindings) {
    const normalized = normalizeKey(raw);
    if (!normalized) continue;
    next.add(normalized);
  }

  return [...next];
}

export function formatBindingLabel(rawKey: string): string {
  const key = rawKey.toLowerCase();

  if (key === ' ') {
    return 'Space';
  }

  if (key === 'arrowup') return '↑';
  if (key === 'arrowdown') return '↓';
  if (key === 'arrowleft') return '←';
  if (key === 'arrowright') return '→';
  if (key === 'tab') return 'Tab';
  if (key === 'escape') return 'Esc';

  if (key.length === 1) {
    return key.toUpperCase();
  }

  return key.replace(/^./, (char) => char.toUpperCase());
}

export function formatActionBindingLabel(keys: string[]): string {
  return keys.map((key) => formatBindingLabel(key)).join(' / ');
}

export function getActionDefaults(action: InputAction): string[] {
  return [...ACTION_DEFINITIONS[action].defaults];
}

export class KeyBindingManager {
  private bindings: ActionBindingMap = {
    moveForward: [...DEFAULT_BINDINGS.moveForward],
    moveBackward: [...DEFAULT_BINDINGS.moveBackward],
    moveLeft: [...DEFAULT_BINDINGS.moveLeft],
    moveRight: [...DEFAULT_BINDINGS.moveRight],
    jump: [...DEFAULT_BINDINGS.jump],
    crouch: [...DEFAULT_BINDINGS.crouch],
    reload: [...DEFAULT_BINDINGS.reload],
    throwSmoke: [...DEFAULT_BINDINGS.throwSmoke],
    switchMap: [...DEFAULT_BINDINGS.switchMap],
    returnToMenu: [...DEFAULT_BINDINGS.returnToMenu],
    toggleScoreboard: [...DEFAULT_BINDINGS.toggleScoreboard]
  };

  private crouchMode: CrouchMode = 'hold';
  private listeners = new Set<() => void>();

  constructor() {
    this.load();
  }

  public getActionConfig(): Record<InputAction, ActionBindingDescriptor> {
    return ACTION_DEFINITIONS;
  }

  public getBindings(): ActionBindingMap {
    return {
      moveForward: [...this.bindings.moveForward],
      moveBackward: [...this.bindings.moveBackward],
      moveLeft: [...this.bindings.moveLeft],
      moveRight: [...this.bindings.moveRight],
      jump: [...this.bindings.jump],
      crouch: [...this.bindings.crouch],
      reload: [...this.bindings.reload],
      switchMap: [...this.bindings.switchMap],
      returnToMenu: [...this.bindings.returnToMenu],
      throwSmoke: [...this.bindings.throwSmoke],
      toggleScoreboard: [...this.bindings.toggleScoreboard]
    };
  }

  public getActionKeys(action: InputAction): string[] {
    return [...this.bindings[action]];
  }

  public getBindingLabel(action: InputAction): string {
    return formatActionBindingLabel(this.bindings[action]);
  }

  public getCrouchMode(): CrouchMode {
    return this.crouchMode;
  }

  public isCrouchToggle(): boolean {
    return this.crouchMode === 'toggle';
  }

  public setCrouchMode(mode: CrouchMode): void {
    if (mode === this.crouchMode) return;
    this.crouchMode = mode;
    this.saveSettings();
    this.notify();
  }

  public setBinding(action: InputAction, keys: string[]): void {
    const next = normalizeBindingList(keys);
    if (next.length === 0) return;

    this.bindings[action] = [...next];
    this.saveBindings();
    this.notify();
  }

  public resetToDefaults(): void {
    this.bindings = {
      moveForward: [...DEFAULT_BINDINGS.moveForward],
      moveBackward: [...DEFAULT_BINDINGS.moveBackward],
      moveLeft: [...DEFAULT_BINDINGS.moveLeft],
      moveRight: [...DEFAULT_BINDINGS.moveRight],
      jump: [...DEFAULT_BINDINGS.jump],
      crouch: [...DEFAULT_BINDINGS.crouch],
      reload: [...DEFAULT_BINDINGS.reload],
      throwSmoke: [...DEFAULT_BINDINGS.throwSmoke],
      switchMap: [...DEFAULT_BINDINGS.switchMap],
      returnToMenu: [...DEFAULT_BINDINGS.returnToMenu],
      toggleScoreboard: [...DEFAULT_BINDINGS.toggleScoreboard]
    };
    this.crouchMode = 'hold';

    this.saveBindings();
    this.saveSettings();
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private load(): void {
    this.loadBindings();
    this.loadSettings();
  }

  private loadBindings(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<ActionBindingMap>;
      if (!parsed || typeof parsed !== 'object') return;

      (Object.keys(DEFAULT_BINDINGS) as InputAction[]).forEach((action) => {
        const saved = parsed[action];
        if (!Array.isArray(saved) || saved.length === 0) return;

        const next = normalizeBindingList(saved);
        if (next.length > 0) {
          this.bindings[action] = next;
        }
      });
    } catch {
      // Ignore and keep defaults.
    }
  }

  private loadSettings(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<{ crouchMode: CrouchMode }>;
      if (parsed?.crouchMode === 'hold' || parsed?.crouchMode === 'toggle') {
        this.crouchMode = parsed.crouchMode;
      }
    } catch {
      // Ignore and keep defaults.
    }
  }

  private saveBindings(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bindings));
    } catch {
      // Ignore storage write failures.
    }
  }

  private saveSettings(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ crouchMode: this.crouchMode }));
    } catch {
      // Ignore storage write failures.
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export { normalizeKey };