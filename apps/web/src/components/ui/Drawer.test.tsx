import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { Drawer } from "./Drawer";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <Drawer
      open={open}
      onToggle={() => setOpen((current) => !current)}
      header={
        <div>
          <h3>Water cut tonight</h3>
          <span>Elmina West</span>
        </div>
      }
    >
      <p>Supply returns by 6 am.</p>
    </Drawer>
  );
}

describe("Drawer", () => {
  it("names the toggle from everything the header shows and reports its state", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const toggle = screen.getByRole("button", { name: "Water cut tonight Elmina West" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAccessibleName("Water cut tonight Elmina West");
  });

  it("keeps the header heading outside the button and labels the body region", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const heading = screen.getByRole("heading", { name: "Water cut tonight" });
    expect(heading.closest("button")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Water cut tonight/ }));
    expect(screen.getByRole("region", { name: "Water cut tonight Elmina West" })).toHaveTextContent(
      "Supply returns by 6 am.",
    );
  });
});
