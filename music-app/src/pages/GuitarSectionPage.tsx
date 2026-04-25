import { Link } from "react-router-dom";

const QUIZZES = [
  {
    to: "/guitar/find-positions",
    title: "Find All Positions",
    tag: "Fretboard",
    desc: "A note name is shown at the top. Click every position on the neck where that note appears. Correct taps play the pitch; wrong taps buzz. Move on when you've found them all.",
  },
  {
    to: "/guitar/name-the-note",
    title: "Name the Note",
    tag: "Fretboard · Timed",
    desc: "A position is highlighted in blue on the fretboard. Choose the correct note name from all 12 chromatic options. The quiz is timed and tracks accuracy across a customisable number of questions.",
  },
];

export default function GuitarSectionPage() {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1rem" }}>
      <Breadcrumb label="Guitar" />
      <h1 style={{ margin: "0.4rem 0 0.25rem" }}>🎸 Guitar</h1>
      <p style={{ opacity: 0.6, marginTop: 4, marginBottom: "2rem", fontSize: 15 }}>
        Fretboard knowledge and note recognition.
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
          (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,160,60,0.35)";
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
        <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: "rgba(255,160,60,0.9)" }}>
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
