import { Link } from "react-router-dom";

const SECTIONS = [
  {
    to: "/guitar",
    icon: "🎸",
    title: "Guitar",
    tagline: "Build fretboard fluency.",
    accent: "rgba(255,160,60,0.10)",
    border: "rgba(255,160,60,0.28)",
    quizzes: [
      {
        name: "Find All Positions",
        desc: "A note name is shown. Click every fret on the neck where that note appears.",
      },
      {
        name: "Name the Note",
        desc: "A fret position is highlighted. Pick the correct note from all 12 chromatic options. Timed with accuracy tracking.",
      },
    ],
  },
  {
    to: "/piano",
    icon: "🎹",
    title: "Piano",
    tagline: "Keyboard chord recognition.",
    accent: "rgba(180,100,255,0.08)",
    border: "rgba(180,100,255,0.28)",
    quizzes: [
      {
        name: "Chord Recognition",
        desc: "Notes are highlighted on a 3-octave keyboard. Identify the root and chord type from the visual pattern. Timed with configurable chord sets.",
      },
    ],
  },
  {
    to: "/ear-training",
    icon: "🎵",
    title: "Ear Training",
    tagline: "Develop your musical hearing.",
    accent: "rgba(80,160,255,0.08)",
    border: "rgba(80,160,255,0.28)",
    quizzes: [
      {
        name: "Interval Quiz",
        desc: "Two notes play in sequence. Identify the interval between them. Choose your instrument and which intervals to practice.",
      },
      {
        name: "Chord Quiz",
        desc: "A chord plays from a random root. Identify it by type — triads, suspended, or sevenths. Harmonic or arpeggiated playback.",
      },
      {
        name: "Chord Inversions",
        desc: "A chord plays in a random inversion. Beginner: chord type shown, identify the inversion. Advanced: identify both.",
      },
    ],
  },
];

export default function HomePage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "3rem 1rem" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: 30, margin: 0 }}>Welcome to Music Trainer</h1>
        <p style={{ opacity: 0.65, marginTop: 8, fontSize: 15 }}>
          Pick a section to get started.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        {SECTIONS.map((s) => (
          <Link key={s.to} to={s.to} style={{ textDecoration: "none", color: "inherit" }}>
            <SectionCard {...s} />
          </Link>
        ))}
      </div>
    </div>
  );
}

function SectionCard({
  icon, title, tagline, accent, border, quizzes, to,
}: typeof SECTIONS[number]) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: "1.5rem",
        background: accent,
        border: `1px solid ${border}`,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.22)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "";
        (e.currentTarget as HTMLElement).style.boxShadow = "";
      }}
    >
      <div style={{ fontSize: 30, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800 }}>{title}</div>
      <div style={{ opacity: 0.6, fontSize: 13, marginTop: 2, marginBottom: 16 }}>{tagline}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {quizzes.map((q) => (
          <div
            key={q.name}
            style={{
              padding: "0.7rem 0.85rem",
              borderRadius: 10,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{q.name}</div>
            <div style={{ opacity: 0.6, fontSize: 12, lineHeight: 1.5 }}>{q.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, fontSize: 13, fontWeight: 600, opacity: 0.8 }}>
        Go to {title} →
      </div>
    </div>
  );
}
