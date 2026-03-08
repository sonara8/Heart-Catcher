/**
 * DialogueBox — rounded panel with typewriter text effect + portrait.
 * Used for: Dancy hints, tutorial messages.
 */
export class DialogueBox {
  private visible = false;
  private text = '';
  private displayedChars = 0;
  private charTimer = 0;
  private readonly CHAR_RATE = 0.03; // seconds per character
  private onDismiss: (() => void) | null = null;
  private portrait: HTMLImageElement | null = null;

  setPortrait(img: HTMLImageElement | null): void {
    this.portrait = img;
  }

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

    const x = 8, y = 155;
    const w = 304, h = 72;
    const PORTRAIT_SIZE = 34;
    const PORTRAIT_X = x + 4;
    const PORTRAIT_Y = y + 4;
    const TEXT_X = x + PORTRAIT_SIZE + 10;
    const TEXT_W = w - PORTRAIT_SIZE - 16;

    // Panel
    ctx.fillStyle = 'rgba(10,10,30,0.92)';
    this.roundRect(ctx, x, y, w, h, 4);
    ctx.fill();
    ctx.strokeStyle = '#ff6b9d';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 4);
    ctx.stroke();

    // Portrait panel
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.roundRect(ctx, PORTRAIT_X, PORTRAIT_Y, PORTRAIT_SIZE, PORTRAIT_SIZE, 3);
    ctx.fill();
    ctx.strokeStyle = '#ff6b9d88';
    ctx.lineWidth = 1;
    this.roundRect(ctx, PORTRAIT_X + 0.5, PORTRAIT_Y + 0.5, PORTRAIT_SIZE - 1, PORTRAIT_SIZE - 1, 3);
    ctx.stroke();
    if (this.portrait) {
      ctx.save();
      this.roundRect(ctx, PORTRAIT_X + 1, PORTRAIT_Y + 1, PORTRAIT_SIZE - 2, PORTRAIT_SIZE - 2, 2);
      ctx.clip();
      ctx.drawImage(this.portrait, PORTRAIT_X + 1, PORTRAIT_Y + 1, PORTRAIT_SIZE - 2, PORTRAIT_SIZE - 2);
      ctx.restore();
    } else {
      // Placeholder silhouette
      ctx.fillStyle = '#c68040';
      ctx.beginPath();
      ctx.arc(PORTRAIT_X + PORTRAIT_SIZE / 2, PORTRAIT_Y + 12, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c68040';
      ctx.beginPath();
      ctx.arc(PORTRAIT_X + PORTRAIT_SIZE / 2, PORTRAIT_Y + PORTRAIT_SIZE + 4, 16, Math.PI, 0);
      ctx.fill();
    }

    // DANCY name tag
    ctx.fillStyle = '#ff6b9d';
    ctx.font = 'bold 7px monospace';
    ctx.fillText('Soso:', TEXT_X, y + 12);

    // Message text (word-wrapped)
    ctx.fillStyle = '#ffffff';
    ctx.font = '7px monospace';
    const displayed = this.text.slice(0, this.displayedChars);
    this.drawWrappedText(ctx, displayed, TEXT_X, y + 23, TEXT_W, 9);

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
