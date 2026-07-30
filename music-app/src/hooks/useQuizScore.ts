import { useMemo, useState } from "react";

// Shared correct/total/streak/accuracy tracking used by the ear-training quizzes
// (IntervalQuizPage, ChordQuizPage, ChordInversionQuizPage).
export function useQuizScore() {
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);

  const accuracy = useMemo(
    () => (total === 0 ? 0 : Math.round((correct / total) * 100)),
    [correct, total]
  );

  function recordAnswer(isCorrect: boolean) {
    setTotal((t) => t + 1);
    if (isCorrect) {
      setCorrect((c) => c + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  }

  function resetScore() {
    setCorrect(0);
    setTotal(0);
    setStreak(0);
  }

  return { correct, total, streak, accuracy, recordAnswer, resetScore };
}
