import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QUIZ_PUBLIC } from "../../test/fixtures";
import { QuizModal } from "./QuizModal";

function setup(result = { score: 2, total: 2, passed: true }, points = 0) {
  const onSubmit = vi.fn(async () => result);
  render(
    <QuizModal
      open
      quiz={QUIZ_PUBLIC}
      points={points}
      loadError={null}
      onSubmit={onSubmit}
      onClose={() => {}}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

const group = (n: number) =>
  screen.getByRole("radiogroup", { name: `Answer options for question ${n}` });

describe("QuizModal", () => {
  it("shows every question at once with the points on offer", () => {
    setup({ score: 0, total: 2, passed: false }, 15);
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    expect(screen.getAllByRole("radiogroup")).toHaveLength(2);
    expect(screen.getByText(/earn 15 points/)).toBeInTheDocument();
  });

  it("has one tab stop per question and moves the choice with arrow keys", async () => {
    const { user } = setup();
    const radios = within(group(1)).getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("tabindex"))).toEqual(["0", "-1", "-1", "-1"]);

    radios[0]!.focus();
    await user.keyboard("{ArrowDown}");
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{ArrowDown}");
    expect(radios[1]).toHaveFocus();
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
  });

  it("wraps at both ends", async () => {
    const { user } = setup();
    const radios = within(group(1)).getAllByRole("radio");
    radios[0]!.focus();
    await user.keyboard("{ArrowUp}");
    expect(radios[3]).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(radios[0]).toHaveFocus();
  });

  it("does not reveal the right answer, sends one answer per question and shows the points", async () => {
    const { user, onSubmit } = setup(undefined, 15);
    await user.click(within(group(1)).getAllByRole("radio")[1]!);
    await user.click(within(group(2)).getAllByRole("radio")[0]!);
    await user.click(screen.getByRole("button", { name: "Submit answers" }));

    expect(onSubmit).toHaveBeenCalledWith([
      { questionId: "q1", optionIndex: 1 },
      { questionId: "q2", optionIndex: 0 },
    ]);
    expect(await screen.findByText("You got 2 of 2 correct.")).toBeInTheDocument();
    expect(screen.getByText("You passed. You earned 15 points.")).toBeInTheDocument();
  });

  it("sends nothing and asks for the rest while a question is unanswered", async () => {
    const { user, onSubmit } = setup();
    await user.click(within(group(1)).getAllByRole("radio")[0]!);
    await user.click(screen.getByRole("button", { name: "Submit answers" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Answer every question to submit");
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(within(group(2)).getAllByRole("radio")[0]!);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows only the score and verdict when the quiz is not passed", async () => {
    const { user } = setup({ score: 1, total: 2, passed: false }, 15);
    await user.click(within(group(1)).getAllByRole("radio")[0]!);
    await user.click(within(group(2)).getAllByRole("radio")[0]!);
    await user.click(screen.getByRole("button", { name: "Submit answers" }));

    expect(await screen.findByText("You got 1 of 2 correct.")).toBeInTheDocument();
    expect(screen.getByText(/You need 2 correct to pass/)).toBeInTheDocument();
    expect(screen.queryByText(/You earned/)).not.toBeInTheDocument();
  });
});
