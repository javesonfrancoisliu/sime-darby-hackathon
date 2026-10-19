import { CheckCircle2, XCircle } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import type { QuizPublic, QuizResult } from "@sdh/contracts";

import { AppButton, Modal } from "../ui";

export type QuizModalProps = {
  open: boolean;
  // The quiz without its right answers; null while it loads.
  quiz: QuizPublic | null;
  loadError: string | null;
  // Sends the answers; resolves with the score and verdict, or rejects with a message to show.
  onSubmit: (answers: { questionId: string; optionIndex: number }[]) => Promise<QuizResult>;
  onClose: () => void;
};

// A quiz, one question at a time. The right answers stay on the server, so the only feedback is the
// score and whether it was passed once every question is answered.
export function QuizModal({ open, quiz, loadError, onSubmit, onClose }: QuizModalProps) {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const questions = quiz?.questions ?? [];
  const question = questions[index];
  const selected = question ? (chosen[question.id] ?? null) : null;
  const isLast = index === questions.length - 1;

  function select(optionIndex: number) {
    if (question) setChosen((prev) => ({ ...prev, [question.id]: optionIndex }));
  }

  async function submit() {
    setBusy(true);
    setSubmitError(null);
    try {
      const answers = questions.flatMap((q) =>
        chosen[q.id] === undefined ? [] : [{ questionId: q.id, optionIndex: chosen[q.id]! }],
      );
      setResult(await onSubmit(answers));
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (isLast) {
      void submit();
      return;
    }
    setIndex((i) => i + 1);
  }

  // Radio group keyboard pattern: arrows move and select, wrapping at the ends.
  function onOptionKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!question) return;
    const count = question.options.length;
    const from = selected ?? -1;
    let target: number;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") target = (from + 1) % count;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      target = from <= 0 ? count - 1 : from - 1;
    } else return;
    event.preventDefault();
    select(target);
    optionRefs.current[target]?.focus();
  }

  function handleClose() {
    // Reset for a clean next open.
    setIndex(0);
    setChosen({});
    setResult(null);
    setSubmitError(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      title={quiz?.title ?? "Quiz"}
      onClose={handleClose}
      footer={
        result ? (
          <AppButton variant="primary" onClick={handleClose}>
            Done
          </AppButton>
        ) : question ? (
          <AppButton variant="primary" onClick={next} disabled={selected == null} loading={busy}>
            {isLast ? "Submit answers" : "Next question"}
          </AppButton>
        ) : (
          <AppButton variant="ghost" onClick={handleClose}>
            Close
          </AppButton>
        )
      }
    >
      {loadError ? (
        <p className="ui-error ui-flush" role="alert">
          {loadError}
        </p>
      ) : !quiz ? (
        <p className="ui-helper ui-flush" role="status">
          Loading the quiz…
        </p>
      ) : result ? (
        <div role="status">
          <p className="ui-flush ui-semibold">
            You got {result.score} of {result.total} correct.
          </p>
          <p className="ui-helper" style={{ marginTop: "var(--space-2)" }}>
            {result.passed
              ? "You passed. Any points are added to your total."
              : `You need ${quiz.passMark} correct to pass. Try again anytime.`}
          </p>
        </div>
      ) : (
        question && (
          <>
            <p className="ui-meta-row">
              Question {index + 1} of {questions.length}
            </p>
            <p className="ui-flush ui-semibold">{question.question}</p>
            <div
              className="quiz-options"
              role="radiogroup"
              aria-label="Answer options"
              onKeyDown={onOptionKeyDown}
            >
              {question.options.map((option, i) => {
                const isChosen = i === selected;
                return (
                  <button
                    key={option}
                    ref={(node) => {
                      optionRefs.current[i] = node;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={isChosen}
                    tabIndex={isChosen || (selected == null && i === 0) ? 0 : -1}
                    className={`quiz-option${isChosen ? " quiz-option--chosen" : ""}`}
                    onClick={() => select(i)}
                  >
                    {option}
                    {isChosen && <CheckCircle2 size={16} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            {submitError && (
              <p className="ui-error ui-flush" role="alert">
                <XCircle size={14} aria-hidden="true" /> {submitError}
              </p>
            )}
          </>
        )
      )}
    </Modal>
  );
}
