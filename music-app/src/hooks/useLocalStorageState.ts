import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

export type Codec<T> = {
  parse: (raw: string) => T;
  serialize: (value: T) => string;
};

const jsonCodec: Codec<unknown> = {
  parse: (raw) => JSON.parse(raw),
  serialize: (value) => JSON.stringify(value),
};

// localStorage-backed useState. Falls back to defaultValue if the key is missing or
// fails to parse (corrupt/old-format data), and persists on every change.
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  codec: Codec<T> = jsonCodec as Codec<T>
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? defaultValue : codec.parse(raw);
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, codec.serialize(value));
    } catch {
      // Storage unavailable (Safari private mode) or full (quota exceeded);
      // value stays in memory for the session.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value]);

  return [value, setValue];
}
