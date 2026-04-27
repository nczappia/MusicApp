import { useEffect, useRef, useState } from "react";
import FretboardDisplay from "../components/FretboardDisplay";
import type { FretboardHighlight } from "../components/FretboardDisplay";
import { SimpleSynth } from "../utils/audio";
import {
  type Cell,
  OPEN_STRING_MIDI, MAX_FRET,
  midiToNameOct, keyOf,
} from "../utils/fretboard";

type Question = { targetMidi: number; label: string; matches: Cell[] };

function buildQuestion(maxFret: number): Question {
  const midiMin = Math.min(...OPEN_STRING_MIDI);
  const midiMax = Math.max(...OPEN_STRING_MIDI) + maxFret;
  const targetMidi = midiMin + Math.floor(Math.random() * (midiMax - midiMin + 1));
  const matches: Cell[] = [];
  for (let s = 0; s < 6; s++) {
    const fret = targetMidi - OPEN_STRING_MIDI[s];
    if (fret >= 0 && fret <= maxFret) matches.push({ stringIdx: s, fret });
  }
  return { targetMidi, label: midiToNameOct(targetMidi), matches };
}

export default function FretboardPage() {
  const [halfNeck, setHalfNeck] = useState(() => localStorage.getItem("fbHalfNeck") === "true");
  const maxFret = halfNeck ? 12 : MAX_FRET;

  const [question, setQuestion] = useState<Question>(() => buildQuestion(halfNeck ? 12 : MAX_FRET));
  const [found, setFound] = useState<Set<string>>(() => new Set());
  const [lastWrong, setLastWrong] = useState<Cell | null>(null);
  const [done, setDone] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<SimpleSynth | null>(null);

  function ensureAudio() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      synthRef.current = new SimpleSynth(audioCtxRef.current);
    }
    if (audioCtxRef.current.state === "suspended") {
      void audioCtxRef.current.resume();
    }
  }

  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      synthRef.current = null;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("fbHalfNeck", String(halfNeck));
    setQuestion(buildQuestion(halfNeck ? 12 : MAX_FRET));
    setFound(new Set());
    setLastWrong(null);
    setDone(false);
  }, [halfNeck]);

  function resetForNext() {
    setQuestion(buildQuestion(maxFret));
    setFound(new Set());
    setLastWrong(null);
    setDone(false);
  }

  function handleCellClick({ stringIdx, fret }: Cell) {
    if (done) return;
    const clickedMidi = OPEN_STRING_MIDI[stringIdx] + fret;
    const clicked: Cell = { stringIdx, fret };

    ensureAudio();

    if (clickedMidi === question.targetMidi && fret <= maxFret) {
      void synthRef.current?.playMidi(clickedMidi, { noteMs: 280, releaseMs: 120, volume: 0.18 });
      setFound((prev) => {
        const next = new Set(prev);
        next.add(keyOf(clicked));
        if (question.matches.every((c) => next.has(keyOf(c)))) setDone(true);
        return next;
      });
      setLastWrong(null);
    } else {
      synthRef.current?.playWrong();
      setLastWrong(clicked);
      setTimeout(() => setLastWrong(null), 220);
    }
  }

  const foundCount = question.matches.filter((c) => found.has(keyOf(c))).length;

  const highlights: FretboardHighlight[] = [
    ...question.matches.filter((c) => found.has(keyOf(c))).map((c) => ({ cell: c, kind: "found" as const })),
    ...(lastWrong ? [{ cell: lastWrong, kind: "wrong" as const }] : []),
  ];

  return (
    <div style={{ maxWidth: 1500, margin: "0 auto", padding: "2rem 1rem" }}>
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
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setHalfNeck((h) => !h)}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: 8,
              border: halfNeck ? "2px solid rgba(80,160,255,0.8)" : "1px solid rgba(255,255,255,0.18)",
              background: halfNeck ? "rgba(80,160,255,0.12)" : "rgba(255,255,255,0.05)",
              color: "inherit",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: halfNeck ? 700 : 400,
            }}
          >
            {halfNeck ? "Frets 0–12 ✓" : "Frets 0–12"}
          </button>
          <button type="button" onClick={resetForNext}>New Note</button>
          {done && <button type="button" onClick={resetForNext}>Next</button>}
        </div>
        {done && (
          <div style={{ width: "100%", marginTop: 6, opacity: 0.9 }}>
            ✅ Nice — you found all {question.label} positions{halfNeck ? " in the first 12 frets" : " on the neck"}.
          </div>
        )}
      </div>

      <FretboardDisplay
        highlights={highlights}
        onCellClick={handleCellClick}
        cursor={done ? "default" : "crosshair"}
      />

      <div style={{ marginTop: 12, opacity: 0.75, fontSize: 13 }}>
        Click every position where the note appears{halfNeck ? " (frets 0–12 only)" : ""}. Correct taps play the pitch; wrong taps buzz.
      </div>
    </div>
  );
}
