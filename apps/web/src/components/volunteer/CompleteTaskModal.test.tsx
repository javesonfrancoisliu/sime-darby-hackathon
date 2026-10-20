import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AcceptedTask } from "../../data/AcceptedTasksContext";
import { CompleteTaskModal } from "./CompleteTaskModal";

function task(durationMinutes: number): AcceptedTask {
  return {
    id: "t1",
    kind: "request",
    title: "Groceries",
    area: "Elmina Valley",
    category: "groceries",
    scheduledAt: "2026-10-20T09:00:00+08:00",
    durationMinutes,
    status: "accepted",
    acceptedAt: "2026-10-18T09:00:00+08:00",
  };
}

function setup(durationMinutes: number) {
  const onConfirm = vi.fn();
  render(
    <CompleteTaskModal task={task(durationMinutes)} onClose={() => {}} onConfirm={onConfirm} />,
  );
  const input = screen.getByLabelText("Minutes spent");
  const submit = screen.getByRole("button", { name: "Yes, completed" });
  return { onConfirm, input, submit, user: userEvent.setup() };
}

async function enter(user: ReturnType<typeof userEvent.setup>, input: HTMLElement, value: string) {
  await user.clear(input);
  if (value) await user.type(input, value);
}

describe("CompleteTaskModal limits", () => {
  it("starts with the planned duration and confirms it in one tap", async () => {
    const { input, submit, user, onConfirm } = setup(60);
    expect(input).toHaveValue(60);
    await user.click(submit);
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }), 60);
  });

  it("allows up to twice the planned duration and rejects more", async () => {
    const { input, submit, user } = setup(60);
    await enter(user, input, "120");
    expect(submit).toBeEnabled();
    await enter(user, input, "121");
    expect(submit).toBeDisabled();
    expect(screen.getByText("Enter a whole number from 1 to 120.")).toBeInTheDocument();
  });

  it("caps the limit at 600 minutes", async () => {
    const { input, submit, user } = setup(400);
    await enter(user, input, "600");
    expect(submit).toBeEnabled();
    await enter(user, input, "601");
    expect(submit).toBeDisabled();
    expect(screen.getByText("Enter a whole number from 1 to 600.")).toBeInTheDocument();
  });

  it("rejects zero, decimals and an empty field", async () => {
    const { input, submit, user } = setup(60);
    await enter(user, input, "0");
    expect(submit).toBeDisabled();
    await enter(user, input, "1.5");
    expect(submit).toBeDisabled();
    await enter(user, input, "");
    expect(submit).toBeDisabled();
    await enter(user, input, "1");
    expect(submit).toBeEnabled();
  });

  it("shows a save error under the field", () => {
    render(
      <CompleteTaskModal
        task={task(60)}
        error="Too long for this task"
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText("Too long for this task")).toBeInTheDocument();
  });
});
