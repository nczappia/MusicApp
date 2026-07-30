import { useEffect, useRef, useState } from "react";
import { instrument as loadSoundfont } from "soundfont-player";
import type { Player } from "soundfont-player";
import { useLocalStorageState } from "./useLocalStorageState";
import { sleep } from "../utils/time";

export const INSTRUMENTS: { id: string; label: string }[] = [
  { id: "acoustic_grand_piano",  label: "Piano" },
  { id: "electric_piano_1",      label: "Electric Piano" },
  { id: "acoustic_guitar_nylon", label: "Nylon Guitar" },
  { id: "acoustic_guitar_steel", label: "Steel Guitar" },
  { id: "electric_guitar_clean", label: "Electric Guitar" },
  { id: "violin",                label: "Violin" },
  { id: "flute",                 label: "Flute" },
  { id: "marimba",               label: "Marimba" },
];

const SOUNDFONT = "MusyngKite";

export type PlayMode = "simultaneous" | "sequential" | "arpeggiated";

export type PlayResult = { ok: true } | { ok: false; reason: "cancelled" | "load-failed" };

type UseSoundfontInstrumentOpts = {
  lsInstrumentKey: string;
  lsVolumeKey: string;
  defaultInstrument?: string;
};

// Shared soundfont-player wiring: AudioContext lifecycle, instrument load/switch,
// volume persistence, and a low-level multi-note playback primitive. Each quiz page
// keeps its own thin playQuestion() built on top, since note timing differs per quiz.
export function useSoundfontInstrument(opts: UseSoundfontInstrumentOpts) {
  const { lsInstrumentKey, lsVolumeKey, defaultInstrument = "acoustic_grand_piano" } = opts;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const playerRef = useRef<Player | null>(null);
  const playIdRef = useRef(0);
  const cancelledRef = useRef(false);
  const [instrumentLoading, setInstrumentLoading] = useState(false);

  const [instrumentId, setInstrumentId] = useLocalStorageState<string>(lsInstrumentKey, defaultInstrument);
  const instrumentIdRef = useRef(instrumentId);
  instrumentIdRef.current = instrumentId;
  const [volume, setVolume] = useLocalStorageState<number>(lsVolumeKey, 1.0, {
    parse: (raw) => {
      const n = parseFloat(raw);
      return isNaN(n) ? 1.0 : Math.max(0, Math.min(3, n));
    },
    serialize: (v) => String(v),
  });

  async function ensureAudio() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      const requestedInstrumentId = instrumentId;
      setInstrumentLoading(true);
      try {
        const player = await loadSoundfont(audioCtxRef.current, requestedInstrumentId, { soundfont: SOUNDFONT });
        // Discard if instrumentId changed while this fetch was in-flight —
        // the instrument-change effect below owns the load for the new id.
        if (!cancelledRef.current && instrumentIdRef.current === requestedInstrumentId) {
          playerRef.current = player;
        }
      } catch {
        // CDN unavailable — player stays null, caught by callers
      } finally {
        if (!cancelledRef.current && instrumentIdRef.current === requestedInstrumentId) {
          setInstrumentLoading(false);
        }
      }
    }
    if (cancelledRef.current) return;
    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume().catch(() => {});
    }
  }

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      playerRef.current = null;
    };
  }, []);

  // Reload instrument when it changes (only if AudioContext already exists)
  useEffect(() => {
    if (!audioCtxRef.current) return;

    let cancelled = false;
    setInstrumentLoading(true);
    playerRef.current?.stop();
    playerRef.current = null;

    loadSoundfont(audioCtxRef.current, instrumentId, { soundfont: SOUNDFONT })
      .then((p) => { if (!cancelled) playerRef.current = p; })
      .catch(() => {})
      .finally(() => { if (!cancelled) setInstrumentLoading(false); });

    return () => {
      cancelled = true;
      playIdRef.current += 1; // cancel in-flight play
      playerRef.current?.stop();
      playerRef.current = null;
    };
  }, [instrumentId]);

  function stop() {
    playIdRef.current++;
    playerRef.current?.stop();
  }

  async function play(
    midiNotes: number[],
    playOpts: { mode?: PlayMode; noteMs?: number; gapMs?: number } = {}
  ): Promise<PlayResult> {
    const { mode = "simultaneous", noteMs = 650, gapMs = 120 } = playOpts;
    const id = ++playIdRef.current;

    await ensureAudio();
    if (id !== playIdRef.current) return { ok: false, reason: "cancelled" };
    if (!playerRef.current) return { ok: false, reason: "load-failed" };
    if (midiNotes.length === 0) return { ok: true };

    playerRef.current.stop();
    const now = audioCtxRef.current!.currentTime;
    const dur = noteMs / 1000;
    const n = midiNotes.length;
    let totalMs: number;

    if (mode === "simultaneous") {
      midiNotes.forEach((m) => playerRef.current!.play(m, now, { duration: dur, gain: volume }));
      totalMs = noteMs + 100;
    } else if (mode === "sequential") {
      midiNotes.forEach((m, i) => {
        playerRef.current!.play(m, now + (i * (noteMs + gapMs)) / 1000, { duration: dur, gain: volume });
      });
      totalMs = n * noteMs + (n - 1) * gapMs + 100;
    } else {
      // arpeggiated: notes stagger by gapMs but each sustains for noteMs (overlapping)
      midiNotes.forEach((m, i) => {
        playerRef.current!.play(m, now + (i * gapMs) / 1000, { duration: dur, gain: volume });
      });
      totalMs = (n - 1) * gapMs + noteMs + 100;
    }

    await sleep(totalMs);
    return id === playIdRef.current ? { ok: true } : { ok: false, reason: "cancelled" };
  }

  return { instrumentId, setInstrumentId, volume, setVolume, instrumentLoading, play, stop };
}
