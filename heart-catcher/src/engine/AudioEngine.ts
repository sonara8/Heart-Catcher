import type { AssetLoader } from './AssetLoader';

/**
 * AudioEngine — Web Audio API wrapper.
 * Handles music looping, crossfading between tracks, and one-shot SFX.
 * AudioContext is created on first user gesture (browser autoplay policy).
 */
export class AudioEngine {
  ctx: AudioContext | null = null;

  private musicGainA: GainNode | null = null;
  private musicGainB: GainNode | null = null;
  private musicSourceA: AudioBufferSourceNode | null = null;
  private musicSourceB: AudioBufferSourceNode | null = null;
  private currentSlot: 'A' | 'B' = 'A';
  private currentMusicKey = '';

  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

  musicVolume = 0.6;
  sfxVolume = 0.8;

  constructor(private readonly assets: AssetLoader) {}

  /** Must be called inside a user gesture handler */
  init(): void {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.assets.setAudioContext(this.ctx);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1;
    this.masterGain.connect(this.ctx.destination);

    this.musicGainA = this.ctx.createGain();
    this.musicGainA.gain.value = 0;
    this.musicGainA.connect(this.masterGain);

    this.musicGainB = this.ctx.createGain();
    this.musicGainB.gain.value = 0;
    this.musicGainB.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  playMusic(key: string, fadeDuration = 0.5): void {
    if (!this.ctx || !this.musicGainA || !this.musicGainB) return;
    if (key === this.currentMusicKey) return;

    const buffer = this.assets.getAudio(key);
    if (!buffer) return;

    const now = this.ctx.currentTime;

    // Fade out current slot
    const outGain = this.currentSlot === 'A' ? this.musicGainA : this.musicGainB;
    const inGain = this.currentSlot === 'A' ? this.musicGainB : this.musicGainA;
    const outSource = this.currentSlot === 'A' ? this.musicSourceA : this.musicSourceB;

    outGain.gain.setValueAtTime(outGain.gain.value, now);
    outGain.gain.linearRampToValueAtTime(0, now + fadeDuration);

    outSource?.stop(now + fadeDuration);

    // Start new source in other slot
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(inGain);
    source.start(0);

    inGain.gain.setValueAtTime(0, now);
    inGain.gain.linearRampToValueAtTime(this.musicVolume, now + fadeDuration);

    if (this.currentSlot === 'A') {
      this.musicSourceB = source;
      this.currentSlot = 'B';
    } else {
      this.musicSourceA = source;
      this.currentSlot = 'A';
    }

    this.currentMusicKey = key;
  }

  stopMusic(fadeDuration = 0.5): void {
    if (!this.ctx || !this.musicGainA || !this.musicGainB) return;
    const now = this.ctx.currentTime;
    const gain = this.currentSlot === 'A' ? this.musicGainA : this.musicGainB;
    const src = this.currentSlot === 'A' ? this.musicSourceA : this.musicSourceB;
    gain.gain.linearRampToValueAtTime(0, now + fadeDuration);
    src?.stop(now + fadeDuration);
    this.currentMusicKey = '';
  }

  playSFX(key: string, volume = 1): void {
    if (!this.ctx || !this.sfxGain) return;
    const buffer = this.assets.getAudio(key);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = volume;
    source.connect(gainNode);
    gainNode.connect(this.sfxGain);
    source.start(0);
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (!this.musicGainA || !this.musicGainB || !this.ctx) return;
    const activeGain = this.currentSlot === 'A' ? this.musicGainB : this.musicGainA;
    activeGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
  }

  setSFXVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }
}
