import { lazy, Suspense, useEffect } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";

const GuitarSectionPage = lazy(() => import("./pages/GuitarSectionPage"));
const EarTrainingSectionPage = lazy(() => import("./pages/EarTrainingSectionPage"));
const FretboardPage = lazy(() => import("./pages/FretboardPage"));
const FretboardNoteQuizPage = lazy(() => import("./pages/FretboardNoteQuizPage"));
const IntervalQuizPage = lazy(() => import("./pages/IntervalQuizPage"));
const ChordQuizPage = lazy(() => import("./pages/ChordQuizPage"));
const ChordInversionQuizPage = lazy(() => import("./pages/ChordInversionQuizPage"));
const PianoSectionPage = lazy(() => import("./pages/PianoSectionPage"));
const PianoChordQuizPage = lazy(() => import("./pages/PianoChordQuizPage"));
const SightReadingSectionPage = lazy(() => import("./pages/SightReadingSectionPage"));
const NoteReadingQuizPage = lazy(() => import("./pages/NoteReadingQuizPage"));

function NotFound() {
  return (
    <div style={{ padding: "3rem 1rem", textAlign: "center" }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Page not found</h1>
      <p style={{ opacity: 0.7, marginBottom: 16 }}>The page you're looking for doesn't exist.</p>
      <Link to="/" style={{ color: "inherit" }}>
        ← Back to home
      </Link>
    </div>
  );
}

function SectionTab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        padding: "0.5rem 0.85rem",
        minHeight: 44,
        borderRadius: 10,
        textDecoration: "none",
        color: "inherit",
        fontSize: 14,
        fontWeight: isActive ? 700 : 400,
        border: "1px solid rgba(255,255,255,0.14)",
        background: isActive ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
        flexShrink: 0,
        whiteSpace: "nowrap",
        scrollSnapAlign: "start",
      })}
    >
      {label}
    </NavLink>
  );
}

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.getElementById("main-content")?.focus();
  }, [pathname]);

  return (
    <div>
      <a
        href="#main-content"
        style={{
          position: "absolute",
          left: "-9999px",
          top: "auto",
          zIndex: 100,
          padding: "0.6rem 1rem",
          borderRadius: 8,
          background: "#000",
          color: "#fff",
          textDecoration: "none",
        }}
        onFocus={(e) => {
          e.currentTarget.style.left = "1rem";
          e.currentTarget.style.top = "1rem";
        }}
        onBlur={(e) => {
          e.currentTarget.style.left = "-9999px";
        }}
      >
        Skip to content
      </a>

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          background: "rgba(0,0,0,0.35)",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0.85rem max(1rem, env(safe-area-inset-right)) 0.85rem max(1rem, env(safe-area-inset-left))",
            paddingTop: "env(safe-area-inset-top)",
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
              flexShrink: 0,
            }}
          >
            Music Trainer
          </Link>

          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.15)", margin: "0 4px", flexShrink: 0 }} />

          <nav aria-label="Main sections">
            <div
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
                scrollSnapType: "x proximity",
                WebkitOverflowScrolling: "touch",
                paddingBottom: 2,
              }}
            >
              <SectionTab to="/guitar" label="🎸 Guitar" />
              <SectionTab to="/piano" label="🎹 Piano" />
              <SectionTab to="/ear-training" label="🎵 Ear Training" />
              <SectionTab to="/sight-reading" label="📄 Sight Reading" />
            </div>
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading…</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />

            <Route path="/guitar" element={<GuitarSectionPage />} />
            <Route path="/guitar/find-positions" element={<FretboardPage />} />
            <Route path="/guitar/name-the-note" element={<FretboardNoteQuizPage />} />

            <Route path="/piano" element={<PianoSectionPage />} />
            <Route path="/piano/chord-quiz" element={<PianoChordQuizPage />} />

            <Route path="/ear-training" element={<EarTrainingSectionPage />} />
            <Route path="/ear-training/intervals" element={<IntervalQuizPage />} />
            <Route path="/ear-training/chords" element={<ChordQuizPage />} />
            <Route path="/ear-training/chord-inversions" element={<ChordInversionQuizPage />} />

            <Route path="/sight-reading" element={<SightReadingSectionPage />} />
            <Route path="/sight-reading/note-reading" element={<NoteReadingQuizPage />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
