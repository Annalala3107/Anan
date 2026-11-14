export type AmbientPreset = 'off' | 'rain' | 'brown';

class AmbientAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private currentPreset: AmbientPreset = 'off';
  private volume = 35;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext, type: 'rain' | 'brown'): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const durationSec = 4;
    const length = sampleRate * durationSec;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'brown') {
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.2;
      }
    } else {
      // Soft pink-ish rainfall noise
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        const pink = (b0 + b1 + b2 + white * 0.1848) * 0.12;
        // Occasional soft droplet micro-transients
        const droplet = Math.random() > 0.9985 ? (Math.random() - 0.5) * 0.35 : 0;
        data[i] = Math.max(-1, Math.min(1, pink + droplet));
      }
    }

    return buffer;
  }

  private stopNodes() {
    try {
      this.sourceNode?.stop();
    } catch {
      // Ignore already stopped
    }
    try {
      this.sourceNode?.disconnect();
      this.filterNode?.disconnect();
      this.gainNode?.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    this.sourceNode = null;
    this.filterNode = null;
    this.gainNode = null;
  }

  private computeGain(): number {
    const normalized = Math.max(0, Math.min(100, this.volume)) / 100;
    // Scale gently so ambient noise sits comfortably beneath piano music
    return this.currentPreset === 'brown' ? normalized * 0.28 : normalized * 0.22;
  }

  public setPreset(preset: AmbientPreset, volume?: number) {
    if (typeof volume === 'number' && !Number.isNaN(volume)) {
      this.volume = Math.max(0, Math.min(100, volume));
    }

    if (preset === 'off') {
      this.currentPreset = 'off';
      this.stopNodes();
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx) return;

    if (this.currentPreset === preset && this.sourceNode && this.gainNode) {
      this.gainNode.gain.setTargetAtTime(this.computeGain(), ctx.currentTime, 0.08);
      return;
    }

    this.stopNodes();
    this.currentPreset = preset;

    try {
      const source = ctx.createBufferSource();
      source.buffer = this.createNoiseBuffer(ctx, preset);
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = preset === 'rain' ? 1100 : 420;
      filter.Q.value = preset === 'rain' ? 0.6 : 0.7;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.setTargetAtTime(this.computeGain(), ctx.currentTime, 0.15);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);

      this.sourceNode = source;
      this.filterNode = filter;
      this.gainNode = gain;
    } catch {
      this.stopNodes();
      this.currentPreset = 'off';
    }
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(100, volume));
    if (this.ctx && this.gainNode && this.currentPreset !== 'off') {
      try {
        this.gainNode.gain.setTargetAtTime(this.computeGain(), this.ctx.currentTime, 0.08);
      } catch {
        // Ignore
      }
    }
  }
}

export const AmbientAudioEngine = new AmbientAudioSynthesizer();
