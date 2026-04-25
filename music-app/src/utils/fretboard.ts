export type Cell = { stringIdx: number; fret: number };

export const OPEN_STRING_MIDI = [64, 59, 55, 50, 45, 40];
// Proportional to a 10-46 light gauge set, scaled so low E = 4 px
export const STRING_WIDTHS = [1, 1.2, 1.5, 2.3, 3.1, 4]; // high e → low E
export const STRING_LABELS = ["e", "B", "G", "D", "A", "E"]; // high → low
export const MAX_FRET = 23;
export const NUM_COLS = MAX_FRET + 1;
export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const MARKER_SINGLE = [3, 5, 7, 9, 15, 17, 19, 21];
export const MARKER_DOUBLE = [12];

export const ROW_HEIGHT = 40;
export const ROW_GAP = 12;
export const PITCH = ROW_HEIGHT + ROW_GAP;
export const INSET = 14;

const MIN_COL_PX = 18;
const OPEN_FACTOR = 0.22;
const GAMMA = 1.15;

export const strings = Array.from({ length: 6 }, (_, i) => i);
export const frets = Array.from({ length: NUM_COLS }, (_, i) => i);
export const stringRanges = OPEN_STRING_MIDI.map((open) => ({ min: open, max: open + MAX_FRET }));

export function midiToNoteName(midi: number): string {
  return NOTE_NAMES[midi % 12];
}

export function midiToNameOct(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function keyOf(c: Cell): string {
  return `${c.stringIdx}:${c.fret}`;
}

function distToFret(n: number): number {
  return 1 - Math.pow(2, -n / 12);
}

const _raw: number[] = [];
for (let n = 1; n <= MAX_FRET; n++) _raw.push(distToFret(n) - distToFret(n - 1));
const _shaped = _raw.map((x) => Math.pow(x, GAMMA));
export const colWeights: number[] = [_shaped[0] * OPEN_FACTOR, ..._shaped];
const _colWeightSum = colWeights.reduce((a, b) => a + b, 0);

export function allocateWidths(totalW: number): { w: number[]; b: number[] } {
  const n = NUM_COLS;
  const minTotal = n * MIN_COL_PX;
  const w: number[] = Array(n).fill(MIN_COL_PX);
  if (totalW > minTotal + 1) {
    const remaining = totalW - minTotal;
    for (let i = 0; i < n; i++) w[i] += (colWeights[i] / _colWeightSum) * remaining;
  } else {
    const eq = totalW / n;
    for (let i = 0; i < n; i++) w[i] = eq;
  }
  const b = [0];
  for (let i = 0; i < n; i++) b.push(b[i] + w[i]);
  return { w, b };
}
