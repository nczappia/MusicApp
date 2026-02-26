import { useMemo, useRef, useState } from "react";

type Cell = { stringIdx: number; fret: number };
type Question = { targetMidi: number; label: string; matches: Cell[] };

// Standard tuning (MIDI): E2, A2, D3, G3, B3, E4
const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64];

const MAX_FRET = 23;
const NUM_COLS = MAX_FRET + 1; // 24 columns: 0..23

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function midiToNameOct(midi: number) {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1; // MIDI: 60 = C4
  return `${name}${octave}`;
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function keyOf(cell: Cell) {
  return `${cell.stringIdx}:${cell.fret}`;
}

// Inlays up to 23 (typical: 3/5/7/9, 12 double, 15/17/19/21)
const MARKER_SINGLE = [3, 5, 7, 9, 15, 17, 19, 21];
const MARKER_DOUBLE = [12];

export default function FretboardPage() {
  // Layout constants (must match click math)
  const INSET = 14;
  const ROW_HEIGHT = 40;
  const ROW_GAP = 12;
  const PITCH = ROW_HEIGHT + ROW_GAP;

  const strings = useMemo(() => Array.from({ length: 6 }, (_, i) => i), []);
  const frets = useMemo(() => Array.from({ length: NUM_COLS }, (_, i) => i), []);

  // Nut boundary is between fret 0 and 1
  const nutLeft = `calc(100% / ${NUM_COLS})`;

  // Precompute each string’s min/max MIDI range on THIS board
  const stringRanges = useMemo(() => {
    return OPEN_STRING_MIDI.map((open) => ({
      min: open,
      max: open + MAX_FRET,
    }));
  }, []);

  // Build a question by choosing a MIDI note that exists on the board
  function buildQuestion(): Question {
    // Overall reachable MIDI range across all strings
    const overallMin = Math.min(...stringRanges.map((r) => r.min));
    const overallMax = Math.max(...stringRanges.map((r) => r.max));

    // Pick a random reachable MIDI in [overallMin, overallMax]
    const targetMidi = overallMin + Math.floor(Math.random() * (overallMax - overallMin + 1));

    // Compute matches per string using your range rule
    const matches: Cell[] = [];
    for (let s = 0; s < 6; s++) {
      const { min, max } = stringRanges[s];
      if (targetMidi >= min && targetMidi <= max) {
        const fret = targetMidi - OPEN_STRING_MIDI[s];
        // fret is guaranteed 0..MAX_FRET by range check
        matches.push({ stringIdx: s, fret });
      }
    }

    // It’s possible (rare) to pick a targetMidi that exists on 0 strings if ranges didn’t overlap properly,
    // but with our overallMin/Max derived from those ranges, matches will always be >= 1.
    return {
      targetMidi,
      label: midiToNameOct(targetMidi),
      matches,
    };
  }

  const [question, setQuestion] = useState<Question>(() => buildQuestion());
  const [found, setFound] = useState<Set<string>>(() => new Set());
  const [lastWrong, setLastWrong] = useState<Cell | null>(null);
  const [done, setDone] = useState(false);

  const boardInnerRef = useRef<HTMLDivElement | null>(null);

  function resetForNext() {
    setQuestion(buildQuestion());
    setFound(new Set());
    setLastWrong(null);
    setDone(false);
  }

  // Convert click coordinates -> (string, fret)
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (done) return;

    const el = boardInnerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const colW = rect.width / NUM_COLS;
    const fret = clamp(Math.floor(x / colW), 0, MAX_FRET);

    // nearest string line
    const approx = Math.round((y - ROW_HEIGHT / 2) / PITCH);
    const stringIdx = clamp(approx, 0, 5);

    const clickedMidi = OPEN_STRING_MIDI[stringIdx] + fret;
    const clicked: Cell = { stringIdx, fret };

    if (clickedMidi === question.targetMidi) {
      setFound((prev) => {
        const next = new Set(prev);
        next.add(keyOf(clicked));

        // completion: all expected matches found
        const finished = question.matches.every((c) => next.has(keyOf(c)));
        if (finished) setDone(true);

        return next;
      });
      setLastWrong(null);
    } else {
      setLastWrong(clicked);
      window.setTimeout(() => setLastWrong(null), 220);
    }
  }

  function highlightStyle(cell: Cell, kind: "found" | "wrong"): React.CSSProperties {
    const leftPct = (cell.fret / NUM_COLS) * 100;
    const widthPct = (1 / NUM_COLS) * 100;
    const topPx = cell.stringIdx * PITCH;
    const heightPx = ROW_HEIGHT;

    const isFound = kind === "found";
    return {
      position: "absolute",
      left: `${leftPct}%`,
      width: `${widthPct}%`,
      top: topPx,
      height: heightPx,
      borderRadius: 10,
      pointerEvents: "none",
      zIndex: 12,
      boxShadow: isFound
        ? "0 0 0 2px rgba(0, 255, 160, 0.75)"
        : "0 0 0 2px rgba(255, 80, 80, 0.75)",
      background: isFound ? "rgba(0,255,160,0.08)" : "rgba(255,80,80,0.10)",
    };
  }

  const foundCount = question.matches.filter((c) => found.has(keyOf(c))).length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Fretboard Quiz</h1>

      {/* Quiz header */}
      <div
        style={{
          borderRadius: 14,
          padding: "0.9rem 1rem",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 16 }}>
          <b>Find all:</b> <span style={{ fontSize: 20 }}>{question.label}</span>
        </div>

        <div style={{ opacity: 0.85 }}>
          <b>Progress:</b> {foundCount}/{question.matches.length}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <button type="button" onClick={resetForNext}>
            New Note
          </button>
          {done && (
            <button type="button" onClick={resetForNext}>
              Next
            </button>
          )}
        </div>

        {done && (
          <div style={{ width: "100%", marginTop: 6, opacity: 0.9 }}>
            ✅ Nice — you found all {question.label} positions on the neck.
          </div>
        )}
      </div>

      {/* Outer container */}
      <div
        style={{
          borderRadius: 16,
          padding: INSET,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          overflowX: "auto",
        }}
      >
        {/* Neck surface */}
        <div
          style={{
            minWidth: 1100,
            position: "relative",
            borderRadius: 14,
            padding: INSET,
            background: "linear-gradient(180deg, rgba(140,100,60,0.18), rgba(40,20,10,0.18))",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          {/* Fret numbers (centered BETWEEN frets) */}
          <div
            style={{
              position: "absolute",
              left: INSET,
              right: INSET,
              top: 6,
              height: 18,
              pointerEvents: "none",
              zIndex: 20,
              opacity: 0.9,
              fontSize: 13,
            }}
          >
            {frets.map((f) => (
              <div
                key={`label-${f}`}
                style={{
                  position: "absolute",
                  left: `${((f + 0.5) / NUM_COLS) * 100}%`, // center of the fret space
                  transform: "translateX(-50%)",
                }}
              >
                {f}
              </div>
            ))}
          </div>

          {/* ONE clickable coordinate plane */}
          <div
            ref={boardInnerRef}
            onPointerDown={handlePointerDown}
            style={{
              position: "relative",
              marginTop: 22, // leave room for fret numbers inside the neck
              height: ROW_HEIGHT * 6 + ROW_GAP * 5,
              userSelect: "none",
              touchAction: "manipulation",
              cursor: done ? "default" : "crosshair",
            }}
          >
            {/* Found highlights */}
            {question.matches
              .filter((c) => found.has(keyOf(c)))
              .map((c) => (
                <div key={`found-${keyOf(c)}`} style={highlightStyle(c, "found")} />
              ))}

            {/* Wrong flash */}
            {lastWrong && <div style={highlightStyle(lastWrong, "wrong")} />}

            {/* Frets overlay */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}>
              {/* Nut */}
              <div
                style={{
                  position: "absolute",
                  left: nutLeft,
                  top: 0,
                  bottom: 0,
                  width: 6,
                  transform: "translateX(-3px)",
                  background: "rgba(255,255,255,0.33)",
                  borderRadius: 999,
                }}
              />
              {/* Fret wires at boundaries 2/NUM_COLS ... MAX_FRET/NUM_COLS */}
              {Array.from({ length: MAX_FRET - 1 }, (_, idx) => idx + 2).map((i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `calc(${i} * (100% / ${NUM_COLS}))`,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    transform: "translateX(-1.5px)",
                    background: "rgba(255,255,255,0.20)",
                    borderRadius: 999,
                  }}
                />
              ))}
            </div>

            {/* Inlay dots overlay */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${NUM_COLS}, 1fr)`,
                  height: "100%",
                }}
              >
                {frets.map((f) => {
                  const isSingle = MARKER_SINGLE.includes(f);
                  const isDouble = MARKER_DOUBLE.includes(f);

                  return (
                    <div key={`inlay-${f}`} style={{ position: "relative", height: "100%" }}>
                      {isSingle && (
                        <div
                          style={{
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            transform: "translate(-50%, -50%)",
                            width: 24,
                            height: 24,
                            borderRadius: 999,
                            background: "rgba(255,255,255,0.28)",
                            boxShadow: "0 0 0 2px rgba(0,0,0,0.10) inset",
                          }}
                        />
                      )}
                      {isDouble && (
                        <>
                          <div
                            style={{
                              position: "absolute",
                              left: "50%",
                              top: "33%",
                              transform: "translate(-50%, -50%)",
                              width: 24,
                              height: 24,
                              borderRadius: 999,
                              background: "rgba(255,255,255,0.28)",
                              boxShadow: "0 0 0 2px rgba(0,0,0,0.10) inset",
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              left: "50%",
                              top: "67%",
                              transform: "translate(-50%, -50%)",
                              width: 24,
                              height: 24,
                              borderRadius: 999,
                              background: "rgba(255,255,255,0.28)",
                              boxShadow: "0 0 0 2px rgba(0,0,0,0.10) inset",
                            }}
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strings (start at nut) */}
            {strings.map((stringIdx) => {
              const y = stringIdx * PITCH + ROW_HEIGHT / 2;
              return (
                <div
                  key={`string-${stringIdx}`}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: y,
                    height: 0,
                    pointerEvents: "none",
                    zIndex: 4,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: nutLeft,
                      right: 0,
                      top: 0,
                      height: 1 + (5 - stringIdx) * 0.25,
                      transform: "translateY(-50%)",
                      background: "rgba(255,255,255,0.40)",
                      borderRadius: 999,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, opacity: 0.75, fontSize: 13 }}>
        Note: this mode is <b>exact pitch</b> (e.g., C3 only). If you want “all C’s any octave”, we can add a toggle.
      </div>
    </div>
  );
}