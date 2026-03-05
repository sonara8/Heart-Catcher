/**
 * AssetLoader — loads images and audio buffers.
 * Images: new Image() + onload promise.
 * Audio: fetch → arrayBuffer → AudioContext.decodeAudioData().
 * All assets cached in a Map by key.
 */
export class AssetLoader {
  private images = new Map<string, HTMLImageElement>();
  private audioBuffers = new Map<string, AudioBuffer>();
  private audioCtx: AudioContext | null = null;

  setAudioContext(ctx: AudioContext): void {
    this.audioCtx = ctx;
  }

  async loadImage(key: string, url: string): Promise<HTMLImageElement> {
    if (this.images.has(key)) return this.images.get(key)!;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(key, img);
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  async loadAudio(key: string, url: string): Promise<AudioBuffer | null> {
    if (!this.audioCtx) return null;
    if (this.audioBuffers.has(key)) return this.audioBuffers.get(key)!;
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(key, audioBuffer);
      return audioBuffer;
    } catch {
      console.warn(`Could not load audio: ${url}`);
      return null;
    }
  }

  async loadMany(
    assets: { key: string; url: string; type: 'image' | 'audio' }[],
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<void> {
    let loaded = 0;
    const total = assets.length;

    await Promise.all(
      assets.map(async ({ key, url, type }) => {
        if (type === 'image') {
          await this.loadImage(key, url).catch(e => console.warn(e));
        } else {
          await this.loadAudio(key, url).catch(e => console.warn(e));
        }
        loaded++;
        onProgress?.(loaded, total);
      }),
    );
  }

  getImage(key: string): HTMLImageElement | null {
    return this.images.get(key) ?? null;
  }

  getAudio(key: string): AudioBuffer | null {
    return this.audioBuffers.get(key) ?? null;
  }

  has(key: string): boolean {
    return this.images.has(key) || this.audioBuffers.has(key);
  }
}
