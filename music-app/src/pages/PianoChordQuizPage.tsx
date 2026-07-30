import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import PianoDisplay from "../components/PianoDisplay";
import type { PianoHighlight } from "../components/PianoDisplay";
import {
  PIANO_CHORDS, PIANO_CHORD_GROUPS, PIANO_PRESETS, ROOT_NAMES, CHORD_EXTENSIONS,
  makePianoQuestion,
} from "../utils/pianoChords";
import type { PianoChordDef, PianoQuestion } from "../utils/pianoChords";
import { formatTime } from "../utils/time";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { useEnabledChords } from "../hooks/useEnabledChords";
import { amber, black, blue, green, red, white } from "../utils/theme";

type Screen = "config" | "quiz" | "results";

type ValidAnswer = { rootSemitone: number; chordId: string };

type Answer = {
  question: PianoQuestion;
  validAnswers: ValidAnswer[];
  chosenRoot: string;
  chosenChordId: string;
  correct: boolean;
};

const LS_IDS = "pq_chordIds";
const LS_NAT  = "pq_naturalRoots";
const LS_EXT  = "pq_extensions";

const PRESET_COUNTS = [5, 10, 20];

// Returns every (root, chord) pair from enabledChords that covers the exact
// same set of pitch classes as the generated chord's base notes.
function computeValidAnswers(
  rootMidi: number,
  chord: PianoChordDef,
  enabledChords: PianoChordDef[],
): ValidAnswer[] {
  const semitones = [...new Set(chord.intervals.map((i) => (rootMidi + i) % 12))];
  const n = semitones.length;
  const results: ValidAnswer[] = [];

  for (const rootSem of semitones) {
    const intervals = semitones
      .map((s) => ((s - rootSem + 12) % 12))
      .sort((a, b) => a - b);

    for (const c of enabledChords) {
      if (c.intervals.length !== n) continue;
      const ci = c.intervals.map((i) => i % 12).sort((a, b) => a - b);
      if (intervals.every((v, i) => v === ci[i])) {
        results.push({ rootSemitone: rootSem, chordId: c.id });
      }
    }
  }
  return results;
}

function validAnswerLabel(va: ValidAnswer): string {
  const root = ROOT_NAMES.find((r) => r.semitone === va.rootSemitone)?.display ?? "?";
  const chord = PIANO_CHORDS.find((c) => c.id === va.chordId)?.label ?? "?";
  return `${root} ${chord}`;
}

