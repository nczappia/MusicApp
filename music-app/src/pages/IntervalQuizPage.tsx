import { useEffect, useMemo, useRef, useState } from "react";
import { instrument as loadSoundfont } from "soundfont-player";
import type { Player } from "soundfont-player";
import "../App.css";
import { ALL_INTERVALS, pick, randInt } from "../utils/intervals";
import type { Interval } from "../utils/intervals";

type Question = { id: string; rootMidi: number; interval: Interval };

const LS_KEY = "enabledIntervalsSemitones_v1";
const LS_INSTRUMENT = "intervalInstrument";
const LS_VOLUME = "intervalVolume";
const NOTE_MS = 650;
const GAP_MS = 120;

const INSTRUMENTS: { id: string; label: string }[] = [
  { id: "acoustic_grand_piano",  label: "Piano" },
  { id: "electric_piano_1",      label: "Electric Piano" },
  { id: "acoustic_guitar_nylon", label: "Nylon Guitar" },
  { id: "acoustic_guitar_steel", label: "Steel Guitar" },
  { id: "electric_guitar_clean", label: "Electric Guitar" },
  { id: "violin",                label: "Violin" },
  { id: "flute",                 label: "Flute" },
  { id: "marimba",               label: "Marimba" },
];

function makeQuestion(enabledIntervals: Interval[]): Question {
  return { id: crypto.randomUUID(), rootMidi: randInt(48, 71), interval: pick(enabledIntervals) };
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export default function IntervalQuizPage() {
  // ---------- Audio ----------
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playerRef = useRef<Player | null>(null);
  const playIdRef = useRef(0);
  const [instrumentLoading, setInstrumentLoading] = useState(false);

  async function ensureAudio(instrumentId: string) {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      setInstrumentLoading(true);
      try {
        playerRef.current = await loadSoundfont(audioCtxRef.current, instrumentId, { soundfont: "MusyngKite" });
      } catch {
        // CDN unavailable — player stays null, caught in playQuestion
      } finally {
        setInstrumentLoading(false);
      }
    }
    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }
  }

  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      playerRef.current = null;
    };
  }, []);

  // ---------- Instrument ----------
  const [instrumentId, setInstrumentId] = useState<string>(
    () => localStorage.getItem(LS_INSTRUMENT) ?? "acoustic_grand_piano"
  );

  // Reload instrument when it changes (only if AudioContext already exists)
  useEffect(() => {
    localStorage.setItem(LS_INSTRUMENT, instrumentId);
    if (!audioCtxRef.current) return;

    let cancelled = false;
    setInstrumentLoading(true);
    playerRef.current = null;

    loadSoundfont(audioCtxRef.current, instrumentId, { soundfont: "MusyngKite" })
      .then((p) => { if (!cancelled) playerRef.current = p; })
      .catch(() => {})
      .finally(() => { if (!cancelled) setInstrumentLoading(false); });

    return () => { cancelled = true; };
  }, [instrumentId]);

  // ---------- Volume ----------
  const [volume, setVolume] = useState<number>(() => {
    const saved = parseFloat(localStorage.getItem(LS_VOLUME) ?? "");
    return isNaN(saved) ? 1.0 : saved;
  });

  useEffect(() => {
    localStorage.setItem(LS_VOLUME, String(volume));
  }, [volume]);

  // ---------- Enabled intervals ----------
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
    localStorage.setItem(LS_KEY, JSON.stringify(Array.from(enabledSet).sort((a, b) => a - b)));
  }, [enabledSet]);

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
      await ensureAudio(instrumentId);

      if (id !== playIdRef.current) return; // cancelled during load

      if (!playerRef.current) {
        setFeedback("Instrument failed to load — check your connection and try again.");
        return;
      }

      playerRef.current.stop();
      const now = audioCtxRef.current!.currentTime;
      playerRef.current.play(question.rootMidi, now, { duration: NOTE_MS / 1000, gain: volume });
      playerRef.current.play(
        question.rootMidi + question.interval.semitones,
        now + (NOTE_MS + GAP_MS) / 1000,
        { duration: NOTE_MS / 1000, gain: volume }
      );

      await sleep(NOTE_MS * 2 + GAP_MS + 100);
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
    playerRef.current?.stop();
    setLocked(false);
    setQuestion(makeQuestion(enabledIntervals));
    setHasPlayed(false);
    setSelected(null);
    setFeedback("");
  }

  function resetScore() {
    playIdRef.current++;
    playerRef.current?.stop();
    setLocked(false);
    setCorrect(0);
    setTotal(0);
    setStreak(0);
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
        <button onClick={playQuestion} disabled={locked || instrumentLoading || enabledIntervals.length === 0}>
          {playButtonLabel}
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
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Settings</summary>

        {/* Instrument selector */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Instrument</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {INSTRUMENTS.map(({ id, label }) => {
              const active = instrumentId === id;
              return (
                <button
                  key={id}
                  onClick={() => setInstrumentId(id)}
                  disabled={instrumentLoading}
                  style={{
                    padding: "0.45rem 0.9rem",
                    borderRadius: 8,
                    border: active ? "2px solid rgba(80,160,255,0.8)" : "1px solid rgba(255,255,255,0.18)",
                    background: active ? "rgba(80,160,255,0.12)" : "rgba(255,255,255,0.05)",
                    color: "inherit",
                    cursor: instrumentLoading ? "not-allowed" : "pointer",
                    fontWeight: active ? 700 : 400,
                    fontSize: 14,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {instrumentLoading && (
            <div style={{ marginTop: 6, opacity: 0.65, fontSize: 13 }}>Loading instrument samples…</div>
          )}
        </div>

        {/* Volume slider */}
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontWeight: 700, opacity: 0.9, whiteSpace: "nowrap" }}>Volume</div>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{ flex: 1, maxWidth: 220, accentColor: "rgba(80,160,255,0.9)" }}
          />
          <div style={{ opacity: 0.75, fontSize: 13, width: 36, textAlign: "right" }}>
            {Math.round(volume * 100)}%
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.10)", margin: "14px 0" }} />

        {/* Interval toggles */}
        <div style={{ fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Intervals</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <button onClick={() => setEnabledSet(new Set(ALL_INTERVALS.map((i) => i.semitones)))} disabled={locked}>
            Enable all
          </button>
          <button onClick={() => setEnabledSet(new Set([0, 3, 4, 5, 7, 12]))} disabled={locked}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 10 }}>
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
        <div style={{ marginTop: 18, padding: "0.9rem 1rem", borderRadius: 12, background: "rgba(255,255,255,0.06)" }}>
          {feedback}
        </div>
      )}
    </div>
  );
}
