import type { AssetLoader } from './AssetLoader';

/**
 * AudioEngine — Web Audio API wrapper.
 * Handles music looping, crossfading between tracks, and one-shot SFX.
 * A separate ambient channel plays looping nature sounds on top of music.
 *
 * AudioContext is created immediately (suspended state — allowed before user
 * gesture). All audio files decode in the background during boot so they are
 * ready with zero lag. On the first user gesture, resume() unlocks playback.
 */
export class AudioEngine {
  ctx: AudioContext;

  private musicGainA: GainNode;
  private musicGainB: GainNode;
  private musicSourceA: AudioBufferSourceNode | null = null;
  private musicSourceB: AudioBufferSourceNode | null = null;
  private currentSlot: 'A' | 'B' = 'A';
  private currentMusicKey = '';

  // Ambient layer (looping nature sounds layered on top of music)
  private ambientGain: GainNode;
  private ambientSource: AudioBufferSourceNode | null = null;
  private currentAmbientKey = '';
  readonly ambientVolume = 0.45;

  private sfxGain: GainNode;
  private masterGain: GainNode;

  musicVolume = 0.3;
  sfxVolume = 1.0;

  constructor(private readonly assets: AssetLoader) {
    // Try to create context immediately (suspended state) so audio can decode
    // during boot. Safari may block this before a user gesture — the catch
    // below falls back to a dummy context; init() will recreate the real one.
    try {
      this.ctx = new AudioContext();
    } catch {
      // Fallback: create an OfflineAudioContext as a stand-in until init()
      this.ctx = new OfflineAudioContext(1, 1, 44100) as unknown as AudioContext;
    }

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1;
    this.masterGain.connect(this.ctx.destination);

    this.musicGainA = this.ctx.createGain();
    this.musicGainA.gain.value = 0;
    this.musicGainA.connect(this.masterGain);

    this.musicGainB = this.ctx.createGain();
    this.musicGainB.gain.value = 0;
    this.musicGainB.connect(this.masterGain);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0;
    this.ambientGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);

    // Start decoding all audio fetched during boot immediately.
    void this.assets.setAudioContext(this.ctx);
  }

  /** Call on first user gesture to unlock playback. */
  init(): void {
    // If we're holding a dummy OfflineAudioContext, create the real one now
    if (this.ctx instanceof OfflineAudioContext) {
      const keyToReplay = this.currentMusicKey;
      const ambientToReplay = this.currentAmbientKey;
      this.currentMusicKey = '';
      this.currentAmbientKey = '';
      this.musicSourceA = null;
      this.musicSourceB = null;
      this.ambientSource = null;

      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1;
      this.masterGain.connect(this.ctx.destination);
      this.musicGainA = this.ctx.createGain();
      this.musicGainA.gain.value = 0;
      this.musicGainA.connect(this.masterGain);
      this.musicGainB = this.ctx.createGain();
      this.musicGainB.gain.value = 0;
      this.musicGainB.connect(this.masterGain);
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0;
      this.ambientGain.connect(this.masterGain);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      // Decode pending buffers then replay music + ambient
      void this.assets.setAudioContext(this.ctx).then(() => {
        this.resume(keyToReplay, ambientToReplay);
      });
      return;
    }
    this.resume(this.currentMusicKey, this.currentAmbientKey);
  }

  resume(keyToReplay = '', ambientToReplay = ''): void {
    const startDeferred = () => {
      // Start any music/ambient that was recorded while context was suspended.
      const toPlay = this.currentMusicKey || keyToReplay;
      if (toPlay) {
        this.currentMusicKey = '';
        this.playMusic(toPlay, 0.3);
      }
      const ambientToPlay = this.currentAmbientKey || ambientToReplay;
      if (ambientToPlay) {
        this.currentAmbientKey = '';
        this.playAmbient(ambientToPlay, 0.3);
      }
    };

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().then(startDeferred);
    } else {
      // Context already running (browser auto-resumed, or prior gesture).
      // Still need to actually start any deferred tracks.
      startDeferred();
    }
  }

  // Per-key loop config: { start, end } in seconds. Omit a field to use buffer default.
  private static readonly LOOP_CONFIGS: Partial<Record<string, { start?: number; end?: number }>> = {
    'music-title':       { start: 17, end: 47  },
    'music-spring':      { start: 0,    end: 15   },
    'music-end-credits': { start: 12 },
  };

  playMusic(key: string, fadeDuration = 0.5): void {
    if (key === this.currentMusicKey) return;

    // If context not yet unlocked, just record the intent — resume() will
    // call playMusic again once the context is running.
    if (this.ctx.state === 'suspended') {
      this.currentMusicKey = key;
      return;
    }

    const buffer = this.assets.getAudio(key);
    if (!buffer) { this.stopMusic(fadeDuration); return; }

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
    const loopCfg = AudioEngine.LOOP_CONFIGS[key];
    const loopStart = loopCfg?.start ?? 0;
    if (loopCfg) {
      source.loopStart = loopStart;
      if (loopCfg.end !== undefined) {
        source.loopEnd = Math.min(loopCfg.end, buffer.duration);
      }
    }
    source.connect(inGain);
    source.start(0, loopStart);

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
    const now = this.ctx.currentTime;
    const gain = this.currentSlot === 'A' ? this.musicGainA : this.musicGainB;
    const src = this.currentSlot === 'A' ? this.musicSourceA : this.musicSourceB;
    gain.gain.linearRampToValueAtTime(0, now + fadeDuration);
    src?.stop(now + fadeDuration);
    this.currentMusicKey = '';
  }

  /** Start a looping ambient track layered on top of music. */
  playAmbient(key: string, fadeDuration = 1.0): void {
    if (key === this.currentAmbientKey) return;

    if (this.ctx.state === 'suspended') {
      this.currentAmbientKey = key;
      return;
    }

    const buffer = this.assets.getAudio(key);
    if (!buffer) { this.stopAmbient(fadeDuration); return; }

    const now = this.ctx.currentTime;

    // Fade out previous ambient
    this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now);
    this.ambientGain.gain.linearRampToValueAtTime(0, now + fadeDuration);
    this.ambientSource?.stop(now + fadeDuration);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.ambientGain);
    source.start(0);

    // Fade in over fadeDuration, but start from zero at the end of the old fade
    this.ambientGain.gain.setValueAtTime(0, now + fadeDuration);
    this.ambientGain.gain.linearRampToValueAtTime(this.ambientVolume, now + fadeDuration * 2);

    this.ambientSource = source;
    this.currentAmbientKey = key;
  }

  /** Fade out and stop the ambient layer. */
  stopAmbient(fadeDuration = 1.0): void {
    if (!this.currentAmbientKey) return;
    const now = this.ctx.currentTime;
    this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now);
    this.ambientGain.gain.linearRampToValueAtTime(0, now + fadeDuration);
    this.ambientSource?.stop(now + fadeDuration);
    this.ambientSource = null;
    this.currentAmbientKey = '';
  }

  playSFX(key: string, volume = 1, maxDuration?: number): void {
    if (this.ctx.state === 'suspended') return; // not yet unlocked by user gesture
    const buffer = this.assets.getAudio(key);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = volume;
    source.connect(gainNode);
    gainNode.connect(this.sfxGain);
    source.start(0);
    if (maxDuration !== undefined) {
      source.stop(this.ctx.currentTime + maxDuration);
    }
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    const activeGain = this.currentSlot === 'A' ? this.musicGainA : this.musicGainB;
    activeGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
  }

  setSFXVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(3, v));
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
  }
}
