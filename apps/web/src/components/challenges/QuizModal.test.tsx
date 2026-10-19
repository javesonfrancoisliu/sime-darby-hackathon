import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QUIZ_PUBLIC } from "../../test/fixtures";
import { QuizModal } from "./QuizModal";

function setup(result = { score: 2, total: 2, passed: true }) {
  const onSubmit = vi.fn(async () => result);
  render(
    <QuizModal open quiz={QUIZ_PUBLIC} loadError={null} onSubmit={onSubmit} onClose={() => {}} />,
  );
  return { onSubmit, user: userEvent.setup() };
}

describe("QuizModal", () => {
  it("has one tab stop and moves the choice with arrow keys", async () => {
    const { user } = setup();
    const radios = screen.getAllByRole("radio");
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
    const radios = screen.getAllByRole("radio");
    radios[0]!.focus();
    await user.keyboard("{ArrowUp}");
    expect(radios[3]).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(radios[0]).toHaveFocus();
  });

  it("does not reveal the right answer and submits every answer at the end", async () => {
    const { user, onSubmit } = setup();
    await user.click(screen.getAllByRole("radio")[1]!);
    await user.click(screen.getByRole("button", { name: "Next question" }));
    await user.click(screen.getAllByRole("radio")[0]!);
    await user.click(screen.getByRole("button", { name: "Submit answers" }));

    expect(onSubmit).toHaveBeenCalledWith([
      { questionId: "q1", optionIndex: 1 },
      { questionId: "q2", optionIndex: 0 },
    ]);
    expect(await screen.findByText("You got 2 of 2 correct.")).toBeInTheDocument();
    expect(screen.getByText(/You passed/)).toBeInTheDocument();
  });

  it("asks for an answer when Next is pressed with nothing chosen", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Next question" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Pick an answer to continue");
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();

    await user.click(screen.getAllByRole("radio")[0]!);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows only the score and verdict when the quiz is not passed", async () => {
    const { user } = setup({ score: 1, total: 2, passed: false });
    await user.click(screen.getAllByRole("radio")[0]!);
    await user.click(screen.getByRole("button", { name: "Next question" }));
    await user.click(screen.getAllByRole("radio")[0]!);
    await user.click(screen.getByRole("button", { name: "Submit answers" }));

    expect(await screen.findByText("You got 1 of 2 correct.")).toBeInTheDocument();
    expect(screen.getByText(/You need 2 correct to pass/)).toBeInTheDocument();
  });
});
