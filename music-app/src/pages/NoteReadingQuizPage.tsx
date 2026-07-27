import { useState, useMemo, useCallback, useEffect } from "react";
import StaffDisplay from "../components/StaffDisplay";
import type { Clef, StaffNote } from "../utils/staffNotes";
import { ALL_STAFF_NOTES, randomNote, NOTE_NAMES } from "../utils/staffNotes";
import { Link } from "react-router-dom";

// ── localStorage keys ────────────────────────────────────────────────────────
const LS_CLEFS = "nr_clefs";
const LS_INCLUDE_LEDGER = "nr_ledger";

function loadClefs(): Set<Clef> {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_CLEFS) ?? "null");
    if (Array.isArray(raw) && raw.length > 0) return new Set(raw as Clef[]);
  } catch {}
  return new Set<Clef>(["treble", "bass"]);
}

function loadLedger(): boolean {
  try {
    const raw = localStorage.getItem(LS_INCLUDE_LEDGER);
    if (raw !== null) return raw === "true";
  } catch {}
  return true;
}

// ── Types ────────────────────────────────────────────────────────────────────
type Screen = "config" | "quiz" | "results";

interface Answer {
  note: StaffNote;
  chosen: string;
  correct: boolean;
}

// ── Quiz generation ──────────────────────────────────────────────────────────
const QUIZ_LEN = 15;

function buildPool(clefs: Set<Clef>, includeLedger: boolean): StaffNote[] {
  return ALL_STAFF_NOTES.filter((n) => {
    if (!clefs.has(n.clef)) return false;
    if (!includeLedger && (n.step < 0 || n.step > 8)) return false;
    return true;
  });
}

