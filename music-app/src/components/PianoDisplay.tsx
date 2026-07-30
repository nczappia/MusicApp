import { memo, type ReactElement } from "react";
import { PIANO_START_MIDI, PIANO_END_MIDI } from "../utils/pianoChords";
import { midiToNameOct } from "../utils/fretboard";
import { black } from "../utils/theme";

export type PianoKeyKind = "root" | "note" | "extension";
export type PianoHighlight = { midi: number; kind: PianoKeyKind };

type Props = {
  highlights?: PianoHighlight[];
};

const WHITE_KEY_W = 40;
const WHITE_KEY_H = 126;
const BLACK_KEY_W = 26;
const BLACK_KEY_H = 80;

const WHITE_SEMITONES = new Set([0, 2, 4, 5, 7, 9, 11]);
const WHITE_OCT_IDX: Record<number, number> = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
const BLACK_BORDER: Record<number, number> = { 1: 1, 3: 2, 6: 4, 8: 5, 10: 6 };

const TOTAL_W = 3 * 7 * WHITE_KEY_W; // 840px

function getKeyX(midi: number): number {
  const oct = Math.floor((midi - PIANO_START_MIDI) / 12);
  const s = midi % 12;
  return WHITE_SEMITONES.has(s)
    ? (oct * 7 + WHITE_OCT_IDX[s]) * WHITE_KEY_W
    : oct * 7 * WHITE_KEY_W + BLACK_BORDER[s] * WHITE_KEY_W - BLACK_KEY_W / 2;
}

const HL: Record<PianoKeyKind, { wBg: string; bBg: string; glow: string }> = {
  root:      { wBg: "#f9a825",              bBg: "#e65100",              glow: "#f57f17" },
  note:      { wBg: "rgba(100,180,255,0.9)", bBg: "rgba(50,130,220,0.9)", glow: "#1565c0" },
  extension: { wBg: "rgba(190,100,255,0.85)", bBg: "rgba(140,60,210,0.9)", glow: "#6a1b9a" },
};

function PianoDisplay({ highlights = [] }: Props) {
  const hlMap = new Map<number, PianoKeyKind>(highlights.map((h) => [h.midi, h.kind]));
  const ariaLabel = highlights.length
    ? `Piano keyboard — highlighted notes: ${highlights.map((h) => midiToNameOct(h.midi)).join(", ")}`
    : "Piano keyboard showing chord tones";

  const whites: ReactElement[] = [];
  const blacks: ReactElement[] = [];

  for (let m = PIANO_START_MIDI; m <= PIANO_END_MIDI; m++) {
    const s = m % 12;
    const isWhite = WHITE_SEMITONES.has(s);
    const x = getKeyX(m);
    const hl = hlMap.get(m);
    const pal = hl ? HL[hl] : null;

    if (isWhite) {
      whites.push(
        <div
          key={m}
          style={{
            position: "absolute",
            left: x,
            width: WHITE_KEY_W - 1,
            height: WHITE_KEY_H,
            background: pal
              ? pal.wBg
              : "linear-gradient(180deg, #e4e4e4 0%, #fff 25%, #f8f8f8 100%)",
            border: `1px solid ${black(0.28)}`,
            borderRadius: "0 0 5px 5px",
            boxShadow: pal
              ? `0 0 0 2.5px ${pal.glow}, 0 4px 10px ${black(0.18)}`
              : `0 2px 5px ${black(0.12)}`,
            zIndex: 1,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: 5,
          }}
        >
          {s === 0 && (
            <span style={{
              fontSize: 10,
              color: pal ? black(0.60) : black(0.35),
              fontWeight: 700,
              lineHeight: 1,
            }}>
              C{Math.floor(m / 12) - 1}
            </span>
          )}
        </div>
      );
    } else {
      blacks.push(
        <div
          key={m}
          style={{
            position: "absolute",
            left: x,
            width: BLACK_KEY_W,
            height: BLACK_KEY_H,
            background: pal
              ? pal.bBg
              : "linear-gradient(180deg, #2a2a2a 0%, #111 65%, #000 100%)",
            borderRadius: "0 0 4px 4px",
            boxShadow: pal
              ? `0 0 0 2.5px ${pal.glow}, 0 5px 12px ${black(0.55)}`
              : `0 5px 12px ${black(0.55)}`,
            zIndex: 3,
          }}
        />
      );
    }
  }

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      style={{ overflowX: "auto", padding: "4px 0 8px", scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch" }}
    >
      <div style={{ position: "relative", width: TOTAL_W, height: WHITE_KEY_H + 4, userSelect: "none", scrollSnapAlign: "start" }}>
        {whites}
        {blacks}
      </div>
    </div>
  );
}

export default memo(PianoDisplay);
