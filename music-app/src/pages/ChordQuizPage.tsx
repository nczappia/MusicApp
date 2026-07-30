import { useEffect, useState } from "react";
import { ALL_CHORDS, CHORD_GROUPS, CHORD_PRESETS, pickChord } from "../utils/chords";
import type { ChordType } from "../utils/chords";
import { useSoundfontInstrument } from "../hooks/useSoundfontInstrument";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { useEnabledChords } from "../hooks/useEnabledChords";
import { useQuizScore } from "../hooks/useQuizScore";
import InstrumentControls from "../components/InstrumentControls";
import { black, blue, white } from "../utils/theme";

type Question = { id: string; rootMidi: number; chord: ChordType };

const LS_KEY = "enabledChordIds_v1";
const LS_INSTRUMENT = "chordInstrument";
const LS_VOLUME = "chordVolume";
const LS_PLAY_MODE = "chordPlayMode";
const CHORD_MS = 1800;
const ARPEG_GAP_MS = 120;

function makeQuestion(chords: ChordType[]): Question {
  return {
    id: crypto.randomUUID(),
    rootMidi: 48 + Math.floor(Math.random() * 12),
    chord: pickChord(chords),
  };
}

export default function ChordQuizPage() {
  const { instrumentId, setInstrumentId, volume, setVolume, instrumentLoading, play, stop } =
    useSoundfontInstrument({ lsInstrumentKey: LS_INSTRUMENT, lsVolumeKey: LS_VOLUME });

  // ---------- Play mode ----------
  const [playMode, setPlayMode] = useLocalStorageState<"harmonic" | "arpeggiated">(
    LS_PLAY_MODE,
    "harmonic",
    { parse: (raw) => (raw === "arpeggiated" ? "arpeggiated" : "harmonic"), serialize: (v) => v }
  );

  // ---------- Enabled chords ----------
  const { enabledSet, enabledChords, toggleChord, toggleGroup, applyPreset } =
    useEnabledChords(LS_KEY, ALL_CHORDS, CHORD_PRESETS);

  // ---------- Quiz state ----------
  const [question, setQuestion] = useState<Question>(() => {
    const init = ALL_CHORDS.filter((c) => enabledSet.has(c.id));
    return makeQuestion(init.length ? init : ALL_CHORDS);
  });
  const [hasPlayed, setHasPlayed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const { correct, total, streak, accuracy, recordAnswer, resetScore: resetScoreState } = useQuizScore();

  useEffect(() => {
    if (!enabledSet.has(question.chord.id)) {
      stop();
      setLocked(false);
      setQuestion(makeQuestion(enabledChords.length ? enabledChords : ALL_CHORDS));
      setHasPlayed(false);
      setSelected(null);
      setFeedback("");
    }
  }, [enabledSet]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    stop();
    setLocked(false);
    setHasPlayed(false);
  }, [instrumentId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function playQuestion() {
    if (enabledChords.length === 0) {
      setFeedback("Enable at least one chord in Settings.");
      return;
    }
    setFeedback("");
    setLocked(true);
    const midiNotes = question.chord.intervals.map((semitones) => question.rootMidi + semitones);
    const result = await play(midiNotes, {
      mode: playMode === "harmonic" ? "simultaneous" : "arpeggiated",
      noteMs: CHORD_MS,
      gapMs: ARPEG_GAP_MS,
    });
    if (result.ok) {
      setHasPlayed(true);
      setLocked(false);
    } else if (result.reason === "load-failed") {
      setFeedback("Instrument failed to load — check your connection and try again.");
      setLocked(false);
    }
    // cancelled: a newer play/stop call already owns `locked`
  }

  function submitAnswer(chordId: string) {
    if (!hasPlayed) {
      setFeedback("Hit Play first 👆 (browsers require a user gesture for audio).");
      return;
    }
    if (selected !== null) return;

    setSelected(chordId);
    const isCorrect = chordId === question.chord.id;
    recordAnswer(isCorrect);

    if (isCorrect) {
      setFeedback(`✅ Correct — ${question.chord.label} (${question.chord.short})`);
    } else {
      const chosen = ALL_CHORDS.find((c) => c.id === chordId)!;
      setFeedback(
        `❌ ${chosen.label} (${chosen.short}) — correct was ${question.chord.label} (${question.chord.short})`
      );
    }
  }

  function nextQuestion() {
    if (enabledChords.length === 0) {
      setFeedback("Enable at least one chord in Settings.");
      return;
    }
    stop();
    setLocked(false);
    setQuestion(makeQuestion(enabledChords));
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
    setQuestion(makeQuestion(enabledChords.length ? enabledChords : ALL_CHORDS));
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
      <h1>Chord Ear Trainer</h1>
      <p style={{ opacity: 0.85 }}>
        A chord plays from a random root (C3–B3). Identify it. Use <b>Settings</b> to choose chords, instrument, and play style.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", margin: "1rem 0" }}>
        <button
          onClick={playQuestion}
          disabled={locked || instrumentLoading || enabledChords.length === 0}
          style={{ minHeight: 44, padding: "10px 16px" }}
        >
          {playButtonLabel}
        </button>
        <button
          onClick={nextQuestion}
          disabled={locked || enabledChords.length === 0}
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
          <div style={{ opacity: 0.85 }}><b>Enabled:</b> {enabledChords.length}/{ALL_CHORDS.length}</div>
        </div>
      </div>

      <details style={{ margin: "1rem 0", borderRadius: 12, padding: "0.8rem 1rem", background: white(0.06) }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Settings</summary>

        {/* Presets */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Presets</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CHORD_PRESETS.map((preset) => {
              const active =
                preset.ids.length === enabledChords.length &&
                preset.ids.every((id) => enabledSet.has(id));
              return (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset.ids)}
                  disabled={locked}
                  aria-pressed={active}
                  style={{
                    padding: "0.45rem 0.9rem",
                    minHeight: 44,
                    borderRadius: 8,
                    border: active ? `2px solid ${blue(0.8)}` : `1px solid ${white(0.18)}`,
                    background: active ? blue(0.12) : white(0.05),
                    color: "inherit",
                    cursor: locked ? "not-allowed" : "pointer",
                    fontWeight: active ? 700 : 400,
                    fontSize: 14,
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ height: 1, background: white(0.10), margin: "14px 0" }} />

        {/* Chord groups */}
        <div style={{ fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Chords</div>
        <div style={{ opacity: 0.65, fontSize: 13, marginBottom: 10 }}>
          Can't disable the last remaining chord.
        </div>

        {CHORD_GROUPS.map((group) => {
          const groupChords = ALL_CHORDS.filter((c) => c.group === group.id);
          const allEnabled = groupChords.every((c) => enabledSet.has(c.id));
          return (
            <div key={group.id} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                  <input
                    type="checkbox"
                    checked={allEnabled}
                    onChange={() => toggleGroup(group.id)}
                    disabled={locked}
                  />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{group.label}</span>
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                {groupChords.map((chord) => {
                  const enabled = enabledSet.has(chord.id);
                  const isLast = enabled && enabledSet.size === 1;
                  return (
                    <label
                      key={chord.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        padding: "0.65rem 0.85rem",
                        borderRadius: 10,
                        border: `1px solid ${white(0.18)}`,
                        background: enabled ? white(0.08) : black(0.08),
                        opacity: isLast ? 0.8 : 1,
                        cursor: isLast || locked ? "not-allowed" : "pointer",
                        userSelect: "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        disabled={locked || isLast}
                        onChange={() => toggleChord(chord.id)}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {chord.label} <span style={{ opacity: 0.7, fontWeight: 400 }}>({chord.short})</span>
                        </div>
                        <div style={{ opacity: 0.6, fontSize: 12 }}>
                          {chord.intervals.join("–")} semitones
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{ height: 1, background: white(0.10), margin: "14px 0" }} />

        <InstrumentControls
          instrumentId={instrumentId}
          setInstrumentId={setInstrumentId}
          instrumentLoading={instrumentLoading}
          volume={volume}
          setVolume={setVolume}
        />

        <div style={{ height: 1, background: white(0.10), margin: "14px 0" }} />

        {/* Play mode */}
        <div>
          <div style={{ fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Play Style</div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["harmonic", "arpeggiated"] as const).map((mode) => {
              const active = playMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setPlayMode(mode)}
                  aria-pressed={active}
                  style={{
                    padding: "0.45rem 0.9rem",
                    minHeight: 44,
                    borderRadius: 8,
                    border: active ? `2px solid ${blue(0.8)}` : `1px solid ${white(0.18)}`,
                    background: active ? blue(0.12) : white(0.05),
                    color: "inherit",
                    cursor: "pointer",
                    fontWeight: active ? 700 : 400,
                    fontSize: 14,
                    textTransform: "capitalize",
                  }}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>
      </details>

      <h2 style={{ marginTop: "1.2rem" }}>Answer</h2>

      {enabledChords.length === 0 ? (
        <div style={{ padding: "0.9rem 1rem", borderRadius: 12, background: white(0.06) }}>
          Enable at least one chord in Settings.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 10 }}>
          {enabledChords.map((chord) => {
            const isPicked = selected === chord.id;
            const isRight = selected !== null && chord.id === question.chord.id;

            let border = `1px solid ${white(0.18)}`;
            let opacity = 1;
            if (selected !== null) {
              if (isRight) border = "2px solid rgba(0, 255, 160, 0.75)";
              else if (isPicked) border = "2px solid rgba(255, 80, 80, 0.75)";
              else opacity = 0.85;
            }

            return (
              <button
                key={chord.id}
                onClick={() => submitAnswer(chord.id)}
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
                <div style={{ fontWeight: 700 }}>{chord.label}</div>
                <div style={{ opacity: 0.8 }}>{chord.short}</div>
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
