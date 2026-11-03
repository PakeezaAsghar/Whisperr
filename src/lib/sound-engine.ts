// Web Audio API Sound Engine for Whisper — pure client-side procedural soundscape

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private isMuted: boolean = true;
  private currentTrack: "candle" | "wind" | "rain" = "candle";
  private volume: number = 0.35;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.initCtx();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
      if (!this.isMuted && !this.noiseNode) {
        this.startAmbientLoop();
      }
    }
    return !this.isMuted;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setTrack(track: "candle" | "wind" | "rain") {
    this.currentTrack = track;
    if (!this.isMuted) {
      this.stopAmbientLoop();
      this.startAmbientLoop();
    }
  }

  public getCurrentTrack(): "candle" | "wind" | "rain" {
    return this.currentTrack;
  }

  private startAmbientLoop() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const bufferSize = this.ctx.sampleRate * 4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink/Brown noise blend
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
        // Intermittent pops for candle crackle
        if (this.currentTrack === "candle" && Math.random() < 0.0008) {
          data[i] += (Math.random() - 0.5) * 0.9;
        }
      }

      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = buffer;
      this.noiseNode.loop = true;

      // Filter depending on track
      const filter = this.ctx.createBiquadFilter();
      if (this.currentTrack === "candle") {
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(650, this.ctx.currentTime);
        filter.Q.setValueAtTime(1.2, this.ctx.currentTime);
      } else if (this.currentTrack === "wind") {
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(320, this.ctx.currentTime);
      } else {
        // rain
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      }

      this.noiseGain = this.ctx.createGain();
      this.noiseGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

      this.noiseNode.connect(filter);
      filter.connect(this.noiseGain);
      this.noiseGain.connect(this.masterGain);

      this.noiseNode.start();
    } catch {
      // Audio autoplay policy or hardware restriction
    }
  }

  private stopAmbientLoop() {
    if (this.noiseNode) {
      try {
        this.noiseNode.stop();
        this.noiseNode.disconnect();
      } catch {
        // ignored
      }
      this.noiseNode = null;
    }
  }

  // Play a crystal chime when lighting a candle
  public playCandleChime() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(528, now); // Solfeggio 528Hz love/transformation
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1056, now); // Harmonic octave

      chimeGain.gain.setValueAtTime(0, now);
      chimeGain.gain.linearRampToValueAtTime(0.35, now + 0.02);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);

      osc1.connect(chimeGain);
      osc2.connect(chimeGain);
      chimeGain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 2.5);
      osc2.stop(now + 2.5);
    } catch {
      // AudioContext unavailable
    }
  }

  // Play a gentle fire woosh when burning a confession into ashes
  public playBurnSwoosh() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.4;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(1600, now + 0.8);
      filter.frequency.exponentialRampToValueAtTime(120, now + 1.8);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.9);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(now);
      noise.stop(now + 2.0);
    } catch {
      // AudioContext unavailable
    }
  }
}

export const soundEngine = new SoundEngine();
