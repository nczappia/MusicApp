import { useEffect, useRef } from "react";
import { SimpleSynth } from "../utils/audio";

// Shared AudioContext/SimpleSynth lifecycle for the lightweight oscillator-based
// quizzes (fretboard drills) — distinct from useSoundfontInstrument, which wraps
// soundfont-player for the ear-training quizzes.
export function useSimpleSynth() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<SimpleSynth | null>(null);

  async function ensureAudio(): Promise<SimpleSynth | null> {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      synthRef.current = new SimpleSynth(audioCtxRef.current);
    }
    if (audioCtxRef.current.state === "suspended") {
      try {
        await audioCtxRef.current.resume();
      } catch {
        return null;
      }
    }
    return synthRef.current;
  }

  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      synthRef.current = null;
    };
  }, []);

  return { ensureAudio };
}
