import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Cell,
  ROW_HEIGHT, ROW_GAP, PITCH, NUM_COLS, MAX_FRET,
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

// Vertical space between outermost strings and fretboard edge
const VTOP = 20;
const VBOT = 20;
const STRINGS_H = ROW_HEIGHT * 6 + ROW_GAP * 5;
const BOARD_H = VTOP + STRINGS_H + VBOT;

// Inlay dot Y positions relative to board top (centred within string span)
const INLAY_SINGLE_Y = VTOP + STRINGS_H / 2 - 10;
const INLAY_DOUBLE_Y1 = VTOP + STRINGS_H / 3 - 10;
const INLAY_DOUBLE_Y2 = VTOP + (STRINGS_H * 2) / 3 - 10;

const INLAY_STYLE: React.CSSProperties = {
  position: "absolute",
  width: 20,
  height: 20,
  borderRadius: 999,
  left: "50%",
  transform: "translateX(-50%)",
  background:
    "radial-gradient(circle at 38% 35%, rgba(255,255,255,0.97) 0%, rgba(210,228,255,0.82) 30%, rgba(195,210,240,0.7) 55%, rgba(200,220,245,0.55) 75%, rgba(170,185,210,0.4) 100%)",
  boxShadow:
    "0 1px 3px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.25) inset",
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
      found:  { shadow: "rgba(0, 255, 160, 0.80)", bg: "rgba(0,255,160,0.10)" },
      wrong:  { shadow: "rgba(255, 80, 80, 0.80)",  bg: "rgba(255,80,80,0.12)" },
      target: { shadow: "rgba(80, 160, 255, 0.90)", bg: "rgba(80,160,255,0.20)" },
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

  function stringGradient(stringIdx: number): string {
    if (stringIdx <= 1) {
      // plain steel
      return "linear-gradient(180deg, rgba(160,168,185,0.7) 0%, rgba(240,244,255,0.96) 30%, rgba(255,255,255,1) 50%, rgba(230,236,250,0.95) 70%, rgba(155,162,178,0.65) 100%)";
    }
    // wound nickel
    return "linear-gradient(180deg, rgba(130,118,95,0.75) 0%, rgba(210,195,158,0.95) 28%, rgba(200,185,148,0.9) 55%, rgba(165,148,112,0.8) 78%, rgba(120,108,85,0.65) 100%)";
  }

  return (
    /* Scroll wrapper: fret numbers + board scroll together */
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 1400 }}>

        {/* Fret numbers */}
        <div style={{
          display: "grid",
          gridTemplateColumns: gridCols,
          alignItems: "center",
          marginBottom: 8,
          paddingLeft: 4,
          paddingRight: 4,
          opacity: 0.55,
          fontSize: 12,
        }}>
          {frets.map((f) => (
            <div key={`top-${f}`} style={{ textAlign: "center" }}>{f}</div>
          ))}
        </div>

        {/* Binding frame */}
        <div style={{
          borderRadius: 10,
          padding: 4,
          background: "linear-gradient(180deg, #1A0A03 0%, #110702 100%)",
          border: "1px solid rgba(60,30,10,0.95)",
          boxShadow: "0 6px 28px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.04) inset",
        }}>
          {/* Wood surface — frets and nut span this full height */}
          <div style={{
            position: "relative",
            height: BOARD_H,
            borderRadius: 7,
            overflow: "hidden",
            background: [
              "repeating-linear-gradient(92deg, transparent 0px, transparent 38px, rgba(0,0,0,0.065) 39px, rgba(0,0,0,0.065) 40px, transparent 41px, transparent 78px)",
              "repeating-linear-gradient(180deg, rgba(255,255,255,0.022) 0px, transparent 3px, transparent 10px, rgba(0,0,0,0.028) 11px, rgba(0,0,0,0.028) 12px, transparent 13px, transparent 28px)",
              "linear-gradient(180deg, #5E2A10 0%, #3C1908 22%, #502210 48%, #3C1908 72%, #4C2010 100%)",
            ].join(", "),
            boxShadow: "0 0 0 1px rgba(0,0,0,0.65) inset",
          }}>

            {/* Fret wires — edge to edge (top:0, bottom:0 = full board height) */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}>
              {/* Nut */}
              <div style={{
                position: "absolute",
                left: nutX,
                top: 0,
                bottom: 0,
                width: 8,
                transform: "translateX(-4px)",
                background: "linear-gradient(90deg, rgba(215,200,155,0.55) 0%, rgba(248,238,198,0.97) 28%, rgba(255,250,218,1) 52%, rgba(238,222,178,0.95) 78%, rgba(205,190,145,0.6) 100%)",
                borderRadius: 3,
                boxShadow: "1px 0 3px rgba(0,0,0,0.55), 1px 0 2px rgba(255,255,255,0.18) inset",
              }} />
              {/* Regular frets */}
              {Array.from({ length: MAX_FRET - 1 }, (_, idx) => idx + 2).map((bIdx) => (
                <div key={`wire-${bIdx}`} style={{
                  position: "absolute",
                  left: boundPx[bIdx] ?? 0,
                  top: 0,
                  bottom: 0,
                  width: 5,
                  transform: "translateX(-2.5px)",
                  background: "linear-gradient(90deg, rgba(120,125,145,0.45) 0%, rgba(210,214,228,0.93) 22%, rgba(245,247,255,1) 50%, rgba(208,212,226,0.92) 78%, rgba(118,123,142,0.42) 100%)",
                  borderRadius: 2,
                  boxShadow: "0 0 2px rgba(0,0,0,0.5), 0 1px 1px rgba(255,255,255,0.14) inset",
                }} />
              ))}
            </div>

            {/* Inlays — mother-of-pearl, pixel Y positions centred within string span */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: gridCols, height: "100%", position: "relative" }}>
                {frets.map((f) => {
                  const isSingle = MARKER_SINGLE.includes(f);
                  const isDouble = MARKER_DOUBLE.includes(f);
                  return (
                    <div key={`inlay-${f}`} style={{ position: "relative", height: "100%" }}>
                      {isSingle && (
                        <div style={{ ...INLAY_STYLE, top: INLAY_SINGLE_Y }} />
                      )}
                      {isDouble && (
                        <>
                          <div style={{ ...INLAY_STYLE, top: INLAY_DOUBLE_Y1 }} />
                          <div style={{ ...INLAY_STYLE, top: INLAY_DOUBLE_Y2 }} />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hit area: sits at VTOP from board top, same width as board */}
            <div
              ref={boardRef}
              onPointerDown={onCellClick ? handlePointerDown : undefined}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: VTOP,
                height: STRINGS_H,
                userSelect: "none",
                touchAction: "manipulation",
                cursor: cursor ?? (onCellClick ? "crosshair" : "default"),
                zIndex: 2,
              }}
            >
              {/* Highlights */}
              {highlights.map(({ cell, kind }) => (
                <div key={`hl-${cell.stringIdx}-${cell.fret}-${kind}`} style={highlightStyle(cell, kind)} />
              ))}

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
                    <div style={{
                      position: "absolute",
                      left: 0, right: 0,
                      top: thickness / 2 + 1,
                      height: Math.max(1, thickness * 0.45),
                      background: "rgba(0,0,0,0.4)",
                      borderRadius: 999,
                      filter: "blur(1px)",
                    }} />
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
      </div>
    </div>
  );
}
