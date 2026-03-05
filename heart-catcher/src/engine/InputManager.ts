/**
 * InputManager — unified abstraction over keyboard, Gamepad API, and pointer events.
 * Keyboard: keydown/keyup → Set<string> of active keys.
 * Gamepad: polled each frame via navigator.getGamepads() (Gamepad API has no events).
 * Touch: pointerdown → stores tap world position for tap-to-walk.
 */
export class InputManager {
  private keys = new Set<string>();
  private justPressedKeys = new Set<string>();
  private justReleasedKeys = new Set<string>();

  // Touch/pointer
  private touchTarget: { x: number; y: number } | null = null;
  private canvasRect: DOMRect | null = null;

  // Canvas logical size for coordinate mapping
  private logicalWidth = 320;
  private logicalHeight = 240;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    this.canvasRect = canvas.getBoundingClientRect();
    window.addEventListener('resize', () => {
      this.canvasRect = canvas.getBoundingClientRect();
    });
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.keys.has(e.code)) {
      this.justPressedKeys.add(e.code);
    }
    this.keys.add(e.code);
    // Prevent arrow keys from scrolling page
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
    this.justReleasedKeys.add(e.code);
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.updateTouchTarget(e);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.buttons > 0) this.updateTouchTarget(e);
  };

  private onPointerUp = (): void => {
    // Keep last target so player continues walking toward it
  };

  private updateTouchTarget(e: PointerEvent): void {
    if (!this.canvasRect) return;
    const rect = this.canvasRect;
    const scaleX = this.logicalWidth / rect.width;
    const scaleY = this.logicalHeight / rect.height;
    this.touchTarget = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  /** Call once per frame after processing input */
  flush(): void {
    this.justPressedKeys.clear();
    this.justReleasedKeys.clear();
  }

  clearTouchTarget(): void {
    this.touchTarget = null;
  }

  // ─── Query API ────────────────────────────────────────────────────────────

  isDown(...codes: string[]): boolean {
    return codes.some(c => this.keys.has(c));
  }

  isJustPressed(...codes: string[]): boolean {
    return codes.some(c => this.justPressedKeys.has(c));
  }

  isJustReleased(...codes: string[]): boolean {
    return codes.some(c => this.justReleasedKeys.has(c));
  }

  /** Directional input — returns -1, 0, or 1 per axis */
  axisX(): number {
    const pad = this.getPadAxis();
    if (pad.x !== 0) return pad.x;
    const left = this.isDown('ArrowLeft', 'KeyA') ? -1 : 0;
    const right = this.isDown('ArrowRight', 'KeyD') ? 1 : 0;
    return left + right;
  }

  axisY(): number {
    const pad = this.getPadAxis();
    if (pad.y !== 0) return pad.y;
    const up = this.isDown('ArrowUp', 'KeyW') ? -1 : 0;
    const down = this.isDown('ArrowDown', 'KeyS') ? 1 : 0;
    return up + down;
  }

  isActionDown(): boolean {
    return this.isDown('KeyZ', 'Space', 'Enter') || this.isPadButton(0);
  }

  isActionJustPressed(): boolean {
    return this.isJustPressed('KeyZ', 'Space', 'Enter') || this.isPadButtonJustPressed(0);
  }

  isRunDown(): boolean {
    return this.isDown('ShiftLeft', 'ShiftRight') || this.isPadButton(1);
  }

  isMenuDown(): boolean {
    return this.isJustPressed('KeyX', 'Escape') || this.isPadButtonJustPressed(3);
  }

  isScentJustPressed(): boolean {
    return this.isJustPressed('KeyQ') || this.isPadButtonJustPressed(4);
  }

  isMowerJustPressed(): boolean {
    return this.isJustPressed('KeyE') || this.isPadButtonJustPressed(5);
  }

  getTouchTarget(): { x: number; y: number } | null {
    return this.touchTarget;
  }

  // ─── Gamepad ──────────────────────────────────────────────────────────────

  private prevPadButtons: boolean[] = [];
  private currPadButtons: boolean[] = [];

  pollGamepad(): void {
    this.prevPadButtons = [...this.currPadButtons];
    const pads = navigator.getGamepads();
    const pad = pads[0];
    if (!pad) {
      this.currPadButtons = [];
      return;
    }
    this.currPadButtons = pad.buttons.map(b => b.pressed);
  }

  private getPadAxis(): { x: number; y: number } {
    const pads = navigator.getGamepads();
    const pad = pads[0];
    if (!pad) return { x: 0, y: 0 };

    // D-Pad (buttons 12–15) or left analog stick (axes 0–1)
    const dLeft = pad.buttons[14]?.pressed;
    const dRight = pad.buttons[15]?.pressed;
    const dUp = pad.buttons[12]?.pressed;
    const dDown = pad.buttons[13]?.pressed;

    const dx = dLeft ? -1 : dRight ? 1 : Math.sign(pad.axes[0] ?? 0);
    const dy = dUp ? -1 : dDown ? 1 : Math.sign(pad.axes[1] ?? 0);

    // Dead zone
    const ax = Math.abs(pad.axes[0] ?? 0) > 0.3 ? Math.sign(pad.axes[0]!) : 0;
    const ay = Math.abs(pad.axes[1] ?? 0) > 0.3 ? Math.sign(pad.axes[1]!) : 0;

    return { x: dx || ax, y: dy || ay };
  }

  private isPadButton(index: number): boolean {
    return this.currPadButtons[index] === true;
  }

  private isPadButtonJustPressed(index: number): boolean {
    return this.currPadButtons[index] === true && this.prevPadButtons[index] !== true;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
