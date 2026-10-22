import { CheckCircle2, XCircle } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import type { QuizPublic, QuizResult } from "@sdh/contracts";

import { formatPoints } from "../../lib/format";
import { AppButton, Modal } from "../ui";

export type QuizModalProps = {
  open: boolean;
  // The quiz without its right answers; null while it loads.
  quiz: QuizPublic | null;
  // Points the challenge pays for passing, shown up front and in the result.
  points?: number;
  loadError: string | null;
  // Sends the answers; resolves with the score and verdict, or rejects with a message to show.
  onSubmit: (answers: { questionId: string; optionIndex: number }[]) => Promise<QuizResult>;
  onClose: () => void;
};

// A quiz with every question on one screen. The right answers stay on the server, so the only
// feedback is the score and whether it was passed. The server wants an answer to every question, so
// nothing is sent until all are chosen.
export function QuizModal({
  open,
  quiz,
  points = 0,
  loadError,
  onSubmit,
  onClose,
}: QuizModalProps) {
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [needsAnswer, setNeedsAnswer] = useState(false);

  const optionRefs = useRef<Record<string, (HTMLButtonElement | null)[]>>({});

  const questions = quiz?.questions ?? [];

  function select(questionId: string, optionIndex: number) {
    setNeedsAnswer(false);
    setChosen((prev) => ({ ...prev, [questionId]: optionIndex }));
  }

  async function submit() {
    if (questions.some((q) => chosen[q.id] === undefined)) {
      setNeedsAnswer(true);
      return;
    }
    setBusy(true);
    setSubmitError(null);
    try {
      const answers = questions.map((q) => ({ questionId: q.id, optionIndex: chosen[q.id]! }));
      setResult(await onSubmit(answers));
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  // Radio group keyboard pattern: arrows move and select, wrapping at the ends.
  function onOptionKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    questionId: string,
    count: number,
  ) {
    const from = chosen[questionId] ?? -1;
    let target: number;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") target = (from + 1) % count;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      target = from <= 0 ? count - 1 : from - 1;
    } else return;
    event.preventDefault();
    select(questionId, target);
    optionRefs.current[questionId]?.[target]?.focus();
  }

  function handleClose() {
    // Reset for a clean next open.
    setChosen({});
    setResult(null);
    setSubmitError(null);
    setNeedsAnswer(false);
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
        ) : questions.length > 0 ? (
          <AppButton variant="primary" onClick={() => void submit()} loading={busy}>
            Submit answers
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
              ? points > 0
                ? `You passed. You earned ${formatPoints(points)}.`
                : "You passed."
              : `You need ${quiz.passMark} correct to pass. Try again later.`}
          </p>
        </div>
      ) : (
        <>
          <p className="ui-helper ui-flush">
            Answer all {questions.length} questions, then send them together. You need{" "}
            {quiz.passMark} correct to pass
            {points > 0 ? ` and earn ${formatPoints(points)}` : ""}.
          </p>
          {questions.map((question, number) => {
            const selected = chosen[question.id] ?? null;
            return (
              <div key={question.id} className="ui-stack ui-gap-2">
                <p className="ui-meta-row">
                  Question {number + 1} of {questions.length}
                </p>
                <p className="ui-flush ui-semibold">{question.question}</p>
                <div
                  className="quiz-options"
                  role="radiogroup"
                  aria-label={`Answer options for question ${number + 1}`}
                  onKeyDown={(event) =>
                    onOptionKeyDown(event, question.id, question.options.length)
                  }
                >
                  {question.options.map((option, i) => {
                    const isChosen = i === selected;
                    return (
                      <button
                        key={option}
                        ref={(node) => {
                          (optionRefs.current[question.id] ??= [])[i] = node;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={isChosen}
                        tabIndex={isChosen || (selected == null && i === 0) ? 0 : -1}
                        className={`quiz-option${isChosen ? " quiz-option--chosen" : ""}`}
                        onClick={() => select(question.id, i)}
                      >
                        {option}
                        {isChosen && <CheckCircle2 size={16} aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {needsAnswer && (
            <p className="ui-error ui-flush" role="alert">
              Answer every question to submit
            </p>
          )}
          {submitError && (
            <p className="ui-error ui-flush" role="alert">
              <XCircle size={14} aria-hidden="true" /> {submitError}
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
