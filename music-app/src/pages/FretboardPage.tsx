import { useEffect, useMemo, useRef, useState } from "react";

type Cell = { stringIdx: number; fret: number };
type Question = { targetMidi: number; label: string; matches: Cell[] };

// TOP -> BOTTOM visually: high E, B, G, D, A, low E
const OPEN_STRING_MIDI = [64, 59, 55, 50, 45, 40];

const MAX_FRET = 23;
const NUM_COLS = MAX_FRET + 1;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function midiToNameOct(midi: number) {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function keyOf(c: Cell) {
  return `${c.stringIdx}:${c.fret}`;
}

// Inlays (typical)
const MARKER_SINGLE = [3, 5, 7, 9, 15, 17, 19, 21];
const MARKER_DOUBLE = [12];

// Equal temperament nut->fret distance fraction
function distToFret(n: number) {
  return 1 - Math.pow(2, -n / 12);
}

export default function FretboardPage() {
  // Layout constants
  const INSET = 14;
  const ROW_HEIGHT = 40;
  const ROW_GAP = 12;
  const PITCH = ROW_HEIGHT + ROW_GAP;

  // ===== You can tweak these two to taste =====
  const MIN_COL_PX = 18;      // prevents upper frets collapsing
  const OPEN_FACTOR = 0.22;   // makes the “0th/headstock” area small (more room for fret 1)
  const GAMMA = 1.15;         // mild taper exaggeration; keep close to 1 to avoid distortion
  // ===========================================

  const strings = useMemo(() => Array.from({ length: 6 }, (_, i) => i), []);
  const frets = useMemo(() => Array.from({ length: NUM_COLS }, (_, i) => i), []);

  // Precompute per-string ranges
  const stringRanges = useMemo(() => {
    return OPEN_STRING_MIDI.map((open) => ({ min: open, max: open + MAX_FRET }));
  }, []);

  function buildQuestion() {
    const overallMin = Math.min(...stringRanges.map((r) => r.min));
    const overallMax = Math.max(...stringRanges.map((r) => r.max));
    const targetMidi = overallMin + Math.floor(Math.random() * (overallMax - overallMin + 1));

    const matches: Cell[] = [];
    for (let s = 0; s < 6; s++) {
      const { min, max } = stringRanges[s];
      if (targetMidi >= min && targetMidi <= max) {
        matches.push({ stringIdx: s, fret: targetMidi - OPEN_STRING_MIDI[s] });
      }
    }
    return { targetMidi, label: midiToNameOct(targetMidi), matches };
  }

  const [question, setQuestion] = useState(() => buildQuestion());
  const [found, setFound] = useState<Set<string>>(() => new Set());
  const [lastWrong, setLastWrong] = useState<Cell | null>(null);
  const [done, setDone] = useState(false);

  const boardRef = useRef<HTMLDivElement | null>(null);

  // ==== Pixel-accurate column widths + boundaries (in px) ====
  const [colPx, setColPx] = useState<number[]>(() => Array(NUM_COLS).fill(40));
  const [boundPx, setBoundPx] = useState<number[]>(() => Array(NUM_COLS + 1).fill(0)); // cumulative

  // Compute base weights (equal temperament fret-space widths)
  const colWeights = useMemo(() => {
    const raw: number[] = [];
    for (let n = 1; n <= MAX_FRET; n++) raw.push(distToFret(n) - distToFret(n - 1));

    // mild shaping so fret 1 feels big but doesn’t destroy later frets
    const shaped = raw.map((x) => Math.pow(x, GAMMA));

    const openArea = shaped[0] * OPEN_FACTOR;
    return [openArea, ...shaped]; // length NUM_COLS
  }, [GAMMA, OPEN_FACTOR]);

  // Allocate pixel widths with a minimum
  function allocateWidths(totalW: number) {
    const n = NUM_COLS;
    const minTotal = n * MIN_COL_PX;

    // If the container is extremely narrow, just equalize to avoid negative remaining space
    if (totalW <= minTotal + 1) {
      const w = Array(n).fill(totalW / n);
      const b = [0];
      for (let i = 0; i < n; i++) b.push(b[i] + w[i]);
      return { w, b };
    }

    // Start with minimum widths
    const w = Array(n).fill(MIN_COL_PX);
    let remaining = totalW - minTotal;

    // Distribute remaining proportionally by weights
    const weightSum = colWeights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < n; i++) {
      w[i] += (colWeights[i] / weightSum) * remaining;
    }

    // Build boundaries
    const b = [0];
    for (let i = 0; i < n; i++) b.push(b[i] + w[i]);

    return { w, b };
  }

  // Resize observer: recompute widths when the board resizes
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      const { w, b } = allocateWidths(rect.width);
      setColPx(w);
      setBoundPx(b);
    });

    ro.observe(el);
    // run once
    const rect = el.getBoundingClientRect();
    const { w, b } = allocateWidths(rect.width);
    setColPx(w);
    setBoundPx(b);

    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colWeights]);

  // Nut boundary is between col0 and col1
  const nutX = boundPx[1] ?? 0;

  function resetForNext() {
    setQuestion(buildQuestion());
    setFound(new Set());
    setLastWrong(null);
    setDone(false);
  }

  // px-based fret mapping from X
  function fretFromX(x: number) {
    // find i s.t. boundPx[i] <= x < boundPx[i+1]
    for (let i = 0; i < NUM_COLS; i++) {
      if (x >= boundPx[i] && x < boundPx[i + 1]) return i;
    }
    return MAX_FRET;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (done) return;
    const el = boardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const fret = clamp(fretFromX(x), 0, MAX_FRET);

    const approx = Math.round((y - ROW_HEIGHT / 2) / PITCH);
    const stringIdx = clamp(approx, 0, 5);

    const clickedMidi = OPEN_STRING_MIDI[stringIdx] + fret;
    const clicked: Cell = { stringIdx, fret };

    if (clickedMidi === question.targetMidi) {
      setFound((prev) => {
        const next = new Set(prev);
        next.add(keyOf(clicked));
        if (question.matches.every((c) => next.has(keyOf(c)))) setDone(true);
        return next;
      });
      setLastWrong(null);
    } else {
      setLastWrong(clicked);
      window.setTimeout(() => setLastWrong(null), 220);
    }
  }

  function highlightStyle(cell: Cell, kind: "found" | "wrong"): React.CSSProperties {
    const left = boundPx[cell.fret] ?? 0;
    const right = boundPx[cell.fret + 1] ?? left + 10;

    const top = cell.stringIdx * PITCH;
    const height = ROW_HEIGHT;

    const isFound = kind === "found";
    return {
      position: "absolute",
      left,
      width: Math.max(1, right - left),
      top,
      height,
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

  // gridTemplateColumns as explicit px values (perfect alignment)
  const gridCols = useMemo(() => colPx.map((w) => `${w}px`).join(" "), [colPx]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Fretboard Quiz</h1>

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

      {/* Fret numbers row (uses SAME px columns, so it can’t collapse into “0123…”) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: gridCols,
          alignItems: "center",
          marginBottom: 10,
          opacity: 0.85,
          fontSize: 13,
          overflow: "hidden",
        }}
      >
        {frets.map((f) => (
          <div key={`top-${f}`} style={{ textAlign: "center" }}>
            {f}
          </div>
        ))}
      </div>

      <div
        style={{
          borderRadius: 16,
          padding: INSET,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          overflowX: "auto",
        }}
      >
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
          <div
            ref={boardRef}
            onPointerDown={handlePointerDown}
            style={{
              position: "relative",
              height: ROW_HEIGHT * 6 + ROW_GAP * 5,
              userSelect: "none",
              touchAction: "manipulation",
              cursor: done ? "default" : "crosshair",
            }}
          >
            {/* Highlights */}
            {question.matches
              .filter((c) => found.has(keyOf(c)))
              .map((c) => (
                <div key={`found-${keyOf(c)}`} style={highlightStyle(c, "found")} />
              ))}
            {lastWrong && <div style={highlightStyle(lastWrong, "wrong")} />}

            {/* Frets overlay (px-accurate boundaries) */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}>
              {/* Nut */}
              <div
                style={{
                  position: "absolute",
                  left: nutX,
                  top: 0,
                  bottom: 0,
                  width: 8,
                  transform: "translateX(-4px)",
                  background: "rgba(255,255,255,0.33)",
                  borderRadius: 999,
                }}
              />

              {/* Fret wires: boundaries 2..MAX_FRET */}
              {Array.from({ length: MAX_FRET - 1 }, (_, idx) => idx + 2).map((bIdx) => (
                <div
                  key={`wire-${bIdx}`}
                  style={{
                    position: "absolute",
                    left: boundPx[bIdx] ?? 0,
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

            {/* Inlays overlay (uses SAME px grid columns) */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: gridCols, height: "100%" }}>
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

            {/* Strings start at nut */}
            {strings.map((stringIdx) => {
              const y = stringIdx * PITCH + ROW_HEIGHT / 2;
              return (
                <div
                  key={`string-${stringIdx}`}
                  style={{
                    position: "absolute",
                    left: nutX,
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
                      left: 0,
                      right: 0,
                      top: 0,
                      height: 1 + stringIdx * 0.25,
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
        This version enforces a minimum fret-space width so upper frets never collapse, while still tapering realistically.
      </div>
    </div>
  );
}