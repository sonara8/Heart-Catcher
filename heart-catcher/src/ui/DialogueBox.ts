/**
 * DialogueBox — rounded panel with typewriter text effect.
 * Used for: Soso Call hints, tutorial messages.
 */
export class DialogueBox {
  private visible = false;
  private text = '';
  private displayedChars = 0;
  private charTimer = 0;
  private readonly CHAR_RATE = 0.03; // seconds per character
  private onDismiss: (() => void) | null = null;

  show(text: string, onDismiss?: () => void): void {
    this.text = text;
    this.displayedChars = 0;
    this.charTimer = 0;
    this.visible = true;
    this.onDismiss = onDismiss ?? null;
  }

  hide(): void {
    this.visible = false;
    this.onDismiss?.();
    this.onDismiss = null;
  }

  dismiss(): void {
    if (!this.visible) return;
    if (this.displayedChars < this.text.length) {
      // First press: reveal all at once
      this.displayedChars = this.text.length;
    } else {
      this.hide();
    }
  }

  update(dt: number): void {
    if (!this.visible) return;
    if (this.displayedChars < this.text.length) {
      this.charTimer += dt;
      while (this.charTimer >= this.CHAR_RATE && this.displayedChars < this.text.length) {
        this.charTimer -= this.CHAR_RATE;
        this.displayedChars++;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    const x = 8, y = 160;
    const w = 304, h = 72;

    // Panel
    ctx.fillStyle = 'rgba(10,10,30,0.9)';
    this.roundRect(ctx, x, y, w, h, 4);
    ctx.fill();
    ctx.strokeStyle = '#ff6b9d';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 4);
    ctx.stroke();

    // Soso name tag
    ctx.fillStyle = '#ff6b9d';
    ctx.font = 'bold 7px monospace';
    ctx.fillText('Soso:', x + 6, y + 12);

    // Message text (word-wrapped)
    ctx.fillStyle = '#ffffff';
    ctx.font = '7px monospace';
    const displayed = this.text.slice(0, this.displayedChars);
    this.drawWrappedText(ctx, displayed, x + 6, y + 23, w - 12, 9);

    // Blinking cursor if done
    if (this.displayedChars >= this.text.length) {
      const blink = Math.floor(Date.now() / 500) % 2;
      if (blink) {
        ctx.fillStyle = '#ffffff';
        ctx.fillText('▼', x + w - 14, y + h - 6);
      }
    }
  }

  private drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
  ): void {
    const words = text.split(' ');
    let line = '';
    let cy = y;

    for (const word of words) {
      // Handle newlines in text
      if (word.includes('\n')) {
        const parts = word.split('\n');
        for (let i = 0; i < parts.length; i++) {
          const testLine = line + (line ? ' ' : '') + parts[i];
          if (ctx.measureText(testLine).width > maxWidth && line !== '') {
            ctx.fillText(line, x, cy);
            cy += lineHeight;
            line = parts[i];
          } else {
            line = testLine;
          }
          if (i < parts.length - 1) {
            ctx.fillText(line, x, cy);
            cy += lineHeight;
            line = '';
          }
        }
        continue;
      }

      const testLine = line + (line ? ' ' : '') + word;
      if (ctx.measureText(testLine).width > maxWidth && line !== '') {
        ctx.fillText(line, x, cy);
        cy += lineHeight;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) ctx.fillText(line, x, cy);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  get isVisible(): boolean { return this.visible; }
  get isDone(): boolean { return this.visible && this.displayedChars >= this.text.length; }
}
