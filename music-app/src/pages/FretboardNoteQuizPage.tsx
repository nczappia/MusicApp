import { useEffect, useRef, useState } from "react";
import FretboardDisplay from "../components/FretboardDisplay";
import type { FretboardHighlight } from "../components/FretboardDisplay";
import { SimpleSynth } from "../utils/audio";
import {
  OPEN_STRING_MIDI, MAX_FRET, NOTE_ENTRIES, STRING_LABELS,
  midiToNoteName, midiToNameOct,
} from "../utils/fretboard";

type NoteQuestion = {
  stringIdx: number;
  fret: number;
  midi: number;
  noteName: string;
};

type Answer = {
  question: NoteQuestion;
  chosen: string;
  correct: boolean;
};

type Screen = "config" | "quiz" | "results";

const PRESET_COUNTS = [5, 10, 20];

function generateQuestions(n: number, maxFret: number): NoteQuestion[] {
  const used = new Set<string>();
  const out: NoteQuestion[] = [];
  for (let i = 0; i < n; i++) {
    let stringIdx: number, fret: number, key: string;
    let attempts = 0;
    do {
      stringIdx = Math.floor(Math.random() * 6);
      fret = Math.floor(Math.random() * (maxFret + 1));
      key = `${stringIdx}:${fret}`;
      attempts++;
    } while (used.has(key) && attempts < 100);
    used.add(key);
    const midi = OPEN_STRING_MIDI[stringIdx] + fret;
    out.push({ stringIdx, fret, midi, noteName: midiToNoteName(midi) });
  }
  return out;
}

