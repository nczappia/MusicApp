export type SynthOptions = {
  waveform?: OscillatorType;
  attackMs?: number;
  releaseMs?: number;
  noteMs?: number;
  gapMs?: number;
  volume?: number;
};

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class SimpleSynth {
  private ctx: AudioContext;
  private activeOscs: Set<OscillatorNode> = new Set();

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  stop(): void {
    for (const osc of this.activeOscs) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    this.activeOscs.clear();
  }

  async playMidi(midi: number, opts: SynthOptions = {}): Promise<void> {
    return this.playFreq(midiToFreq(midi), opts);
  }

  playWrong(): void {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    this.activeOscs.add(osc);
    osc.start(now);
    osc.stop(now + 0.14);
    osc.onended = () => this.activeOscs.delete(osc);
  }

  private async playFreq(freq: number, opts: SynthOptions = {}): Promise<void> {
    const {
      waveform = "sine",
      attackMs = 10,
      releaseMs = 80,
      noteMs = 550,
      volume = 0.25,
    } = opts;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = waveform;
    osc.frequency.setValueAtTime(freq, now);

    const gain = this.ctx.createGain();
    const attack = attackMs / 1000;
    const hold = noteMs / 1000;
    const release = releaseMs / 1000;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + attack);
    gain.gain.setValueAtTime(Math.max(0.0001, volume), now + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + hold + release);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    this.activeOscs.add(osc);
    osc.start(now);
    osc.stop(now + hold + release + 0.02);

    await new Promise<void>((resolve) => {
      osc.onended = () => {
        this.activeOscs.delete(osc);
        resolve();
      };
    });
  }
}
