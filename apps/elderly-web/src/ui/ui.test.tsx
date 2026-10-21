import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";
import { TextField } from "./TextField";
import { StatusBadge } from "./StatusBadge";
import { Banner } from "./Banner";
import { Spinner } from "./Spinner";
import { AppShell } from "./AppShell";
import {
  STATUS_TEXT,
  STATUS_TONE,
  canCancel,
  requestStatusText,
  requestStatusTone,
  showsVolunteer,
} from "./status";
import { RequestStatus } from "@sdh/contracts";

describe("Button", () => {
  it("renders a text label and fires onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Request help</Button>);
    const btn = screen.getByRole("button", { name: "Request help" });
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("TextField", () => {
  it("associates a visible label with the input", () => {
    render(<TextField label="Description" value="" onChange={() => {}} />);
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
  });

  it("passes inputMode to the input", () => {
    render(<TextField label="Phone" value="" onChange={() => {}} inputMode="tel" />);
    expect(screen.getByLabelText("Phone")).toHaveAttribute("inputmode", "tel");
  });

  it("shows an error tied via aria-describedby", () => {
    render(
      <TextField
        label="Description"
        value=""
        onChange={() => {}}
        error="Please enter a description"
      />,
    );
    const input = screen.getByLabelText("Description");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a description");
  });
});

describe("status helpers", () => {
  const statuses = RequestStatus.options;

  it("maps all six statuses to plain text and a tone", () => {
    expect(statuses).toHaveLength(6);
    for (const s of statuses) {
      const { container, unmount } = render(
        <StatusBadge status={s} confirmedAt="2026-10-19T10:00:00Z" />,
      );
      expect(screen.getByText(STATUS_TEXT[s])).toBeInTheDocument();
      expect(container.querySelector(".ui-badge")).toHaveClass(`ui-badge--${STATUS_TONE[s]}`);
      unmount();
    }
  });

  it("uses the agreed words and tones", () => {
    expect(STATUS_TEXT).toEqual({
      pending_review: "Being checked",
      open: "Finding a volunteer",
      matched: "Volunteer coming",
      completed: "Completed",
      rejected: "Not accepted",
      cancelled: "Cancelled",
    });
    expect(STATUS_TONE.matched).toBe("success");
    expect(STATUS_TONE.rejected).toBe("danger");
  });

  it("says waiting for confirmation until a completed request is confirmed", () => {
    expect(requestStatusText({ status: "completed" })).toBe("Waiting for your confirmation");
    expect(requestStatusTone({ status: "completed" })).toBe("warning");
    expect(requestStatusText({ status: "completed", confirmedAt: "2026-10-19T10:00:00Z" })).toBe(
      "Completed",
    );
    expect(requestStatusText({ status: "open" })).toBe("Finding a volunteer");
  });

  it("shows the volunteer only once matched or completed", () => {
    expect(statuses.filter(showsVolunteer)).toEqual(["matched", "completed"]);
  });

  it("allows cancel only while being checked or open", () => {
    expect(statuses.filter(canCancel)).toEqual(["pending_review", "open"]);
  });
});

describe("Banner", () => {
  it("invokes the retry callback", async () => {
    const onRetry = vi.fn();
    render(<Banner message="It failed" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("Spinner", () => {
  it("exposes a live status region", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("AppShell", () => {
  it("renders its page content (brand bar removed; branding lives on landing/home)", () => {
    render(
      <AppShell>
        <p>content</p>
      </AppShell>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("applies Easy View always on at the root", () => {
    const { container } = render(
      <AppShell>
        <p>content</p>
      </AppShell>,
    );
    expect(container.querySelector(".app-root")).toHaveClass("easy-view");
  });
});

describe("AppButton variants (design-system conformance)", () => {
  it("renders shared ui-button classes with the requested variant", () => {
    const { container } = render(<Button variant="danger">Cancel request</Button>);
    const btn = container.querySelector("button");
    expect(btn).toHaveClass("ui-button");
    expect(btn).toHaveClass("ui-button--danger");
  });
});
