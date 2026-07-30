import { useEffect, useState } from "react";
import { ALL_CHORDS, CHORD_GROUPS, CHORD_PRESETS, pickChord } from "../utils/chords";
import type { ChordType } from "../utils/chords";
import { useSoundfontInstrument } from "../hooks/useSoundfontInstrument";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { useEnabledChords } from "../hooks/useEnabledChords";
import { useQuizScore } from "../hooks/useQuizScore";
import InstrumentControls from "../components/InstrumentControls";
import { black, blue, green, red, white } from "../utils/theme";

type Difficulty = "beginner" | "advanced";

type Question = {
  id: string;
  rootMidi: number;
  chord: ChordType;
  inversionIdx: number;
  midis: number[];
};

// aug ([0,4,8]) is acoustically symmetric — every inversion sounds identical from
// a random root with no absolute pitch reference, making it unanswerable here.
const INVERSION_CHORDS = ALL_CHORDS.filter((c) => c.id !== "aug");

const LS_PREFIX = "chordInversion_";
const LS_CHORDS = LS_PREFIX + "chordIds_v1";
const LS_INSTRUMENT = LS_PREFIX + "instrument";
const LS_VOLUME = LS_PREFIX + "volume";
const LS_PLAY_MODE = LS_PREFIX + "playMode";
const LS_DIFFICULTY = LS_PREFIX + "difficulty";
const CHORD_MS = 1800;
const ARPEG_GAP_MS = 120;
const INVERSION_NAMES = ["Root Position", "1st Inversion", "2nd Inversion", "3rd Inversion"];

// Maps a chord-tone's semitone distance from the root to its scale-degree label.
// Generic over chord quality so sus2/sus4 (2nd/4th) don't get mislabeled as "3rd".
function degreeLabel(semitonesFromRoot: number): string {
  const m = ((semitonesFromRoot % 12) + 12) % 12;
  if (m === 0) return "root";
  if (m === 1 || m === 2) return "2nd";
  if (m === 3 || m === 4) return "3rd";
  if (m === 5) return "4th";
  if (m === 6 || m === 7 || m === 8) return "5th";
  if (m === 9) return "6th";
  return "7th";
}

function invertedMidis(rootMidi: number, intervals: number[], inversionIdx: number): number[] {
  const result: number[] = [];
  const bass = rootMidi + intervals[inversionIdx];
  result.push(bass);
  for (let j = 1; j < intervals.length; j++) {
    const idx = (inversionIdx + j) % intervals.length;
    let midi = rootMidi + intervals[idx];
    while (midi <= result[result.length - 1]) midi += 12;
    result.push(midi);
  }
  return result;
}

function makeQuestion(chords: ChordType[]): Question {
  const chord = pickChord(chords);
  const inversionIdx = Math.floor(Math.random() * chord.intervals.length);
  const rootMidi = 48 + Math.floor(Math.random() * 12);
  return {
    id: crypto.randomUUID(),
    rootMidi,
    chord,
    inversionIdx,
    midis: invertedMidis(rootMidi, chord.intervals, inversionIdx),
  };
}

