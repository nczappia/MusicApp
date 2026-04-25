import { NavLink, Route, Routes } from "react-router-dom";
import IntervalQuizPage from "./pages/IntervalQuizPage";
import FretboardPage from "./pages/FretboardPage";
import FretboardNoteQuizPage from "./pages/FretboardNoteQuizPage";

function TabLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      style={({ isActive }) => ({
        padding: "0.55rem 0.85rem",
        borderRadius: 12,
        textDecoration: "none",
        color: "inherit",
        border: "1px solid rgba(255,255,255,0.14)",
        background: isActive ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)",
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
            padding: "0.9rem 1rem",
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 800, marginRight: 8 }}>Music Trainer</div>
          <TabLink to="/" label="Interval Quiz" />
          <TabLink to="/fretboard" label="Find Positions" />
          <TabLink to="/name-quiz" label="Name the Note" />
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<IntervalQuizPage />} />
          <Route path="/fretboard" element={<FretboardPage />} />
          <Route path="/name-quiz" element={<FretboardNoteQuizPage />} />
        </Routes>
      </main>
    </div>
  );
}
