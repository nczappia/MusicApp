// src/utils/intervals.ts
export type Interval = {
  semitones: number;
  label: string;
  short: string;
};

export const ALL_INTERVALS: Interval[] = [
  { semitones: 0, label: "Unison", short: "P1" },
  { semitones: 1, label: "Minor 2nd", short: "m2" },
  { semitones: 2, label: "Major 2nd", short: "M2" },
  { semitones: 3, label: "Minor 3rd", short: "m3" },
  { semitones: 4, label: "Major 3rd", short: "M3" },
  { semitones: 5, label: "Perfect 4th", short: "P4" },
  { semitones: 6, label: "Tritone", short: "TT" },
  { semitones: 7, label: "Perfect 5th", short: "P5" },
  { semitones: 8, label: "Minor 6th", short: "m6" },
  { semitones: 9, label: "Major 6th", short: "M6" },
  { semitones: 10, label: "Minor 7th", short: "m7" },
  { semitones: 11, label: "Major 7th", short: "M7" },
  { semitones: 12, label: "Octave", short: "P8" },
];

export function randInt(min: number, max: number): number {
  // inclusive
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
