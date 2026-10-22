import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Drawer } from "./Drawer";

function Demo() {
  const [open, setOpen] = useState(false);
  return (
    <Drawer
      open={open}
      onToggle={() => setOpen((cur) => !cur)}
      header={
        <>
          <p>Broken streetlight</p>
          <span>Reported</span>
          <span>Block A lobby</span>
          <span>12 Oct</span>
        </>
      }
    >
      <p>The lamp has been out for a week.</p>
    </Drawer>
  );
}

describe("Drawer", () => {
  it("names the toggle from everything its header shows", () => {
    render(<Demo />);
    const toggle = screen.getByRole("button", {
      name: "Broken streetlight Reported Block A lobby 12 Oct",
    });
    expect(toggle).not.toHaveAttribute("aria-label");
  });

  it("reports open and closed with aria-expanded and keeps the same name", async () => {
    render(<Demo />);
    const toggle = screen.getByRole("button", { name: /Broken streetlight/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAccessibleName("Broken streetlight Reported Block A lobby 12 Oct");
  });

  it("labels the opened body region with the toggle", async () => {
    render(<Demo />);
    await userEvent.click(screen.getByRole("button", { name: /Broken streetlight/ }));
    const region = screen.getByRole("region", {
      name: "Broken streetlight Reported Block A lobby 12 Oct",
    });
    expect(region).toHaveTextContent("The lamp has been out for a week.");
  });
});
