import { Link } from "react-router-dom";

const QUIZZES = [
  {
    to: "/ear-training/intervals",
    title: "Interval Quiz",
    tag: "Melodic · Ascending",
    desc: "Two notes play in sequence. Identify the interval between them — from unison to octave. Choose which intervals to practice, pick an instrument (piano, guitar, violin, and more), and adjust volume. Tracks score and streak.",
  },
  {
    to: "/ear-training/chords",
    title: "Chord Quiz",
    tag: "Harmonic · Root Position",
    desc: "A chord plays from a random root. Identify it by type — triads, suspended, or sevenths. Choose harmonic or arpeggiated playback, configure which chords to include, and pick your instrument. Tracks score and streak.",
  },
  {
    to: "/ear-training/chord-inversions",
    title: "Chord Inversions",
    tag: "Harmonic · All Positions",
    desc: "A chord plays in a random inversion. Beginner: chord type is revealed — identify only the inversion. Advanced: both chord type and inversion are unknown. Pick your difficulty, chords, and instrument.",
  },
];

export default function EarTrainingSectionPage() {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1rem" }}>
      <Breadcrumb label="Ear Training" />
      <h1 style={{ margin: "0.4rem 0 0.25rem" }}>🎵 Ear Training</h1>
      <p style={{ opacity: 0.6, marginTop: 4, marginBottom: "2rem", fontSize: 15 }}>
        Develop your ability to recognise musical sounds.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {QUIZZES.map((q) => (
          <QuizCard key={q.to} {...q} />
        ))}
      </div>
    </div>
  );
}

function QuizCard({ to, title, tag, desc }: typeof QUIZZES[number]) {
  return (
    <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          borderRadius: 14,
          padding: "1.25rem",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          cursor: "pointer",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)";
          (e.currentTarget as HTMLElement).style.border = "1px solid rgba(80,160,255,0.35)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "";
          (e.currentTarget as HTMLElement).style.boxShadow = "";
          (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.12)";
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.45, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
          {tag}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>{title}</div>
        <div style={{ opacity: 0.65, fontSize: 14, lineHeight: 1.6, flex: 1 }}>{desc}</div>
        <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: "rgba(80,160,255,0.9)" }}>
          Start →
        </div>
      </div>
    </Link>
  );
}

function Breadcrumb({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 6 }}>
      <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>Home</Link>
      <span style={{ margin: "0 6px" }}>›</span>
      {label}
    </div>
  );
}
