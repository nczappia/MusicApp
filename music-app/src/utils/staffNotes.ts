export type Clef = "treble" | "bass";

export interface StaffNote {
  clef: Clef;
  // Steps above the bottom line of the staff (0 = bottom line, 1 = first space, etc.)
  // Can be negative (ledger lines below) or > 8 (ledger lines above)
  step: number;
  // The note name: C, D, E, F, G, A, B
  name: string;
  // Octave number (scientific notation)
  octave: number;
  // e.g. "C4", "F#5" — no accidentals in this quiz, all naturals
  label: string;
}

// Treble clef: bottom line = E4, step 0
// Steps:  0=E4, 1=F4, 2=G4, 3=A4, 4=B4, 5=C5, 6=D5, 7=E5, 8=F5
// We include 2 ledger lines below (C4, D4) and 2 above (G5, A5)
const TREBLE_NOTES: StaffNote[] = [
  { clef: "treble", step: -2, name: "C", octave: 4, label: "C4" },
  { clef: "treble", step: -1, name: "D", octave: 4, label: "D4" },
  { clef: "treble", step:  0, name: "E", octave: 4, label: "E4" },
  { clef: "treble", step:  1, name: "F", octave: 4, label: "F4" },
  { clef: "treble", step:  2, name: "G", octave: 4, label: "G4" },
  { clef: "treble", step:  3, name: "A", octave: 4, label: "A4" },
  { clef: "treble", step:  4, name: "B", octave: 4, label: "B4" },
  { clef: "treble", step:  5, name: "C", octave: 5, label: "C5" },
  { clef: "treble", step:  6, name: "D", octave: 5, label: "D5" },
  { clef: "treble", step:  7, name: "E", octave: 5, label: "E5" },
  { clef: "treble", step:  8, name: "F", octave: 5, label: "F5" },
  { clef: "treble", step:  9, name: "G", octave: 5, label: "G5" },
  { clef: "treble", step: 10, name: "A", octave: 5, label: "A5" },
];

// Bass clef: bottom line = G2, step 0
// Steps: 0=G2, 1=A2, 2=B2, 3=C3, 4=D3, 5=E3, 6=F3, 7=G3, 8=A3
// 2 ledger lines below (C2, D2... actually E2, F2) and 2 above (B3, C4)
const BASS_NOTES: StaffNote[] = [
  { clef: "bass", step: -2, name: "C", octave: 2, label: "C2" },
  { clef: "bass", step: -1, name: "D", octave: 2, label: "D2" },
  { clef: "bass", step:  0, name: "E", octave: 2, label: "E2" },
  { clef: "bass", step:  1, name: "F", octave: 2, label: "F2" },
  { clef: "bass", step:  2, name: "G", octave: 2, label: "G2" },
  { clef: "bass", step:  3, name: "A", octave: 2, label: "A2" },
  { clef: "bass", step:  4, name: "B", octave: 2, label: "B2" },
  { clef: "bass", step:  5, name: "C", octave: 3, label: "C3" },
  { clef: "bass", step:  6, name: "D", octave: 3, label: "D3" },
  { clef: "bass", step:  7, name: "E", octave: 3, label: "E3" },
  { clef: "bass", step:  8, name: "F", octave: 3, label: "F3" },
  { clef: "bass", step:  9, name: "G", octave: 3, label: "G3" },
  { clef: "bass", step: 10, name: "A", octave: 3, label: "A3" },
];

export const ALL_STAFF_NOTES: StaffNote[] = [...TREBLE_NOTES, ...BASS_NOTES];

export function getNotesForClef(clef: Clef): StaffNote[] {
  return clef === "treble" ? TREBLE_NOTES : BASS_NOTES;
}

export function randomNote(pool: StaffNote[]): StaffNote {
  return pool[Math.floor(Math.random() * pool.length)];
}

// Lines of a staff: steps 0, 2, 4, 6, 8
export function isOnLine(step: number): boolean {
  return step >= 0 && step <= 8 && step % 2 === 0;
}

// Which ledger lines are needed for a given step
// Returns an array of steps that need a ledger line drawn
export function ledgerLines(step: number): number[] {
  const lines: number[] = [];
  if (step < 0) {
    // below staff: draw ledger lines from -2 down to step (even steps only)
    for (let s = -2; s >= step; s -= 2) lines.push(s);
  } else if (step > 8) {
    for (let s = 10; s <= step; s += 2) lines.push(s);
  }
  return lines;
}

export const NOTE_NAMES = ["C", "D", "E", "F", "G", "A", "B"] as const;
