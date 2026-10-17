import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

import type { QuizQuestion } from "../../data/gamification.mock";
import { AppButton, Modal } from "../ui";

export type QuizResult = { correct: number; total: number; passed: boolean };

export type QuizModalProps = {
  open: boolean;
  questions: QuizQuestion[];
  /** Correct answers needed to pass and earn points. */
  passTarget: number;
  /** Whether points were already earned (quiz completed before) — shown as info. */
  alreadyEarned: boolean;
  onClose: () => void;
  onPassed: (result: QuizResult) => void;
};

/**
 * Environmental awareness quiz, one question at a time. Gives per-answer
 * feedback and only reports a pass (awarding points) when the pass target is met.
 * Demo content.
 */
export function QuizModal({
  open,
  questions,
  passTarget,
  alreadyEarned,
  onClose,
  onPassed,
}: QuizModalProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[index];
  const isLast = index === questions.length - 1;

  function check() {
    if (selected == null || !question) return;
    setRevealed(true);
    if (selected === question.correctIndex) setCorrectCount((c) => c + 1);
  }

  function next() {
    if (isLast) {
      const total = questions.length;
      const passed = correctCount >= passTarget;
      setFinished(true);
      if (passed && !alreadyEarned) onPassed({ correct: correctCount, total, passed });
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
  }

  function handleClose() {
    // Reset for a clean next open.
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
    setFinished(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      title="Environmental quiz (demo)"
      onClose={handleClose}
      footer={
        finished ? (
          <AppButton variant="primary" onClick={handleClose}>
            Done
          </AppButton>
        ) : !revealed ? (
          <AppButton variant="primary" onClick={check} disabled={selected == null}>
            Check answer
          </AppButton>
        ) : (
          <AppButton variant="primary" onClick={next}>
            {isLast ? "See result" : "Next question"}
          </AppButton>
        )
      }
    >
      {finished ? (
        <div role="status">
          <p style={{ margin: 0, fontWeight: 600 }}>
            You got {correctCount} of {questions.length} correct.
          </p>
          <p className="ui-helper" style={{ marginTop: "var(--space-2)" }}>
            {correctCount >= passTarget
              ? alreadyEarned
                ? "You passed. Points were already earned for this quiz (no double rewards)."
                : "You passed and earned the demo quiz points."
              : `You need ${passTarget} correct to earn points. Try again anytime.`}
          </p>
        </div>
      ) : (
        question && (
          <>
            <p className="ui-meta-row">
              Question {index + 1} of {questions.length}
            </p>
            <p style={{ margin: 0, fontWeight: 600 }}>{question.question}</p>
            <div className="quiz-options" role="radiogroup" aria-label="Answer options">
              {question.options.map((option, i) => {
                const isCorrect = i === question.correctIndex;
                const isChosen = i === selected;
                const stateClass = revealed
                  ? isCorrect
                    ? " quiz-option--correct"
                    : isChosen
                      ? " quiz-option--wrong"
                      : ""
                  : isChosen
                    ? " quiz-option--chosen"
                    : "";
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={isChosen}
                    className={`quiz-option${stateClass}`}
                    disabled={revealed}
                    onClick={() => setSelected(i)}
                  >
                    {option}
                    {revealed && isCorrect && (
                      <CheckCircle2 size={16} aria-hidden="true" />
                    )}
                    {revealed && isChosen && !isCorrect && (
                      <XCircle size={16} aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )
      )}
    </Modal>
  );
}
