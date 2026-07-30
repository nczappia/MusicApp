import { useEffect, useMemo, useRef, useState } from "react";
import FretboardDisplay from "../components/FretboardDisplay";
import type { FretboardHighlight } from "../components/FretboardDisplay";
import { useSimpleSynth } from "../hooks/useSimpleSynth";
import { useIsMobile } from "../hooks/useIsMobile";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import {
  type Cell,
  OPEN_STRING_MIDI, MAX_FRET,
  midiToNameOct, keyOf,
} from "../utils/fretboard";
import { blue, white } from "../utils/theme";

type Question = { targetMidi: number; label: string; matches: Cell[]; key: number };

let questionCounter = 0;
function buildQuestion(maxFret: number): Question {
  const midiMin = Math.min(...OPEN_STRING_MIDI);
  const midiMax = Math.max(...OPEN_STRING_MIDI) + maxFret;
  const targetMidi = midiMin + Math.floor(Math.random() * (midiMax - midiMin + 1));
  const matches: Cell[] = [];
  for (let s = 0; s < 6; s++) {
    const fret = targetMidi - OPEN_STRING_MIDI[s];
    if (fret >= 0 && fret <= maxFret) matches.push({ stringIdx: s, fret });
  }
  return { targetMidi, label: midiToNameOct(targetMidi), matches, key: ++questionCounter };
}

export default function FretboardPage() {
  const isMobile = useIsMobile();
  const [halfNeck, setHalfNeck] = useLocalStorageState<boolean>("fbHalfNeck", isMobile, {
    parse: (raw) => raw === "true",
    serialize: (v) => String(v),
  });
  const maxFret = halfNeck ? 12 : MAX_FRET;

  const [question, setQuestion] = useState<Question>(() => buildQuestion(halfNeck ? 12 : MAX_FRET));
  const [found, setFound] = useState<Set<string>>(() => new Set());
  const [lastWrong, setLastWrong] = useState<Cell | null>(null);
  const done = question.matches.length > 0 && question.matches.every((c) => found.has(keyOf(c)));

  const { ensureAudio } = useSimpleSynth();
  const wrongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (wrongTimeoutRef.current) clearTimeout(wrongTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setQuestion(buildQuestion(halfNeck ? 12 : MAX_FRET));
    setFound(new Set());
    setLastWrong(null);
  }, [halfNeck]);

  function resetForNext() {
    setQuestion(buildQuestion(maxFret));
    setFound(new Set());
    setLastWrong(null);
  }

  async function handleCellClick({ stringIdx, fret }: Cell) {
    if (done) return;
    const clicked: Cell = { stringIdx, fret };
    if (found.has(keyOf(clicked))) return;
    const clickedMidi = OPEN_STRING_MIDI[stringIdx] + fret;

    const synth = await ensureAudio();
    if (!synth) return;

    if (clickedMidi === question.targetMidi && fret <= maxFret) {
      void synth.playMidi(clickedMidi, { noteMs: 280, releaseMs: 120, volume: 0.18 });
      setFound((prev) => {
        const next = new Set(prev);
        next.add(keyOf(clicked));
        return next;
      });
      setLastWrong(null);
    } else {
      synth.playWrong();
      setLastWrong(clicked);
      if (wrongTimeoutRef.current) clearTimeout(wrongTimeoutRef.current);
      wrongTimeoutRef.current = setTimeout(() => setLastWrong(null), 220);
    }
  }

  const foundCount = question.matches.filter((c) => found.has(keyOf(c))).length;

  const highlights = useMemo<FretboardHighlight[]>(() => [
    ...question.matches.filter((c) => found.has(keyOf(c))).map((c) => ({ cell: c, kind: "found" as const })),
    ...(lastWrong ? [{ cell: lastWrong, kind: "wrong" as const }] : []),
  ], [question.matches, found, lastWrong]);

  return (
    <div style={{ maxWidth: 1500, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Fretboard Quiz</h1>

      <div
        style={{
          borderRadius: 14,
          padding: "0.9rem 1rem",
          background: white(0.06),
          border: `1px solid ${white(0.12)}`,
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
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setHalfNeck((h) => !h)}
            style={{
              padding: "0.45rem 0.9rem",
              minHeight: 44,
              borderRadius: 8,
              border: halfNeck ? `2px solid ${blue(0.8)}` : `1px solid ${white(0.18)}`,
              background: halfNeck ? blue(0.12) : white(0.05),
              color: "inherit",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: halfNeck ? 700 : 400,
            }}
          >
            {halfNeck ? "Frets 0–12 ✓" : "Frets 0–12"}
          </button>
          <button type="button" onClick={resetForNext} style={{ minHeight: 44, padding: "0.45rem 0.9rem" }}>New Note</button>
          {done && <button type="button" onClick={resetForNext} style={{ minHeight: 44, padding: "0.45rem 0.9rem" }}>Next</button>}
        </div>
        {done && (
          <div role="status" aria-live="polite" style={{ width: "100%", marginTop: 6, opacity: 0.9 }}>
            ✅ Nice — you found all {question.label} positions{halfNeck ? " in the first 12 frets" : " on the neck"}.
          </div>
        )}
      </div>

      <FretboardDisplay
        highlights={highlights}
        onCellClick={handleCellClick}
        cursor={done ? "default" : "crosshair"}
        visibleFrets={halfNeck ? 12 : undefined}
        resetKey={question.key}
      />

      <div style={{ marginTop: 12, opacity: 0.75, fontSize: 13 }}>
        Click every position where the note appears{halfNeck ? " (frets 0–12 only)" : ""}. Correct taps play the pitch; wrong taps buzz.
      </div>
    </div>
  );
}
