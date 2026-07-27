import type { StaffNote } from "../utils/staffNotes";
import { ledgerLines } from "../utils/staffNotes";

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

// Treble clef symbol via SVG path (simplified drawn with lines/arcs)
// We'll use a text glyph approach with a unicode character scaled via transform
function TrebleClef() {
  return (
    <text
      x={STAFF_LEFT - 6}
      y={stepToY(2) + 4}
      fontSize={72}
      fontFamily="serif"
      fill="currentColor"
      style={{ userSelect: "none" }}
      textAnchor="middle"
    >
      𝄞
    </text>
  );
}

function BassClef() {
  const y = stepToY(6);
  return (
    <g>
      <text
        x={STAFF_LEFT - 4}
        y={y + 6}
        fontSize={46}
        fontFamily="serif"
        fill="currentColor"
        style={{ userSelect: "none" }}
        textAnchor="middle"
      >
        𝄢
      </text>
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
      width={SVG_W}
      height={SVG_H}
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Staff lines */}
      {staffLines.map((s) => (
        <line
          key={s}
          x1={STAFF_LEFT}
          x2={STAFF_RIGHT}
          y1={stepToY(s)}
          y2={stepToY(s)}
          stroke="rgba(255,255,255,0.55)"
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
            stroke="rgba(255,255,255,0.55)"
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
