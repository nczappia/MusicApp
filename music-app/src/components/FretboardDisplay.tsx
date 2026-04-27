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

  // Strings 0-1 are plain steel; 2-5 are wound (warmer nickel tint)
  function stringGradient(stringIdx: number): string {
    if (stringIdx <= 1) {
      // plain steel
      return "linear-gradient(180deg, rgba(160,168,185,0.7) 0%, rgba(240,244,255,0.96) 30%, rgba(255,255,255,1) 50%, rgba(230,236,250,0.95) 70%, rgba(155,162,178,0.65) 100%)";
    }
    // wound — nickel wrap gives a warmer, slightly bronze tone
    return "linear-gradient(180deg, rgba(130,118,95,0.75) 0%, rgba(210,195,158,0.95) 28%, rgba(200,185,148,0.9) 55%, rgba(165,148,112,0.8) 78%, rgba(120,108,85,0.65) 100%)";
  }

  return (
    <>
      {/* Fret numbers */}
      <div style={{ display: "grid", gridTemplateColumns: gridCols, alignItems: "center", marginBottom: 10, opacity: 0.6, fontSize: 12, overflow: "hidden" }}>
        {frets.map((f) => (
          <div key={`top-${f}`} style={{ textAlign: "center" }}>{f}</div>
        ))}
      </div>

      {/* Outer frame — dark binding/edge around the neck */}
      <div style={{
        borderRadius: 12,
        padding: 6,
        background: "linear-gradient(180deg, #1C0C04 0%, #130804 100%)",
        border: "1px solid rgba(80,40,15,0.9)",
        boxShadow: "0 6px 28px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.04) inset",
        overflowX: "auto",
      }}>
        {/* Fretboard wood surface */}
        <div style={{
          minWidth: 1100,
          position: "relative",
          borderRadius: 8,
          padding: INSET,
          background: [
            // subtle vertical grain streaks
            "repeating-linear-gradient(92deg, transparent 0px, transparent 38px, rgba(0,0,0,0.07) 39px, rgba(0,0,0,0.07) 40px, transparent 41px, transparent 78px)",
            // faint horizontal grain shimmer
            "repeating-linear-gradient(180deg, rgba(255,255,255,0.025) 0px, transparent 3px, transparent 10px, rgba(0,0,0,0.03) 11px, rgba(0,0,0,0.03) 12px, transparent 13px, transparent 28px)",
            // base rosewood gradient
            "linear-gradient(180deg, #5C2810 0%, #3A1808 25%, #4E2210 50%, #3A1808 75%, #4A2010 100%)",
          ].join(", "),
          boxShadow: "0 0 0 1px rgba(0,0,0,0.6) inset, 0 2px 4px rgba(0,0,0,0.4) inset",
          overflow: "hidden",
        }}>
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
              {/* Nut — bone/cream coloured, wider */}
              <div style={{
                position: "absolute",
                left: nutX,
                top: -2,
                bottom: -2,
                width: 7,
                transform: "translateX(-3.5px)",
                background: "linear-gradient(90deg, rgba(225,210,165,0.6) 0%, rgba(248,238,198,0.98) 30%, rgba(255,248,215,1) 55%, rgba(235,220,175,0.95) 80%, rgba(210,195,150,0.65) 100%)",
                borderRadius: 3,
                boxShadow: "0 0 3px rgba(0,0,0,0.5), 1px 0 2px rgba(255,255,255,0.15) inset",
              }} />
              {/* Regular fret wires */}
              {Array.from({ length: MAX_FRET - 1 }, (_, idx) => idx + 2).map((bIdx) => (
                <div key={`wire-${bIdx}`} style={{
                  position: "absolute",
                  left: boundPx[bIdx] ?? 0,
                  top: -1,
                  bottom: -1,
                  width: 4,
                  transform: "translateX(-2px)",
                  background: "linear-gradient(90deg, rgba(140,145,165,0.5) 0%, rgba(215,218,232,0.95) 25%, rgba(240,242,252,1) 50%, rgba(210,214,228,0.9) 75%, rgba(135,140,158,0.45) 100%)",
                  borderRadius: 2,
                  boxShadow: "0 0 2px rgba(0,0,0,0.45), 0 1px 1px rgba(255,255,255,0.12) inset",
                }} />
              ))}
            </div>

            {/* Inlays — mother-of-pearl */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: gridCols, height: "100%" }}>
                {frets.map((f) => {
                  const isSingle = MARKER_SINGLE.includes(f);
                  const isDouble = MARKER_DOUBLE.includes(f);
                  const inlayStyle: React.CSSProperties = {
                    position: "absolute",
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: "radial-gradient(circle at 38% 35%, rgba(255,255,255,0.97) 0%, rgba(210,228,255,0.82) 30%, rgba(195,210,240,0.7) 55%, rgba(200,220,245,0.55) 75%, rgba(170,185,210,0.4) 100%)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.25) inset",
                    left: "50%",
                    transform: "translateX(-50%)",
                  };
                  return (
                    <div key={`inlay-${f}`} style={{ position: "relative", height: "100%" }}>
                      {isSingle && (
                        <div style={{ ...inlayStyle, top: "50%", marginTop: -10 }} />
                      )}
                      {isDouble && (
                        <>
                          <div style={{ ...inlayStyle, top: "33%", marginTop: -10 }} />
                          <div style={{ ...inlayStyle, top: "67%", marginTop: -10 }} />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strings */}
            {strings.map((stringIdx) => {
              const thickness = STRING_WIDTHS[stringIdx];
              return (
                <div key={`string-${stringIdx}`} style={{
                  position: "absolute",
                  left: nutX,
                  right: 0,
                  top: stringIdx * PITCH + ROW_HEIGHT / 2,
                  height: 0,
                  pointerEvents: "none",
                  zIndex: 8,
                }}>
                  {/* Shadow under string */}
                  <div style={{
                    position: "absolute",
                    left: 0, right: 0,
                    top: thickness / 2,
                    height: Math.max(1, thickness * 0.5),
                    background: "rgba(0,0,0,0.45)",
                    borderRadius: 999,
                    filter: "blur(1px)",
                  }} />
                  {/* String body */}
                  <div style={{
                    position: "absolute",
                    left: 0, right: 0,
                    top: 0,
                    height: thickness,
                    transform: "translateY(-50%)",
                    background: stringGradient(stringIdx),
                    borderRadius: 999,
                  }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
