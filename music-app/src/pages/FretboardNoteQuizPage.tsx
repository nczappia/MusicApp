import { useEffect, useMemo, useRef, useState } from "react";
import FretboardDisplay from "../components/FretboardDisplay";
import type { FretboardHighlight } from "../components/FretboardDisplay";
import { useSimpleSynth } from "../hooks/useSimpleSynth";
import { useIsMobile } from "../hooks/useIsMobile";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { formatTime } from "../utils/time";
import {
  OPEN_STRING_MIDI, MAX_FRET, NOTE_ENTRIES, STRING_LABELS,
  midiToNoteName, midiToNameOct,
} from "../utils/fretboard";
import { blue, green, red, white } from "../utils/theme";

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
  const clampedN = Math.min(n, 6 * (maxFret + 1));

  const positions: { stringIdx: number; fret: number }[] = [];
  for (let stringIdx = 0; stringIdx < 6; stringIdx++) {
    for (let fret = 0; fret <= maxFret; fret++) {
      positions.push({ stringIdx, fret });
    }
  }

  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  return positions.slice(0, clampedN).map(({ stringIdx, fret }) => {
    const midi = OPEN_STRING_MIDI[stringIdx] + fret;
    return { stringIdx, fret, midi, noteName: midiToNoteName(midi) };
  });
}

