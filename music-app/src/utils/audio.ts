// src/utils/audio.ts
export type SynthOptions = {
  waveform?: OscillatorType;
  attackMs?: number;
  releaseMs?: number;
  noteMs?: number;
  gapMs?: number;
  volume?: number; // 0..1
};

function midiToFreq(midi: number): number {
  // A4 = midi 69 = 440 Hz
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class SimpleSynth {
  private ctx: AudioContext;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  async playTwoNotesAscending(
    midiRoot: number,
    semitonesUp: number,
    opts: SynthOptions = {}
  ): Promise<void> {
    const {
      waveform = "sine",
      attackMs = 10,
      releaseMs = 80,
      noteMs = 550,
      gapMs = 90,
      volume = 0.25,
    } = opts;

    const first = midiToFreq(midiRoot);
    const second = midiToFreq(midiRoot + semitonesUp);

    await this.playNote(first, { waveform, attackMs, releaseMs, noteMs, volume });
    await sleep(gapMs);
    await this.playNote(second, { waveform, attackMs, releaseMs, noteMs, volume });
  }

  private async playNote(
    freq: number,
    opts: Required<Pick<SynthOptions, "waveform" | "attackMs" | "releaseMs" | "noteMs" | "volume">>
  ): Promise<void> {
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = opts.waveform;
    osc.frequency.setValueAtTime(freq, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);

    const attack = opts.attackMs / 1000;
    const hold = opts.noteMs / 1000;
    const release = opts.releaseMs / 1000;

    // ADSR-ish envelope
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, opts.volume), now + attack);
    gain.gain.setValueAtTime(Math.max(0.0001, opts.volume), now + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + hold + release);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + hold + release + 0.02);

    // Wait for note to finish
    await new Promise<void>((resolve) => {
      osc.onended = () => resolve();
    });
  }
}
