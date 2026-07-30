import Breadcrumb from "../components/Breadcrumb";
import QuizCard from "../components/QuizCard";
import { orange } from "../utils/theme";

const QUIZZES = [
  {
    to: "/piano/chord-quiz",
    title: "Chord Recognition",
    tag: "Piano · Timed",
    desc: "Chord notes are highlighted on a 3-octave keyboard. Identify the root and chord type from the visual pattern. Configurable chord sets and a timer to track your speed.",
  },
];

export default function PianoSectionPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1rem" }}>
      <Breadcrumb label="Piano" />
      <h1 style={{ margin: "0.4rem 0 0.25rem" }}>🎹 Piano</h1>
      <p style={{ opacity: 0.6, marginTop: 4, marginBottom: "2rem", fontSize: 15 }}>
        Chord recognition and keyboard theory.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {QUIZZES.map((q) => <QuizCard key={q.to} {...q} accent={orange} />)}
      </div>
    </div>
  );
}
