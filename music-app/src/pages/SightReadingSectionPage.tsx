import Breadcrumb from "../components/Breadcrumb";
import QuizCard from "../components/QuizCard";
import { orange } from "../utils/theme";

const QUIZZES = [
  {
    to: "/sight-reading/note-reading",
    title: "Note Reading",
    tag: "Sight Reading · Treble & Bass",
    desc: "A single note appears on the treble or bass clef staff. Identify its name. Configurable for ledger lines and which clefs to include.",
  },
];

export default function SightReadingSectionPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1rem" }}>
      <Breadcrumb label="Sight Reading" />
      <h1 style={{ margin: "0.4rem 0 0.25rem" }}>📄 Sight Reading</h1>
      <p style={{ opacity: 0.6, marginTop: 4, marginBottom: "2rem", fontSize: 15 }}>
        Musical notation and staff reading.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {QUIZZES.map((q) => <QuizCard key={q.to} {...q} accent={orange} />)}
      </div>
    </div>
  );
}
