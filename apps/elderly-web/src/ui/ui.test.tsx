import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";
import { TextField } from "./TextField";
import { StatusBadge } from "./StatusBadge";
import { Banner } from "./Banner";
import { Spinner } from "./Spinner";
import { AppShell } from "./AppShell";
import { STATUS_TEXT, canCancel, showsVolunteer } from "./status";
import type { RequestStatus } from "../api/client";

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
  it("associates a visible label with the input (Req 1.6)", () => {
    render(<TextField label="Description" value="" onChange={() => {}} />);
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
  });

  it("shows an error tied via aria-describedby (Req 5.5)", () => {
    render(<TextField label="Description" value="" onChange={() => {}} error="Please enter a description" />);
    const input = screen.getByLabelText("Description");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a description");
  });
});

describe("status helpers", () => {
  const statuses: RequestStatus[] = ["pending", "matched", "in_progress", "completed", "cancelled"];

  it("maps every status to human-readable text (Req 6.3)", () => {
    for (const s of statuses) {
      render(<StatusBadge status={s} />);
      expect(screen.getAllByText(STATUS_TEXT[s]).length).toBeGreaterThan(0);
    }
  });

  it("shows volunteer only for matched/in_progress/completed (Req 7.1, 7.2)", () => {
    expect(showsVolunteer("pending")).toBe(false);
    expect(showsVolunteer("cancelled")).toBe(false);
    expect(showsVolunteer("matched")).toBe(true);
    expect(showsVolunteer("in_progress")).toBe(true);
    expect(showsVolunteer("completed")).toBe(true);
  });

  it("allows cancel only when pending (Req 8.1)", () => {
    expect(canCancel("pending")).toBe(true);
    for (const s of ["matched", "in_progress", "completed", "cancelled"] as RequestStatus[]) {
      expect(canCancel(s)).toBe(false);
    }
  });
});

describe("Banner", () => {
  it("invokes the retry callback (Req 5.6)", async () => {
    const onRetry = vi.fn();
    render(<Banner message="It failed" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("Spinner", () => {
  it("exposes a live status region (Req 6.6)", () => {
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

  it("applies Easy View always on at the root (Option A, Req 1.1, 1.2)", () => {
    const { container } = render(
      <AppShell>
        <p>content</p>
      </AppShell>,
    );
    expect(container.querySelector(".app-root")).toHaveClass("easy-view");
  });
});

describe("StatusBadge tone mapping (design-system conformance)", () => {
  it("uses the shared ui-badge class with a semantic tone", () => {
    const { container } = render(<StatusBadge status="completed" />);
    const badge = container.querySelector(".ui-badge");
    expect(badge).not.toBeNull();
    expect(badge).toHaveClass("ui-badge--success");
  });

  it("maps pending to the info tone and cancelled to danger", () => {
    const { container: c1 } = render(<StatusBadge status="pending" />);
    expect(c1.querySelector(".ui-badge")).toHaveClass("ui-badge--info");
    const { container: c2 } = render(<StatusBadge status="cancelled" />);
    expect(c2.querySelector(".ui-badge")).toHaveClass("ui-badge--danger");
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