export default function ChordInversionQuizPage() {
  const { instrumentId, setInstrumentId, volume, setVolume, instrumentLoading, play, stop } =
    useSoundfontInstrument({ lsInstrumentKey: LS_INSTRUMENT, lsVolumeKey: LS_VOLUME });

  // ---------- Play mode ----------
  const [playMode, setPlayMode] = useLocalStorageState<"harmonic" | "arpeggiated">(
    LS_PLAY_MODE,
    "harmonic",
    { parse: (raw) => (raw === "arpeggiated" ? "arpeggiated" : "harmonic"), serialize: (v) => v }
  );

  // ---------- Difficulty ----------
  const [difficulty, setDifficulty] = useLocalStorageState<Difficulty>(
    LS_DIFFICULTY,
    "beginner",
    { parse: (raw) => (raw === "advanced" ? "advanced" : "beginner"), serialize: (v) => v }
  );

  // ---------- Enabled chords ----------
  const { enabledSet, enabledChords, toggleChord, toggleGroup, applyPreset } =
    useEnabledChords(LS_CHORDS, INVERSION_CHORDS, CHORD_PRESETS);

  // ---------- Quiz state ----------
  const [question, setQuestion] = useState<Question>(() => {
    const init = INVERSION_CHORDS.filter((c) => enabledSet.has(c.id));
    return makeQuestion(init.length ? init : INVERSION_CHORDS);
  });
  const [hasPlayed, setHasPlayed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const { correct, total, streak, accuracy, recordAnswer, resetScore: resetScoreState } = useQuizScore();

  // Answer state
  const [pendingChordId, setPendingChordId] = useState<string | null>(null); // Advanced: selected but not submitted
  const [submittedChordId, setSubmittedChordId] = useState<string | null>(null);
  const [submittedInversionIdx, setSubmittedInversionIdx] = useState<number | null>(null);
  const submitted = submittedInversionIdx !== null;

  useEffect(() => {
    if (!enabledSet.has(question.chord.id)) {
      stop();
      setLocked(false);
      const next = enabledChords.length ? enabledChords : INVERSION_CHORDS;
      resetAnswerState();
      setQuestion(makeQuestion(next));
    }
  }, [enabledSet]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    stop();
    setLocked(false);
    resetAnswerState();
  }, [difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    stop();
    setLocked(false);
    resetAnswerState();
  }, [instrumentId]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetAnswerState() {
    setPendingChordId(null);
    setSubmittedChordId(null);
    setSubmittedInversionIdx(null);
    setHasPlayed(false);
    setFeedback("");
  }

  async function playQuestion() {
    if (enabledChords.length === 0) { setFeedback("Enable at least one chord in Settings."); return; }
    setFeedback("");
    setLocked(true);
    const result = await play(question.midis, {
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

  function submitInversion(inversionIdx: number) {
    if (!hasPlayed) { setFeedback("Hit Play first 👆 (browsers require a user gesture for audio)."); return; }
    if (submitted) return;

    const chordAnswer = difficulty === "beginner" ? question.chord.id : pendingChordId;
    if (difficulty === "advanced" && chordAnswer === null) {
      setFeedback("Pick a chord type first, then pick the inversion.");
      return;
    }

    setSubmittedChordId(chordAnswer!);
    setSubmittedInversionIdx(inversionIdx);

    const chordCorrect = chordAnswer === question.chord.id;
    const inversionCorrect = inversionIdx === question.inversionIdx;
    const isCorrect = chordCorrect && inversionCorrect;
    recordAnswer(isCorrect);

    if (isCorrect) {
      setFeedback(
        `✅ Correct — ${question.chord.label}, ${INVERSION_NAMES[question.inversionIdx]}`
      );
    } else {
      const parts: string[] = [];
      if (!chordCorrect) {
        const chosen = ALL_CHORDS.find((c) => c.id === chordAnswer)!;
        parts.push(`chord: you said ${chosen.label}, correct was ${question.chord.label}`);
      }
      if (!inversionCorrect) {
        parts.push(`inversion: you said ${INVERSION_NAMES[inversionIdx]}, correct was ${INVERSION_NAMES[question.inversionIdx]}`);
      }
      setFeedback(`❌ ${parts.join(" · ")}`);
    }
  }

  function nextQuestion() {
    if (enabledChords.length === 0) { setFeedback("Enable at least one chord in Settings."); return; }
    stop();
    setLocked(false);
    resetAnswerState();
    setQuestion(makeQuestion(enabledChords));
  }

  function resetScore() {
    stop();
    setLocked(false);
    resetScoreState();
    resetAnswerState();
    setQuestion(makeQuestion(enabledChords.length ? enabledChords : INVERSION_CHORDS));
  }

  const playButtonLabel = instrumentLoading ? "Loading…" : locked ? "Playing…" : hasPlayed ? "Replay" : "Play";
  // In advanced mode, always show all 4 buttons — showing only as many as the actual
  // chord has intervals would reveal the chord family (triad/sus vs 7th/6th) for free.
  const inversionCount =
    difficulty === "beginner" ? question.chord.intervals.length : INVERSION_NAMES.length;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Chord Inversion Quiz</h1>
      <p style={{ opacity: 0.85 }}>
        {difficulty === "beginner"
          ? "The chord type is shown. Identify the inversion."
          : "Both the chord type and inversion are unknown. Pick the chord type first, then the inversion."}
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
          <div style={{ opacity: 0.85 }}><b>Enabled:</b> {enabledChords.length}/{INVERSION_CHORDS.length}</div>
        </div>
      </div>

      <details style={{ margin: "1rem 0", borderRadius: 12, padding: "0.8rem 1rem", background: white(0.06) }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Settings</summary>

        {/* Difficulty */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Difficulty</div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["beginner", "advanced"] as const).map((d) => {
              const active = difficulty === d;
              return (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  disabled={locked}
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
                  {d === "beginner" ? "Beginner — inversion only" : "Advanced — chord + inversion"}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ height: 1, background: white(0.10), margin: "14px 0" }} />

        {/* Presets */}
        <div>
          <div style={{ fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Presets</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CHORD_PRESETS.map((preset) => {
              const presetIds = preset.ids.filter((id) => id !== "aug");
              const active =
                presetIds.length === enabledChords.length &&
                presetIds.every((id) => enabledSet.has(id));
              return (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(presetIds)}
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
        <div style={{ opacity: 0.65, fontSize: 13, marginBottom: 10 }}>Can't disable the last remaining chord.</div>

        {CHORD_GROUPS.map((group) => {
          const groupChords = INVERSION_CHORDS.filter((c) => c.group === group.id);
          const allEnabled = groupChords.every((c) => enabledSet.has(c.id));
          return (
            <div key={group.id} style={{ marginBottom: 14 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                  <input type="checkbox" checked={allEnabled} onChange={() => toggleGroup(group.id)} disabled={locked} />
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
                        display: "flex", gap: 10, alignItems: "center",
                        padding: "0.65rem 0.85rem", borderRadius: 10,
                        border: `1px solid ${white(0.18)}`,
                        background: enabled ? white(0.08) : black(0.08),
                        opacity: isLast ? 0.8 : 1,
                        cursor: isLast || locked ? "not-allowed" : "pointer",
                        userSelect: "none",
                      }}
                    >
                      <input type="checkbox" checked={enabled} disabled={locked || isLast} onChange={() => toggleChord(chord.id)} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {chord.label} <span style={{ opacity: 0.7, fontWeight: 400 }}>({chord.short})</span>
                        </div>
                        <div style={{ opacity: 0.6, fontSize: 12 }}>{chord.intervals.join("–")} semitones</div>
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

        {/* Play style */}
        <div>
          <div style={{ fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Play Style</div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["harmonic", "arpeggiated"] as const).map((mode) => {
              const active = playMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setPlayMode(mode)}
                  disabled={locked}
                  aria-pressed={active}
                  style={{
                    padding: "0.45rem 0.9rem", minHeight: 44, borderRadius: 8,
                    border: active ? `2px solid ${blue(0.8)}` : `1px solid ${white(0.18)}`,
                    background: active ? blue(0.12) : white(0.05),
                    color: "inherit", cursor: "pointer",
                    fontWeight: active ? 700 : 400, fontSize: 14, textTransform: "capitalize",
                  }}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>
      </details>

      {/* Answer area */}
      <div style={{ marginTop: "1.2rem" }}>
        {enabledChords.length === 0 ? (
          <div style={{ padding: "0.9rem 1rem", borderRadius: 12, background: white(0.06) }}>
            Enable at least one chord in Settings.
          </div>
        ) : (
          <>
            {/* Beginner: show chord label */}
            {difficulty === "beginner" && (
              <div style={{ marginBottom: 16, padding: "0.8rem 1rem", borderRadius: 12, background: white(0.06), fontSize: 16 }}>
                Chord type: <b>{question.chord.label}</b> <span style={{ opacity: 0.7 }}>({question.chord.short})</span>
              </div>
            )}

            {/* Advanced: chord type picker */}
            {difficulty === "advanced" && (
              <>
                <h2 style={{ margin: "0 0 0.5rem" }}>Step 1 — Chord type</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 24 }}>
                  {enabledChords.map((chord) => {
                    const isPending = pendingChordId === chord.id;
                    const isSubmittedRight = submitted && chord.id === question.chord.id;
                    const isSubmittedWrong = submitted && submittedChordId === chord.id && chord.id !== question.chord.id;

                    let border = `1px solid ${white(0.18)}`;
                    let bg = "transparent";
                    let opacity = 1;

                    if (submitted) {
                      if (isSubmittedRight) border = `2px solid ${green(0.75)}`;
                      else if (isSubmittedWrong) border = `2px solid ${red(0.75)}`;
                      else if (!isSubmittedRight) opacity = 0.6;
                    } else if (isPending) {
                      border = "2px solid rgba(255,200,60,0.8)";
                      bg = "rgba(255,200,60,0.08)";
                    }

                    return (
                      <button
                        key={chord.id}
                        onClick={() => { if (!submitted) setPendingChordId(chord.id); }}
                        disabled={submitted}
                        style={{
                          padding: "0.8rem", textAlign: "left", borderRadius: 12,
                          border, background: bg, opacity,
                          cursor: submitted ? "not-allowed" : "pointer",
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{chord.label}</div>
                        <div style={{ opacity: 0.8, fontSize: 13 }}>{chord.short}</div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Inversion picker */}
            <h2 style={{ margin: "0 0 0.5rem" }}>
              {difficulty === "beginner" ? "Which inversion?" : "Step 2 — Inversion"}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              {Array.from({ length: inversionCount }, (_, i) => {
                const isSubmittedRight = submitted && i === question.inversionIdx;
                const isSubmittedWrong = submitted && submittedInversionIdx === i && i !== question.inversionIdx;

                let border = `1px solid ${white(0.18)}`;
                let opacity = 1;
                if (submitted) {
                  if (isSubmittedRight) border = `2px solid ${green(0.75)}`;
                  else if (isSubmittedWrong) border = `2px solid ${red(0.75)}`;
                  else opacity = 0.6;
                }

                return (
                  <button
                    key={i}
                    onClick={() => submitInversion(i)}
                    disabled={locked || submitted}
                    style={{
                      padding: "0.9rem", textAlign: "left", borderRadius: 12,
                      border, opacity,
                      cursor: locked || submitted ? "not-allowed" : "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{INVERSION_NAMES[i]}</div>
                    <div style={{ opacity: 0.7, fontSize: 13 }}>
                      {difficulty === "advanced" && !submitted
                        ? "?"
                        : i === 0
                          ? "bass = root"
                          : i < question.chord.intervals.length
                            ? `bass = ${degreeLabel(question.chord.intervals[i])}`
                            : "—"}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

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
