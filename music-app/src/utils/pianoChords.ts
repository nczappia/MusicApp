export type PianoChordGroup = "triads" | "suspended" | "sevenths" | "sixths";

export type PianoChordDef = {
  id: string;
  label: string;
  short: string;
  intervals: number[]; // semitones from root, root position
  group: PianoChordGroup;
};

export type ChordExtension = {
  id: string;
  label: string;
  short: string;
  semitone: number; // semitone offset from root (may be > 11)
};

export const PIANO_CHORD_GROUPS: { id: PianoChordGroup; label: string }[] = [
  { id: "triads",    label: "Triads" },
  { id: "suspended", label: "Suspended" },
  { id: "sevenths",  label: "Sevenths" },
  { id: "sixths",    label: "Sixths" },
];

export const PIANO_CHORDS: PianoChordDef[] = [
  // Triads
  { id: "major",    label: "Major",         short: "maj",   intervals: [0, 4, 7],     group: "triads" },
  { id: "minor",    label: "Minor",         short: "min",   intervals: [0, 3, 7],     group: "triads" },
  { id: "dim",      label: "Diminished",    short: "dim",   intervals: [0, 3, 6],     group: "triads" },
  { id: "aug",      label: "Augmented",     short: "aug",   intervals: [0, 4, 8],     group: "triads" },
  // Suspended
  { id: "sus2",     label: "Sus 2",         short: "sus2",  intervals: [0, 2, 7],     group: "suspended" },
  { id: "sus4",     label: "Sus 4",         short: "sus4",  intervals: [0, 5, 7],     group: "suspended" },
  // Sevenths
  { id: "dom7",     label: "Dominant 7",    short: "7",     intervals: [0, 4, 7, 10], group: "sevenths" },
  { id: "maj7",     label: "Major 7",       short: "maj7",  intervals: [0, 4, 7, 11], group: "sevenths" },
  { id: "min7",     label: "Minor 7",       short: "min7",  intervals: [0, 3, 7, 10], group: "sevenths" },
  { id: "halfdim7", label: "Half Dim (ø7)", short: "ø7",    intervals: [0, 3, 6, 10], group: "sevenths" },
  { id: "dim7",     label: "Diminished 7",  short: "dim7",  intervals: [0, 3, 6, 9],  group: "sevenths" },
  // Sixths
  { id: "maj6",     label: "Major 6",       short: "6",     intervals: [0, 4, 7, 9],  group: "sixths" },
  { id: "min6",     label: "Minor 6",       short: "m6",    intervals: [0, 3, 7, 9],  group: "sixths" },
];

export const CHORD_EXTENSIONS: ChordExtension[] = [
  { id: "add9",  label: "Add 9",  short: "add9",  semitone: 14 },
  { id: "add11", label: "Add 11", short: "add11", semitone: 17 },
  { id: "add4",  label: "Add 4",  short: "add4",  semitone: 5  },
  { id: "add6",  label: "Add 6",  short: "add6",  semitone: 9  },
];

export const PIANO_PRESETS: { label: string; ids: string[] }[] = [
  { label: "Basics",          ids: ["major", "minor"] },
  { label: "Triads",          ids: ["major", "minor", "dim", "aug", "sus2", "sus4"] },
  { label: "Jazz Essentials", ids: ["major", "minor", "dom7", "maj7", "min7"] },
  { label: "Full 7ths",       ids: ["dom7", "maj7", "min7", "halfdim7", "dim7"] },
  { label: "All",             ids: PIANO_CHORDS.map((c) => c.id) },
];

// Root note names for answer buttons (C-first for piano convention)
export const ROOT_NAMES: { display: string; semitone: number }[] = [
  { display: "C",     semitone: 0  },
  { display: "C#/Db", semitone: 1  },
  { display: "D",     semitone: 2  },
  { display: "D#/Eb", semitone: 3  },
  { display: "E",     semitone: 4  },
  { display: "F",     semitone: 5  },
  { display: "F#/Gb", semitone: 6  },
  { display: "G",     semitone: 7  },
  { display: "G#/Ab", semitone: 8  },
  { display: "A",     semitone: 9  },
  { display: "A#/Bb", semitone: 10 },
  { display: "B",     semitone: 11 },
];

export type PianoQuestion = {
  id: string;
  rootMidi: number;
  chord: PianoChordDef;
  extension: ChordExtension | null;
  noteMidis: number[];
};

// Piano spans MIDI 48 (C3) to 83 (B5) — 3 octaves
export const PIANO_START_MIDI = 48;
export const PIANO_END_MIDI = 83;

export function makePianoQuestion(
  chords: PianoChordDef[],
  extensions: ChordExtension[],
  allowExtensions: boolean,
  naturalRootsOnly: boolean,
): PianoQuestion {
  const chord = chords[Math.floor(Math.random() * chords.length)];

  const maxExtSemitone = allowExtensions && extensions.length > 0
    ? Math.max(...extensions.map((e) => e.semitone))
    : 0;
  const maxInterval = Math.max(...chord.intervals, maxExtSemitone);

  // Valid root range: root + highest interval must fit on the piano
  const rootMin = PIANO_START_MIDI;
  const rootMax = PIANO_END_MIDI - maxInterval;

  // Filter to natural notes (C D E F G A B) if requested
  const naturalSemitones = new Set([0, 2, 4, 5, 7, 9, 11]);
  const validRoots: number[] = [];
  for (let m = rootMin; m <= rootMax; m++) {
    if (!naturalRootsOnly || naturalSemitones.has(m % 12)) validRoots.push(m);
  }

  const rootMidi = validRoots[Math.floor(Math.random() * validRoots.length)];

  // Decide whether to add an extension (40% chance when allowed and available)
  const extension =
    allowExtensions && extensions.length > 0 && Math.random() < 0.4
      ? extensions[Math.floor(Math.random() * extensions.length)]
      : null;

  const noteMidis = [
    ...chord.intervals.map((i) => rootMidi + i),
    ...(extension ? [rootMidi + extension.semitone] : []),
  ];

  return { id: crypto.randomUUID(), rootMidi, chord, extension, noteMidis };
}
