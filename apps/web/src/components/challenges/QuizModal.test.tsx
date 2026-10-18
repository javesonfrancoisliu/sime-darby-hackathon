import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { QuizQuestion } from "../../data/gamification.mock";
import { QuizModal } from "./QuizModal";

const QUESTIONS: QuizQuestion[] = [
  { id: "q1", question: "Which bin?", options: ["Red", "Blue", "Green"], correctIndex: 1 },
  { id: "q2", question: "Second?", options: ["Yes", "No"], correctIndex: 0 },
];

function setup() {
  const onPassed = vi.fn();
  render(
    <QuizModal
      open
      questions={QUESTIONS}
      passTarget={2}
      alreadyEarned={false}
      onClose={() => {}}
      onPassed={onPassed}
    />,
  );
  return { onPassed, user: userEvent.setup() };
}

describe("QuizModal answer options", () => {
  it("has one tab stop and moves the choice with arrow keys", async () => {
    const { user } = setup();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);

    radios[0]!.focus();
    await user.keyboard("{ArrowDown}");
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{ArrowDown}");
    expect(radios[1]).toHaveFocus();
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    expect(radios.map((r) => r.getAttribute("tabindex"))).toEqual(["-1", "0", "-1"]);
  });

  it("wraps at both ends", async () => {
    const { user } = setup();
    const radios = screen.getAllByRole("radio");
    radios[0]!.focus();
    await user.keyboard("{ArrowUp}");
    expect(radios[2]).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(radios[0]).toHaveFocus();
  });

  it("reports a pass after answering correctly with the keyboard", async () => {
    const { user, onPassed } = setup();
    screen.getAllByRole("radio")[0]!.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    await user.click(screen.getByRole("button", { name: "Check answer" }));
    await user.click(screen.getByRole("button", { name: "Next question" }));
    await user.click(screen.getAllByRole("radio")[0]!);
    await user.click(screen.getByRole("button", { name: "Check answer" }));
    await user.click(screen.getByRole("button", { name: "See result" }));
    expect(onPassed).toHaveBeenCalledWith({ correct: 2, total: 2, passed: true });
  });
});