function buildQuestions(pool: StaffNote[]): StaffNote[] {
  if (pool.length === 0) return [];
  const qs: StaffNote[] = [];
  for (let i = 0; i < QUIZ_LEN; i++) {
    qs.push(randomNote(pool));
  }
  return qs;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function NoteReadingQuizPage() {
  const [screen, setScreen] = useState<Screen>("config");
  const [clefs, setClefs] = useState<Set<Clef>>(loadClefs);
  const [includeLedger, setIncludeLedger] = useState(loadLedger);

  const [questions, setQuestions] = useState<StaffNote[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  // per-question state
  const [chosen, setChosen] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const pool = useMemo(() => buildPool(clefs, includeLedger), [clefs, includeLedger]);

  // persist settings
  useEffect(() => {
    localStorage.setItem(LS_CLEFS, JSON.stringify([...clefs]));
  }, [clefs]);
  useEffect(() => {
    localStorage.setItem(LS_INCLUDE_LEDGER, String(includeLedger));
  }, [includeLedger]);

  const startQuiz = useCallback(() => {
    const qs = buildQuestions(pool);
    setQuestions(qs);
    setQIndex(0);
    setAnswers([]);
    setChosen(null);
    setRevealed(false);
    setScreen("quiz");
  }, [pool]);

  const handleAnswer = useCallback(
    (name: string) => {
      if (revealed) return;
      const note = questions[qIndex];
      const correct = name === note.name;
      setChosen(name);
      setRevealed(true);

      const ans: Answer = { note, chosen: name, correct };

      setTimeout(() => {
        const next = qIndex + 1;
        if (next >= questions.length) {
          setAnswers((prev) => [...prev, ans]);
          setScreen("results");
        } else {
          setAnswers((prev) => [...prev, ans]);
          setQIndex(next);
          setChosen(null);
          setRevealed(false);
        }
      }, 700);
    },
    [revealed, questions, qIndex]
  );

  if (screen === "config") {
    return <ConfigScreen clefs={clefs} setClefs={setClefs} includeLedger={includeLedger} setIncludeLedger={setIncludeLedger} pool={pool} onStart={startQuiz} />;
  }
  if (screen === "results") {
    return <ResultsScreen answers={answers} onRestart={() => setScreen("config")} />;
  }

  const note = questions[qIndex];
  if (!note) return null;

  return (
    <QuizScreen
      note={note}
      qIndex={qIndex}
      total={questions.length}
      chosen={chosen}
      revealed={revealed}
      onAnswer={handleAnswer}
    />
  );
}

// ── Config Screen ────────────────────────────────────────────────────────────
function ConfigScreen({
  clefs, setClefs, includeLedger, setIncludeLedger, pool, onStart,
}: {
  clefs: Set<Clef>;
  setClefs: (c: Set<Clef>) => void;
  includeLedger: boolean;
  setIncludeLedger: (v: boolean) => void;
  pool: StaffNote[];
  onStart: () => void;
}) {
  function toggleClef(c: Clef) {
    const next = new Set(clefs);
    if (next.has(c) && next.size === 1) return; // keep at least one
    next.has(c) ? next.delete(c) : next.add(c);
    setClefs(next);
  }

  return (
    <div style={{ maxWidth: 540, margin: "0 auto", padding: "2.5rem 1rem" }}>
      <Breadcrumb />
      <h1 style={{ margin: "0.4rem 0 0.25rem" }}>Note Reading</h1>
      <p style={{ opacity: 0.6, marginTop: 4, marginBottom: "2rem", fontSize: 15 }}>
        A note appears on the staff — name it.
      </p>

      <Section label="Clef">
        {(["treble", "bass"] as Clef[]).map((c) => (
          <Chip key={c} active={clefs.has(c)} onClick={() => toggleClef(c)}>
            {c === "treble" ? "Treble" : "Bass"}
          </Chip>
        ))}
      </Section>

      <Section label="Ledger Lines">
        <Chip active={includeLedger} onClick={() => setIncludeLedger(true)}>Include</Chip>
        <Chip active={!includeLedger} onClick={() => setIncludeLedger(false)}>Staff Only</Chip>
      </Section>

      <div style={{ opacity: 0.45, fontSize: 13, marginBottom: "1.5rem" }}>
        {pool.length} notes in pool
      </div>

      <button
        onClick={onStart}
        disabled={pool.length === 0}
        style={{
          padding: "0.7rem 2rem",
          borderRadius: 10,
          border: "none",
          background: pool.length === 0 ? "rgba(255,255,255,0.1)" : "rgba(255,160,60,0.85)",
          color: pool.length === 0 ? "rgba(255,255,255,0.3)" : "#000",
          fontWeight: 700,
          fontSize: 15,
          cursor: pool.length === 0 ? "not-allowed" : "pointer",
        }}
      >
        Start ({QUIZ_LEN} questions)
      </button>
    </div>
  );
}

// ── Quiz Screen ──────────────────────────────────────────────────────────────
function QuizScreen({
  note, qIndex, total, chosen, revealed, onAnswer,
}: {
  note: StaffNote;
  qIndex: number;
  total: number;
  chosen: string | null;
  revealed: boolean;
  onAnswer: (name: string) => void;
}) {
  return (
    <div style={{ maxWidth: 540, margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", opacity: 0.55, fontSize: 13 }}>
        <Breadcrumb />
        <span>{qIndex + 1} / {total}</span>
      </div>

      <div style={{ fontSize: 13, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
        {note.clef} clef
      </div>

      {/* Staff */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        padding: "1.5rem 1rem",
        display: "flex",
        justifyContent: "center",
        marginBottom: "2rem",
      }}>
        <StaffDisplay note={note} revealed={revealed} />
      </div>

      {/* Answer buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {NOTE_NAMES.map((name) => {
          const isCorrect = name === note.name;
          const isChosen = name === chosen;

          let bg = "rgba(255,255,255,0.07)";
          let border = "1px solid rgba(255,255,255,0.12)";
          let color = "inherit";

          if (revealed) {
            if (isCorrect) {
              bg = "rgba(76,175,80,0.30)";
              border = "1px solid rgba(76,175,80,0.7)";
              color = "#81c784";
            } else if (isChosen) {
              bg = "rgba(244,67,54,0.25)";
              border = "1px solid rgba(244,67,54,0.6)";
              color = "#e57373";
            }
          }

          return (
            <button
              key={name}
              onClick={() => onAnswer(name)}
              disabled={revealed}
              style={{
                padding: "0.75rem 0",
                borderRadius: 10,
                border,
                background: bg,
                color,
                fontWeight: 700,
                fontSize: 18,
                cursor: revealed ? "default" : "pointer",
                transition: "background 0.15s, border 0.15s",
              }}
            >
              {name}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div style={{ textAlign: "center", marginTop: "1.25rem", fontSize: 14, opacity: 0.7 }}>
          {chosen === note.name ? "Correct!" : `That's ${note.name}${note.octave}`}
        </div>
      )}
    </div>
  );
}

// ── Results Screen ───────────────────────────────────────────────────────────
function ResultsScreen({ answers, onRestart }: { answers: Answer[]; onRestart: () => void }) {
  const score = answers.filter((a) => a.correct).length;
  const total = answers.length;
  const pct = Math.round((score / total) * 100);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "2rem 1rem" }}>
      <Breadcrumb />
      <h2 style={{ margin: "0.5rem 0 0.25rem" }}>Results</h2>
      <div style={{ fontSize: 32, fontWeight: 800, marginBottom: "0.25rem" }}>
        {score}/{total}
        <span style={{ fontSize: 18, fontWeight: 400, opacity: 0.55, marginLeft: 10 }}>{pct}%</span>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1.5rem", fontSize: 14 }}>
        <thead>
          <tr style={{ opacity: 0.5, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <th style={th}>#</th>
            <th style={th}>Clef</th>
            <th style={th}>Position</th>
            <th style={th}>Your Answer</th>
            <th style={th}>Correct</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {answers.map((a, i) => (
            <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <td style={td}>{i + 1}</td>
              <td style={td}>{a.note.clef}</td>
              <td style={td}>{a.note.label}</td>
              <td style={{ ...td, color: a.correct ? "#81c784" : "#e57373", fontWeight: 700 }}>{a.chosen}</td>
              <td style={{ ...td, color: "#81c784", fontWeight: 700 }}>{a.note.name}</td>
              <td style={td}>{a.correct ? "✅" : "❌"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={onRestart}
        style={{
          marginTop: "2rem",
          padding: "0.7rem 2rem",
          borderRadius: 10,
          border: "none",
          background: "rgba(255,160,60,0.85)",
          color: "#000",
          fontWeight: 700,
          fontSize: 15,
          cursor: "pointer",
        }}
      >
        Try Again
      </button>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "6px 10px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "8px 10px" };

// ── Helpers ──────────────────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ fontSize: 12, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.45rem 1rem",
        borderRadius: 8,
        border: active ? "1px solid rgba(255,160,60,0.7)" : "1px solid rgba(255,255,255,0.15)",
        background: active ? "rgba(255,160,60,0.18)" : "rgba(255,255,255,0.05)",
        color: "inherit",
        fontWeight: active ? 700 : 400,
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Breadcrumb() {
  return (
    <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 6 }}>
      <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>Home</Link>
      <span style={{ margin: "0 6px" }}>›</span>
      <Link to="/sight-reading" style={{ color: "inherit", textDecoration: "none" }}>Sight Reading</Link>
      <span style={{ margin: "0 6px" }}>›</span>
      Note Reading
    </div>
  );
}
