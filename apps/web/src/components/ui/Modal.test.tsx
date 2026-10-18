import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "./Modal";

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        rerender {count}
      </button>
      <main>
        <button type="button">outside</button>
      </main>
      <Modal open title="First" onClose={() => onClose()} footer={<button>Footer</button>}>
        <input aria-label="Name" />
      </Modal>
    </div>
  );
}

describe("Modal", () => {
  it("moves focus to the dialog once and not again on re-render", () => {
    render(<Harness />);
    const dialog = screen.getByRole("dialog", { name: "First" });
    expect(dialog).toHaveFocus();

    const input = screen.getByLabelText("Name");
    input.focus();
    // The page behind is inert, so trigger a parent re-render from inside the tree.
    fireEvent.click(screen.getByText(/rerender/), {});
    expect(input).toHaveFocus();
  });

  it("keeps Shift+Tab from the dialog container inside the dialog", async () => {
    render(<Harness />);
    const user = userEvent.setup();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveFocus();
    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(screen.getByText("Footer"));
  });

  it("wraps Tab from the last control to the first and Shift+Tab back", async () => {
    render(<Harness />);
    const user = userEvent.setup();
    screen.getByText("Footer").focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByText("Footer")).toHaveFocus();
  });

  it("makes the page behind inert and restores it on close", () => {
    function Toggle() {
      const [open, setOpen] = useState(true);
      return (
        <div>
          <main data-testid="page">page</main>
          <Modal open={open} title="Only" onClose={() => setOpen(false)}>
            body
          </Modal>
        </div>
      );
    }
    render(<Toggle />);
    expect(screen.getByTestId("page")).toHaveAttribute("inert");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByTestId("page")).not.toHaveAttribute("inert");
  });

  it("returns focus to the opener when it closes", async () => {
    function Opener() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            open
          </button>
          <Modal open={open} title="Later" onClose={() => setOpen(false)}>
            body
          </Modal>
        </div>
      );
    }
    render(<Opener />);
    const user = userEvent.setup();
    const opener = screen.getByRole("button", { name: "open" });
    await user.click(opener);
    expect(screen.getByRole("dialog")).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("closes only the topmost of stacked dialogs on Escape", () => {
    const closeLower = vi.fn();
    const closeUpper = vi.fn();
    render(
      <div>
        <Modal open title="Lower" onClose={closeLower}>
          lower
        </Modal>
        <Modal open title="Upper" onClose={closeUpper}>
          upper
        </Modal>
      </div>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(closeUpper).toHaveBeenCalledTimes(1);
    expect(closeLower).not.toHaveBeenCalled();
  });

  it("keeps the scroll lock until the last dialog closes", () => {
    function Two() {
      const [lower, setLower] = useState(true);
      const [upper, setUpper] = useState(true);
      return (
        <div>
          <Modal open={lower} title="Lower" onClose={() => setLower(false)}>
            lower
          </Modal>
          <Modal open={upper} title="Upper" onClose={() => setUpper(false)}>
            upper
          </Modal>
        </div>
      );
    }
    document.body.style.overflow = "auto";
    render(<Two />);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.style.overflow).toBe("auto");
    document.body.style.overflow = "";
  });

  it("closes on a backdrop press but not a press inside the dialog", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
