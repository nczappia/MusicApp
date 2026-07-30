import type { StaffNote } from "../utils/staffNotes";
import { ledgerLines } from "../utils/staffNotes";
import { white } from "../utils/theme";

type Props = {
  note: StaffNote;
  revealed?: boolean;
};

const SVG_W = 260;
const SVG_H = 160;

// Staff geometry
const STAFF_LEFT = 60;   // where the 5 lines start
const STAFF_RIGHT = 220;
const STAFF_TOP = 30;    // y of top (5th) line
const LINE_GAP = 14;     // px between adjacent staff lines

// step 8 = top line (y = STAFF_TOP), step 0 = bottom line (y = STAFF_TOP + 4*LINE_GAP)
function stepToY(step: number): number {
  return STAFF_TOP + (8 - step) * (LINE_GAP / 2);
}

const LEDGER_HALF = 18; // half-width of ledger line
const NOTE_R = 9;       // note head radius (slightly squashed)
const NOTE_RY = 7;

// Clefs are drawn as hand-built SVG paths (not the Unicode glyphs U+1D11E/U+1D122)
// because serif fonts on Linux/Android have no coverage for the Musical Symbols
// block and render them as empty boxes. Paths are plotted directly in the staff's
// coordinate space (STAFF_LEFT/STAFF_TOP/LINE_GAP) so they stay aligned with the lines.
function TrebleClef() {
  return (
    <path
      d="
        M 70 4
        C 58 -2 46 6 48 16
        C 50 26 64 28 68 18
        C 71 10 62 6 58 12
        C 54 18 58 26 64 30
        C 80 42 96 50 96 66
        C 96 84 74 92 60 82
        C 48 74 52 62 62 60
        C 72 58 78 68 74 76
        C 68 90 44 88 40 106
        C 37 120 50 130 60 122
        C 68 116 64 106 54 106
      "
      fill="none"
      stroke="currentColor"
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function BassClef() {
  return (
    <g stroke="currentColor" fill="currentColor">
      <path
        d="
          M 28 24
          C 46 16 66 22 70 36
          C 74 50 66 64 50 70
          C 40 74 28 70 26 62
        "
        fill="none"
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={78} cy={37} r={3.4} stroke="none" />
      <circle cx={78} cy={51} r={3.4} stroke="none" />
    </g>
  );
}

export default function StaffDisplay({ note, revealed = false }: Props) {
  const noteY = stepToY(note.step);
  const staffLines = [0, 2, 4, 6, 8];
  const ledgers = ledgerLines(note.step);

  // Stem: draw up if note is below middle line (step < 4), else down
  const stemUp = note.step < 4;
  const stemX = stemUp ? STAFF_LEFT + 110 + NOTE_R - 1 : STAFF_LEFT + 110 - NOTE_R + 1;
  const stemEndY = stemUp ? noteY - LINE_GAP * 3.5 : noteY + LINE_GAP * 3.5;

  const noteColor = revealed ? "#4caf50" : "rgba(220,220,255,0.95)";
  const noteGlow = revealed ? "drop-shadow(0 0 6px #4caf50)" : "none";

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      role="img"
      aria-label={revealed ? `${note.label} on ${note.clef} clef` : `Note on ${note.clef} clef — identify it`}
      style={{ display: "block", overflow: "visible", width: "100%", height: "auto" }}
    >
      {/* Staff lines */}
      {staffLines.map((s) => (
        <line
          key={s}
          x1={STAFF_LEFT}
          x2={STAFF_RIGHT}
          y1={stepToY(s)}
          y2={stepToY(s)}
          stroke={white(0.55)}
          strokeWidth={1.2}
        />
      ))}

      {/* Clef */}
      {note.clef === "treble" ? <TrebleClef /> : <BassClef />}

      {/* Ledger lines */}
      {ledgers.map((s) => {
        const ly = stepToY(s);
        return (
          <line
            key={s}
            x1={STAFF_LEFT + 110 - LEDGER_HALF}
            x2={STAFF_LEFT + 110 + LEDGER_HALF}
            y1={ly}
            y2={ly}
            stroke={white(0.55)}
            strokeWidth={1.2}
          />
        );
      })}

      {/* Stem */}
      <line
        x1={stemX}
        x2={stemX}
        y1={noteY}
        y2={stemEndY}
        stroke={noteColor}
        strokeWidth={1.5}
        style={{ filter: noteGlow }}
      />

      {/* Note head */}
      <ellipse
        cx={STAFF_LEFT + 110}
        cy={noteY}
        rx={NOTE_R}
        ry={NOTE_RY}
        fill={noteColor}
        style={{ filter: noteGlow }}
      />

      {/* "on-line" note gets a tiny center hole to look like open notehead —
          actually all notes here are quarter notes (filled), skip this */}
    </svg>
  );
}
