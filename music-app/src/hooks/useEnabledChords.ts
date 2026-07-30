import { useMemo } from "react";
import { useLocalStorageState } from "./useLocalStorageState";

type ChordLike = { id: string; group: string };
type Preset = { label: string; ids: string[] };

// Shared enabled-chords/preset/group-toggle logic used by ChordQuizPage,
// ChordInversionQuizPage, and PianoChordQuizPage — each keeps a persisted Set
// of enabled chord ids scoped to its own localStorage key and chord list.
export function useEnabledChords<C extends ChordLike>(
  lsKey: string,
  allChords: C[],
  presets: Preset[],
  defaultPresetLabel = "Basics"
) {
  const defaultIds = presets.find((p) => p.label === defaultPresetLabel)?.ids ?? allChords.map((c) => c.id);

  const [enabledSet, setEnabledSet] = useLocalStorageState<Set<string>>(lsKey, new Set(defaultIds), {
    parse: (raw) => {
      const parsed = JSON.parse(raw) as string[];
      const valid = parsed.filter((id) => allChords.some((c) => c.id === id));
      return new Set(valid.length ? valid : defaultIds);
    },
    serialize: (s) => JSON.stringify(Array.from(s)),
  });

  const enabledChords = useMemo(
    () => allChords.filter((c) => enabledSet.has(c.id)),
    [enabledSet, allChords]
  );

  function toggleChord(id: string) {
    setEnabledSet((prev) => {
      if (prev.has(id)) {
        if (prev.size === 1) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function toggleGroup(groupId: string) {
    const groupChords = allChords.filter((c) => c.group === groupId);
    setEnabledSet((prev) => {
      const allEnabled = groupChords.every((c) => prev.has(c.id));
      const next = new Set(prev);
      if (allEnabled) {
        const after = new Set([...next].filter((id) => !groupChords.some((c) => c.id === id)));
        return after.size === 0 ? prev : after;
      }
      groupChords.forEach((c) => next.add(c.id));
      return next;
    });
  }

  function applyPreset(ids: string[]) {
    if (ids.length === 0) return;
    setEnabledSet(new Set(ids));
  }

  return { enabledSet, setEnabledSet, enabledChords, toggleChord, toggleGroup, applyPreset };
}
