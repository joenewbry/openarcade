// Input manager for RICOCHET FPS controls
// Handles keyboard, mouse, and touch input mapping

import type { ActionBindingMap, InputAction } from './input-bindings.js';

declare global {
  interface Window {
    requestPointerLock: () => void;
    exitPointerLock: () => void;
    pointerLockElement: Element | null;
  }
}

export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private mouseDelta: { x: number; y: number } = { x: 0, y: 0 };
  private touchStart: { x: number; y: number } | null = null;
  private pointerLocked = false;
  private sensitivity = 0.002;

  constructor() {
    this.setupKeyboardEvents();
    this.setupMouseEvents();
    this.setupTouchEvents();
  }

  private setupKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
      this.setKeyState(e.key, true);
      this.setKeyState(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
      this.setKeyState(e.key, false);
      this.setKeyState(e.code, false);
    });
  }

  private setKeyState(rawKey: string, isDown: boolean): void {
    const key = rawKey.toLowerCase();
    this.keys.set(key, isDown);

    const alias = this.getAlias(key);
    if (alias) {
      this.keys.set(alias, isDown);
    }
  }

  private getAlias(key: string): string | null {
    switch (key) {
      case 'keyw': return 'w';
      case 'keya': return 'a';
      case 'keys': return 's';
      case 'keyd': return 'd';
      case 'arrowup': return 'arrowup';
      case 'arrowleft': return 'arrowleft';
      case 'arrowdown': return 'arrowdown';
      case 'arrowright': return 'arrowright';
      case 'space':
      case 'spacebar':
      case ' ': return ' ';
      default: return null;
    }
  }

  private setupMouseEvents() {
    // Mouse movement for look controls
    window.addEventListener('mousemove', (e) => {
      if (this.pointerLocked) {
        this.mouseDelta.x = e.movementX || 0;
        this.mouseDelta.y = e.movementY || 0;
      }
    });

    // Handle pointer lock change
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === document.body;
    });

    // Handle mouse lock error
    document.addEventListener('pointerlockerror', () => {
      console.warn('Pointer lock failed - ensure user interaction first');
    });
  }

  private setupTouchEvents() {
    // Touch controls for mobile - virtual joystick-style
    const touchCanvas = document.getElementById('canvas');
    if (!touchCanvas) return;

    touchCanvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.touchStart = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      }
    });

    touchCanvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.touchStart) {
        const dx = e.touches[0].clientX - this.touchStart.x;
        const dy = e.touches[0].clientY - this.touchStart.y;

        // Map touch movement to mouse delta for camera control
        this.mouseDelta.x = dx * 0.1;
        this.mouseDelta.y = dy * 0.1;
      }
    });

    touchCanvas.addEventListener('touchend', () => {
      this.touchStart = null;
    });
  }

  // Get input state
  public getKey(key: string): boolean {
    return this.keys.get(key.toLowerCase()) || false;
  }

  public getAnyKey(keys: string[]): boolean {
    return keys.some((key) => this.getKey(key));
  }

  public isActionActive(action: InputAction, bindings: ActionBindingMap): boolean {
    const keys = bindings[action] || [];
    return this.getAnyKey(keys);
  }

  public getMouseDelta(): { x: number; y: number } {
    const delta = { ...this.mouseDelta };
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    return delta;
  }

  public isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  public requestPointerLock(): void {
    document.body.requestPointerLock?.();
  }

  public getSensitivity(): number {
    return this.sensitivity;
  }

  public setSensitivity(sensitivity: number): void {
    this.sensitivity = sensitivity;
  }
}