function formatTime(ms: number): string {
  const totalS = Math.floor(ms / 1000);
  const m = Math.floor(totalS / 60);
  const s = totalS % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function FretboardNoteQuizPage() {
  const [screen, setScreen] = useState<Screen>("config");
  const [totalQ, setTotalQ] = useState(10);
  const [customInput, setCustomInput] = useState("");
  const [halfNeck, setHalfNeck] = useState(() => localStorage.getItem("nqHalfNeck") === "true");

  // Quiz state
  const [questions, setQuestions] = useState<NoteQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  // Audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<SimpleSynth | null>(null);

  function ensureAudio() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      synthRef.current = new SimpleSynth(audioCtxRef.current);
    }
    if (audioCtxRef.current.state === "suspended") void audioCtxRef.current.resume();
  }

  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      synthRef.current = null;
    };
  }, []);

  // Timer tick during quiz
  useEffect(() => {
    if (screen !== "quiz") return;
    const id = setInterval(() => setElapsed(Date.now() - startTime), 100);
    return () => clearInterval(id);
  }, [screen, startTime]);

  function startQuiz() {
    localStorage.setItem("nqHalfNeck", String(halfNeck));
    const q = generateQuestions(totalQ, halfNeck ? 12 : MAX_FRET);
    setQuestions(q);
    setQIndex(0);
    setAnswers([]);
    setChosen(null);
    setLocked(false);
    const now = Date.now();
    setStartTime(now);
    setElapsed(0);
    setScreen("quiz");
  }

  function handleAnswer(note: string) {
    if (locked || chosen !== null) return;
    const current = questions[qIndex];
    const chosenSemitone = NOTE_ENTRIES.find((e) => e.display === note)?.semitone;
    const correct = chosenSemitone === current.midi % 12;

    setChosen(note);
    setLocked(true);

    ensureAudio();
    if (correct) {
      void synthRef.current?.playMidi(current.midi, { noteMs: 280, releaseMs: 120, volume: 0.2 });
    } else {
      synthRef.current?.playWrong();
    }

    const newAnswers: Answer[] = [...answers, { question: current, chosen: note, correct }];
    setAnswers(newAnswers);

    setTimeout(() => {
      const next = qIndex + 1;
      if (next >= questions.length) {
        setTotalTime(Date.now() - startTime);
        setScreen("results");
      } else {
        setQIndex(next);
        setChosen(null);
        setLocked(false);
      }
    }, 700);
  }

  // ─── Config screen ────────────────────────────────────────────────────────

  if (screen === "config") {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1rem" }}>
        <h1>Name the Note</h1>
        <p style={{ opacity: 0.85 }}>
          A fret position is highlighted on the neck. Identify the note name as fast as you can.
        </p>

        <div style={{ marginTop: "1.5rem" }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Number of questions</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {PRESET_COUNTS.map((n) => {
              const active = totalQ === n && !customInput;
              return (
                <button
                  key={n}
                  onClick={() => { setTotalQ(n); setCustomInput(""); }}
                  style={{
                    padding: "0.65rem 1.3rem",
                    borderRadius: 10,
                    border: active ? "2px solid rgba(80,160,255,0.8)" : "1px solid rgba(255,255,255,0.18)",
                    background: active ? "rgba(80,160,255,0.12)" : "rgba(255,255,255,0.05)",
                    color: "inherit",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  {n}
                </button>
              );
            })}
            <input
              type="number"
              min={1}
              max={100}
              placeholder="Custom"
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value);
                const n = parseInt(e.target.value, 10);
                if (!isNaN(n) && n >= 1) setTotalQ(Math.min(n, 100));
              }}
              style={{
                width: 90,
                padding: "0.65rem 0.8rem",
                borderRadius: 10,
                border: customInput ? "2px solid rgba(80,160,255,0.8)" : "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.05)",
                color: "inherit",
                fontSize: 15,
              }}
            />
          </div>
          <div style={{ marginTop: 8, opacity: 0.6, fontSize: 13 }}>
            {totalQ} question{totalQ !== 1 ? "s" : ""} · answers auto-advance after 700 ms
          </div>
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Fret range</div>
          <div style={{ display: "flex", gap: 10 }}>
            {([false, true] as const).map((half) => {
              const active = halfNeck === half;
              return (
                <button
                  key={String(half)}
                  onClick={() => setHalfNeck(half)}
                  style={{
                    padding: "0.65rem 1.3rem",
                    borderRadius: 10,
                    border: active ? "2px solid rgba(80,160,255,0.8)" : "1px solid rgba(255,255,255,0.18)",
                    background: active ? "rgba(80,160,255,0.12)" : "rgba(255,255,255,0.05)",
                    color: "inherit",
                    cursor: "pointer",
                    fontWeight: active ? 700 : 400,
                    fontSize: 15,
                  }}
                >
                  {half ? "First 12 frets" : "All frets (0–23)"}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={startQuiz}
          style={{
            marginTop: "2rem",
            padding: "0.85rem 2rem",
            borderRadius: 12,
            background: "rgba(80,160,255,0.18)",
            border: "1px solid rgba(80,160,255,0.5)",
            color: "inherit",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Start →
        </button>
      </div>
    );
  }

  // ─── Results screen ───────────────────────────────────────────────────────

  if (screen === "results") {
    const correctCount = answers.filter((a) => a.correct).length;
    const accuracy = Math.round((correctCount / answers.length) * 100);

    return (
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem" }}>
        <h1>Quiz Complete</h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, margin: "1.5rem 0" }}>
          {[
            { label: "Score",    value: `${correctCount} / ${answers.length}` },
            { label: "Accuracy", value: `${accuracy}%` },
            { label: "Time",     value: formatTime(totalTime) },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{ padding: "1rem", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", textAlign: "center" }}
            >
              <div style={{ opacity: 0.65, fontSize: 13 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: "1.5rem" }}>
          <button
            onClick={startQuiz}
            style={{ padding: "0.7rem 1.5rem", borderRadius: 10, fontWeight: 700, cursor: "pointer", background: "rgba(80,160,255,0.15)", border: "1px solid rgba(80,160,255,0.4)", color: "inherit" }}
          >
            Try Again
          </button>
          <button
            onClick={() => setScreen("config")}
            style={{ padding: "0.7rem 1.5rem", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}
          >
            Change Settings
          </button>
        </div>

        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.07)" }}>
                {["#", "String · Fret", "Correct", "Your Answer", ""].map((h) => (
                  <th key={h} style={{ padding: "0.7rem 1rem", textAlign: "left", fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {answers.map((a, idx) => (
                <tr
                  key={idx}
                  style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: idx % 2 ? "rgba(255,255,255,0.02)" : "transparent" }}
                >
                  <td style={{ padding: "0.6rem 1rem", opacity: 0.5 }}>{idx + 1}</td>
                  <td style={{ padding: "0.6rem 1rem" }}>
                    <span style={{ fontFamily: "monospace" }}>
                      {STRING_LABELS[a.question.stringIdx]} · fret {a.question.fret}
                    </span>
                    <span style={{ opacity: 0.45, fontSize: 12, marginLeft: 6 }}>
                      ({midiToNameOct(a.question.midi)})
                    </span>
                  </td>
                  <td style={{ padding: "0.6rem 1rem", fontWeight: 700 }}>{a.question.noteName}</td>
                  <td
                    style={{
                      padding: "0.6rem 1rem",
                      fontWeight: 700,
                      color: a.correct ? "rgba(0,255,160,0.9)" : "rgba(255,80,80,0.9)",
                    }}
                  >
                    {a.chosen}
                  </td>
                  <td style={{ padding: "0.6rem 1rem" }}>{a.correct ? "✅" : "❌"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── Quiz screen ──────────────────────────────────────────────────────────

  const current = questions[qIndex];
  if (!current) return null;

  const progress = qIndex / questions.length;
  const correctSoFar = answers.filter((a) => a.correct).length;

  const highlight: FretboardHighlight = {
    cell: { stringIdx: current.stringIdx, fret: current.fret },
    kind: "target",
  };

  return (
    <div style={{ maxWidth: 1500, margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>Name the Note</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ opacity: 0.85, fontSize: 14 }}>
            <b>Q:</b> {qIndex + 1} / {questions.length}
          </div>
          <div style={{ opacity: 0.85, fontSize: 14 }}>
            <b>Correct:</b> {correctSoFar}
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, fontVariantNumeric: "tabular-nums" }}>
            ⏱ {(elapsed / 1000).toFixed(1)}s
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.10)", marginBottom: 14, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: "rgba(80,160,255,0.7)", borderRadius: 999, transition: "width 0.3s" }} />
      </div>

      <FretboardDisplay highlights={[highlight]} cursor="default" />

      {/* 12 note buttons — 6 per row */}
      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 10,
          maxWidth: 560,
        }}
      >
        {NOTE_ENTRIES.map(({ display, semitone }) => {
          const isPicked = chosen === display;
          const isAnswer = semitone === current.midi % 12;
          const revealed = chosen !== null;

          let border = "1px solid rgba(255,255,255,0.18)";
          let bg = "rgba(255,255,255,0.05)";

          if (revealed) {
            if (isAnswer) { border = "2px solid rgba(0,255,160,0.8)"; bg = "rgba(0,255,160,0.10)"; }
            else if (isPicked) { border = "2px solid rgba(255,80,80,0.8)"; bg = "rgba(255,80,80,0.10)"; }
          }

          return (
            <button
              key={display}
              onClick={() => handleAnswer(display)}
              disabled={locked}
              style={{
                padding: "0.9rem 0.4rem",
                borderRadius: 10,
                border,
                background: bg,
                color: "inherit",
                fontSize: 14,
                fontWeight: 700,
                cursor: locked ? "not-allowed" : "pointer",
                transition: "border 0.08s, background 0.08s",
              }}
            >
              {display}
            </button>
          );
        })}
      </div>
    </div>
  );
}
