import Breadcrumb from "../components/Breadcrumb";
import QuizCard from "../components/QuizCard";
import { orange } from "../utils/theme";

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
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1rem" }}>
      <Breadcrumb label="Guitar" />
      <h1 style={{ margin: "0.4rem 0 0.25rem" }}>🎸 Guitar</h1>
      <p style={{ opacity: 0.6, marginTop: 4, marginBottom: "2rem", fontSize: 15 }}>
        Fretboard knowledge and note recognition.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {QUIZZES.map((q) => (
          <QuizCard key={q.to} {...q} accent={orange} />
        ))}
      </div>
    </div>
  );
}
