import { INSTRUMENTS } from "../hooks/useSoundfontInstrument";
import { blue, white } from "../utils/theme";

type Props = {
  instrumentId: string;
  setInstrumentId: (id: string) => void;
  instrumentLoading: boolean;
  volume: number;
  setVolume: (v: number) => void;
};

export default function InstrumentControls({
  instrumentId, setInstrumentId, instrumentLoading, volume, setVolume,
}: Props) {
  return (
    <>
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
                aria-pressed={active}
                style={{
                  padding: "0.45rem 0.9rem",
                  minHeight: 44,
                  borderRadius: 8,
                  border: active ? `2px solid ${blue(0.8)}` : `1px solid ${white(0.18)}`,
                  background: active ? blue(0.12) : white(0.05),
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
          aria-label="Volume"
          style={{ flex: 1, maxWidth: 220, accentColor: blue(0.9) }}
        />
        <div style={{ opacity: 0.75, fontSize: 13, width: 36, textAlign: "right" }}>
          {Math.round(volume * 100)}%
        </div>
      </div>
    </>
  );
}
