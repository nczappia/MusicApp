import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Cell,
  INSET, ROW_HEIGHT, ROW_GAP, PITCH, NUM_COLS, MAX_FRET,
  MARKER_SINGLE, MARKER_DOUBLE, STRING_WIDTHS,
  strings, frets, allocateWidths, clamp,
} from "../utils/fretboard";

export type HighlightKind = "found" | "wrong" | "target";
export type FretboardHighlight = { cell: Cell; kind: HighlightKind };

type Props = {
  highlights?: FretboardHighlight[];
  onCellClick?: (cell: Cell) => void;
  cursor?: string;
};

export default function FretboardDisplay({ highlights = [], onCellClick, cursor }: Props) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [colPx, setColPx] = useState<number[]>(() => Array(NUM_COLS).fill(40));
  const [boundPx, setBoundPx] = useState<number[]>(() => Array(NUM_COLS + 1).fill(0));

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const update = () => {
      const { width } = el.getBoundingClientRect();
      const { w, b } = allocateWidths(width);
      setColPx(w);
      setBoundPx(b);
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  const nutX = boundPx[1] ?? 0;
  const gridCols = useMemo(() => colPx.map((w) => `${w}px`).join(" "), [colPx]);

  function highlightStyle(cell: Cell, kind: HighlightKind): React.CSSProperties {
    const left = boundPx[cell.fret] ?? 0;
    const right = boundPx[cell.fret + 1] ?? left + 10;
    const palette = {
      found:  { shadow: "rgba(0, 255, 160, 0.75)", bg: "rgba(0,255,160,0.08)" },
      wrong:  { shadow: "rgba(255, 80, 80, 0.75)",  bg: "rgba(255,80,80,0.10)" },
      target: { shadow: "rgba(80, 160, 255, 0.85)", bg: "rgba(80,160,255,0.18)" },
    };
    const { shadow, bg } = palette[kind];
    return {
      position: "absolute",
      left,
      width: Math.max(1, right - left),
      top: cell.stringIdx * PITCH,
      height: ROW_HEIGHT,
      borderRadius: 10,
      pointerEvents: "none",
      zIndex: 12,
      boxShadow: `0 0 0 2px ${shadow}`,
      background: bg,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!onCellClick) return;
    const rect = boardRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let fret = MAX_FRET;
    for (let i = 0; i < NUM_COLS; i++) {
      if (x >= boundPx[i] && x < boundPx[i + 1]) { fret = i; break; }
    }
    const stringIdx = clamp(Math.round((y - ROW_HEIGHT / 2) / (ROW_HEIGHT + ROW_GAP)), 0, 5);
    onCellClick({ stringIdx, fret: clamp(fret, 0, MAX_FRET) });
  }

  return (
    <>
      {/* Fret numbers */}
      <div style={{ display: "grid", gridTemplateColumns: gridCols, alignItems: "center", marginBottom: 10, opacity: 0.85, fontSize: 13, overflow: "hidden" }}>
        {frets.map((f) => (
          <div key={`top-${f}`} style={{ textAlign: "center" }}>{f}</div>
        ))}
      </div>

      <div style={{ borderRadius: 16, padding: INSET, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", overflowX: "auto" }}>
        <div style={{ minWidth: 1100, position: "relative", borderRadius: 14, padding: INSET, background: "linear-gradient(180deg, rgba(140,100,60,0.18), rgba(40,20,10,0.18))", border: "1px solid rgba(255,255,255,0.10)" }}>
          <div
            ref={boardRef}
            onPointerDown={onCellClick ? handlePointerDown : undefined}
            style={{
              position: "relative",
              height: ROW_HEIGHT * 6 + ROW_GAP * 5,
              userSelect: "none",
              touchAction: "manipulation",
              cursor: cursor ?? (onCellClick ? "crosshair" : "default"),
            }}
          >
            {/* Highlights */}
            {highlights.map(({ cell, kind }) => (
              <div key={`hl-${cell.stringIdx}-${cell.fret}-${kind}`} style={highlightStyle(cell, kind)} />
            ))}

            {/* Fret wires */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}>
              <div style={{ position: "absolute", left: nutX, top: 0, bottom: 0, width: 8, transform: "translateX(-4px)", background: "rgba(255,255,255,0.33)", borderRadius: 999 }} />
              {Array.from({ length: MAX_FRET - 1 }, (_, idx) => idx + 2).map((bIdx) => (
                <div key={`wire-${bIdx}`} style={{ position: "absolute", left: boundPx[bIdx] ?? 0, top: 0, bottom: 0, width: 3, transform: "translateX(-1.5px)", background: "rgba(255,255,255,0.20)", borderRadius: 999 }} />
              ))}
            </div>

            {/* Inlays */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: gridCols, height: "100%" }}>
                {frets.map((f) => {
                  const isSingle = MARKER_SINGLE.includes(f);
                  const isDouble = MARKER_DOUBLE.includes(f);
                  return (
                    <div key={`inlay-${f}`} style={{ position: "relative", height: "100%" }}>
                      {isSingle && (
                        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 24, height: 24, borderRadius: 999, background: "rgba(255,255,255,0.28)", boxShadow: "0 0 0 2px rgba(0,0,0,0.10) inset" }} />
                      )}
                      {isDouble && (
                        <>
                          <div style={{ position: "absolute", left: "50%", top: "33%", transform: "translate(-50%, -50%)", width: 24, height: 24, borderRadius: 999, background: "rgba(255,255,255,0.28)", boxShadow: "0 0 0 2px rgba(0,0,0,0.10) inset" }} />
                          <div style={{ position: "absolute", left: "50%", top: "67%", transform: "translate(-50%, -50%)", width: 24, height: 24, borderRadius: 999, background: "rgba(255,255,255,0.28)", boxShadow: "0 0 0 2px rgba(0,0,0,0.10) inset" }} />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strings */}
            {strings.map((stringIdx) => (
              <div key={`string-${stringIdx}`} style={{ position: "absolute", left: nutX, right: 0, top: stringIdx * PITCH + ROW_HEIGHT / 2, height: 0, pointerEvents: "none", zIndex: 4 }}>
                <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: STRING_WIDTHS[stringIdx], transform: "translateY(-50%)", background: "rgba(255,255,255,0.40)", borderRadius: 999 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
