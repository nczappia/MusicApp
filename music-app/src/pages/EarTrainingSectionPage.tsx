import Breadcrumb from "../components/Breadcrumb";
import QuizCard from "../components/QuizCard";

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
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1rem" }}>
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
