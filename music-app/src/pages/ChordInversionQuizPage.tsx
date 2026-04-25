import { useEffect, useMemo, useRef, useState } from "react";
import { instrument as loadSoundfont } from "soundfont-player";
import type { Player } from "soundfont-player";
import "../App.css";
import { ALL_CHORDS, CHORD_GROUPS, CHORD_PRESETS, pickChord } from "../utils/chords";
import type { ChordGroup, ChordType } from "../utils/chords";

type Difficulty = "beginner" | "advanced";

type Question = {
  id: string;
  rootMidi: number;
  chord: ChordType;
  inversionIdx: number;
  midis: number[];
};

const LS_PREFIX = "chordInversion_";
const LS_CHORDS = LS_PREFIX + "chordIds_v1";
const LS_INSTRUMENT = LS_PREFIX + "instrument";
const LS_VOLUME = LS_PREFIX + "volume";
const LS_PLAY_MODE = LS_PREFIX + "playMode";
const LS_DIFFICULTY = LS_PREFIX + "difficulty";
const CHORD_MS = 1800;
const ARPEG_GAP_MS = 120;
const INVERSION_NAMES = ["Root Position", "1st Inversion", "2nd Inversion", "3rd Inversion"];

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

const DEFAULT_IDS = CHORD_PRESETS.find((p) => p.label === "Basics")!.ids;

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

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function loadEnabledSet(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_CHORDS);
    if (!raw) return new Set(DEFAULT_IDS);
    const parsed = JSON.parse(raw) as string[];
    const valid = parsed.filter((id) => ALL_CHORDS.some((c) => c.id === id));
    return new Set(valid.length ? valid : DEFAULT_IDS);
  } catch {
    return new Set(DEFAULT_IDS);
  }
}