export default function PianoChordQuizPage() {
  const [screen, setScreen] = useState<Screen>("config");
  const [totalQ, setTotalQ] = useState(10);
  const [customInput, setCustomInput] = useState("");
  const { enabledSet, enabledChords, toggleChord, toggleGroup, applyPreset } =
    useEnabledChords(LS_IDS, PIANO_CHORDS, PIANO_PRESETS);
  const [naturalRoots, setNaturalRoots] = useLocalStorageState<boolean>(
    LS_NAT, false, { parse: (raw) => raw === "true", serialize: (v) => String(v) }
  );
  const [allowExt, setAllowExt] = useLocalStorageState<boolean>(
    LS_EXT, false, { parse: (raw) => raw === "true", serialize: (v) => String(v) }
  );

  const [questions, setQuestions] = useState<PianoQuestion[]>([]);
  const [qIndex, setQIndex]       = useState(0);
  const [answers, setAnswers]     = useState<Answer[]>([]);
  const [rootChoice, setRootChoice]   = useState<string | null>(null);
  const [chordChoice, setChordChoice] = useState<string | null>(null);
  const [locked, setLocked]     = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed]     = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    if (screen !== "quiz") return;
    const id = setInterval(() => setElapsed(Date.now() - startTime), 100);
    return () => clearInterval(id);
  }, [screen, startTime]);

  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current); }, []);

  const quizHeadingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (screen === "quiz") quizHeadingRef.current?.focus();
    if (screen === "results") quizHeadingRef.current?.focus();
  }, [screen]);

  // Valid answers for current question — recomputed only when question or enabled chords change
  const currentValidAnswers = useMemo<ValidAnswer[]>(() => {
    if (screen !== "quiz" || !questions[qIndex]) return [];
    const q = questions[qIndex];
    return computeValidAnswers(q.rootMidi, q.chord, enabledChords);
  }, [screen, qIndex, questions, enabledChords]);

  // Piano highlights for current question — hoisted above the screen-branch early
  // returns (below) so this hook runs unconditionally on every render, and stays a
  // stable reference across the 10Hz elapsed-time timer ticks.
  const current = questions[qIndex];
  const pianoHighlights: PianoHighlight[] = useMemo(() => {
    if (!current) return [];
    return current.noteMidis.map((m) => {
      if (current.extension && m === current.rootMidi + current.extension.semitone)
        return { midi: m, kind: "extension" };
      return { midi: m, kind: "note" };
    });
  }, [current?.noteMidis, current?.extension, current?.rootMidi]);

  // Style helpers for the root/chord answer buttons — hoisted above the screen-branch
  // early returns (below) so these hooks run unconditionally on every render.
  const revealed    = locked;
  const lastAnswer  = revealed ? answers[answers.length - 1] : null;
  const lastCorrect = lastAnswer?.correct ?? false;
  const validRootSems = useMemo(
    () => new Set(currentValidAnswers.map((va) => va.rootSemitone)),
    [currentValidAnswers]
  );
  const validChordIds = useMemo(
    () => new Set(currentValidAnswers.map((va) => va.chordId)),
    [currentValidAnswers]
  );

  const rootBorder = useCallback((display: string): string => {
    const sem        = ROOT_NAMES.find((r) => r.display === display)?.semitone ?? -1;
    const isSelected = rootChoice === display;
    if (revealed) {
      if (isSelected) return lastCorrect ? `2px solid ${green(0.8)}` : `2px solid ${red(0.8)}`;
      if (validRootSems.has(sem)) return `2px solid ${green(0.35)}`;
      return `1px solid ${white(0.08)}`;
    }
    if (isSelected) return `2px solid ${amber(0.8)}`;
    return `1px solid ${white(0.18)}`;
  }, [rootChoice, revealed, lastCorrect, validRootSems]);

  const rootBg = useCallback((display: string): string => {
    const sem        = ROOT_NAMES.find((r) => r.display === display)?.semitone ?? -1;
    const isSelected = rootChoice === display;
    if (revealed) {
      if (isSelected) return lastCorrect ? green(0.12) : red(0.12);
      if (validRootSems.has(sem)) return green(0.05);
      return white(0.03);
    }
    if (isSelected) return amber(0.12);
    return white(0.05);
  }, [rootChoice, revealed, lastCorrect, validRootSems]);

  const chordBorder = useCallback((id: string): string => {
    const isSelected = chordChoice === id;
    if (revealed) {
      if (isSelected) return lastCorrect ? `2px solid ${green(0.8)}` : `2px solid ${red(0.8)}`;
      if (validChordIds.has(id)) return `2px solid ${green(0.35)}`;
      return `1px solid ${white(0.08)}`;
    }
    if (isSelected) return `2px solid ${amber(0.8)}`;
    return `1px solid ${white(0.18)}`;
  }, [chordChoice, revealed, lastCorrect, validChordIds]);

  const chordBg = useCallback((id: string): string => {
    const isSelected = chordChoice === id;
    if (revealed) {
      if (isSelected) return lastCorrect ? green(0.12) : red(0.12);
      if (validChordIds.has(id)) return green(0.05);
      return white(0.03);
    }
    if (isSelected) return amber(0.12);
    return white(0.05);
  }, [chordChoice, revealed, lastCorrect, validChordIds]);

  function startQuiz() {
    const pool = enabledChords.length ? enabledChords : PIANO_CHORDS;
    const qs   = Array.from({ length: totalQ }, () =>
      makePianoQuestion(pool, CHORD_EXTENSIONS, allowExt, naturalRoots)
    );
    setQuestions(qs);
    setQIndex(0);
    setAnswers([]);
    setRootChoice(null);
    setChordChoice(null);
    setLocked(false);
    const now = Date.now();
    setStartTime(now);
    setElapsed(0);
    setScreen("quiz");
  }

  function evaluate(root: string, chordId: string) {
    const q = questions[qIndex];
    const rootSem  = ROOT_NAMES.find((r) => r.display === root)?.semitone ?? -1;
    const correct  = currentValidAnswers.some(
      (va) => va.rootSemitone === rootSem && va.chordId === chordId
    );

    setLocked(true);
    const newAnswers: Answer[] = [
      ...answers,
      { question: q, validAnswers: currentValidAnswers, chosenRoot: root, chosenChordId: chordId, correct },
    ];
    setAnswers(newAnswers);

    autoAdvanceRef.current = setTimeout(() => {
      const next = qIndex + 1;
      if (next >= questions.length) {
        setTotalTime(Date.now() - startTime);
        setScreen("results");
        setLocked(false);
      } else {
        setQIndex(next);
        setRootChoice(null);
        setChordChoice(null);
        setLocked(false);
      }
    }, 900);
  }

  function handleRootChoice(display: string) {
    if (locked) return;
    setRootChoice(display);
    if (chordChoice !== null) evaluate(display, chordChoice);
  }

  function handleChordChoice(id: string) {
    if (locked) return;
    setChordChoice(id);
    if (rootChoice !== null) evaluate(rootChoice, id);
  }

  // ─── Config ───────────────────────────────────────────────────────────────

  if (screen === "config") {
    const btnBase: React.CSSProperties = { borderRadius: 10, color: "inherit", cursor: "pointer" };
    const activeStyle = (on: boolean): React.CSSProperties => ({
      border: on ? `2px solid ${blue(0.8)}` : `1px solid ${white(0.18)}`,
      background: on ? blue(0.12) : white(0.05),
      fontWeight: on ? 700 : 400,
    });

    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
        <h1>Piano Chord Quiz</h1>
        <p style={{ opacity: 0.8 }}>
          Chord notes are highlighted on a keyboard. Identify the root and chord type as fast as you can.
          Equivalent chord names (e.g. C Major 6 = A Minor 7) are both accepted.
        </p>

        {/* Question count */}
        <div style={{ marginTop: "1.5rem" }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Number of questions</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {PRESET_COUNTS.map((n) => {
              const on = totalQ === n && !customInput;
              return (
                <button key={n} onClick={() => { setTotalQ(n); setCustomInput(""); }}
                  style={{ ...btnBase, ...activeStyle(on), padding: "0.65rem 1.3rem", fontSize: 16, fontWeight: 700 }}>
                  {n}
                </button>
              );
            })}
            <input
              type="number" inputMode="numeric" pattern="[0-9]*" min={1} max={100} placeholder="Custom" aria-label="Number of questions" value={customInput}
              onChange={(e) => { setCustomInput(e.target.value); const n = parseInt(e.target.value, 10); if (!isNaN(n) && n >= 1) setTotalQ(Math.min(n, 100)); }}
              onBlur={() => { if (!customInput) return; setCustomInput(String(totalQ)); }}
              style={{ width: 90, padding: "0.65rem 0.8rem", borderRadius: 10, border: customInput ? `2px solid ${blue(0.8)}` : `1px solid ${white(0.18)}`, background: white(0.05), color: "inherit", fontSize: 16 }}
            />
          </div>
          <div style={{ marginTop: 8, opacity: 0.6, fontSize: 13 }}>
            {totalQ} question{totalQ !== 1 ? "s" : ""} · answers auto-advance after 900 ms
          </div>
        </div>

        {/* Presets */}
        <div style={{ marginTop: "1.5rem" }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Chord preset</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PIANO_PRESETS.map((preset) => {
              const on = preset.ids.length === enabledChords.length && preset.ids.every((id) => enabledSet.has(id));
              return (
                <button key={preset.label} onClick={() => applyPreset(preset.ids)}
                  aria-pressed={on}
                  style={{ ...btnBase, ...activeStyle(on), padding: "0.5rem 1rem", minHeight: 44, fontSize: 14 }}>
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Individual toggles */}
        <details style={{ marginTop: "1rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, padding: "0.5rem 0" }}>
            Chord selection ({enabledChords.length} / {PIANO_CHORDS.length} enabled)
          </summary>
          <div style={{ marginTop: 12 }}>
            {PIANO_CHORD_GROUPS.map((group) => {
              const gc   = PIANO_CHORDS.filter((c) => c.group === group.id);
              const allOn = gc.every((c) => enabledSet.has(c.id));
              return (
                <div key={group.id} style={{ marginBottom: 14 }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", marginBottom: 8, fontWeight: 700 }}>
                    <input type="checkbox" checked={allOn} onChange={() => toggleGroup(group.id)} />
                    {group.label}
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginLeft: 24 }}>
                    {gc.map((chord) => {
                      const on = enabledSet.has(chord.id);
                      const isLast = on && enabledSet.size === 1;
                      return (
                        <label key={chord.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "0.5rem 0.8rem", borderRadius: 8, border: `1px solid ${white(0.15)}`, background: on ? white(0.08) : black(0.1), cursor: isLast ? "not-allowed" : "pointer", opacity: isLast ? 0.7 : 1 }}>
                          <input type="checkbox" checked={on} disabled={isLast} onChange={() => toggleChord(chord.id)} />
                          <span style={{ fontWeight: 600 }}>{chord.label}</span>
                          <span style={{ opacity: 0.55, fontSize: 12 }}>({chord.short})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </details>

        {/* Options */}
        <div style={{ marginTop: "1.5rem" }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Options</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => setNaturalRoots((v) => !v)}
              style={{ ...btnBase, ...activeStyle(naturalRoots), padding: "0.6rem 1.1rem", minHeight: 44, fontSize: 14 }}>
              {naturalRoots ? "✓ " : ""}Natural roots only (C D E F G A B)
            </button>
            <button onClick={() => setAllowExt((v) => !v)}
              style={{ ...btnBase, ...activeStyle(allowExt), padding: "0.6rem 1.1rem", minHeight: 44, fontSize: 14 }}>
              {allowExt ? "✓ " : ""}Allow extensions (add9, add11…)
            </button>
          </div>
        </div>

        <button
          onClick={startQuiz}
          disabled={enabledChords.length === 0}
          style={{ marginTop: "2rem", padding: "0.85rem 2rem", borderRadius: 12, background: blue(0.18), border: `1px solid ${blue(0.5)}`, color: "inherit", fontSize: 16, fontWeight: 700, cursor: enabledChords.length === 0 ? "not-allowed" : "pointer" }}
        >
          Start →
        </button>
      </div>
    );
  }

  // ─── Results ──────────────────────────────────────────────────────────────

  if (screen === "results") {
    const correct  = answers.filter((a) => a.correct).length;
    const accuracy = Math.round((correct / answers.length) * 100);

    return (
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem" }}>
        <h1 ref={quizHeadingRef} tabIndex={-1}>Quiz Complete</h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, margin: "1.5rem 0" }}>
          {[
            { label: "Score",    value: `${correct} / ${answers.length}` },
            { label: "Accuracy", value: `${accuracy}%` },
            { label: "Time",     value: formatTime(totalTime) },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: "1rem", borderRadius: 12, background: white(0.06), border: `1px solid ${white(0.12)}`, textAlign: "center" }}>
              <div style={{ opacity: 0.65, fontSize: 13 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: "1.5rem" }}>
          <button onClick={startQuiz} style={{ padding: "0.7rem 1.5rem", borderRadius: 10, fontWeight: 700, cursor: "pointer", background: blue(0.15), border: `1px solid ${blue(0.4)}`, color: "inherit" }}>
            Try Again
          </button>
          <button onClick={() => setScreen("config")} style={{ padding: "0.7rem 1.5rem", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
            Change Settings
          </button>
        </div>

        <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${white(0.12)}` }}>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: white(0.07) }}>
                  {["#", "Your Answer", "Valid Answers", ""].map((h) => (
                    <th key={h} scope="col" style={{ padding: "0.7rem 1rem", textAlign: "left", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {answers.map((a, idx) => {
                  const yourChord = PIANO_CHORDS.find((c) => c.id === a.chosenChordId)?.label ?? "?";
                  const validLabels = a.validAnswers.map(validAnswerLabel);
                  return (
                    <tr key={idx} style={{ borderTop: `1px solid ${white(0.07)}`, background: idx % 2 ? white(0.02) : "transparent" }}>
                      <td style={{ padding: "0.6rem 1rem", opacity: 0.5 }}>{idx + 1}</td>
                      <td style={{ padding: "0.6rem 1rem", fontWeight: 700, color: a.correct ? green(0.9) : red(0.9) }}>
                        {a.chosenRoot} {yourChord}
                      </td>
                      <td style={{ padding: "0.6rem 1rem", opacity: 0.8 }}>
                        {validLabels.join(" · ")}
                      </td>
                      <td style={{ padding: "0.6rem 1rem" }}>{a.correct ? "✅" : "❌"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── Quiz ─────────────────────────────────────────────────────────────────

  if (!current) return null;

  const progress     = qIndex / questions.length;
  const correctSoFar = answers.filter((a) => a.correct).length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
        <h1 ref={quizHeadingRef} tabIndex={-1} style={{ margin: 0, fontSize: "clamp(1.3rem, 5vw, 2rem)" }}>Piano Chord Quiz</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ opacity: 0.85, fontSize: 14 }}><b>Q:</b> {qIndex + 1} / {questions.length}</div>
          <div style={{ opacity: 0.85, fontSize: 14 }}><b>Correct:</b> {correctSoFar}</div>
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
        style={{ height: 4, borderRadius: 999, background: white(0.10), marginBottom: 18, overflow: "hidden" }}
      >
        <div style={{ height: "100%", width: `${progress * 100}%`, background: blue(0.7), borderRadius: 999, transition: "width 0.3s" }} />
      </div>

      {/* Piano */}
      <PianoDisplay highlights={pianoHighlights} />

      {revealed && (
        <div
          role="status"
          aria-live="polite"
          style={{ marginTop: 10, padding: "0.6rem 1rem", borderRadius: 12, background: white(0.06) }}
        >
          {lastCorrect
            ? `✅ Correct — ${lastAnswer!.chosenRoot} ${PIANO_CHORDS.find((c) => c.id === lastAnswer!.chosenChordId)?.label ?? "?"}`
            : `❌ ${lastAnswer!.chosenRoot} ${PIANO_CHORDS.find((c) => c.id === lastAnswer!.chosenChordId)?.label ?? "?"} — correct was ${validAnswerLabel(lastAnswer!.validAnswers[0])}`}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, margin: "8px 0 22px", fontSize: 12, opacity: 0.65 }}>
        <span>
          <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: "rgba(100,180,255,0.9)", marginRight: 5, verticalAlign: "middle" }} />
          Chord tone
        </span>
        {current.extension !== null && (
          <span>
            <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: "rgba(190,100,255,0.85)", marginRight: 5, verticalAlign: "middle" }} />
            Extension
          </span>
        )}
      </div>

      {/* Root buttons */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 12, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.07em" }}>Root</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))", gap: 8, maxWidth: 560 }}>
          {ROOT_NAMES.map(({ display }) => (
            <button
              key={display}
              onClick={() => handleRootChoice(display)}
              disabled={locked}
              aria-pressed={rootChoice === display}
              style={{
                padding: "0.75rem 0.3rem",
                minHeight: 44,
                borderRadius: 10,
                border: rootBorder(display),
                background: rootBg(display),
                color: "inherit",
                fontSize: 13,
                fontWeight: 700,
                cursor: locked ? "not-allowed" : "pointer",
                transition: "border 0.08s, background 0.08s",
              }}
            >
              {display}
            </button>
          ))}
        </div>
      </div>

      {/* Chord type buttons */}
      <div>
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 12, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.07em" }}>Chord Type</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {enabledChords.map((chord) => (
            <button
              key={chord.id}
              onClick={() => handleChordChoice(chord.id)}
              disabled={locked}
              aria-pressed={chordChoice === chord.id}
              style={{
                padding: "0.75rem 1.1rem",
                minHeight: 44,
                borderRadius: 10,
                border: chordBorder(chord.id),
                background: chordBg(chord.id),
                color: "inherit",
                fontSize: 14,
                fontWeight: 700,
                cursor: locked ? "not-allowed" : "pointer",
                transition: "border 0.08s, background 0.08s",
              }}
            >
              {chord.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
