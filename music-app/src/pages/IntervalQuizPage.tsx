import { useEffect, useMemo, useRef, useState } from "react";
import "../App.css";
import { SimpleSynth } from "../utils/audio";
import { ALL_INTERVALS, pick, randInt } from "../utils/intervals";
import type { Interval } from "../utils/intervals";

type Question = {
  id: string;
  rootMidi: number;
  interval: Interval;
};

const LS_KEY = "enabledIntervalsSemitones_v1";

function makeQuestion(enabledIntervals: Interval[]): Question {
  return {
    id: crypto.randomUUID(),
    rootMidi: randInt(48, 71),
    interval: pick(enabledIntervals),
  };
}

export default function IntervalQuizPage() {
  // ---------- Audio ----------
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<SimpleSynth | null>(null);
  const playIdRef = useRef(0);

  async function ensureAudio() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      synthRef.current = new SimpleSynth(audioCtxRef.current);
    }
    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }
  }

  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      synthRef.current = null;
    };
  }, []);

  // ---------- Settings: enabled intervals ----------
  const [enabledSet, setEnabledSet] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return new Set(ALL_INTERVALS.map((i) => i.semitones));
      const parsed = JSON.parse(raw) as number[];
      const valid = parsed.filter((n) => ALL_INTERVALS.some((i) => i.semitones === n));
      return new Set(valid.length ? valid : ALL_INTERVALS.map((i) => i.semitones));
    } catch {
      return new Set(ALL_INTERVALS.map((i) => i.semitones));
    }
  });

  useEffect(() => {
    const arr = Array.from(enabledSet.values()).sort((a, b) => a - b);
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
  }, [enabledSet]);

  const enabledIntervals = useMemo(
    () => ALL_INTERVALS.filter((i) => enabledSet.has(i.semitones)),
    [enabledSet]
  );

  // ---------- Quiz state ----------
  // Initialize from the already-loaded enabledSet so the first question is always valid.
  const [question, setQuestion] = useState<Question>(() => {
    const init = ALL_INTERVALS.filter((i) => enabledSet.has(i.semitones));
    return makeQuestion(init.length ? init : ALL_INTERVALS);
  });
  const [hasPlayed, setHasPlayed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!enabledSet.has(question.interval.semitones)) {
      setQuestion(makeQuestion(enabledIntervals.length ? enabledIntervals : ALL_INTERVALS));
      setHasPlayed(false);
      setSelected(null);
      setFeedback("");
    }
  }, [enabledSet]); // eslint-disable-line react-hooks/exhaustive-deps

  const accuracy = useMemo(
    () => (total === 0 ? 0 : Math.round((correct / total) * 100)),
    [correct, total]
  );

  async function playQuestion() {
    if (enabledIntervals.length === 0) {
      setFeedback("Enable at least one interval in Settings.");
      return;
    }
    const id = ++playIdRef.current;
    try {
      setFeedback("");
      setLocked(true);
      await ensureAudio();
      synthRef.current!.stop();
      await synthRef.current!.playTwoNotesAscending(question.rootMidi, question.interval.semitones, {
        waveform: "sine",
        noteMs: 550,
        gapMs: 100,
        attackMs: 10,
        releaseMs: 90,
        volume: 0.25,
      });
      if (id === playIdRef.current) setHasPlayed(true);
    } finally {
      if (id === playIdRef.current) setLocked(false);
    }
  }

  function submitAnswer(semitones: number) {
    if (!hasPlayed) {
      setFeedback("Hit Play first 👆 (browsers require a user gesture for audio).");
      return;
    }
    if (selected !== null) return;

    setSelected(semitones);
    const isCorrect = semitones === question.interval.semitones;
    setTotal((t) => t + 1);

    if (isCorrect) {
      setCorrect((c) => c + 1);
      setStreak((s) => s + 1);
      setFeedback(`✅ Correct — ${question.interval.label} (${question.interval.short})`);
    } else {
      setStreak(0);
      const right = question.interval;
      const chosen = ALL_INTERVALS.find((x) => x.semitones === semitones)!;
      setFeedback(`❌ ${chosen.label} (${chosen.short}) — correct was ${right.label} (${right.short})`);
    }
  }

  function nextQuestion() {
    if (enabledIntervals.length === 0) {
      setFeedback("Enable at least one interval in Settings.");
      return;
    }
    playIdRef.current++;
    synthRef.current?.stop();
    setQuestion(makeQuestion(enabledIntervals));
    setHasPlayed(false);
    setSelected(null);
    setFeedback("");
  }

  function resetScore() {
    playIdRef.current++;
    synthRef.current?.stop();
    setCorrect(0);
    setTotal(0);
    setStreak(0);
    setFeedback("");
    setSelected(null);
    setHasPlayed(false);
    setQuestion(makeQuestion(enabledIntervals.length ? enabledIntervals : ALL_INTERVALS));
  }

  // ---------- Settings UI helpers ----------
  function toggleInterval(semitones: number) {
    setEnabledSet((prev) => {
      const next = new Set(prev);
      if (next.has(semitones)) {
        if (next.size === 1) return next;
        next.delete(semitones);
      } else {
        next.add(semitones);
      }
      return next;
    });
  }

  function enableAll() {
    setEnabledSet(new Set(ALL_INTERVALS.map((i) => i.semitones)));
  }

  function enableOnlyCommon() {
    setEnabledSet(new Set([0, 3, 4, 5, 7, 12]));
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Interval Ear Trainer</h1>
      <p style={{ opacity: 0.85 }}>
        Ascending melodic intervals only. Use <b>Settings</b> to choose which intervals are included.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", margin: "1rem 0" }}>
        <button onClick={playQuestion} disabled={locked || enabledIntervals.length === 0}>
          {locked ? "Playing..." : hasPlayed ? "Replay" : "Play"}
        </button>

        <button onClick={nextQuestion} disabled={locked || enabledIntervals.length === 0}>
          Next
        </button>

        <button onClick={resetScore} disabled={locked}>
          Reset
        </button>

        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div><b>Score:</b> {correct}/{total} ({accuracy}%)</div>
          <div><b>Streak:</b> {streak}</div>
          <div style={{ opacity: 0.85 }}><b>Enabled:</b> {enabledIntervals.length}/{ALL_INTERVALS.length}</div>
        </div>
      </div>

      <details style={{ margin: "1rem 0", borderRadius: 12, padding: "0.8rem 1rem", background: "rgba(255,255,255,0.06)" }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Settings: Choose intervals</summary>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button onClick={enableAll} disabled={locked}>Enable all</button>
          <button onClick={enableOnlyCommon} disabled={locked}>Common set</button>
          <div style={{ opacity: 0.75, alignSelf: "center" }}>
            (You can't disable the last remaining interval.)
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          {ALL_INTERVALS.map((i) => {
            const enabled = enabledSet.has(i.semitones);
            const disabledBecauseLast = enabled && enabledSet.size === 1;
            return (
              <label
                key={i.semitones}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: "0.75rem 0.85rem",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: enabled ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                  opacity: disabledBecauseLast ? 0.8 : 1,
                  cursor: disabledBecauseLast ? "not-allowed" : "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={locked || disabledBecauseLast}
                  onChange={() => toggleInterval(i.semitones)}
                />
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {i.label} <span style={{ opacity: 0.8 }}>({i.short})</span>
                  </div>
                  <div style={{ opacity: 0.75, fontSize: 13 }}>{i.semitones} semitones</div>
                </div>
              </label>
            );
          })}
        </div>
      </details>

      <h2 style={{ marginTop: "1.2rem" }}>Answer</h2>

      {enabledIntervals.length === 0 ? (
        <div style={{ padding: "0.9rem 1rem", borderRadius: 12, background: "rgba(255,255,255,0.06)" }}>
          Enable at least one interval in Settings.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
            marginTop: 10,
          }}
        >
          {enabledIntervals.map((i) => {
            const isPicked = selected === i.semitones;
            const isRight = selected !== null && i.semitones === question.interval.semitones;
            const showRight = selected !== null;

            let border = "1px solid rgba(255,255,255,0.18)";
            let opacity = 1;
            if (showRight) {
              if (isRight) border = "2px solid rgba(0, 255, 160, 0.75)";
              else if (isPicked) border = "2px solid rgba(255, 80, 80, 0.75)";
              else opacity = 0.85;
            }

            return (
              <button
                key={i.semitones}
                onClick={() => submitAnswer(i.semitones)}
                disabled={locked || selected !== null}
                style={{
                  padding: "0.9rem 0.9rem",
                  textAlign: "left",
                  borderRadius: 12,
                  border,
                  opacity,
                  cursor: locked || selected !== null ? "not-allowed" : "pointer",
                }}
              >
                <div style={{ fontWeight: 700 }}>{i.label}</div>
                <div style={{ opacity: 0.8 }}>{i.short}</div>
              </button>
            );
          })}
        </div>
      )}

      {feedback && (
        <div style={{ marginTop: 18, padding: "0.9rem 1rem", borderRadius: 12, background: "rgba(255,255,255,0.06)" }}>
          {feedback}
        </div>
      )}

      <div style={{ marginTop: 18, opacity: 0.75, fontSize: 13 }}>
        Tip: next upgrades are easy now — e.g., "4-choice mode", descending intervals, harmonic intervals,
        or "keep the same root note" to remove pitch distraction.
      </div>
    </div>
  );
}
