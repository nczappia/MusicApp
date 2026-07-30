import { useEffect, useMemo, useState } from "react";
import { ALL_INTERVALS, pick, randInt } from "../utils/intervals";
import type { Interval } from "../utils/intervals";
import { useSoundfontInstrument } from "../hooks/useSoundfontInstrument";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { useQuizScore } from "../hooks/useQuizScore";
import InstrumentControls from "../components/InstrumentControls";
import { black, white } from "../utils/theme";

type Question = { id: string; rootMidi: number; interval: Interval };

const LS_KEY = "enabledIntervalsSemitones_v1";
const LS_INSTRUMENT = "intervalInstrument";
const LS_VOLUME = "intervalVolume";
const NOTE_MS = 650;
const GAP_MS = 120;

function makeQuestion(enabledIntervals: Interval[]): Question {
  return { id: crypto.randomUUID(), rootMidi: randInt(48, 71), interval: pick(enabledIntervals) };
}

function allSemitones(): Set<number> {
  return new Set(ALL_INTERVALS.map((i) => i.semitones));
}

export default function IntervalQuizPage() {
  const { instrumentId, setInstrumentId, volume, setVolume, instrumentLoading, play, stop } =
    useSoundfontInstrument({ lsInstrumentKey: LS_INSTRUMENT, lsVolumeKey: LS_VOLUME });

  // ---------- Enabled intervals ----------
  const [enabledSet, setEnabledSet] = useLocalStorageState<Set<number>>(LS_KEY, allSemitones(), {
    parse: (raw) => {
      const parsed = JSON.parse(raw) as number[];
      const valid = parsed.filter((n) => ALL_INTERVALS.some((i) => i.semitones === n));
      return new Set(valid.length ? valid : Array.from(allSemitones()));
    },
    serialize: (s) => JSON.stringify(Array.from(s).sort((a, b) => a - b)),
  });

  const enabledIntervals = useMemo(
    () => ALL_INTERVALS.filter((i) => enabledSet.has(i.semitones)),
    [enabledSet]
  );

  // ---------- Quiz state ----------
  const [question, setQuestion] = useState<Question>(() => {
    const init = ALL_INTERVALS.filter((i) => enabledSet.has(i.semitones));
    return makeQuestion(init.length ? init : ALL_INTERVALS);
  });
  const [hasPlayed, setHasPlayed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const { correct, total, streak, accuracy, recordAnswer, resetScore: resetScoreState } = useQuizScore();

  useEffect(() => {
    if (!enabledSet.has(question.interval.semitones)) {
      stop();
      setLocked(false);
      setQuestion(makeQuestion(enabledIntervals.length ? enabledIntervals : ALL_INTERVALS));
      setHasPlayed(false);
      setSelected(null);
      setFeedback("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledSet]);

  useEffect(() => {
    stop();
    setLocked(false);
    setHasPlayed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instrumentId]);

  async function playQuestion() {
    if (enabledIntervals.length === 0) {
      setFeedback("Enable at least one interval in Settings.");
      return;
    }
    setFeedback("");
    setLocked(true);
    const result = await play(
      [question.rootMidi, question.rootMidi + question.interval.semitones],
      { mode: "sequential", noteMs: NOTE_MS, gapMs: GAP_MS }
    );
    if (result.ok) {
      setHasPlayed(true);
      setLocked(false);
    } else if (result.reason === "load-failed") {
      setFeedback("Instrument failed to load — check your connection and try again.");
      setLocked(false);
    }
    // cancelled: a newer play/stop call already owns `locked`
  }

  function submitAnswer(semitones: number) {
    if (!hasPlayed) {
      setFeedback("Hit Play first 👆 (browsers require a user gesture for audio).");
      return;
    }
    if (selected !== null) return;

    setSelected(semitones);
    const isCorrect = semitones === question.interval.semitones;
    recordAnswer(isCorrect);

    if (isCorrect) {
      setFeedback(`✅ Correct — ${question.interval.label} (${question.interval.short})`);
    } else {
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
    stop();
    setLocked(false);
    setQuestion(makeQuestion(enabledIntervals));
    setHasPlayed(false);
    setSelected(null);
    setFeedback("");
  }

  function resetScore() {
    stop();
    setLocked(false);
    resetScoreState();
    setFeedback("");
    setSelected(null);
    setHasPlayed(false);
    setQuestion(makeQuestion(enabledIntervals.length ? enabledIntervals : ALL_INTERVALS));
  }

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

  const playButtonLabel = instrumentLoading
    ? "Loading…"
    : locked
    ? "Playing…"
    : hasPlayed
    ? "Replay"
    : "Play";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Interval Ear Trainer</h1>
      <p style={{ opacity: 0.85 }}>
        Ascending melodic intervals only. Use <b>Settings</b> to choose intervals and instrument.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", margin: "1rem 0" }}>
        <button
          onClick={playQuestion}
          disabled={locked || instrumentLoading || enabledIntervals.length === 0}
          style={{ minHeight: 44, padding: "10px 16px" }}
        >
          {playButtonLabel}
        </button>
        <button
          onClick={nextQuestion}
          disabled={locked || enabledIntervals.length === 0}
          style={{ minHeight: 44, padding: "10px 16px" }}
        >
          Next
        </button>
        <button onClick={resetScore} disabled={locked} style={{ minHeight: 44, padding: "10px 16px" }}>
          Reset
        </button>

        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div><b>Score:</b> {correct}/{total} ({accuracy}%)</div>
          <div><b>Streak:</b> {streak}</div>
          <div style={{ opacity: 0.85 }}><b>Enabled:</b> {enabledIntervals.length}/{ALL_INTERVALS.length}</div>
        </div>
      </div>

      <details style={{ margin: "1rem 0", borderRadius: 12, padding: "0.8rem 1rem", background: white(0.06) }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Settings</summary>

        <InstrumentControls
          instrumentId={instrumentId}
          setInstrumentId={setInstrumentId}
          instrumentLoading={instrumentLoading}
          volume={volume}
          setVolume={setVolume}
        />

        <div style={{ height: 1, background: white(0.10), margin: "14px 0" }} />

        {/* Interval toggles */}
        <div style={{ fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Intervals</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <button onClick={() => setEnabledSet(allSemitones())} disabled={locked} style={{ minHeight: 44, padding: "10px 16px" }}>
            Enable all
          </button>
          <button onClick={() => setEnabledSet(new Set([0, 3, 4, 5, 7, 12]))} disabled={locked} style={{ minHeight: 44, padding: "10px 16px" }}>
            Common set
          </button>
          <div style={{ opacity: 0.75, alignSelf: "center", fontSize: 13 }}>
            (Can't disable the last remaining interval.)
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
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
                  border: `1px solid ${white(0.18)}`,
                  background: enabled ? white(0.08) : black(0.08),
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
        <div style={{ padding: "0.9rem 1rem", borderRadius: 12, background: white(0.06) }}>
          Enable at least one interval in Settings.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 10 }}>
          {enabledIntervals.map((i) => {
            const isPicked = selected === i.semitones;
            const isRight = selected !== null && i.semitones === question.interval.semitones;
            const showRight = selected !== null;

            let border = `1px solid ${white(0.18)}`;
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
                  padding: "0.9rem",
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
        <div
          role="status"
          aria-live="polite"
          style={{ marginTop: 18, padding: "0.9rem 1rem", borderRadius: 12, background: white(0.06) }}
        >
          {feedback}
        </div>
      )}
    </div>
  );
}