export default function FretboardNoteQuizPage() {
  const [screen, setScreen] = useState<Screen>("config");
  const [totalQ, setTotalQ] = useState(10);
  const [customInput, setCustomInput] = useState("");
  const isMobile = useIsMobile();
  const [halfNeck, setHalfNeck] = useLocalStorageState<boolean>("nqHalfNeck", isMobile, {
    parse: (raw) => raw === "true",
    serialize: (v) => String(v),
  });
  const maxQuestions = 6 * ((halfNeck ? 12 : MAX_FRET) + 1);

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
  const { ensureAudio } = useSimpleSynth();

  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current); }, []);

  // Re-clamp the question count if switching fret range shrinks the pool below it.
  useEffect(() => {
    setTotalQ((prev) => Math.min(prev, maxQuestions));
    setCustomInput((prev) => {
      if (!prev) return prev;
      const n = parseInt(prev, 10);
      return String(Number.isNaN(n) ? maxQuestions : Math.min(Math.max(n, 1), maxQuestions));
    });
  }, [maxQuestions]);

  // Timer tick during quiz
  useEffect(() => {
    if (screen !== "quiz") return;
    const id = setInterval(() => setElapsed(Date.now() - startTime), 100);
    return () => clearInterval(id);
  }, [screen, startTime]);

  const quizHeadingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (screen === "quiz") quizHeadingRef.current?.focus();
    if (screen === "results") quizHeadingRef.current?.focus();
  }, [screen]);

  // Current-question highlight — hoisted above the screen-branch early returns
  // (below) so these hooks run unconditionally, and stay stable references
  // across the 10Hz elapsed-time timer ticks.
  const current = questions[qIndex];
  const highlight: FretboardHighlight | null = useMemo(() => {
    if (!current) return null;
    return { cell: { stringIdx: current.stringIdx, fret: current.fret }, kind: "target" };
  }, [current?.stringIdx, current?.fret]);
  const highlights = useMemo(() => (highlight ? [highlight] : []), [highlight]);

  function startQuiz() {
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

  async function handleAnswer(note: string) {
    if (locked || chosen !== null) return;
    setChosen(note);
    setLocked(true);

    const current = questions[qIndex];
    const chosenSemitone = NOTE_ENTRIES.find((e) => e.display === note)?.semitone;
    const correct = chosenSemitone === current.midi % 12;

    const synth = await ensureAudio();
    if (!synth) {
      setLocked(false);
      setChosen(null);
      return;
    }

    if (correct) {
      void synth.playMidi(current.midi, { noteMs: 280, releaseMs: 120, volume: 0.2 });
    } else {
      synth.playWrong();
    }

    const newAnswers: Answer[] = [...answers, { question: current, chosen: note, correct }];
    setAnswers(newAnswers);

    autoAdvanceRef.current = setTimeout(() => {
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
                    border: active ? `2px solid ${blue(0.8)}` : `1px solid ${white(0.18)}`,
                    background: active ? blue(0.12) : white(0.05),
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
              inputMode="numeric"
              pattern="[0-9]*"
              min={1}
              max={maxQuestions}
              placeholder="Custom"
              aria-label="Number of questions"
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value);
                const n = parseInt(e.target.value, 10);
                if (!isNaN(n) && n >= 1) setTotalQ(Math.min(n, maxQuestions));
              }}
              onBlur={() => {
                if (!customInput) return;
                setCustomInput(String(totalQ));
              }}
              style={{
                width: 90,
                padding: "0.65rem 0.8rem",
                borderRadius: 10,
                border: customInput ? `2px solid ${blue(0.8)}` : `1px solid ${white(0.18)}`,
                background: white(0.05),
                color: "inherit",
                fontSize: 16,
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
                    border: active ? `2px solid ${blue(0.8)}` : `1px solid ${white(0.18)}`,
                    background: active ? blue(0.12) : white(0.05),
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
            background: blue(0.18),
            border: `1px solid ${blue(0.5)}`,
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
        <h1 ref={quizHeadingRef} tabIndex={-1}>Quiz Complete</h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, margin: "1.5rem 0" }}>
          {[
            { label: "Score",    value: `${correctCount} / ${answers.length}` },
            { label: "Accuracy", value: `${accuracy}%` },
            { label: "Time",     value: formatTime(totalTime) },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{ padding: "1rem", borderRadius: 12, background: white(0.06), border: `1px solid ${white(0.12)}`, textAlign: "center" }}
            >
              <div style={{ opacity: 0.65, fontSize: 13 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: "1.5rem" }}>
          <button
            onClick={startQuiz}
            style={{ padding: "0.7rem 1.5rem", borderRadius: 10, fontWeight: 700, cursor: "pointer", background: blue(0.15), border: `1px solid ${blue(0.4)}`, color: "inherit" }}
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

        <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${white(0.12)}` }}>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: white(0.07) }}>
                  {["#", "String · Fret", "Correct", "Your Answer", ""].map((h) => (
                    <th key={h} scope="col" style={{ padding: "0.7rem 1rem", textAlign: "left", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {answers.map((a, idx) => (
                  <tr
                    key={idx}
                    style={{ borderTop: `1px solid ${white(0.07)}`, background: idx % 2 ? white(0.02) : "transparent" }}
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
                        color: a.correct ? green(0.9) : red(0.9),
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
      </div>
    );
  }

  // ─── Quiz screen ──────────────────────────────────────────────────────────

  if (!current) return null;

  const progress = qIndex / questions.length;
  const correctSoFar = answers.filter((a) => a.correct).length;

  return (
    <div style={{ maxWidth: 1500, margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
        <h1 ref={quizHeadingRef} tabIndex={-1} style={{ margin: 0, fontSize: "clamp(1.3rem, 5vw, 2rem)" }}>Name the Note</h1>
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
      <div
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Quiz progress"
        style={{ height: 4, borderRadius: 999, background: white(0.10), marginBottom: 14, overflow: "hidden" }}
      >
        <div style={{ height: "100%", width: `${progress * 100}%`, background: blue(0.7), borderRadius: 999, transition: "width 0.3s" }} />
      </div>

      <FretboardDisplay
        highlights={highlights}
        cursor="default"
        visibleFrets={halfNeck ? 12 : undefined}
        resetKey={current?.midi ?? 0}
      />

      {/* 12 note buttons — 6 per row */}
      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))",
          gap: 10,
          maxWidth: 560,
        }}
      >
        {NOTE_ENTRIES.map(({ display, semitone }) => {
          const isPicked = chosen === display;
          const isAnswer = semitone === current.midi % 12;
          const revealed = chosen !== null;

          let border = `1px solid ${white(0.18)}`;
          let bg = white(0.05);

          if (revealed) {
            if (isAnswer) { border = `2px solid ${green(0.8)}`; bg = green(0.10); }
            else if (isPicked) { border = `2px solid ${red(0.8)}`; bg = red(0.10); }
          }

          const ariaLabel = revealed
            ? isAnswer
              ? `${display} — correct`
              : isPicked
                ? `${display} — incorrect`
                : display
            : display;

          return (
            <button
              key={display}
              onClick={() => handleAnswer(display)}
              disabled={locked}
              aria-label={ariaLabel}
              style={{
                padding: "0.9rem 0.4rem",
                minHeight: 44,
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

      {chosen !== null && (() => {
        const chosenSemitone = NOTE_ENTRIES.find((e) => e.display === chosen)?.semitone;
        const correct = chosenSemitone === current.midi % 12;
        return (
          <div
            role="status"
            aria-live="polite"
            style={{ marginTop: 18, padding: "0.9rem 1rem", borderRadius: 12, background: white(0.06) }}
          >
            {correct ? `${chosen} — correct` : `Incorrect — that was ${current.noteName}`}
          </div>
        );
      })()}
    </div>
  );
}
