export type ChordGroup = "triads" | "suspended" | "sevenths";

export type ChordType = {
  id: string;
  label: string;
  short: string;
  intervals: number[]; // semitones from root, root position
  group: ChordGroup;
};

export const CHORD_GROUPS: { id: ChordGroup; label: string }[] = [
  { id: "triads",    label: "Essential Triads" },
  { id: "suspended", label: "Suspended" },
  { id: "sevenths",  label: "Core 7ths" },
];

export const ALL_CHORDS: ChordType[] = [
  { id: "major", label: "Major",       short: "maj",  intervals: [0, 4, 7],     group: "triads" },
  { id: "minor", label: "Minor",       short: "min",  intervals: [0, 3, 7],     group: "triads" },
  { id: "dim",   label: "Diminished",  short: "dim",  intervals: [0, 3, 6],     group: "triads" },
  { id: "aug",   label: "Augmented",   short: "aug",  intervals: [0, 4, 8],     group: "triads" },
  { id: "sus2",  label: "Sus 2",       short: "sus2", intervals: [0, 2, 7],     group: "suspended" },
  { id: "sus4",  label: "Sus 4",       short: "sus4", intervals: [0, 5, 7],     group: "suspended" },
  { id: "dom7",  label: "Dominant 7",  short: "7",    intervals: [0, 4, 7, 10], group: "sevenths" },
  { id: "maj7",  label: "Major 7",     short: "maj7", intervals: [0, 4, 7, 11], group: "sevenths" },
  { id: "min7",  label: "Minor 7",     short: "min7", intervals: [0, 3, 7, 10], group: "sevenths" },
];

export const CHORD_PRESETS: { label: string; ids: string[] }[] = [
  { label: "Basics",          ids: ["major", "minor"] },
  { label: "Triads",          ids: ["major", "minor", "dim", "aug", "sus2", "sus4"] },
  { label: "Jazz Essentials", ids: ["major", "minor", "dom7", "maj7", "min7"] },
  { label: "All",             ids: ALL_CHORDS.map((c) => c.id) },
];

export function pickChord(chords: ChordType[]): ChordType {
  return chords[Math.floor(Math.random() * chords.length)];
}
