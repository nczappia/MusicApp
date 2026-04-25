import { Link, NavLink, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import GuitarSectionPage from "./pages/GuitarSectionPage";
import EarTrainingSectionPage from "./pages/EarTrainingSectionPage";
import FretboardPage from "./pages/FretboardPage";
import FretboardNoteQuizPage from "./pages/FretboardNoteQuizPage";
import IntervalQuizPage from "./pages/IntervalQuizPage";
import ChordQuizPage from "./pages/ChordQuizPage";

function SectionTab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        padding: "0.5rem 0.85rem",
        borderRadius: 10,
        textDecoration: "none",
        color: "inherit",
        fontSize: 14,
        fontWeight: isActive ? 700 : 400,
        border: "1px solid rgba(255,255,255,0.14)",
        background: isActive ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
      })}
    >
      {label}
    </NavLink>
  );
}

export default function App() {
  return (
    <div>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(10px)",
          background: "rgba(0,0,0,0.35)",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0.85rem 1rem",
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <Link
            to="/"
            style={{
              fontWeight: 800,
              fontSize: 15,
              marginRight: 6,
              textDecoration: "none",
              color: "inherit",
              opacity: 0.9,
            }}
          >
            Music Trainer
          </Link>

          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.15)", margin: "0 4px" }} />

          <SectionTab to="/guitar" label="🎸 Guitar" />
          <SectionTab to="/ear-training" label="🎵 Ear Training" />
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route path="/guitar" element={<GuitarSectionPage />} />
          <Route path="/guitar/find-positions" element={<FretboardPage />} />
          <Route path="/guitar/name-the-note" element={<FretboardNoteQuizPage />} />

          <Route path="/ear-training" element={<EarTrainingSectionPage />} />
          <Route path="/ear-training/intervals" element={<IntervalQuizPage />} />
          <Route path="/ear-training/chords" element={<ChordQuizPage />} />
        </Routes>
      </main>
    </div>
  );
}