export default function ChordInversionQuizPage() {
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
        // CDN unavailable
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

  useEffect(() => { localStorage.setItem(LS_VOLUME, String(volume)); }, [volume]);

  // ---------- Play mode ----------
  const [playMode, setPlayMode] = useState<"harmonic" | "arpeggiated">(() => {
    return localStorage.getItem(LS_PLAY_MODE) === "arpeggiated" ? "arpeggiated" : "harmonic";
  });

  useEffect(() => { localStorage.setItem(LS_PLAY_MODE, playMode); }, [playMode]);

  // ---------- Difficulty ----------
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    return localStorage.getItem(LS_DIFFICULTY) === "advanced" ? "advanced" : "beginner";
  });

  useEffect(() => { localStorage.setItem(LS_DIFFICULTY, difficulty); }, [difficulty]);

  // ---------- Enabled chords ----------
  const [enabledSet, setEnabledSet] = useState<Set<string>>(loadEnabledSet);

  useEffect(() => {
    localStorage.setItem(LS_CHORDS, JSON.stringify(Array.from(enabledSet)));
  }, [enabledSet]);

  const enabledChords = useMemo(
    () => ALL_CHORDS.filter((c) => enabledSet.has(c.id)),
    [enabledSet]
  );

  // ---------- Quiz state ----------
  const [question, setQuestion] = useState<Question>(() => {
    const init = ALL_CHORDS.filter((c) => enabledSet.has(c.id));
    return makeQuestion(init.length ? init : ALL_CHORDS);
  });
  const [hasPlayed, setHasPlayed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);

  // Answer state
  const [pendingChordId, setPendingChordId] = useState<string | null>(null); // Advanced: selected but not submitted
  const [submittedChordId, setSubmittedChordId] = useState<string | null>(null);
  const [submittedInversionIdx, setSubmittedInversionIdx] = useState<number | null>(null);
  const submitted = submittedInversionIdx !== null;

  useEffect(() => {
    if (!enabledSet.has(question.chord.id)) {
      const next = enabledChords.length ? enabledChords : ALL_CHORDS;
      resetAnswerState();
      setQuestion(makeQuestion(next));
    }
  }, [enabledSet]); // eslint-disable-line react-hooks/exhaustive-deps

  const accuracy = useMemo(
    () => (total === 0 ? 0 : Math.round((correct / total) * 100)),
    [correct, total]
  );

  function resetAnswerState() {
    setPendingChordId(null);
    setSubmittedChordId(null);
    setSubmittedInversionIdx(null);
    setHasPlayed(false);
    setFeedback("");
  }

  async function playQuestion() {
    if (enabledChords.length === 0) { setFeedback("Enable at least one chord in Settings."); return; }
    const id = ++playIdRef.current;
    try {
      setFeedback("");
      setLocked(true);
      await ensureAudio(instrumentId);
      if (id !== playIdRef.current) return;
      if (!playerRef.current) {
        setFeedback("Instrument failed to load — check your connection and try again.");
        return;
      }
      playerRef.current.stop();
      const now = audioCtxRef.current!.currentTime;
      const { midis } = question;
      const dur = CHORD_MS / 1000;
      const gap = ARPEG_GAP_MS / 1000;

      if (playMode === "harmonic") {
        midis.forEach((midi) => {
          playerRef.current!.play(midi, now, { duration: dur, gain: volume });
        });
        await sleep(CHORD_MS + 100);
      } else {
        midis.forEach((midi, i) => {
          playerRef.current!.play(midi, now + i * gap, { duration: dur, gain: volume });
        });
        await sleep((midis.length - 1) * ARPEG_GAP_MS + CHORD_MS + 100);
      }

      if (id === playIdRef.current) setHasPlayed(true);
    } finally {
      if (id === playIdRef.current) setLocked(false);
    }
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
    setTotal((t) => t + 1);

    const chordCorrect = chordAnswer === question.chord.id;
    const inversionCorrect = inversionIdx === question.inversionIdx;
    const isCorrect = chordCorrect && inversionCorrect;

    if (isCorrect) {
      setCorrect((c) => c + 1);
      setStreak((s) => s + 1);
      setFeedback(
        `✅ Correct — ${question.chord.label}, ${INVERSION_NAMES[question.inversionIdx]}`
      );
    } else {
      setStreak(0);
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
    playIdRef.current++;
    playerRef.current?.stop();
    setLocked(false);
    resetAnswerState();
    setQuestion(makeQuestion(enabledChords));
  }

  function resetScore() {
    playIdRef.current++;
    playerRef.current?.stop();
    setLocked(false);
    setCorrect(0);
    setTotal(0);
    setStreak(0);
    resetAnswerState();
    setQuestion(makeQuestion(enabledChords.length ? enabledChords : ALL_CHORDS));
  }

  function applyPreset(ids: string[]) { setEnabledSet(new Set(ids)); }

  function toggleChord(id: string) {
    setEnabledSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size === 1) return next; next.delete(id); }
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(groupId: ChordGroup) {
    const groupChords = ALL_CHORDS.filter((c) => c.group === groupId);
    const allEnabled = groupChords.every((c) => enabledSet.has(c.id));
    setEnabledSet((prev) => {
      const next = new Set(prev);
      if (allEnabled) {
        const after = new Set([...next].filter((id) => !groupChords.some((c) => c.id === id)));
        return after.size === 0 ? next : after;
      }
      groupChords.forEach((c) => next.add(c.id));
      return next;
    });
  }

  const playButtonLabel = instrumentLoading ? "Loading…" : locked ? "Playing…" : hasPlayed ? "Replay" : "Play";
  const inversionCount = question.chord.intervals.length;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Chord Inversion Quiz</h1>
      <p style={{ opacity: 0.85 }}>
        {difficulty === "beginner"
          ? "The chord type is shown. Identify the inversion."
          : "Both the chord type and inversion are unknown. Pick the chord type first, then the inversion."}
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", margin: "1rem 0" }}>
        <button onClick={playQuestion} disabled={locked || instrumentLoading || enabledChords.length === 0}>
          {playButtonLabel}
        </button>
        <button onClick={nextQuestion} disabled={locked || enabledChords.length === 0}>
          Next
        </button>
        <button onClick={resetScore} disabled={locked}>
          Reset
        </button>

        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div><b>Score:</b> {correct}/{total} ({accuracy}%)</div>
          <div><b>Streak:</b> {streak}</div>
          <div style={{ opacity: 0.85 }}><b>Enabled:</b> {enabledChords.length}/{ALL_CHORDS.length}</div>
        </div>
      </div>

      <details style={{ margin: "1rem 0", borderRadius: 12, padding: "0.8rem 1rem", background: "rgba(255,255,255,0.06)" }}>
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
                  style={{
                    padding: "0.45rem 0.9rem",
                    borderRadius: 8,
                    border: active ? "2px solid rgba(80,160,255,0.8)" : "1px solid rgba(255,255,255,0.18)",
                    background: active ? "rgba(80,160,255,0.12)" : "rgba(255,255,255,0.05)",
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

        <div style={{ height: 1, background: "rgba(255,255,255,0.10)", margin: "14px 0" }} />

        {/* Presets */}
        <div>
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
                  style={{
                    padding: "0.45rem 0.9rem",
                    borderRadius: 8,
                    border: active ? "2px solid rgba(80,160,255,0.8)" : "1px solid rgba(255,255,255,0.18)",
                    background: active ? "rgba(80,160,255,0.12)" : "rgba(255,255,255,0.05)",
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

        <div style={{ height: 1, background: "rgba(255,255,255,0.10)", margin: "14px 0" }} />

        {/* Chord groups */}
        <div style={{ fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Chords</div>
        <div style={{ opacity: 0.65, fontSize: 13, marginBottom: 10 }}>Can't disable the last remaining chord.</div>

        {CHORD_GROUPS.map((group) => {
          const groupChords = ALL_CHORDS.filter((c) => c.group === group.id);
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
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: enabled ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
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

        <div style={{ height: 1, background: "rgba(255,255,255,0.10)", margin: "14px 0" }} />

        {/* Instrument */}
        <div>
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
                    padding: "0.45rem 0.9rem", borderRadius: 8,
                    border: active ? "2px solid rgba(80,160,255,0.8)" : "1px solid rgba(255,255,255,0.18)",
                    background: active ? "rgba(80,160,255,0.12)" : "rgba(255,255,255,0.05)",
                    color: "inherit", cursor: instrumentLoading ? "not-allowed" : "pointer",
                    fontWeight: active ? 700 : 400, fontSize: 14,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {instrumentLoading && <div style={{ marginTop: 6, opacity: 0.65, fontSize: 13 }}>Loading instrument samples…</div>}
        </div>

        {/* Volume */}
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontWeight: 700, opacity: 0.9, whiteSpace: "nowrap" }}>Volume</div>
          <input
            type="range" min={0} max={1.5} step={0.05} value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{ flex: 1, maxWidth: 220, accentColor: "rgba(80,160,255,0.9)" }}
          />
          <div style={{ opacity: 0.75, fontSize: 13, width: 36, textAlign: "right" }}>{Math.round(volume * 100)}%</div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.10)", margin: "14px 0" }} />

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
                  style={{
                    padding: "0.45rem 0.9rem", borderRadius: 8,
                    border: active ? "2px solid rgba(80,160,255,0.8)" : "1px solid rgba(255,255,255,0.18)",
                    background: active ? "rgba(80,160,255,0.12)" : "rgba(255,255,255,0.05)",
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
          <div style={{ padding: "0.9rem 1rem", borderRadius: 12, background: "rgba(255,255,255,0.06)" }}>
            Enable at least one chord in Settings.
          </div>
        ) : (
          <>
            {/* Beginner: show chord label */}
            {difficulty === "beginner" && (
              <div style={{ marginBottom: 16, padding: "0.8rem 1rem", borderRadius: 12, background: "rgba(255,255,255,0.06)", fontSize: 16 }}>
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

                    let border = "1px solid rgba(255,255,255,0.18)";
                    let bg = "transparent";
                    let opacity = 1;

                    if (submitted) {
                      if (isSubmittedRight) border = "2px solid rgba(0,255,160,0.75)";
                      else if (isSubmittedWrong) border = "2px solid rgba(255,80,80,0.75)";
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

                let border = "1px solid rgba(255,255,255,0.18)";
                let opacity = 1;
                if (submitted) {
                  if (isSubmittedRight) border = "2px solid rgba(0,255,160,0.75)";
                  else if (isSubmittedWrong) border = "2px solid rgba(255,80,80,0.75)";
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
                      {i === 0 ? "bass = root" : `bass = ${["", "3rd", "5th", "7th"][i]}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {feedback && (
        <div style={{ marginTop: 18, padding: "0.9rem 1rem", borderRadius: 12, background: "rgba(255,255,255,0.06)" }}>
          {feedback}
        </div>
      )}
    </div>
  );
}
